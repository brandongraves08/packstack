import os
import base64
import json
import re
import time
import logging
from datetime import datetime
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
from openai import OpenAI
from marshmallow import Schema, fields, validate, ValidationError

# AWS monitoring imports
from aws_xray_sdk.core import xray_recorder, patch_all
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware
import watchtower

from dotenv import load_dotenv
from amazon_api import AmazonProductAPI
from walmart_api import WalmartAPI

load_dotenv()

app = Flask(__name__)
allowed_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
CORS(app, resources={r"/*": {"origins": allowed_origins, "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}}, supports_credentials=True)

# Configure AWS X-Ray when in production
if os.environ.get('FLASK_ENV') == 'production':
    # Configure X-Ray
    xray_recorder.configure(service='packstack-backend')
    XRayMiddleware(app, xray_recorder)
    patch_all()  # Patch all supported libraries for X-Ray
    
    # Configure CloudWatch Logs
    handler = watchtower.CloudWatchLogHandler(log_group='packstack-logs')
    app.logger.addHandler(handler)
    logging.getLogger('werkzeug').addHandler(handler)

# Request timer middleware
@app.before_request
def start_timer():
    g.start = time.time()
    g.request_id = request.headers.get('X-Request-ID', f"req-{datetime.now().strftime('%Y%m%d%H%M%S%f')}")

# Structured logging after each request
@app.after_request
def log_request(response):
    if request.path == '/health_check':
        return response  # Skip logging health checks to reduce noise
        
    now = time.time()
    duration = round(now - g.start, 3)
    
    # Create structured log entry
    log_data = {
        "request_id": g.request_id,
        "method": request.method,
        "path": request.path,
        "status": response.status_code,
        "duration_ms": duration * 1000,
        "content_length": response.content_length,
        "timestamp": datetime.now().isoformat(),
        "user_agent": request.headers.get('User-Agent')
    }
    
    # Add client IP if available
    if request.headers.get('X-Forwarded-For'):
        log_data["client_ip"] = request.headers.get('X-Forwarded-For')
    
    # Add a segment for AWS X-Ray tracing in production
    if os.environ.get('FLASK_ENV') == 'production' and not request.path == '/health_check':
        try:
            xray_recorder.current_segment().put_annotation('request_id', g.request_id)
            xray_recorder.current_segment().put_metadata('request', {
                'path': request.path,
                'method': request.method,
                'duration': duration
            })
        except Exception as e:
            app.logger.error(f"Error adding X-Ray annotations: {str(e)}")
    
    # Determine log level based on status code
    if response.status_code >= 500:
        app.logger.error(json.dumps(log_data))
    elif response.status_code >= 400:
        app.logger.warning(json.dumps(log_data))
    else:
        app.logger.info(json.dumps(log_data))
        
    return response

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
amazon_api = AmazonProductAPI()
walmart_api = WalmartAPI()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class RegisterSchema(Schema):
    username = fields.Str(required=True)
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6))

class LoginSchema(Schema):
    emailOrUsername = fields.Str(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6))

class ChatSchema(Schema):
    message = fields.Str(required=True)
    history = fields.List(fields.Dict(), missing=[])

class AmazonSearchSchema(Schema):
    keywords = fields.Str(required=True)
    category = fields.Str(missing='Outdoors')
    max_results = fields.Int(missing=10)

class ASINSchema(Schema):
    asin = fields.Str(required=True)

class WeatherSchema(Schema):
    location = fields.Str(required=True)

