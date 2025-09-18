"""
Consolidated Scheduler Module
Combines all scheduler operations, data management, and endpoints
"""

import time
import json
import os
from datetime import datetime, timedelta
from threading import Thread, Event
from typing import Optional, Any, Dict, List
from flask import Blueprint, request, jsonify
import pytz

from config import current_config as config
from logger import get_app_logger

# Try to import APScheduler, provide fallback if not available
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    logger = get_app_logger()
    logger.warning("APScheduler not available, using fallback scheduler")

    class BackgroundScheduler:
        def __init__(self):
            self.running = False
            self.jobs = []
        
        def start(self):
            self.running = True
        
        def shutdown(self):
            self.running = False
        
        def add_job(self, func, trigger=None, **kwargs):
            pass

logger = get_app_logger()

# EST timezone functions
def get_est_now():
    """Get current time in EST"""
    est = pytz.timezone('US/Eastern')
    return datetime.now(est)

def format_est_datetime(dt):
    """Format datetime to EST string"""
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except:
            return dt
    
    if dt is None:
        return None
    
    est = pytz.timezone('US/Eastern')
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    
    est_dt = dt.astimezone(est)
    return est_dt.strftime('%Y-%m-%d %I:%M:%S %p EST')

# =============================================================================
# SCHEDULER DATA MANAGER CLASS
# =============================================================================

