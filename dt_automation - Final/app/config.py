"""
Optimized Configuration Management for DomainTools Monitor
Simplified, focused configuration with better organization and validation
"""
import os
from dotenv import load_dotenv

# Load environment variables
# Try to load from parent directory first, then current directory
load_dotenv('../.env')
load_dotenv('.env')

class BaseConfig:
    """Base configuration with common settings"""
    
    # Flask Application Settings
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    FLASK_PORT = int(os.getenv('FLASK_PORT', 5006))
    FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    
    # DomainTools API Configuration
    DOMAINTOOLS_USERNAME = os.getenv('DOMAINTOOLS_USERNAME')
    DOMAINTOOLS_API_KEY = os.getenv('DOMAINTOOLS_API_KEY')
    DOMAINTOOLS_BASE_URL = os.getenv('DOMAINTOOLS_BASE_URL', 'https://api.domaintools.com/v1/iris-investigate/')
    
    # API Request Settings
    API_TIMEOUT_SECONDS = int(os.getenv('API_TIMEOUT_SECONDS', 30))
    API_RETRY_ATTEMPTS = int(os.getenv('API_RETRY_ATTEMPTS', 3))
    
    # Risk Score Thresholds
    RISK_THRESHOLD_HIGH = int(os.getenv('RISK_THRESHOLD_HIGH', 80))
    RISK_THRESHOLD_MEDIUM = int(os.getenv('RISK_THRESHOLD_MEDIUM', 50))
    AUTO_SUBMIT_THRESHOLD = int(os.getenv('AUTO_SUBMIT_THRESHOLD', 80))
    
    # Scanning Configuration
    SCAN_INTERVAL_MINUTES = int(os.getenv('SCAN_INTERVAL_MINUTES', 60))
    MAX_RESULTS_PER_SCAN = int(os.getenv('MAX_RESULTS_PER_SCAN', 1000))
    ENABLE_AUTOMATIC_SCANNING = os.getenv('ENABLE_AUTOMATIC_SCANNING', 'True').lower() in ['true', '1', 'yes', 'on']
    MAX_CONCURRENT_SCANS = int(os.getenv('MAX_CONCURRENT_SCANS', 3))
    
    # Data Storage Settings
    DATA_DIRECTORY = os.getenv('DATA_DIRECTORY', 'data')
    FINDINGS_FILE = os.path.join(DATA_DIRECTORY, os.getenv('FINDINGS_FILE', 'findings.json'))
    HASHES_FILE = os.path.join(DATA_DIRECTORY, os.getenv('HASHES_FILE', 'search_hashes.json'))
    ASRM_FILE = os.path.join(DATA_DIRECTORY, os.getenv('ASRM_FILE', 'ASRM.json'))
    TAGS_FILE = os.path.join(DATA_DIRECTORY, os.getenv('TAGS_FILE', 'tags.json'))
    SCAN_ACTIVITY_FILE = os.path.join(DATA_DIRECTORY, os.getenv('SCAN_ACTIVITY_FILE', 'scan_activity.json'))
    SCHEDULER_DATA_FILE = os.path.join(DATA_DIRECTORY, os.getenv('SCHEDULER_DATA_FILE', 'scheduler_data.json'))
    EXPORT_DIRECTORY = os.getenv('EXPORT_DIRECTORY', 'exports')
    
    # PhishLabs Integration
    PHISHLABS_ENABLED = os.getenv('PHISHLABS_ENABLED', 'False').lower() == 'true'
    
    # PhishLabs API Configuration
    PHISHLABS_CASE_API_BASE_URL = os.getenv('PHISHLABS_CASE_API_BASE_URL', 'https://caseapi.phishlabs.com/v1/create/')
    PHISHLABS_MONITOR_API_BASE_URL = os.getenv('PHISHLABS_MONITOR_API_BASE_URL', 'https://feed.phishlabs.com/')
    
    # PhishLabs Authentication
    PHISHLABS_USERNAME = os.getenv('PHISHLABS_USERNAME', '')
    PHISHLABS_PASSWORD = os.getenv('PHISHLABS_PASSWORD', '')
    PHISHLABS_CUSTID = os.getenv('PHISHLABS_CUSTID', '')
    
    # PhishLabs API Settings
    PHISHLABS_API_TIMEOUT = int(os.getenv('PHISHLABS_API_TIMEOUT', 15))
    PHISHLABS_API_RETRY_ATTEMPTS = int(os.getenv('PHISHLABS_API_RETRY_ATTEMPTS', 3))
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    LOG_DIRECTORY = os.getenv('LOG_DIRECTORY', 'logs')
    
    # UI Settings
    MAX_RESULTS_PER_PAGE = int(os.getenv('MAX_RESULTS_PER_PAGE', 100))
    
    @classmethod
    def validate_required_settings(cls):
        """Validate that all required configuration is present"""
        required_settings = [
            ('DOMAINTOOLS_USERNAME', cls.DOMAINTOOLS_USERNAME),
            ('DOMAINTOOLS_API_KEY', cls.DOMAINTOOLS_API_KEY),
        ]
        
        # Add PhishLabs validation if enabled
        if cls.PHISHLABS_ENABLED:
            # Direct API integration requires credentials
            phishlabs_settings = [
                ('PHISHLABS_USERNAME', cls.PHISHLABS_USERNAME),
                ('PHISHLABS_PASSWORD', cls.PHISHLABS_PASSWORD),
            ]
            required_settings.extend(phishlabs_settings)
        
        missing_settings = []
        for setting_name, setting_value in required_settings:
            if not setting_value:
                missing_settings.append(setting_name)
        
        if missing_settings:
            raise ValueError(f"Missing required configuration: {', '.join(missing_settings)}")
        
        return True
    
    @classmethod
    def get_risk_threshold_label(cls, risk_score):
        """Get risk threshold label for a given score"""
        if risk_score >= cls.RISK_THRESHOLD_HIGH:
            return 'high'
        elif risk_score >= cls.RISK_THRESHOLD_MEDIUM:
            return 'medium'
        else:
            return 'low'
    
    @classmethod
    def should_auto_submit(cls, risk_score):
        """Determine if a finding should be auto-submitted based on risk score"""
        return risk_score >= cls.AUTO_SUBMIT_THRESHOLD
    
    @classmethod
    def ensure_directories(cls):
        """Ensure all required directories exist"""
        directories = [cls.LOG_DIRECTORY, cls.EXPORT_DIRECTORY, 'backups']
        for directory in directories:
            if not os.path.exists(directory):
                os.makedirs(directory)
    
    @classmethod
    def get_export_file_path(cls, filename):
        """Get full path for export file"""
        cls.ensure_directories()
        return os.path.join(cls.EXPORT_DIRECTORY, filename)
    
    @classmethod
    def print_configuration_summary(cls):
        """Print configuration summary for debugging"""
        print("=== DomainTools Monitor Configuration ===")
        print(f"Flask Debug: {cls.FLASK_DEBUG}")
        print(f"Flask Port: {cls.FLASK_PORT}")
        print(f"Risk Thresholds: High≥{cls.RISK_THRESHOLD_HIGH}, Medium≥{cls.RISK_THRESHOLD_MEDIUM}")
        print(f"Auto-Submit Threshold: ≥{cls.AUTO_SUBMIT_THRESHOLD}")
        print(f"Scan Interval: {cls.SCAN_INTERVAL_MINUTES} minutes")
        print(f"Automatic Scanning: {cls.ENABLE_AUTOMATIC_SCANNING}")
        print(f"PhishLabs Integration: {cls.PHISHLABS_ENABLED}")
        if cls.PHISHLABS_ENABLED:
            print(f"PhishLabs Case API: {cls.PHISHLABS_CASE_API_BASE_URL}")
            print(f"PhishLabs Monitor API: {cls.PHISHLABS_MONITOR_API_BASE_URL}")
        print("==========================================")