@app.route('/analyze', methods=['POST'])
def analyze_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    batch_mode = request.form.get('batch_mode', 'false').lower() == 'true'
    detect_barcodes = request.form.get('detect_barcodes', 'false').lower() == 'true'
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            with open(filepath, "rb") as image_file:
                prompt_text = (
                    "This is an image of outdoor/backpacking gear. " +
                    ("Identify all distinct items visible in this image. " if batch_mode else "Analyze this specific item. ")
                )
                
                if detect_barcodes:
                    prompt_text += (
                        "If there are any barcodes or QR codes visible in the image, detect and decode them. " +
                        "For each barcode/QR code detected, provide the decoded value. "
                    )
                
                prompt_text += (
                    "For each item, provide a detailed JSON object with these fields: " +
                    "name (string), description (string), weight (number in grams), " +
                    "price (number in USD, estimated if not visible), category (string), " +
                    "brand (string if visible, null if not), productUrl (string, empty if not visible), " +
                    "consumable (boolean, true if it's food/fuel/etc), " +
                    "barcodeValue (string, only if barcode is detected). " +
                    (
                        "Return a JSON array of objects, with each object representing a distinct item. " if batch_mode else 
                        "Return a single JSON object with the item details. "
                    ) +
                    "Format your response ONLY as valid JSON with no additional text before or after."
                )
                
                response = client.chat.completions.create(
                    model="gpt-4-vision-preview",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt_text},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64.b64encode(image_file.read()).decode()}"}}
                            ]
                        }
                    ],
                    max_tokens=1500
                )
                
            os.remove(filepath)  # Clean up the uploaded file
            
            response_content = response.choices[0].message.content
            
            # Try to parse the response as JSON and ensure it's correctly formatted
            try:
                json_response = json.loads(response_content)
                return jsonify({
                    'success': True,
                    'analysis': json_response,
                    'batch_mode': batch_mode,
                    'detect_barcodes': detect_barcodes
                })
            except json.JSONDecodeError as json_err:
                # If the response isn't valid JSON, return it as a string
                return jsonify({
                    'success': False,
                    'analysis': response_content,
                    'error': f"Failed to parse AI response as JSON: {str(json_err)}",
                    'batch_mode': batch_mode,
                    'detect_barcodes': detect_barcodes
                })
            
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)  # Ensure cleanup even on error
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Failed to analyze image'
            }), 500
    
    return jsonify({'error': 'Unsupported file type'}), 400

@app.route('/chat', methods=['POST'])
def chat_with_assistant():
    """Endpoint for ChatGPT interactions related to gear, packing lists, and recommendations"""
    json_data = request.get_json(force=True)
    try:
        data = ChatSchema().load(json_data)
    except ValidationError as err:
        return jsonify({'errors': err.messages, 'success': False}), 400
    app.logger.info(f"Chat request validated: {data}")
    
    try:
        app.logger.info("Chat endpoint called")
        app.logger.info(f"Received chat data: {data}")
        
        if not data:
            app.logger.info("No data received in request")
            return jsonify({'error': 'No data provided', 'success': False, 'message': 'Request body is empty'}), 400
            
        if 'message' not in data:
            app.logger.info(f"Missing 'message' field in request: {data.keys()}")
            return jsonify({'error': 'No message provided', 'success': False, 'message': 'Message field is required'}), 400
        
        user_message = data.get('message', '')
        app.logger.info(f"User message: {user_message}")
        
        # Apply content filtering to user message
        is_inappropriate, filtered_message = filter_content(user_message)
        if is_inappropriate:
            return jsonify({
                'success': False, 
                'error': 'Content filtered',
                'message': 'Your message contains content that may be inappropriate. Please revise and try again.'
            }), 403
        
        # Get conversation history if provided
        history = data.get('history', [])
        app.logger.info(f"Chat history length: {len(history)}")
        
        # Check if OpenAI API key is available
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            app.logger.info("OpenAI API key not configured")
            return jsonify({
                'success': False,
                'error': 'API key not configured',
                'message': 'Please add your OpenAI API key in the Settings page to use the chat feature.'
            }), 400
            
        app.logger.info(f"Using OpenAI API key: {api_key[:5]}...")
        
        # Prepare the conversation for the API
        messages = []
        
        # Define a system message with context about the application
        system_message = """
        You are a helpful assistant for outdoor and backpacking enthusiasts. You help users with:
        1. Recommending gear based on trip parameters and weather conditions
        2. Suggesting packing strategies to reduce weight
        3. Providing information about outdoor skills and techniques
        4. Answering questions about outdoor activities and gear
        
        Focus on being practical and precise. If you're unsure about something, 
        acknowledge the uncertainty rather than providing potentially misleading information.
        """
        
        messages.append({"role": "system", "content": system_message})
        
        # Add conversation history if available
        if history:
            for message in history:
                if isinstance(message, dict) and 'role' in message and 'content' in message:
                    messages.append(message)
                else:
                    app.logger.info(f"Invalid message format in history: {message}")
        
        # Add the user's new message
        messages.append({"role": "user", "content": filtered_message})
        
        app.logger.info(f"Final messages to send to OpenAI: {len(messages)} messages")
        
        # Make a request to the OpenAI API
        try:
            app.logger.info("Sending request to OpenAI API")
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=500,
                temperature=0.7,
            )
            
            assistant_response = response.choices[0].message.content
            app.logger.info(f"Received response from OpenAI: {assistant_response[:50]}...")
            
            # Apply content filtering to assistant response
            is_inappropriate, filtered_response = filter_content(assistant_response)
            
            if is_inappropriate:
                return jsonify({
                    'success': False, 
                    'error': 'Response filtered',
                    'message': 'The AI generated content that may be inappropriate. Please try a different query.'
                }), 403
            
            # Add assistant response to history
            history.append({"role": "assistant", "content": filtered_response})
            
            return jsonify({
                'success': True,
                'response': filtered_response,
                'history': history
            })
        except Exception as e:
            app.logger.error(f"OpenAI API error: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'OpenAI API error',
                'message': f'Error communicating with OpenAI: {str(e)}'
            }), 500
            
    except Exception as e:
        app.logger.error(f"Chat endpoint error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'An error occurred while processing your request'
        }), 500