class SchedulerDataManager:
    """Manages persistent scheduler data storage"""
    
    def __init__(self, data_file: str = None):
        if data_file is None:
            self.data_file = config.SCHEDULER_DATA_FILE
        else:
            self.data_file = data_file
        self.data = self._load_data()
    
    def _load_data(self) -> Dict[str, Any]:
        """Load scheduler data from JSON file"""
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    logger.info(f"Loaded scheduler data from {self.data_file}")
                    return data
            else:
                logger.info(f"Scheduler data file {self.data_file} not found, creating default")
                return self._create_default_data()
        except Exception as e:
            logger.error(f"Error loading scheduler data: {e}")
            return self._create_default_data()
    
    def _create_default_data(self) -> Dict[str, Any]:
        """Create default scheduler data structure"""
        return {
            "scheduler_status": {
                "is_running": False,
                "enabled": True,
                "scheduler_type": None,
                "interval_minutes": 5,
                "last_run": None,
                "next_run": None,
                "total_runs": 0,
                "last_successful_run": None,
                "last_failed_run": None,
                "consecutive_failures": 0,
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat()
            },
            "run_history": [],
            "configuration": {
                "scan_interval_minutes": 5,
                "max_concurrent_scans": 3,
                "auto_restart_on_failure": True,
                "max_consecutive_failures": 5
            }
        }
    
    def _save_data(self) -> bool:
        """Save scheduler data to JSON file"""
        try:
            # Update last_updated timestamp
            self.data["scheduler_status"]["last_updated"] = datetime.now().isoformat()
            
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"Scheduler data saved to {self.data_file}")
            return True
        except Exception as e:
            logger.error(f"Error saving scheduler data: {e}")
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """Get current scheduler status"""
        return self.data["scheduler_status"].copy()
    
    def update_status(self, **kwargs) -> bool:
        """Update scheduler status fields"""
        try:
            for key, value in kwargs.items():
                if key in self.data["scheduler_status"]:
                    self.data["scheduler_status"][key] = value
                else:
                    logger.warning(f"Unknown status field: {key}")
            
            return self._save_data()
        except Exception as e:
            logger.error(f"Error updating scheduler status: {e}")
            return False
    
    def start_scheduler(self, scheduler_type: str, interval_minutes: int = None) -> bool:
        """Mark scheduler as started"""
        now = datetime.now()
        status_update = {
            'is_running': True,
            'scheduler_type': scheduler_type,
            'last_updated': now.isoformat()
        }
        if interval_minutes is not None:
            # Update both status and configuration to keep them in sync
            status_update['interval_minutes'] = interval_minutes
            self.update_configuration(scan_interval_minutes=interval_minutes)
        return self.update_status(**status_update)
    
    def stop_scheduler(self) -> bool:
        """Mark scheduler as stopped"""
        now = datetime.now()
        return self.update_status(
            is_running=False,
            scheduler_type=None,
            next_run=None,
            last_updated=now.isoformat()
        )
    
    def record_run_start(self) -> bool:
        """Record the start of a scheduler run"""
        now = datetime.now()
        run_id = f"run_{now.strftime('%Y%m%d_%H%M%S')}"
        
        run_record = {
            "run_id": run_id,
            "started_at": now.isoformat(),
            "status": "running",
            "findings_processed": 0,
            "errors": []
        }
        
        self.data["run_history"].append(run_record)
        
        # Keep only last 100 runs to prevent file from growing too large
        if len(self.data["run_history"]) > 100:
            self.data["run_history"] = self.data["run_history"][-100:]
        
        return self.update_status(
            last_run=now.isoformat(),
            total_runs=self.data["scheduler_status"]["total_runs"] + 1
        )
    
    def record_run_success(self, findings_processed: int = 0) -> bool:
        """Record successful completion of a scheduler run"""
        now = datetime.now()
        
        # Update the last run record
        if self.data["run_history"]:
            last_run = self.data["run_history"][-1]
            last_run.update({
                "completed_at": now.isoformat(),
                "status": "success",
                "findings_processed": findings_processed,
                "duration_seconds": (now - datetime.fromisoformat(last_run["started_at"])).total_seconds()
            })
        
        return self.update_status(
            last_successful_run=now.isoformat(),
            consecutive_failures=0
        )
    
    def record_run_failure(self, error_message: str) -> bool:
        """Record failed scheduler run"""
        now = datetime.now()
        
        # Update the last run record
        if self.data["run_history"]:
            last_run = self.data["run_history"][-1]
            last_run.update({
                "completed_at": now.isoformat(),
                "status": "failed",
                "errors": [error_message],
                "duration_seconds": (now - datetime.fromisoformat(last_run["started_at"])).total_seconds()
            })
        
        consecutive_failures = self.data["scheduler_status"]["consecutive_failures"] + 1
        
        return self.update_status(
            last_failed_run=now.isoformat(),
            consecutive_failures=consecutive_failures
        )
    
    def calculate_next_run(self, interval_minutes: int) -> Optional[str]:
        """Calculate next run time based on interval"""
        if not self.data["scheduler_status"]["is_running"]:
            return None
        
        last_run = self.data["scheduler_status"]["last_run"]
        if not last_run:
            return None
        
        try:
            last_run_dt = datetime.fromisoformat(last_run)
            next_run_dt = last_run_dt + timedelta(minutes=interval_minutes)
            return next_run_dt.isoformat()
        except Exception as e:
            logger.error(f"Error calculating next run time: {e}")
            return None
    
    def update_next_run(self, interval_minutes: int) -> bool:
        """Update next run time"""
        next_run = self.calculate_next_run(interval_minutes)
        return self.update_status(next_run=next_run)
    
    def get_run_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent run history"""
        return self.data["run_history"][-limit:] if self.data["run_history"] else []
    
    def get_configuration(self) -> Dict[str, Any]:
        """Get scheduler configuration"""
        return self.data["configuration"].copy()
    
    def update_configuration(self, **kwargs) -> bool:
        """Update scheduler configuration"""
        try:
            for key, value in kwargs.items():
                if key in self.data["configuration"]:
                    self.data["configuration"][key] = value
                else:
                    logger.warning(f"Unknown configuration field: {key}")
            
            return self._save_data()
        except Exception as e:
            logger.error(f"Error updating scheduler configuration: {e}")
            return False
    
    def should_auto_restart(self) -> bool:
        """Check if scheduler should auto-restart after failures"""
        config = self.data["configuration"]
        status = self.data["scheduler_status"]
        
        if not config.get("auto_restart_on_failure", True):
            return False
        
        max_failures = config.get("max_consecutive_failures", 5)
        return status.get("consecutive_failures", 0) < max_failures
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get scheduler health status"""
        status = self.data["scheduler_status"]
        config = self.data["configuration"]
        
        health = {
            "is_healthy": True,
            "issues": [],
            "recommendations": []
        }
        
        # Check for consecutive failures
        if status.get("consecutive_failures", 0) > 0:
            health["issues"].append(f"Consecutive failures: {status['consecutive_failures']}")
            if status["consecutive_failures"] >= config.get("max_consecutive_failures", 5):
                health["is_healthy"] = False
                health["recommendations"].append("Consider checking logs for recurring errors")
        
        # Check if scheduler has been running for too long without activity
        if status.get("is_running") and status.get("last_run"):
            try:
                last_run = datetime.fromisoformat(status["last_run"])
                hours_since_last_run = (datetime.now() - last_run).total_seconds() / 3600
                if hours_since_last_run > 24:  # More than 24 hours
                    health["issues"].append(f"No runs in {hours_since_last_run:.1f} hours")
                    health["recommendations"].append("Check if scheduler is stuck")
            except Exception:
                pass
        
        return health

