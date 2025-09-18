import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

class AppLogger:
    """Simplified logging system for DomainTools Monitor application
    
    Provides 4 specialized loggers for clear debugging:
    - app.log: Main application events, errors, configuration changes
    - domaintools_api.log: All DomainTools API interactions
    - phishlabs_api.log: All PhishLabs API interactions  
    - findings.log: Domain discoveries and processing
    """
    
    def __init__(self, app_name="domaintools_monitor"):
        self.app_name = app_name
        self.log_dir = "logs"
        self.ensure_log_directory()
        self.setup_loggers()
    
    def ensure_log_directory(self):
        """Create logs directory if it doesn't exist"""
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)
    
    def setup_loggers(self):
        """Setup 4 specialized loggers for different components"""
        
        # Main application logger - core app events, errors, config changes
        self.app_logger = self._create_logger(
            name="app",
            filename="app.log",
            level=logging.INFO
        )
        
        # DomainTools API logger - all DT API calls and responses
        self.domaintools_logger = self._create_logger(
            name="domaintools_api",
            filename="domaintools_api.log",
            level=logging.DEBUG
        )
        
        # PhishLabs API logger - all PL API calls and submissions
        self.phishlabs_logger = self._create_logger(
            name="phishlabs_api",
            filename="phishlabs_api.log",
            level=logging.INFO
        )
        
        # Findings logger - domain discoveries and processing
        self.findings_logger = self._create_logger(
            name="findings",
            filename="findings.log",
            level=logging.INFO
        )
    
    def _create_logger(self, name, filename, level=logging.INFO):
        """Create individual logger with rotating file handler"""
        
        logger_name = f"{self.app_name}.{name}"
        logger = logging.getLogger(logger_name)
        
        # Prevent duplicate handlers
        if logger.handlers:
            return logger
        
        logger.setLevel(level)
        
        # File handler with rotation (10MB max, keep 5 files)
        file_path = os.path.join(self.log_dir, filename)
        file_handler = RotatingFileHandler(
            file_path,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        
        # Console handler for development
        console_handler = logging.StreamHandler()
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
        
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
        return logger
    
    # Getter methods for each logger
    def get_app_logger(self):
        """Get main application logger"""
        return self.app_logger
    
    def get_domaintools_logger(self):
        """Get DomainTools API logger"""
        return self.domaintools_logger
    
    def get_phishlabs_logger(self):
        """Get PhishLabs API logger"""
        return self.phishlabs_logger
    
    def get_findings_logger(self):
        """Get findings/discoveries logger"""
        return self.findings_logger
    
    # Specialized logging methods for common operations
    
    # Application logging
    def log_app_start(self, message):
        """Log application startup events"""
        self.app_logger.info(f"APP_START - {message}")
    
    def log_app_error(self, component, error, context=None):
        """Log application errors"""
        error_msg = f"APP_ERROR in {component}: {error}"
        if context:
            error_msg += f" | Context: {context}"
        self.app_logger.error(error_msg)
    
    def log_config_change(self, action, details):
        """Log configuration changes"""
        self.app_logger.info(f"CONFIG_CHANGE - {action}: {details}")
    
    def log_scheduler_event(self, event, details):
        """Log scheduler events"""
        self.app_logger.info(f"SCHEDULER - {event}: {details}")
    
    # DomainTools API logging
    def log_dt_api_request(self, endpoint, params, response_time=None):
        """Log DomainTools API requests"""
        if response_time:
            self.domaintools_logger.debug(
                f"DT_API_REQUEST - {endpoint} - Params: {len(str(params))} chars - Response time: {response_time:.2f}s"
            )
        else:
            self.domaintools_logger.debug(f"DT_API_REQUEST - {endpoint} - Params: {len(str(params))} chars")
    
    def log_dt_api_error(self, endpoint, error, params=None):
        """Log DomainTools API errors"""
        self.domaintools_logger.error(f"DT_API_ERROR - {endpoint}: {error}")
    
    def log_dt_api_success(self, endpoint, result_count):
        """Log successful DomainTools API calls"""
        self.domaintools_logger.info(f"DT_API_SUCCESS - {endpoint}: {result_count} results")
    
    def log_dt_scan_start(self, hash_name, hash_id):
        """Log DomainTools scan initiation"""
        self.domaintools_logger.info(f"DT_SCAN_START - Hash: {hash_name} (ID: {hash_id})")
    
    def log_dt_scan_complete(self, hash_name, findings_count, duration_seconds):
        """Log DomainTools scan completion"""
        self.domaintools_logger.info(
            f"DT_SCAN_COMPLETE - Hash: {hash_name} - {findings_count} findings in {duration_seconds:.2f}s"
        )
    
    # PhishLabs API logging
    def log_pl_api_request(self, endpoint, action):
        """Log PhishLabs API requests"""
        self.phishlabs_logger.info(f"PL_API_REQUEST - {endpoint} - Action: {action}")
    
    def log_pl_api_error(self, endpoint, error):
        """Log PhishLabs API errors"""
        self.phishlabs_logger.error(f"PL_API_ERROR - {endpoint}: {error}")
    
    def log_pl_submission_success(self, domain_name, case_number, case_type):
        """Log successful PhishLabs submissions"""
        self.phishlabs_logger.info(f"PL_SUBMISSION_SUCCESS - {domain_name} -> Case: {case_number} ({case_type})")
    
    def log_pl_submission_failed(self, domain_name, error):
        """Log failed PhishLabs submissions"""
        self.phishlabs_logger.error(f"PL_SUBMISSION_FAILED - {domain_name}: {error}")
    
    def log_pl_auto_submission(self, domain_name, success, case_number=None, error=None):
        """Log auto-submission attempts"""
        if success:
            self.phishlabs_logger.info(f"PL_AUTO_SUBMIT_SUCCESS - {domain_name} -> Case: {case_number}")
        else:
            self.phishlabs_logger.error(f"PL_AUTO_SUBMIT_FAILED - {domain_name}: {error}")
    
    # Findings logging
    def log_finding_discovered(self, domain_name, risk_score, hash_name, source_ip=None):
        """Log new domain discovery"""
        log_msg = f"FINDING_DISCOVERED - Domain: {domain_name}, Risk: {risk_score}, Source: {hash_name}"
        if source_ip:
            log_msg += f", IP: {source_ip}"
        self.findings_logger.info(log_msg)
    
    def log_finding_processed(self, domain_name, action, case_number=None, user=None):
        """Log finding processing actions"""
        log_msg = f"FINDING_PROCESSED - {domain_name}: {action}"
        if case_number:
            log_msg += f" -> Case: {case_number}"
        if user:
            log_msg += f" (User: {user})"
        self.findings_logger.info(log_msg)
    
    def log_asrm_match(self, domain_name, rule_name, matched_conditions):
        """Log ASRM rule matches"""
        self.findings_logger.info(f"ASRM_MATCH - {domain_name} matched rule '{rule_name}': {matched_conditions}")
    
    def log_risk_assessment(self, domain_name, risk_score, factors):
        """Log risk assessment details"""
        self.findings_logger.info(f"RISK_ASSESSMENT - {domain_name}: {risk_score} - Factors: {factors}")
    
    # Performance logging
    def log_performance_metric(self, operation, duration_seconds, additional_info=None):
        """Log performance metrics"""
        perf_msg = f"PERFORMANCE - {operation}: {duration_seconds:.2f}s"
        if additional_info:
            perf_msg += f" | {additional_info}"
        self.app_logger.info(perf_msg)

# Global logger instance
app_logger_instance = AppLogger()

# Convenience functions for easy import
def get_app_logger():
    return app_logger_instance.get_app_logger()

def get_domaintools_logger():
    return app_logger_instance.get_domaintools_logger()

def get_phishlabs_logger():
    return app_logger_instance.get_phishlabs_logger()

def get_findings_logger():
    return app_logger_instance.get_findings_logger()

# Direct access to specialized logging methods
log_app_start = app_logger_instance.log_app_start
log_app_error = app_logger_instance.log_app_error
log_config_change = app_logger_instance.log_config_change
log_scheduler_event = app_logger_instance.log_scheduler_event

log_dt_api_request = app_logger_instance.log_dt_api_request
log_dt_api_error = app_logger_instance.log_dt_api_error
log_dt_api_success = app_logger_instance.log_dt_api_success
log_dt_scan_start = app_logger_instance.log_dt_scan_start
log_dt_scan_complete = app_logger_instance.log_dt_scan_complete

log_pl_api_request = app_logger_instance.log_pl_api_request
log_pl_api_error = app_logger_instance.log_pl_api_error
log_pl_submission_success = app_logger_instance.log_pl_submission_success
log_pl_submission_failed = app_logger_instance.log_pl_submission_failed
log_pl_auto_submission = app_logger_instance.log_pl_auto_submission

log_finding_discovered = app_logger_instance.log_finding_discovered
log_finding_processed = app_logger_instance.log_finding_processed
log_asrm_match = app_logger_instance.log_asrm_match
log_risk_assessment = app_logger_instance.log_risk_assessment

log_performance_metric = app_logger_instance.log_performance_metric