def filter_content(content):
    """Filter user prompts and AI responses for inappropriate content"""
    
    # Define patterns for inappropriate content
    inappropriate_patterns = [
        r'\b(hack|crack|steal|illegal|pornographic|obscene)\b',
        r'\b(password|credit\s*card|ssn|social\s*security)\b'
    ]
    
    # Check if any inappropriate patterns are found
    for pattern in inappropriate_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            return True, "Your request contains inappropriate or sensitive content that cannot be processed."
    
    return False, content

@app.route('/walmart/search', methods=['GET'])
def walmart_search():
    """Search for products on Walmart by keywords"""
    keywords = request.args.get('keywords', '')
    category = request.args.get('category', '')
    max_results = int(request.args.get('max_results', 10))
    
    if not keywords:
        return jsonify({'error': 'No search keywords provided'}), 400
    
    try:
        results = walmart_api.search_products(keywords, category, max_results)
        return jsonify(results)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error searching Walmart products'
        }), 500

@app.route('/walmart/product/<item_id>', methods=['GET'])
def walmart_product_details(item_id):
    """Get detailed information for a specific Walmart product by item ID"""
    if not item_id:
        return jsonify({'error': 'No product item ID provided'}), 400
    
    try:
        result = walmart_api.get_product_details(item_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error retrieving Walmart product details'
        }), 500

@app.route('/walmart/store-availability/<item_id>', methods=['GET'])
def walmart_store_availability(item_id):
    """Check if a product is available for pickup at nearby stores"""
    if not item_id:
        return jsonify({'error': 'No product item ID provided'}), 400
    
    zip_code = request.args.get('zip_code', '')
    if not zip_code:
        return jsonify({'error': 'No zip code provided'}), 400
    
    try:
        result = walmart_api.check_store_availability(item_id, zip_code)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error checking store availability'
        }), 500