class DevelopmentConfig(BaseConfig):
    """Development-specific configuration"""
    FLASK_DEBUG = True
    LOG_LEVEL = 'DEBUG'
    API_RETRY_ATTEMPTS = 1
    SCAN_INTERVAL_MINUTES = 5

class ProductionConfig(BaseConfig):
    """Production-specific configuration"""
    FLASK_DEBUG = False
    LOG_LEVEL = 'INFO'
    ENABLE_AUTOMATIC_SCANNING = True

class TestingConfig(BaseConfig):
    """Testing-specific configuration"""
    FLASK_DEBUG = True
    LOG_LEVEL = 'DEBUG'
    DATA_DIRECTORY = 'data'
    FINDINGS_FILE = os.path.join(DATA_DIRECTORY, 'test_findings.json')
    HASHES_FILE = os.path.join(DATA_DIRECTORY, 'test_search_hashes.json')
    ASRM_FILE = os.path.join(DATA_DIRECTORY, 'ASRM.json')
    TAGS_FILE = os.path.join(DATA_DIRECTORY, 'tags.json')
    SCAN_ACTIVITY_FILE = os.path.join(DATA_DIRECTORY, 'scan_activity.json')
    SCHEDULER_DATA_FILE = os.path.join(DATA_DIRECTORY, 'scheduler_data.json')
    ENABLE_AUTOMATIC_SCANNING = False
    PHISHLABS_ENABLED = False

def get_config(config_name=None):
    """Get configuration based on environment"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    config_map = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig
    }
    
    return config_map.get(config_name, DevelopmentConfig)

# Default configuration instance
current_config = get_config()