# Global scheduler data manager instance
scheduler_data = SchedulerDataManager()

# =============================================================================
# SCHEDULER OPERATIONS
# =============================================================================

# Global scheduler instance
_scheduler_instance = None
_fallback_thread = None
_shutdown_event = Event()

def create_scheduler():
    """Create and configure a scheduler instance"""
    global _scheduler_instance
    
    if not APSCHEDULER_AVAILABLE:
        logger.warning("APScheduler not available, using fallback scheduler")
        _scheduler_instance = BackgroundScheduler()
        return _scheduler_instance
    
    try:
        scheduler = BackgroundScheduler()
        _scheduler_instance = scheduler
        logger.info("APScheduler created successfully")
        return scheduler
    except Exception as e:
        logger.error(f"Error creating APScheduler: {e}")
        _scheduler_instance = BackgroundScheduler()
        return _scheduler_instance

def start_automated_scanning():
    """Start automated scanning with configured interval"""
    global _scheduler_instance, _fallback_thread
    
    # Get latest interval from .env file directly
    import os
    from dotenv import load_dotenv
    load_dotenv('.env')
    current_interval = int(os.getenv('SCAN_INTERVAL_MINUTES', config.SCAN_INTERVAL_MINUTES))
    
    if not config.ENABLE_AUTOMATIC_SCANNING:
        logger.info("Automatic scanning is disabled in configuration")
        scheduler_data.update_status(enabled=False, is_running=False)
        return None
    
    try:
        scheduler = create_scheduler()
        scheduler_type = 'APScheduler' if APSCHEDULER_AVAILABLE else 'Fallback'
        
        if APSCHEDULER_AVAILABLE and hasattr(scheduler, 'add_job'):
            # Use APScheduler for proper scheduling
            from core_operations import scan_all_hashes
            
            interval_minutes = current_interval
            
            scheduler.add_job(
                func=scan_all_hashes,
                trigger=IntervalTrigger(minutes=interval_minutes),
                id='automated_scanning',
                name='Automated Domain Scanning',
                replace_existing=True,
                max_instances=1
            )
            
            scheduler.start()
            logger.info(f"Automated scanning started with {interval_minutes}-minute interval using APScheduler")
        else:
            # Use fallback thread-based scheduler
            _fallback_thread = Thread(target=_fallback_scheduler_loop, daemon=True)
            _fallback_thread.start()
            logger.info(f"Automated scanning started with {current_interval}-minute interval using fallback scheduler")
        
        # Update persistent storage
        scheduler_data.start_scheduler(scheduler_type, current_interval)
        scheduler_data.update_next_run(current_interval)
        
        return scheduler
        
    except Exception as e:
        logger.error(f"Error starting automated scanning: {e}")
        scheduler_data.record_run_failure(f"Failed to start scheduler: {str(e)}")
        return None

def stop_automated_scanning():
    """Stop automated scanning"""
    global _scheduler_instance, _fallback_thread, _shutdown_event
    
    try:
        _shutdown_event.set()
        
        if _scheduler_instance and APSCHEDULER_AVAILABLE:
            _scheduler_instance.shutdown(wait=False)
            logger.info("APScheduler stopped")
        
        if _fallback_thread and _fallback_thread.is_alive():
            _fallback_thread.join(timeout=5)
            logger.info("Fallback scheduler thread stopped")
        
        _scheduler_instance = None
        _fallback_thread = None
        
        # Update persistent storage
        scheduler_data.stop_scheduler()
        
        logger.info("Automated scanning stopped")
        return True
        
    except Exception as e:
        logger.error(f"Error stopping automated scanning: {e}")
        scheduler_data.record_run_failure(f"Failed to stop scheduler: {str(e)}")
        return False