@app.route('/compare-prices', methods=['GET'])
def compare_prices():
    """Compare prices for a product across multiple retailers"""
    keywords = request.args.get('keywords', '')
    
    if not keywords:
        return jsonify({'error': 'No search keywords provided'}), 400
    
    try:
        # Search both Amazon and Walmart
        amazon_results = amazon_api.search_products(keywords, 'Outdoors', 5)
        walmart_results = walmart_api.search_products(keywords, None, 5)
        
        # Combine and format the results
        combined_results = {
            'success': True,
            'amazon': amazon_results.get('products', []) if amazon_results.get('success', False) else [],
            'walmart': walmart_results.get('products', []) if walmart_results.get('success', False) else [],
            'comparison': []
        }
        
        # Create a simplified comparison of similar products
        amazon_products = amazon_results.get('products', []) if amazon_results.get('success', False) else []
        walmart_products = walmart_results.get('products', []) if walmart_results.get('success', False) else []
        
        for amazon_product in amazon_products:
            for walmart_product in walmart_products:
                # Simple title similarity check - could be enhanced with better matching algorithm
                if any(word in walmart_product.get('title', '').lower() for word in amazon_product.get('title', '').lower().split()):
                    combined_results['comparison'].append({
                        'title': amazon_product.get('title'),
                        'amazon_price': amazon_product.get('price', {}).get('amount'),
                        'amazon_url': amazon_product.get('url'),
                        'walmart_price': walmart_product.get('price', {}).get('amount'),
                        'walmart_url': walmart_product.get('url'),
                        'price_difference': abs(float(amazon_product.get('price', {}).get('amount', 0)) - 
                                              float(walmart_product.get('price', {}).get('amount', 0)))
                    })
        
        return jsonify(combined_results)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error comparing prices'
        }), 500

@app.route('/user-recommendations', methods=['POST'])
def user_recommendations():
    """Get personalized gear recommendations based on user profile and inventory"""
    try:
        # Parse request data
        data = request.get_json(force=True)
        user_profile = data.get('user_profile', {})
        trip_parameters = data.get('trip_parameters', {})
        inventory = data.get('inventory', [])
        
        # Get weather forecast for the trip location and season
        location = trip_parameters.get('location', 'mountains')
        season = trip_parameters.get('season', 'summer')
        
        # Make internal request to our weather forecast endpoint
        weather_data = None
        try:
            weather_response = get_weather_forecast()
            if weather_response[1] == 200:  # Check if status code is 200
                weather_data = weather_response[0].json
        except Exception as e:
            app.logger.error(f"Error fetching weather data: {str(e)}")
        
        # Construct prompt with user profile, trip parameters, inventory, and weather data
        prompt = f"""
        I need personalized gear recommendations for an outdoor enthusiast.
        
        User profile:
        {json.dumps(user_profile) if user_profile else "No specific profile provided"}
        
        Trip parameters (if provided):
        {json.dumps(trip_parameters) if trip_parameters else "No specific trip planned"}
        
        Current inventory:
        {json.dumps(inventory) if inventory else "No existing inventory provided"}
        """
        
        # Add weather data if available
        if weather_data:
            prompt += f"""
            
            Weather forecast for {location} during {season}:
            Temperature: {weather_data['forecast']['avg_temp']}
            Precipitation: {weather_data['forecast']['precipitation']}
            Conditions: {', '.join(weather_data['forecast']['conditions'])}
            Weather alerts: {', '.join(weather_data['forecast']['alerts'])}
            
            Please provide weather-specific gear recommendations based on these conditions.
            """
        
        prompt += """
        
        Please provide:
        1. Personalized gear recommendations based on their experience level, preferences, existing inventory, and weather conditions
        2. Suggestions for gear upgrades based on their current items
        3. Recommendations for new items they might need
        4. Any specialized gear relevant to their typical activities and weather conditions
        5. Safety equipment needed based on weather alerts and conditions
        
        Format your response as structured JSON with categories and item recommendations.
        """
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a personalized gear recommendation system for Packstack. Your recommendations should be highly targeted to the individual user based on their profile, preferences, existing inventory, and weather conditions for their planned trip."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=2000,
            temperature=0.5,
            response_format={"type": "json_object"}  # Request JSON formatted response
        )
        
        # Extract the assistant's response
        recommendation = response.choices[0].message.content
        
        # Apply content filtering to AI response
        is_inappropriate, filtered_response = filter_content(recommendation)
        if is_inappropriate:
            return jsonify({
                'success': False,
                'error': 'Content filtering',
                'message': "The generated response contained inappropriate content and was blocked."
            }), 403
        
        # Parse the JSON to validate it and ensure proper structure
        try:
            json_response = json.loads(filtered_response)
            return jsonify({
                'success': True,
                'recommendations': json_response
            })
        except json.JSONDecodeError:
            # If not valid JSON, return the raw response
            return jsonify({
                'success': False,
                'recommendations': filtered_response,
                'error': 'Failed to generate structured recommendations'
            })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'An error occurred while generating recommendations'
        }), 500

