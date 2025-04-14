import os
import requests
import time
import json
import hmac
import hashlib
import base64
from datetime import datetime
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv()

# Load Walmart API credentials from environment variables
WALMART_CLIENT_ID = os.getenv('WALMART_CLIENT_ID')
WALMART_CLIENT_SECRET = os.getenv('WALMART_CLIENT_SECRET')
WALMART_API_BASE_URL = "https://developer.api.walmart.com/api-proxy/service"

class WalmartAPI:
    """Client for interacting with the Walmart Affiliate API"""
    
    def __init__(self):
        """Initialize the Walmart API client with credentials from environment variables"""
        self.client_id = WALMART_CLIENT_ID
        self.client_secret = WALMART_CLIENT_SECRET
        self.api_base_url = WALMART_API_BASE_URL
        
        if not self.client_id or not self.client_secret:
            print("WARNING: Walmart API credentials not found in environment variables")
    
    def _get_auth_signature(self, timestamp):
        """Generate the authentication signature required for Walmart API"""
        message = f"{self.client_id}\n{timestamp}\n"
        digest = hmac.new(
            self.client_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).digest()
        return base64.b64encode(digest).decode()
    
    def _get_headers(self):
        """Generate the headers required for Walmart API requests"""
        timestamp = str(int(time.time() * 1000))
        signature = self._get_auth_signature(timestamp)
        
        return {
            "WM_SEC.KEY_VERSION": "1",
            "WM_CONSUMER.ID": self.client_id,
            "WM_CONSUMER.INTIMESTAMP": timestamp,
            "WM_SEC.AUTH_SIGNATURE": signature,
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    def search_products(self, query, category=None, limit=10):
        """Search for products on Walmart by query and optionally filter by category"""
        endpoint = f"{self.api_base_url}/affil/product/v2/search"
        
        params = {
            "query": query,
            "numItems": limit
        }
        
        if category:
            params["categoryId"] = category
        
        try:
            response = requests.get(
                endpoint,
                params=params,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                # Format the response to be consistent with our Amazon API
                formatted_results = []
                
                if 'items' in data:
                    for item in data['items']:
                        product = {
                            'asin': item.get('itemId'),
                            'title': item.get('name'),
                            'url': item.get('productUrl'),
                            'image': item.get('largeImage'),
                            'price': {
                                'amount': item.get('salePrice', 0),
                                'currency': 'USD',
                                'formatted': f"${item.get('salePrice', 0)}"
                            },
                            'rating': item.get('customerRating', 0),
                            'totalReviews': item.get('numReviews', 0),
                            'category': item.get('categoryPath'),
                            'source': 'walmart'
                        }
                        formatted_results.append(product)
                
                return {
                    'success': True,
                    'products': formatted_results,
                    'total': len(formatted_results)
                }
            else:
                return {
                    'success': False,
                    'error': f"Error {response.status_code}: {response.text}",
                    'products': []
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'products': []
            }
    
    def get_product_details(self, item_id):
        """Get detailed information for a specific Walmart product by item ID"""
        endpoint = f"{self.api_base_url}/affil/product/v2/items/{item_id}"
        
        try:
            response = requests.get(
                endpoint,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                item = data.get('item', {})
                
                # Format the response to be consistent with our Amazon API
                product_details = {
                    'success': True,
                    'product': {
                        'asin': item.get('itemId'),
                        'title': item.get('name'),
                        'description': item.get('longDescription', ''),
                        'url': item.get('productUrl'),
                        'images': [item.get('largeImage')] if item.get('largeImage') else [],
                        'price': {
                            'amount': item.get('salePrice', 0),
                            'currency': 'USD',
                            'formatted': f"${item.get('salePrice', 0)}"
                        },
                        'rating': item.get('customerRating', 0),
                        'totalReviews': item.get('numReviews', 0),
                        'availability': 'In Stock' if item.get('stock', '') == 'Available' else 'Out of Stock',
                        'features': [],  # Walmart API doesn't provide a dedicated features list
                        'category': item.get('categoryPath', ''),
                        'brand': item.get('brandName', ''),
                        'specifications': [],  # Will parse from the item attributes
                        'source': 'walmart',
                        'storePickupAvailable': item.get('pickupToday', False),
                        'storePickupLocations': item.get('pickupStores', [])
                    }
                }
                
                # Extract product specifications if available
                if 'attributes' in item:
                    for attr in item['attributes']:
                        spec = {
                            'name': attr.get('name', ''),
                            'value': attr.get('value', '')
                        }
                        product_details['product']['specifications'].append(spec)
                
                return product_details
                
            else:
                return {
                    'success': False,
                    'error': f"Error {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def check_store_availability(self, item_id, zip_code):
        """Check if a product is available for pickup at nearby stores"""
        endpoint = f"{self.api_base_url}/affil/product/v2/items/{item_id}/stores"
        
        params = {
            "zipCode": zip_code
        }
        
        try:
            response = requests.get(
                endpoint,
                params=params,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'storeAvailability': data
                }
            else:
                return {
                    'success': False,
                    'error': f"Error {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