def get_scheduler_status():
    """Get current scheduler status and information"""
    global _scheduler_instance
    
    # Get latest interval from .env file directly
    import os
    from dotenv import load_dotenv
    load_dotenv('.env')
    current_interval = int(os.getenv('SCAN_INTERVAL_MINUTES', config.SCAN_INTERVAL_MINUTES))
    
    # Get persistent status data
    persistent_status = scheduler_data.get_status()
    
    # Ensure stored values are in sync with .env file
    if persistent_status.get('interval_minutes') != current_interval:
        scheduler_data.update_status(interval_minutes=current_interval)
        scheduler_data.update_configuration(scan_interval_minutes=current_interval)
        # Refresh persistent status after update
        persistent_status = scheduler_data.get_status()
    
    if not config.ENABLE_AUTOMATIC_SCANNING:
        return {
            'is_running': False,
            'running': False,
            'enabled': False,
            'reason': 'Automatic scanning disabled in configuration',
            'scheduler_type': persistent_status.get('scheduler_type'),
            'interval_minutes': current_interval,
            'interval': current_interval,
            'next_run': format_est_datetime(persistent_status.get('next_run')),
            'last_run': format_est_datetime(persistent_status.get('last_run')),
            'total_runs': persistent_status.get('total_runs', 0),
            'consecutive_failures': persistent_status.get('consecutive_failures', 0),
            'last_successful_run': format_est_datetime(persistent_status.get('last_successful_run')),
            'last_failed_run': format_est_datetime(persistent_status.get('last_failed_run')),
            'jobs': []
        }
    
    if not _scheduler_instance:
        return {
            'is_running': False,
            'running': False,
            'enabled': True,
            'reason': 'Scheduler not started',
            'scheduler_type': persistent_status.get('scheduler_type'),
            'interval_minutes': current_interval,
            'interval': current_interval,
            'next_run': format_est_datetime(persistent_status.get('next_run')),
            'last_run': format_est_datetime(persistent_status.get('last_run')),
            'total_runs': persistent_status.get('total_runs', 0),
            'consecutive_failures': persistent_status.get('consecutive_failures', 0),
            'last_successful_run': format_est_datetime(persistent_status.get('last_successful_run')),
            'last_failed_run': format_est_datetime(persistent_status.get('last_failed_run')),
            'jobs': []
        }
    
    scheduler_type = 'APScheduler' if APSCHEDULER_AVAILABLE else 'Fallback'
    
    try:
        if APSCHEDULER_AVAILABLE and hasattr(_scheduler_instance, 'get_jobs'):
            jobs = _scheduler_instance.get_jobs()
            job_info = []
            next_run = None
            
            for job in jobs:
                job_data = {
                    'id': job.id,
                    'name': job.name,
                    'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None
                }
                job_info.append(job_data)
                
                if job.next_run_time and (not next_run or job.next_run_time < next_run):
                    next_run = job.next_run_time
            
            # Update next_run in persistent storage if we have a better prediction
            if next_run:
                scheduler_data.update_status(next_run=next_run.isoformat())
            
            return {
                'is_running': _scheduler_instance.running,
                'running': _scheduler_instance.running,
                'enabled': True,
                'reason': 'Running normally',
                'scheduler_type': scheduler_type,
                'interval_minutes': current_interval,
                'interval': current_interval,
                'next_run': format_est_datetime(next_run) if next_run else format_est_datetime(persistent_status.get('next_run')),
                'last_run': persistent_status.get('last_run'),
                'total_runs': persistent_status.get('total_runs', 0),
                'consecutive_failures': persistent_status.get('consecutive_failures', 0),
                'last_successful_run': persistent_status.get('last_successful_run'),
                'last_failed_run': persistent_status.get('last_failed_run'),
                'jobs': job_info
            }
        else:
            # Fallback scheduler - update next run prediction
            if persistent_status.get('is_running'):
                scheduler_data.update_next_run(current_interval)
            
            is_running = _fallback_thread.is_alive() if _fallback_thread else False
            return {
                'is_running': is_running,
                'running': is_running,
                'enabled': True,
                'reason': 'Running with fallback scheduler',
                'scheduler_type': scheduler_type,
                'interval_minutes': current_interval,
                'interval': current_interval,
                'next_run': persistent_status.get('next_run'),
                'last_run': persistent_status.get('last_run'),
                'total_runs': persistent_status.get('total_runs', 0),
                'consecutive_failures': persistent_status.get('consecutive_failures', 0),
                'last_successful_run': persistent_status.get('last_successful_run'),
                'last_failed_run': persistent_status.get('last_failed_run'),
                'jobs': [{'id': 'fallback_scan', 'name': 'Fallback Automated Scanning'}]
            }
            
    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        return {
            'is_running': False,
            'running': False,
            'enabled': True,
            'reason': f'Error checking status: {str(e)}',
            'scheduler_type': scheduler_type,
            'interval_minutes': current_interval,
            'interval': current_interval,
            'next_run': format_est_datetime(persistent_status.get('next_run')),
            'last_run': format_est_datetime(persistent_status.get('last_run')),
            'total_runs': persistent_status.get('total_runs', 0),
            'consecutive_failures': persistent_status.get('consecutive_failures', 0),
            'last_successful_run': format_est_datetime(persistent_status.get('last_successful_run')),
            'last_failed_run': format_est_datetime(persistent_status.get('last_failed_run')),
            'jobs': []
        }