@app.route('/amazon/search', methods=['GET'])
def amazon_search():
    """Search for products on Amazon by keywords"""
    args = request.args.to_dict()
    try:
        params = AmazonSearchSchema().load(args)
    except ValidationError as err:
        return jsonify({'errors': err.messages}), 400
    try:
        results = amazon_api.search_products(params['keywords'], params['category'], params['max_results'])
        return jsonify(results)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error searching Amazon products'
        }), 500

@app.route('/amazon/product/<asin>', methods=['GET'])
def amazon_product_details(asin):
    """Get detailed information for a specific Amazon product by ASIN"""
    try:
        data = ASINSchema().load({'asin': asin})
    except ValidationError as err:
        return jsonify({'errors': err.messages}), 400
    result = amazon_api.get_product_details(data['asin'])
    return jsonify(result)

@app.route('/weather-forecast', methods=['GET'])
def get_weather_forecast():
    """Get weather forecast for a location"""
    args = request.args.to_dict()
    try:
        params = WeatherSchema().load(args)
    except ValidationError as err:
        return jsonify({'errors': err.messages}), 400
    location = params['location']
    
    # Mock weather forecasting data - in a real application, this would call a weather API
    mock_forecasts = {
        'mountains': {
            'spring': {
                'avg_temp': '45-65°F (7-18°C)',
                'precipitation': 'Moderate rain showers',
                'conditions': ['Rain', 'Wind', 'Variable temperatures'],
                'alerts': ['Possibility of late snow']
            },
            'summer': {
                'avg_temp': '65-85°F (18-29°C)',
                'precipitation': 'Occasional thunderstorms',
                'conditions': ['Sunny days', 'Cool nights', 'Afternoon thunderstorms'],
                'alerts': ['Lightning risk', 'Flash flood potential in valleys']
            },
            'fall': {
                'avg_temp': '40-60°F (4-15°C)',
                'precipitation': 'Light rain, possible early snow',
                'conditions': ['Variable weather', 'Dropping temperatures', 'Early frost possible'],
                'alerts': ['Early snowfall possible at higher elevations']
            },
            'winter': {
                'avg_temp': '10-30°F (-12 to -1°C)',
                'precipitation': 'Snow, occasional freezing rain',
                'conditions': ['Snow', 'Ice', 'Strong winds'],
                'alerts': ['Blizzard conditions possible', 'Avalanche risk in steep terrain']
            }
        },
        'desert': {
            'spring': {
                'avg_temp': '60-80°F (15-27°C)',
                'precipitation': 'Very little',
                'conditions': ['Large temperature swings', 'Windy', 'Dry'],
                'alerts': ['Dust storms possible']
            },
            'summer': {
                'avg_temp': '90-110°F (32-43°C)',
                'precipitation': 'Rare thunderstorms',
                'conditions': ['Extreme heat', 'Very dry', 'Intense sun'],
                'alerts': ['Extreme heat warnings', 'Flash flood risk during storms']
            },
            'fall': {
                'avg_temp': '65-85°F (18-29°C)',
                'precipitation': 'Very little',
                'conditions': ['Cooling temperatures', 'Dry', 'Pleasant'],
                'alerts': ['Cold nights possible']
            },
            'winter': {
                'avg_temp': '40-60°F (4-15°C)',
                'precipitation': 'Occasional rain',
                'conditions': ['Cool days', 'Cold nights', 'Clear skies'],
                'alerts': ['Freezing temperatures at night']
            }
        },
        'coast': {
            'spring': {
                'avg_temp': '50-65°F (10-18°C)',
                'precipitation': 'Frequent rain showers',
                'conditions': ['Foggy mornings', 'Windy', 'Mild'],
                'alerts': ['High surf advisories possible']
            },
            'summer': {
                'avg_temp': '65-75°F (18-24°C)',
                'precipitation': 'Fog and occasional drizzle',
                'conditions': ['Morning fog', 'Mild temperatures', 'Ocean breeze'],
                'alerts': ['Rip currents', 'Dense fog advisories']
            },
            'fall': {
                'avg_temp': '55-70°F (13-21°C)',
                'precipitation': 'Increasing rain chances',
                'conditions': ['Variable clouds', 'Moderate temperatures', 'Windy'],
                'alerts': ['High surf', 'Early season storms possible']
            },
            'winter': {
                'avg_temp': '45-60°F (7-15°C)',
                'precipitation': 'Heavy rain periods',
                'conditions': ['Stormy', 'Wet', 'Windy'],
                'alerts': ['Coastal flooding', 'High wind warnings']
            }
        },
        'forest': {
            'spring': {
                'avg_temp': '45-65°F (7-18°C)',
                'precipitation': 'Frequent rain',
                'conditions': ['Damp', 'Cool mornings', 'Mild afternoons'],
                'alerts': ['Flooding in low areas']
            },
            'summer': {
                'avg_temp': '65-85°F (18-29°C)',
                'precipitation': 'Occasional rain',
                'conditions': ['Warm days', 'Cooler under canopy', 'Humidity'],
                'alerts': ['Wildfire risk in dry periods', 'Tick activity high']
            },
            'fall': {
                'avg_temp': '40-65°F (4-18°C)',
                'precipitation': 'Moderate rain',
                'conditions': ['Cool', 'Damp mornings', 'Falling leaves increase trail slipperiness'],
                'alerts': ['Early frost possible', 'Falling branches during storms']
            },
            'winter': {
                'avg_temp': '20-40°F (-7 to 4°C)',
                'precipitation': 'Snow and freezing rain',
                'conditions': ['Snow-covered trails', 'Ice', 'Limited daylight'],
                'alerts': ['Hypothermia risk', 'Tree fall hazards during storms']
            }
        }
    }
    
    # Default to mountains if location not found
    location_key = location.lower() if location.lower() in mock_forecasts else 'mountains'
    
    # Get the appropriate season data (default to summer)
    season = request.args.get('season', 'summer').lower()
    if season not in ['spring', 'summer', 'fall', 'winter']:
        season = 'summer'
    
    forecast = mock_forecasts[location_key][season]
    
    return jsonify({
        'location': location,
        'season': season,
        'forecast': forecast
    })

