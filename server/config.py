import os

class BaseConfig:
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    CACHE_TYPE = os.getenv('CACHE_TYPE', 'SimpleCache')

class DevConfig(BaseConfig):
    DEBUG = True
    FLASK_ENV = 'development'

class ProdConfig(BaseConfig):
    DEBUG = False
    FLASK_ENV = 'production'