def _fallback_scheduler_loop():
    """Fallback scheduler loop for when APScheduler is not available"""
    global _shutdown_event
    
    logger.info("Starting fallback scheduler loop")
    
    while not _shutdown_event.is_set():
        try:
            # Record run start
            scheduler_data.record_run_start()
            
            # Import here to avoid circular imports
            from core_operations import scan_all_hashes
            
            # Run the scan
            logger.info("Starting automated scan (fallback scheduler)")
            scan_all_hashes()
            
            # Record successful run
            scheduler_data.record_run_success()
            logger.info("Automated scan completed successfully")
            
        except Exception as e:
            logger.error(f"Error in fallback scheduler loop: {e}")
            scheduler_data.record_run_failure(str(e))
        
        # Wait for the configured interval
        interval_seconds = config.SCAN_INTERVAL_MINUTES * 60
        if _shutdown_event.wait(interval_seconds):
            break
    
    logger.info("Fallback scheduler loop stopped")

def trigger_immediate_scan():
    """Trigger an immediate scan"""
    try:
        logger.info("Triggering immediate scan")
        scheduler_data.record_run_start()
        
        from core_operations import scan_all_hashes
        scan_all_hashes()
        
        scheduler_data.record_run_success()
        logger.info("Immediate scan completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error in immediate scan: {e}")
        scheduler_data.record_run_failure(str(e))
        return False

def update_scan_interval(new_interval_minutes: int):
    """Update the scan interval"""
    try:
        if new_interval_minutes < 1:
            raise ValueError("Scan interval must be at least 1 minute")
        
        logger.info(f"Updating scan interval to {new_interval_minutes} minutes")
        
        # Update configuration
        config.SCAN_INTERVAL_MINUTES = new_interval_minutes
        
        # Also update the environment variable and .env file for consistency
        import os
        os.environ['SCAN_INTERVAL_MINUTES'] = str(new_interval_minutes)
        
        # Update .env file
        try:
            env_file = '.env'
            if os.path.exists(env_file):
                # Read current .env file
                with open(env_file, 'r') as f:
                    lines = f.readlines()
                
                # Update SCAN_INTERVAL_MINUTES line
                updated = False
                for i, line in enumerate(lines):
                    if line.startswith('SCAN_INTERVAL_MINUTES='):
                        lines[i] = f'SCAN_INTERVAL_MINUTES={new_interval_minutes}\n'
                        updated = True
                        break
                
                # If not found, add it
                if not updated:
                    lines.append(f'SCAN_INTERVAL_MINUTES={new_interval_minutes}\n')
                
                # Write back to .env file
                with open(env_file, 'w') as f:
                    f.writelines(lines)
                
                logger.info(f"Updated .env file with SCAN_INTERVAL_MINUTES={new_interval_minutes}")
        except Exception as e:
            logger.warning(f"Failed to update .env file: {e}")
        
        # Update persistent storage - both status and configuration
        scheduler_data.update_configuration(scan_interval_minutes=new_interval_minutes)
        scheduler_data.update_status(interval_minutes=new_interval_minutes)
        
        # Restart scheduler with new interval
        if _scheduler_instance:
            stop_automated_scanning()
            time.sleep(1)  # Brief pause
            new_scheduler = start_automated_scanning()
            if new_scheduler:
                logger.info(f"Scan interval updated to {new_interval_minutes} minutes")
                return True
            else:
                logger.error("Failed to restart scheduler with new interval")
                return False
        else:
            logger.info(f"Scan interval updated to {new_interval_minutes} minutes (scheduler not running)")
            return True
            
    except Exception as e:
        logger.error(f"Error updating scan interval: {e}")
        return False