@app.route('/health_check', methods=['GET'])
def health_check():
    """Enhanced endpoint to verify server is running and check subsystem health"""
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': os.environ.get('APP_VERSION', '1.0.0'),
        'environment': os.environ.get('FLASK_ENV', 'development'),
        'subsystems': {
            'openai_api': test_openai_connection_status(),
            'amazon_api': test_amazon_api_status(),
            'walmart_api': test_walmart_api_status(),
            'file_storage': os.path.exists(UPLOAD_FOLDER)
        }
    }
    
    # Determine overall health
    if not all(health_status['subsystems'].values()):
        health_status['status'] = 'degraded'
    
    return jsonify(health_status)

def test_openai_connection_status():
    """Test if OpenAI API is accessible"""
    try:
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return False
        
        # Just check if the key exists and is properly formatted
        return len(api_key) > 20
    except Exception:
        return False

def test_amazon_api_status():
    """Test if Amazon API is configured"""
    try:
        return amazon_api is not None
    except Exception:
        return False

def test_walmart_api_status():
    """Test if Walmart API is configured"""
    try:
        return walmart_api is not None
    except Exception:
        return False

@app.route('/user', methods=['OPTIONS', 'POST'])
def register_user():
    """Mock endpoint for user registration"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
        
    # Handle POST request for registration
    json_data = request.get_json(force=True)
    try:
        data = RegisterSchema().load(json_data)
    except ValidationError as err:
        return jsonify({'errors': err.messages}), 400
    app.logger.info(f"User registration validated: {data}")
    
    # Mock successful registration response
    return jsonify({
        'token': 'mock_token_for_testing',
        'user': {
            'id': 1,
            'username': data.get('username', ''),
            'email': data.get('email', ''),
            'created_at': '2025-04-14T09:00:00Z',
            'updated_at': '2025-04-14T09:00:00Z',
            'currency': {
                'code': 'USD',
                'name': 'United States Dollar',
                'symbol': '$'
            },
            'unit_weight': 'METRIC',
            'unit_distance': 'KILOMETERS',
            'trips': []
        }
    }), 201

@app.route('/user/login', methods=['OPTIONS', 'POST'])
def login_user():
    """Mock endpoint for user login"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
        
    # Handle POST request for login
    json_data = request.get_json(force=True)
    try:
        data = LoginSchema().load(json_data)
    except ValidationError as err:
        return jsonify({'errors': err.messages}), 400
    app.logger.info(f"User login validated: {data}")
    
    # Mock successful login response
    return jsonify({
        'token': 'mock_token_for_testing',
        'user': {
            'id': 1,
            'username': data.get('emailOrUsername', '').split('@')[0] if '@' in data.get('emailOrUsername', '') else data.get('emailOrUsername', ''),
            'email': data.get('emailOrUsername', ''),
            'created_at': '2025-04-14T09:00:00Z',
            'updated_at': '2025-04-14T09:00:00Z',
            'currency': {
                'code': 'USD',
                'name': 'United States Dollar',
                'symbol': '$'
            },
            'unit_weight': 'METRIC',
            'unit_distance': 'KILOMETERS',
            'trips': []
        }
    }), 200

