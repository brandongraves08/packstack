import os
import time
import hmac
import hashlib
import base64
import urllib.parse
import json
import httpx
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

# Amazon API credentials
AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_KEY = os.getenv('AWS_SECRET_KEY')
AWS_ASSOCIATE_TAG = os.getenv('AWS_ASSOCIATE_TAG')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
AWS_SERVICE = 'ProductAdvertisingAPI'

class AmazonProductAPI:
    def __init__(self):
        self.host = f'webservices.amazon.{AWS_REGION if AWS_REGION != "us-east-1" else "com"}'
        self.endpoint = f'https://{self.host}/paapi5/searchitems'
        
        if not AWS_ACCESS_KEY or not AWS_SECRET_KEY or not AWS_ASSOCIATE_TAG:
            print("WARNING: Amazon API credentials not configured. Amazon product search will not work.")
        
    def _create_signature(self, request_params, timestamp, method="GET"):
        """Create signature for request"""
        # Create canonical request
        canonical_uri = '/paapi5/searchitems'
        canonical_querystring = urllib.parse.urlencode(request_params)
        canonical_headers = f'host:{self.host}\nx-amz-date:{timestamp}\n'
        signed_headers = 'host;x-amz-date'
        payload_hash = hashlib.sha256(''.encode('utf-8')).hexdigest()
        canonical_request = f"{method}\n{canonical_uri}\n{canonical_querystring}\n{canonical_headers}\n{signed_headers}\n{payload_hash}"
        
        # Create string to sign
        algorithm = 'AWS4-HMAC-SHA256'
        credential_scope = f"{timestamp[:8]}/{AWS_REGION}/{AWS_SERVICE}/aws4_request"
        string_to_sign = f"{algorithm}\n{timestamp}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"
        
        # Calculate signature
        k_date = hmac.new(f'AWS4{AWS_SECRET_KEY}'.encode('utf-8'), timestamp[:8].encode('utf-8'), hashlib.sha256).digest()
        k_region = hmac.new(k_date, AWS_REGION.encode('utf-8'), hashlib.sha256).digest()
        k_service = hmac.new(k_region, AWS_SERVICE.encode('utf-8'), hashlib.sha256).digest()
        k_signing = hmac.new(k_service, 'aws4_request'.encode('utf-8'), hashlib.sha256).digest()
        signature = hmac.new(k_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
        
        # Create authorization header
        authorization = f"{algorithm} Credential={AWS_ACCESS_KEY}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"
        
        return authorization
        
    def search_products(self, keywords, category="Outdoors", max_results=10):
        """Search for products by keywords"""
        if not AWS_ACCESS_KEY or not AWS_SECRET_KEY or not AWS_ASSOCIATE_TAG:
            return {
                "success": False,
                "error": "Amazon API credentials not configured",
                "message": "Please add AWS credentials to .env file"
            }
            
        # Create request parameters
        timestamp = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
        
        # Build request payload
        payload = {
            "Keywords": keywords,
            "Resources": [
                "ItemInfo.Title",
                "ItemInfo.Features",
                "ItemInfo.ProductInfo",
                "ItemInfo.ByLineInfo",
                "Images.Primary.Medium",
                "Offers.Listings.Price",
                "Offers.Listings.DeliveryInfo.IsPrimeEligible"
            ],
            "PartnerTag": AWS_ASSOCIATE_TAG,
            "PartnerType": "Associates",
            "Marketplace": "www.amazon.com",
            "SearchIndex": category,
            "ItemCount": max_results
        }
        
        # Create headers
        headers = {
            'content-encoding': 'amz-1.0',
            'content-type': 'application/json; charset=utf-8',
            'host': self.host,
            'x-amz-date': timestamp,
            'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
        }
        
        # Get authorization header
        auth_header = self._create_signature({}, timestamp, method="POST")
        headers['Authorization'] = auth_header
        
        try:
            # Make request with retries
            with httpx.Client(timeout=10.0) as client:
                for attempt in range(3):
                    try:
                        response = client.post(
                            self.endpoint,
                            json=payload,
                            headers=headers
                        )
                        response.raise_for_status()
                        break
                    except httpx.RequestError as e:
                        if attempt == 2:
                            return {'success': False, 'error': str(e), 'message': 'HTTP request failed after retries'}
                        time.sleep(2 ** attempt)
            
            # Parse response
            if response.status_code == 200:
                data = response.json()
                
                # Extract relevant product information
                products = []
                if 'SearchResult' in data and 'Items' in data['SearchResult']:
                    for item in data['SearchResult']['Items']:
                        product = {
                            'id': item.get('ASIN'),
                            'title': item.get('ItemInfo', {}).get('Title', {}).get('DisplayValue', ''),
                            'brand': item.get('ItemInfo', {}).get('ByLineInfo', {}).get('Brand', {}).get('DisplayValue', ''),
                            'url': item.get('DetailPageURL', ''),
                            'image': item.get('Images', {}).get('Primary', {}).get('Medium', {}).get('URL', ''),
                            'price': item.get('Offers', {}).get('Listings', [{}])[0].get('Price', {}).get('DisplayAmount', ''),
                            'prime': item.get('Offers', {}).get('Listings', [{}])[0].get('DeliveryInfo', {}).get('IsPrimeEligible', False)
                        }
                        products.append(product)
                
                return {
                    'success': True,
                    'products': products
                }
            else:
                return {
                    'success': False,
                    'error': f"API request failed with status code {response.status_code}",
                    'message': response.text
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Error searching Amazon products'
            }
            
    def get_product_details(self, asin):
        """Get detailed information for a specific product by ASIN"""
        if not AWS_ACCESS_KEY or not AWS_SECRET_KEY or not AWS_ASSOCIATE_TAG:
            return {
                "success": False,
                "error": "Amazon API credentials not configured",
                "message": "Please add AWS credentials to .env file"
            }
            
        # Create request parameters
        timestamp = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
        
        # Build request payload
        payload = {
            "ItemIds": [asin],
            "Resources": [
                "ItemInfo.Title",
                "ItemInfo.Features",
                "ItemInfo.ProductInfo",
                "ItemInfo.ByLineInfo",
                "ItemInfo.TechnicalInfo",
                "ItemInfo.ContentInfo",
                "ItemInfo.ManufactureInfo",
                "Images.Primary.Large",
                "Images.Variants.Large",
                "Offers.Listings.Price",
                "Offers.Listings.DeliveryInfo.IsPrimeEligible",
                "Offers.Summaries.LowestPrice"
            ],
            "PartnerTag": AWS_ASSOCIATE_TAG,
            "PartnerType": "Associates",
            "Marketplace": "www.amazon.com"
        }
        
        # Create headers
        headers = {
            'content-encoding': 'amz-1.0',
            'content-type': 'application/json; charset=utf-8',
            'host': self.host,
            'x-amz-date': timestamp,
            'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems'
        }
        
        # Get authorization header
        auth_header = self._create_signature({}, timestamp, method="POST")
        headers['Authorization'] = auth_header
        
        try:
            # Make request with retries
            with httpx.Client(timeout=10.0) as client:
                for attempt in range(3):
                    try:
                        response = client.post(
                            f"https://{self.host}/paapi5/getitems",
                            json=payload,
                            headers=headers
                        )
                        response.raise_for_status()
                        break
                    except httpx.RequestError as e:
                        if attempt == 2:
                            return {'success': False, 'error': str(e), 'message': 'HTTP request failed after retries'}
                        time.sleep(2 ** attempt)
            
            # Parse response
            if response.status_code == 200:
                data = response.json()
                
                # Extract relevant product information
                if 'ItemsResult' in data and 'Items' in data['ItemsResult']:
                    items = data['ItemsResult']['Items']
                    # Find item matching the ASIN
                    item = next((itm for itm in items if itm.get('ASIN') == asin), None)
                    if not item:
                        return {
                            'success': False,
                            'error': 'Product not found',
                            'message': 'The requested product could not be found'
                        }
                    
                    # Get product weight if available
                    weight = None
                    weight_unit = None
                    if 'ItemInfo' in item and 'ProductInfo' in item['ItemInfo'] and 'ItemDimensions' in item['ItemInfo']['ProductInfo']:
                        dimensions = item['ItemInfo']['ProductInfo']['ItemDimensions']
                        if 'Weight' in dimensions:
                            weight = dimensions['Weight'].get('DisplayValue')
                            weight_unit = dimensions['Weight'].get('Unit')
                    
                    # Get features list
                    features = []
                    if 'ItemInfo' in item and 'Features' in item['ItemInfo'] and 'DisplayValues' in item['ItemInfo']['Features']:
                        features = item['ItemInfo']['Features']['DisplayValues']
                    
                    # Get current price
                    price = None
                    if 'Offers' in item and 'Listings' in item['Offers'] and len(item['Offers']['Listings']) > 0:
                        price = item['Offers']['Listings'][0].get('Price', {}).get('DisplayAmount')
                    
                    # Get images
                    images = []
                    if 'Images' in item:
                        if 'Primary' in item['Images'] and 'Large' in item['Images']['Primary']:
                            images.append(item['Images']['Primary']['Large']['URL'])
                        if 'Variants' in item['Images']:
                            for variant in item['Images']['Variants']:
                                if 'Large' in variant:
                                    images.append(variant['Large']['URL'])
                    
                    product = {
                        'id': asin,
                        'title': item.get('ItemInfo', {}).get('Title', {}).get('DisplayValue', ''),
                        'brand': item.get('ItemInfo', {}).get('ByLineInfo', {}).get('Brand', {}).get('DisplayValue', ''),
                        'url': item.get('DetailPageURL', ''),
                        'images': images,
                        'price': price,
                        'features': features,
                        'weight': weight,
                        'weight_unit': weight_unit,
                        'prime': item.get('Offers', {}).get('Listings', [{}])[0].get('DeliveryInfo', {}).get('IsPrimeEligible', False)
                    }
                    
                    return {
                        'success': True,
                        'product': product
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Product not found',
                        'message': 'The requested product could not be found'
                    }
            else:
                return {
                    'success': False,
                    'error': f"API request failed with status code {response.status_code}",
                    'message': response.text
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Error getting product details'
            }