def get_scheduler_logs(limit: int = 50):
    """Get scheduler logs"""
    try:
        # Get run history from persistent storage
        run_history = scheduler_data.get_run_history(limit)
        
        # Add some basic logs
        logs = []
        
        status = get_scheduler_status()
        logs.append({
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'message': f"Scheduler status: {status['reason']}",
            'details': {
                'is_running': status['is_running'],
                'scheduler_type': status['scheduler_type'],
                'total_runs': status.get('total_runs', 0),
                'consecutive_failures': status.get('consecutive_failures', 0)
            }
        })
        
        # Add run history
        for run in run_history:
            logs.append({
                'timestamp': run['started_at'],
                'level': 'INFO' if run['status'] == 'success' else 'ERROR',
                'message': f"Scan run {run['run_id']}: {run['status']}",
                'details': run
            })
        
        return logs
        
    except Exception as e:
        logger.error(f"Error getting scheduler logs: {e}")
        return [{
            'timestamp': datetime.now().isoformat(),
            'level': 'ERROR',
            'message': f"Error getting logs: {str(e)}",
            'details': {}
        }]

def get_scheduler_health():
    """Get scheduler health status"""
    try:
        return scheduler_data.get_health_status()
    except Exception as e:
        logger.error(f"Error getting scheduler health: {e}")
        return {
            'is_healthy': False,
            'issues': [f"Error checking health: {str(e)}"],
            'recommendations': ['Check logs for more details']
        }

# =============================================================================
# SCHEDULER ENDPOINTS
# =============================================================================

# Create blueprint for scheduler endpoints
scheduler_bp = Blueprint('scheduler', __name__)

@scheduler_bp.route('/status', methods=['GET'])
def get_status_endpoint():
    """Get current scheduler status"""
    try:
        status = get_scheduler_status()
        return jsonify({'success': True, 'status': status})
        
    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@scheduler_bp.route('/start', methods=['POST'])
