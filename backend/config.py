import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:

    
    # Flask Core
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # Database (Legacy - keeping for compatibility)
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://localhost/sis_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    # Session Configuration
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_TYPE = 'filesystem'
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB max file size
    ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    LOG_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'
    
    # Rate Limiting
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URL = "memory://"
    RATELIMIT_STRATEGY = "fixed-window"
    
    # API Configuration 
    API_VERSION = 'v1'
    API_TITLE = 'Student Information System API'
    API_DESCRIPTION = 'RESTful API for managing students, programs, and colleges'


class DevelopmentConfig(Config):
    """Development configuration with relaxed security"""
    DEBUG = True
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    SESSION_COOKIE_SECURE = False  # Allow HTTP in development
    LOG_LEVEL = 'DEBUG'
    
    # Development-specific settings
    TESTING = False
    RATELIMIT_ENABLED = False  # Disable rate limiting in development


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    SECRET_KEY = 'test-secret-key'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    SESSION_COOKIE_SECURE = False
    LOG_LEVEL = 'DEBUG'
    RATELIMIT_ENABLED = False  # Disable rate limiting in tests


class ProductionConfig(Config):
    """Production configuration with strict security"""
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError('SECRET_KEY environment variable must be set in production')
    
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'WARNING')
    
    # Production-specific settings
    RATELIMIT_ENABLED = True
    
    # Ensure Supabase credentials are set
    if not os.getenv('SUPABASE_URL') or not os.getenv('SUPABASE_ANON_KEY'):
        raise ValueError('SUPABASE_URL and SUPABASE_ANON_KEY must be set in production')


# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config(config_name=None):
    """Get configuration class based on environment"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    selected_config = config.get(config_name, config['default'])
    
    # Log which configuration is being used
    print(f"🔧 Using {config_name} configuration")
    
    return selected_config