@app.route('/user', methods=['GET'])
def get_user():
    """Mock endpoint to get the current user's data"""
    # Check for auth token
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Mock user data
    return jsonify({
        'id': 1,
        'username': 'testuser',
        'email': 'test@example.com',
        'created_at': '2025-04-14T09:00:00Z',
        'updated_at': '2025-04-14T09:00:00Z',
        'currency': {
            'code': 'USD',
            'name': 'United States Dollar',
            'symbol': '$'
        },
        'unit_weight': 'METRIC',
        'unit_distance': 'KILOMETERS',
        'openai_api_key': os.getenv('OPENAI_API_KEY', ''),
        'amazon_access_key': os.getenv('AWS_ACCESS_KEY_ID', ''),
        'amazon_secret_key': os.getenv('AWS_SECRET_KEY', ''),
        'amazon_associate_tag': os.getenv('AWS_ASSOCIATE_TAG', ''),
        'walmart_client_id': os.getenv('WALMART_CLIENT_ID', ''),
        'walmart_client_secret': os.getenv('WALMART_CLIENT_SECRET', ''),
        'trips': []
    }), 200

@app.route('/user', methods=['PUT'])
def update_user():
    """Endpoint to update user settings and API keys"""
    # Check for auth token
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        app.logger.info(f"Received user update: {data}")
        
        # Update environment variables with API keys if provided
        if 'openai_api_key' in data and data['openai_api_key']:
            os.environ['OPENAI_API_KEY'] = data['openai_api_key']
            # Update the OpenAI client with the new API key
            global client
            client = OpenAI(api_key=data['openai_api_key'])
        
        # Update Amazon API keys
        if 'amazon_access_key' in data and data['amazon_access_key']:
            os.environ['AWS_ACCESS_KEY_ID'] = data['amazon_access_key']
        if 'amazon_secret_key' in data and data['amazon_secret_key']:
            os.environ['AWS_SECRET_KEY'] = data['amazon_secret_key']
        if 'amazon_associate_tag' in data and data['amazon_associate_tag']:
            os.environ['AWS_ASSOCIATE_TAG'] = data['amazon_associate_tag']
            
        # Reinitialize the Amazon API client
        if any(['amazon_access_key' in data, 'amazon_secret_key' in data, 'amazon_associate_tag' in data]):
            global amazon_api
            amazon_api = AmazonProductAPI()
        
        # Update Walmart API keys
        if 'walmart_client_id' in data and data['walmart_client_id']:
            os.environ['WALMART_CLIENT_ID'] = data['walmart_client_id']
        if 'walmart_client_secret' in data and data['walmart_client_secret']:
            os.environ['WALMART_CLIENT_SECRET'] = data['walmart_client_secret']
            
        # Reinitialize the Walmart API client
        if any(['walmart_client_id' in data, 'walmart_client_secret' in data]):
            global walmart_api
            walmart_api = WalmartAPI()
        
        # Return updated user data
        return jsonify({
            'id': 1,
            'username': 'testuser',
            'email': data.get('email', 'test@example.com'),
            'created_at': '2025-04-14T09:00:00Z',
            'updated_at': '2025-04-14T09:00:00Z',
            'currency': {
                'code': data.get('currency', 'USD'),
                'name': 'Updated Currency',
                'symbol': '$'
            },
            'unit_weight': data.get('unit_weight', 'METRIC'),
            'unit_distance': data.get('unit_distance', 'KILOMETERS'),
            'openai_api_key': data.get('openai_api_key', ''),
            'amazon_access_key': data.get('amazon_access_key', ''),
            'amazon_secret_key': data.get('amazon_secret_key', ''),
            'amazon_associate_tag': data.get('amazon_associate_tag', ''),
            'walmart_client_id': data.get('walmart_client_id', ''),
            'walmart_client_secret': data.get('walmart_client_secret', ''),
            'trips': []
        }), 200
    except Exception as e:
        app.logger.error(f"Error updating user: {e}")
        return jsonify({'error': 'Bad request', 'message': str(e)}), 400