def start_scheduler_endpoint():
    """Start the automated scheduler"""
    try:
        scheduler = start_automated_scanning()
        
        if scheduler:
            logger.info("Scheduler started via API")
            return jsonify({'success': True, 'message': 'Automated scanning started successfully'})
        else:
            logger.warning("Failed to start scheduler via API")
            return jsonify({'success': False, 'message': 'Failed to start automated scanning'})
            
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@scheduler_bp.route('/stop', methods=['POST'])
def stop_scheduler_endpoint():
    """Stop the automated scheduler"""
    try:
        stop_automated_scanning()
        logger.info("Scheduler stopped via API")
        return jsonify({'success': True, 'message': 'Automated scanning stopped successfully'})
        
    except Exception as e:
        logger.error(f"Error stopping scheduler: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@scheduler_bp.route('/trigger_scan', methods=['POST'])
def trigger_scan_endpoint():
    """Trigger an immediate scan outside of the regular schedule"""
    try:
        result = trigger_immediate_scan()
        
        if result:
            logger.info("Immediate scan triggered via API")
            return jsonify({'success': True, 'message': 'Immediate scan completed successfully'})
        else:
            logger.error("Immediate scan failed via API")
            return jsonify({'success': False, 'message': 'Immediate scan failed'})
            
    except Exception as e:
        logger.error(f"Error triggering immediate scan: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@scheduler_bp.route('/update_interval', methods=['POST'])
def update_interval_endpoint():
    """Update the scanning interval"""
    try:
        data = request.json
        new_interval = data.get('interval_minutes')
        
        if not new_interval:
            return jsonify({'success': False, 'message': 'interval_minutes is required'})
        
        try:
            new_interval = int(new_interval)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'interval_minutes must be a valid integer'})
        
        success = update_scan_interval(new_interval)
        
        if success:
            logger.info(f"Scan interval updated via API to {new_interval} minutes")
            return jsonify({'success': True, 'message': f'Scan interval updated to {new_interval} minutes'})
        else:
            logger.warning(f"Failed to update scan interval via API to {new_interval} minutes")
            return jsonify({'success': False, 'message': 'Failed to update scan interval'})
            
    except Exception as e:
        logger.error(f"Error updating scan interval: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@scheduler_bp.route('/logs', methods=['GET'])
def get_logs_endpoint():
    """Get recent scheduler logs"""
    try:
        limit = request.args.get('limit', 50)
        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 50
        
        logs = get_scheduler_logs(limit)
        return jsonify({'success': True, 'logs': logs})
        
    except Exception as e:
        logger.error(f"Error getting scheduler logs: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@scheduler_bp.route('/config', methods=['GET'])
def get_config_endpoint():
    """Get current scheduler configuration"""
    try:
        scheduler_config = {
            'automatic_scanning_enabled': config.ENABLE_AUTOMATIC_SCANNING,
            'scan_interval_minutes': config.SCAN_INTERVAL_MINUTES,
            'max_concurrent_scans': config.MAX_CONCURRENT_SCANS,
            'max_results_per_scan': config.MAX_RESULTS_PER_SCAN
        }
        
        return jsonify({'success': True, 'config': scheduler_config})
        
    except Exception as e:
        logger.error(f"Error getting scheduler config: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@scheduler_bp.route('/config', methods=['POST'])
def update_config_endpoint():
    """Update scheduler configuration"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'success': False, 'message': 'Configuration data is required'})
        
        updated_settings = []
        
        # Update interval if provided
        if 'scan_interval_minutes' in data:
            try:
                new_interval = int(data['scan_interval_minutes'])
                success = update_scan_interval(new_interval)
                if success:
                    updated_settings.append(f"Scan interval: {new_interval} minutes")
                else:
                    return jsonify({'success': False, 'message': 'Failed to update interval'})
            except (ValueError, TypeError):
                return jsonify({'success': False, 'message': 'scan_interval_minutes must be a valid integer'})
        
        # Update other settings (runtime only)
        if 'automatic_scanning_enabled' in data:
            enabled = bool(data['automatic_scanning_enabled'])
            config.ENABLE_AUTOMATIC_SCANNING = enabled
            updated_settings.append(f"Automatic scanning: {'enabled' if enabled else 'disabled'}")
        
        if 'max_concurrent_scans' in data:
            try:
                max_scans = int(data['max_concurrent_scans'])
                config.MAX_CONCURRENT_SCANS = max_scans
                updated_settings.append(f"Max concurrent scans: {max_scans}")
            except (ValueError, TypeError):
                return jsonify({'success': False, 'message': 'max_concurrent_scans must be a valid integer'})
        
        if 'max_results_per_scan' in data:
            try:
                max_results = int(data['max_results_per_scan'])
                config.MAX_RESULTS_PER_SCAN = max_results
                updated_settings.append(f"Max results per scan: {max_results}")
            except (ValueError, TypeError):
                return jsonify({'success': False, 'message': 'max_results_per_scan must be a valid integer'})
        
        if updated_settings:
            message = f"Configuration updated: {', '.join(updated_settings)}"
            logger.info(f"Scheduler configuration updated via API: {message}")
            return jsonify({'success': True, 'message': message})
        else:
            return jsonify({'success': False, 'message': 'No valid configuration changes provided'})
        
    except Exception as e:
        logger.error(f"Error updating scheduler config: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@scheduler_bp.route('/purge-findings', methods=['POST'])
def purge_old_findings_endpoint():
    """Manually trigger purge of old findings"""
    try:
        from findings_operations import FindingsManager
        
        findings_manager = FindingsManager()
        days_old = request.json.get('days_old', 90) if request.is_json else 90
        
        purged_count = findings_manager.purge_old_findings(days_old=days_old)
        
        return jsonify({
            'success': True,
            'message': f'Successfully purged {purged_count} findings older than {days_old} days',
            'purged_count': purged_count,
            'days_old': days_old
        })
        
    except Exception as e:
        logger.error(f"Error in purge findings endpoint: {e}")
        return jsonify({
            'success': False,
            'message': f'Error purging findings: {str(e)}'
        }), 500

# =============================================================================
# EXPORTS
# =============================================================================

# Export the blueprint
__all__ = [
    'scheduler_bp',
    'get_scheduler_status',
    'start_automated_scanning',
    'stop_automated_scanning',
    'trigger_immediate_scan',
    'update_scan_interval',
    'get_scheduler_logs',
    'get_scheduler_health',
    'SchedulerDataManager'
]