@app.route('/item/search', methods=['GET'])
def search_items():
    """Mock endpoint to search items by name or brand"""
    query = request.args.get('query', '')
    if not query or len(query) < 2:
        return jsonify([])
    
    # Mock item search results
    mock_items = [
        {"id": 1, "name": "Tent", "brand": "Big Agnes"},
        {"id": 2, "name": "Sleeping Bag", "brand": "REI"},
        {"id": 3, "name": "Backpack", "brand": "Osprey"},
        {"id": 4, "name": "Hiking Boots", "brand": "Salomon"},
        {"id": 5, "name": "Water Filter", "brand": "Sawyer"},
        {"id": 6, "name": "Trekking Poles", "brand": "Black Diamond"},
        {"id": 7, "name": "Rain Jacket", "brand": "Patagonia"},
        {"id": 8, "name": "Cookset", "brand": "MSR"},
        {"id": 9, "name": "Headlamp", "brand": "Petzl"},
        {"id": 10, "name": "Sleeping Pad", "brand": "Therm-a-Rest"}
    ]
    
    # Filter results based on query (case insensitive)
    query = query.lower()
    results = [
        item for item in mock_items 
        if query in item["name"].lower() or query in item["brand"].lower()
    ]
    
    return jsonify(results)

@app.route('/test-openai', methods=['GET'])
def test_openai_connection():
    """Test endpoint to verify OpenAI API connection"""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return jsonify({
            'success': False,
            'error': 'API key not found',
            'message': 'No OpenAI API key is configured. Please add it in Settings.'
        })
    
    app.logger.debug("Testing OpenAI API connection")
    
    try:
        # Initialize a new client with the current key
        test_client = OpenAI(api_key=api_key)
        
        # Make a simple request
        completion = test_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello!"}
            ],
            max_tokens=10,
        )
        
        # Get the response
        response_text = completion.choices[0].message.content
        
        return jsonify({
            'success': True,
            'message': 'OpenAI API connection successful',
            'response': response_text
        })
    except Exception as e:
        app.logger.error(f"OpenAI API test error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to connect to OpenAI API.'
        })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    # In development use debug mode, in production it will be overridden by gunicorn
    debug_mode = os.environ.get('FLASK_ENV', 'development') == 'development'
    app.run(host='0.0.0.0', debug=debug_mode, port=port)
