from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file, send_from_directory
from config import current_config as config
from logger import get_app_logger, log_dt_scan_start, log_dt_scan_complete, log_app_error, log_scheduler_event

from constants import (
    DOMAINTOOLS_FIELDS, THREAT_CATEGORIES, RISK_SCORE_THRESHOLDS, 
    FINDING_STATUSES, CSV_EXPORT_COLUMNS, get_domaintools_field_keys, 
    get_rule_condition_fields
)
from datetime import datetime
import os
import json
from core_operations import ScanActivityManager

app = Flask(__name__)

# Configure static folders to serve data files
app.static_folder = 'static'
app.add_url_rule('/data/<path:filename>', 'data_file', lambda filename: send_from_directory('data', filename))

# Initialize components with proper dependency injection
logger = get_app_logger()
scan_activity = ScanActivityManager()

# Initialize scheduler but don't auto-start
# Let users control scheduler start/stop from the UI
try:
    from scheduler import get_scheduler_status
    scheduler_status = get_scheduler_status()
    if scheduler_status.get('is_running'):
        log_scheduler_event("status_check", "Scheduler is already running")
    else:
        log_scheduler_event("status_check", "Scheduler is stopped - users can start it from the UI")
except Exception as e:
    logger.error(f"Error checking scheduler status: {e}")

# Register blueprints
from core_operations import hash_bp, findings_bp, scanning_bp, utils_bp, tag_bp
from phishlabs import phishlabs_bp
from scheduler import scheduler_bp
from asrm import asrm_bp, asrm_modern_bp


# Import operations functions
from core_operations import (
    get_hash_stats, get_all_hashes, add_hash, update_hash, 
    delete_hash, get_hash_by_id
)
from core_operations import FindingsManager
from core_operations import scan_specific_hash, scan_all_hashes, get_scan_statistics
from scheduler import get_scheduler_status
from core_operations import export_findings_to_csv

# Initialize findings manager
findings_manager = FindingsManager()

app.register_blueprint(hash_bp, url_prefix='/api/hash')
app.register_blueprint(findings_bp, url_prefix='/api/findings')
app.register_blueprint(phishlabs_bp, url_prefix='/api/phishlabs')
app.register_blueprint(scanning_bp, url_prefix='/api/scanning')
app.register_blueprint(scheduler_bp, url_prefix='/api/scheduler')
app.register_blueprint(utils_bp, url_prefix='/api/utils')
app.register_blueprint(asrm_bp, url_prefix='/api/asrm')
app.register_blueprint(asrm_modern_bp)  # Modern ASRM endpoints with /api/asrm/v2 prefix
app.register_blueprint(tag_bp, url_prefix='/api/tags')


def get_user_friendly_error_message(error_str):
    """Convert technical error messages to user-friendly ones"""
    error_lower = error_str.lower()
    
    # API authentication errors
    if '403' in error_str and 'forbidden' in error_lower:
        return "Authentication failed. Please check your DomainTools API credentials."
    elif '401' in error_str and 'unauthorized' in error_lower:
        return "Invalid API credentials. Please verify your username and API key."
    elif '429' in error_str:
        return "API rate limit exceeded. Please wait a moment before trying again."
    
    # Network errors
    elif 'timeout' in error_str:
        return "Request timed out. Please check your internet connection and try again."
    elif 'connection' in error_str:
        return "Connection failed. Please check your internet connection."
    
    # DomainTools specific errors
    elif 'domaintools' in error_lower and 'api' in error_lower:
        return "DomainTools API error. Please check your credentials and try again."
    
    # Generic errors
    elif 'scan failed' in error_lower:
        return "Scan operation failed. Please try again or contact support if the problem persists."
    elif 'api call failed' in error_lower:
        return "External service error. Please try again later."
    
    # Default fallback
    else:
        return "An unexpected error occurred. Please try again or contact support."

@app.route('/debug_settings')
def debug_settings():
    """Debug settings page for troubleshooting"""
    return send_file('debug_settings.html', mimetype='text/html')

@app.route('/search_hashes.json')
def serve_search_hashes():
    """Serve search_hashes.json file"""
    try:
        return send_file(config.HASHES_FILE, mimetype='application/json')
    except FileNotFoundError:
        return jsonify([]), 404

@app.route('/ASRM.json')
def serve_asrm_rules():
    """Serve ASRM.json file"""
    try:
        return send_file(config.ASRM_FILE, mimetype='application/json')
    except FileNotFoundError:
        return jsonify([]), 404

@app.route('/filter_test')
def filter_test():
    """Filter test page for debugging"""
    try:
        # Load findings data for testing
        findings = findings_manager.get_findings()
        return render_template('filter_test.html', findings=findings)
    except Exception as e:
        logger.error(f"Error loading filter test page: {e}")
        return render_template('filter_test.html', findings=[])

@app.route('/comprehensive_test')
def comprehensive_test():
    """Comprehensive filter test page"""
    try:
        findings = findings_manager.get_findings()
        return render_template('comprehensive_test.html', findings=findings)
    except Exception as e:
        logger.error(f"Error loading comprehensive test page: {e}")
        return render_template('comprehensive_test.html', findings=[])

@app.route('/real_filter_test')
def real_filter_test():
    """Real filter test using actual JavaScript logic"""
    try:
        findings = findings_manager.get_findings()
        return render_template('real_filter_test.html', findings=findings)
    except Exception as e:
        logger.error(f"Error loading real filter test page: {e}")
        return render_template('real_filter_test.html', findings=[])

@app.route('/')
def index():
    """Main dashboard page"""
    try:
        # Get statistics
        stats = findings_manager.get_findings_stats()
        hash_stats = get_hash_stats()
        phishlabs_stats = findings_manager.get_phishlabs_submission_stats()
        
        # Get scheduler status
        scheduler_status = get_scheduler_status()
        
        return render_template('index.html', 
                             stats=stats, 
                             hash_stats=hash_stats,
                             phishlabs_stats=phishlabs_stats,
                             scheduler_status=scheduler_status,
                             config=config)
    except Exception as e:
        logger.error(f"Error loading dashboard: {e}")
        return render_template('error.html', error=str(e))

@app.route('/hashes')
def manage_hashes():
    """Manage search hashes page"""
    try:
        hashes = get_all_hashes()
        return render_template('hashes.html', hashes=hashes)
    except Exception as e:
        logger.error(f"Error loading hashes page: {e}")
        return render_template('hashes.html', hashes=[])


def get_scan_activity():
    """Get recent scan activities"""
    try:
        return scan_activity.get_recent_activities(limit=10)
    except Exception as e:
        logger.error(f"Error getting scan activity: {e}")
        return []

def get_scheduler_data():
    """Get scheduler data for backward compatibility"""
    try:
        return scan_activity.get_status()
    except Exception as e:
        logger.error(f"Error getting scheduler data: {e}")
        return {}

@app.route('/api/scan/full', methods=['POST'])
def api_full_scan():
    """Execute full scan across all active hashes"""
    try:
        # Record scan start
        scan_activity.add_scan_activity({
            'scan_type': 'manual_full',
            'status': 'started'
        })
        
        # Get all active hashes
        hashes = get_all_hashes()
        active_hashes = [h for h in hashes if h.get('active', True)]
        
        if not active_hashes:
            return jsonify({
                'success': False,
                'message': 'No active hashes found for scanning'
            }), 400
        
        # Import scanning operations
        from domaintools import scan_all_hashes
        
        # Execute the scan
        results = scan_all_hashes(active_hashes)
        
        # Record scan completion
        findings_count = results.get('total_findings_saved', 0)
        scan_activity.add_scan_activity({
            'scan_type': 'manual_full',
            'status': 'completed',
            'findings_count': findings_count
        })
        
        return jsonify({
            'success': True,
            'message': f'Full scan completed successfully',
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Error executing full scan: {e}")
        
        # Record scan failure
        scan_activity.add_scan_activity({
            'scan_type': 'manual_full',
            'status': 'failed',
            'error_message': str(e)
        })
        
        return jsonify({
            'success': False,
            'message': f'Full scan failed: {str(e)}'
        }), 500

@app.route('/api/scan/single', methods=['POST'])
def api_single_scan():
    """Execute scan for a single hash"""
    try:
        data = request.get_json()
        hash_id = data.get('hash_id')
        
        if not hash_id:
            return jsonify({
                'success': False,
                'message': 'Hash ID is required'
            }), 400
        
        # Record scan start
        scan_activity.add_scan_activity({
            'scan_type': 'manual_single',
            'hash_id': hash_id,
            'status': 'started'
        })
        
        # Get the specific hash
        hashes = get_all_hashes()
        target_hash = next((h for h in hashes if h.get('id') == hash_id), None)
        
        if not target_hash:
            return jsonify({
                'success': False,
                'message': f'Hash {hash_id} not found'
            }), 404
        
        # Import scanning operations
        from domaintools import scan_single_hash
        
        # Execute the scan
        results = scan_single_hash(target_hash)
        
        # Record scan completion
        findings_count = results.get('findings_count', 0)
        scan_activity.add_scan_activity({
            'scan_type': 'manual_single',
            'hash_id': hash_id,
            'status': 'completed',
            'findings_count': findings_count
        })
        
        return jsonify({
            'success': True,
            'message': f'Single hash scan completed successfully',
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Error executing single scan: {e}")
        
        # Record scan failure
        scan_activity.add_scan_activity({
            'scan_type': 'manual_single',
            'hash_id': hash_id,
            'status': 'failed',
            'error_message': str(e)
        })
        
        return jsonify({
            'success': False,
            'message': f'Single scan failed: {str(e)}'
        }), 500

@app.route('/api/scan/schedule', methods=['POST'])
def api_schedule_scan():
    """Schedule a scan for a specific hash"""
    try:
        data = request.get_json()
        hash_id = data.get('hash_id')
        interval_minutes = data.get('interval_minutes', 60)  # Default 1 hour
        
        if not hash_id:
            return jsonify({
                'success': False,
                'message': 'Hash ID is required'
            }), 400
        
        # Get the specific hash
        hashes = get_all_hashes()
        target_hash = next((h for h in hashes if h.get('id') == hash_id), None)
        
        if not target_hash:
            return jsonify({
                'success': False,
                'message': f'Hash {hash_id} not found'
            }), 404
        
        # For now, we'll just record this as a scheduled activity
        # In a full implementation, this would integrate with the scheduler
        scan_activity.add_scan_activity({
            'scan_type': 'scheduled',
            'hash_id': hash_id,
            'status': 'started'
        })
        
        return jsonify({
            'success': True,
            'message': f'Hash {hash_id} scheduled for scanning every {interval_minutes} minutes',
            'hash_id': hash_id,
            'interval_minutes': interval_minutes
        })
        
    except Exception as e:
        logger.error(f"Error scheduling scan: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to schedule scan: {str(e)}'
        }), 500

@app.route('/api/status')
def api_system_status():
    """Get system status for all components"""
    try:
        # Test DomainTools connection
        api_status = _test_domaintools_connection()
        
        # Get scheduler status
        scheduler_status = get_scheduler_status()
        
        # Test PhishLabs connection
        phishlabs_status = _test_phishlabs_connection()
        
        # Determine DomainTools API status based on actual response
        if isinstance(api_status, tuple):
            # Function returns (success: bool, result: dict)
            dt_connected = api_status[0]
        elif isinstance(api_status, dict):
            # Function returns dict with 'connected' key
            dt_connected = api_status.get('connected', False)
        else:
            dt_connected = False
        
        # Determine PhishLabs API status based on actual response
        if isinstance(phishlabs_status, tuple):
            # Function returns (success: bool, result: dict)
            pl_connected = phishlabs_status[0]
        elif isinstance(phishlabs_status, dict):
            # Function returns dict with 'connected' key
            pl_connected = phishlabs_status.get('connected', False)
        else:
            pl_connected = False
        
        return jsonify({
            'api_status': 'Connected' if dt_connected else 'Disconnected',
            'scheduler_status': 'Running' if scheduler_status.get('is_running') else 'Stopped',
            'phishlabs_status': 'Connected' if pl_connected else 'Disconnected'
        })
        
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        return jsonify({
            'api_status': 'Error',
            'scheduler_status': 'Error',
            'phishlabs_status': 'Error'
        })

@app.route('/api/scan/history', methods=['GET', 'DELETE'])
def api_scan_history():
    """Get or clear scan history"""
    try:
        if request.method == 'DELETE':
            # Clear scan history
            success = scan_activity.clear_all_activities()
            if success:
                        return jsonify({
                            'success': True,
                            'message': 'Scan history cleared successfully'
                        })
            else:
                    return jsonify({
                        'success': False,
                        'message': 'Failed to clear scan history'
                }), 500
        else:
            # Get scan history
            activities = scan_activity.get_recent_activities(limit=50)
            return jsonify({
                'success': True,
                'activities': activities
            })
        
    except Exception as e:
        logger.error(f"Error with scan history: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/scan/history/export')
def api_export_scan_history():
    """Export scan history as JSON"""
    try:
        activities = scan_activity.get_recent_activities(limit=1000)
        
        # Create export data
        export_data = {
            'export_date': datetime.now().isoformat(),
            'total_activities': len(activities),
            'activities': activities
        }
        
        # Create temporary file
        import tempfile
        import json
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(export_data, f, indent=2)
            temp_file = f.name
        
        return send_file(temp_file, as_attachment=True, download_name=f'scan_history_{datetime.now().strftime("%Y%m%d")}.json')
        
    except Exception as e:
        logger.error(f"Error exporting scan history: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

def _test_domaintools_connection():
    """Test DomainTools API connection"""
    try:
        # Call the actual test function from domaintools module
        import domaintools
        success, result = domaintools.test_domaintools_connection()
        return success, result
    except Exception as e:
        logger.error(f"DomainTools connection test failed: {e}")
        return False, {'error': str(e)}

def _test_phishlabs_connection():
    """Test PhishLabs API connection"""
    try:
        # Call the actual test function from phishlabs module
        import phishlabs
        success, result = phishlabs.test_phishlabs_connection()
        return success, result
    except Exception as e:
        logger.error(f"PhishLabs connection test failed: {e}")
        return False, {'error': str(e)}

@app.route('/review')
def review_findings():
    """Review findings page"""
    try:
        findings = findings_manager.get_all_findings()
        
        # Create a mapping of hash IDs to hash names for the filter dropdown
        hashes = get_all_hashes()
        hash_names = {hash_obj['id']: hash_obj['name'] for hash_obj in hashes}
        
        # Extract unique values from findings for dynamic filters
        unique_statuses = list(set(finding.get('status', 'pending') for finding in findings))
        unique_registrars = list(set(finding.get('registrar', 'Unknown') for finding in findings if finding.get('registrar')))
        unique_countries = list(set(finding.get('ip_country', 'Unknown') for finding in findings if finding.get('ip_country')))
        
        # Extract unique tags from all findings
        all_tags = []
        for finding in findings:
            tags = finding.get('tags', [])
            if isinstance(tags, list):
                all_tags.extend(tags)
        unique_tags = list(set(all_tags))
        
        # Sort the lists for better UX
        unique_statuses.sort()
        unique_registrars.sort()
        unique_countries.sort()
        unique_tags.sort()
        
        return render_template('review.html', 
                             findings=findings, 
                             hash_names=hash_names, 
                             total_findings=len(findings),
                             unique_statuses=unique_statuses,
                             unique_registrars=unique_registrars,
                             unique_countries=unique_countries,
                             unique_tags=unique_tags)
    except Exception as e:
        logger.error(f"Error loading review page: {e}")
        return render_template('review.html', 
                             findings=[], 
                             hash_names={}, 
                             total_findings=0,
                             unique_statuses=[],
                             unique_registrars=[],
                             unique_countries=[])

@app.route('/settings')
def settings_page():
    """Settings page with sidebar navigation"""
    try:
        # Load tags from tags.json file
        try:
            from tag_operations import get_all_tags
            tags = get_all_tags()
        except Exception as e:
            logger.warning(f"Could not load tags: {e}")
            tags = []
        
        # Load current settings from .env file
        config = {}
        env_file_path = os.path.join(os.path.dirname(__file__), '.env')
        if os.path.exists(env_file_path):
            with open(env_file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        # Remove comments from value
                        if '#' in value:
                            value = value.split('#')[0].strip()
                        config[key] = value
        
        # Create response with cache-busting headers
        from flask import make_response
        response = make_response(render_template('settings.html', page_title='Settings', tags=tags, config=config))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except Exception as e:
        logger.error(f"Error loading settings page: {e}")
        return render_template('settings.html', page_title='Settings', tags=[], config={})

    
# API Routes - Hash operations are now handled by the hash blueprint at /api/hash/*

@app.route('/api/run_scan', methods=['POST'])
def run_scan():
    """Trigger manual scan - can be single hash or all active hashes"""
    try:
        data = request.json
        hash_id = data.get('hash_id')  # If None, scan all active hashes
        
        if hash_id:
            # Scan single hash
            hash_obj = get_hash_by_id(hash_id)
            if not hash_obj:
                return jsonify({'success': False, 'message': 'Hash not found'})
            
            log_dt_scan_start(hash_obj['name'], hash_id)
            start_time = datetime.now()
            
            from scanning_operations import scan_specific_hash
            success, message, new_findings = scan_specific_hash(hash_id)
            if not success:
                return jsonify({'success': False, 'message': message})
            
            duration = (datetime.now() - start_time).total_seconds()
            log_dt_scan_complete(hash_obj['name'], len(new_findings), duration)
            
            return jsonify({
                'success': True,
                'message': f'Scan completed for "{hash_obj["name"]}". Found {len(new_findings)} new domains.',
                'count': len(new_findings)
            })
        else:
            # Scan all active hashes
            log_dt_scan_start("ALL_ACTIVE_HASHES", "batch")
            start_time = datetime.now()
                    
            from core_operations import scan_all_hashes
            successful_scans, total_findings = scan_all_hashes()
                    
            duration = (datetime.now() - start_time).total_seconds()
            log_dt_scan_complete("ALL_ACTIVE_HASHES", total_findings, duration)
            
            return jsonify({
                'success': True,
                'message': f'Scanned all active hashes. Found {total_findings} total new domains.',
                'count': total_findings
            })
            
    except Exception as e:
        log_app_error("ManualScan", str(e))
        # Convert technical error to user-friendly message
        user_message = get_user_friendly_error_message(str(e))
        return jsonify({
            'success': False,
            'message': user_message
        })

@app.route('/api/findings/submit-phishlabs', methods=['POST'])
def submit_finding_to_phishlabs():
    """Submit finding to PhishLabs and update finding with case number"""
    try:
        data = request.json
        finding_id = data.get('finding_id')
        
        if not finding_id:
            return jsonify({'success': False, 'error': 'Missing finding ID'}), 400
        
        # Get finding data
        finding = findings_manager.get_finding_by_id(finding_id)
        if not finding:
            return jsonify({'success': False, 'error': 'Finding not found'}), 404
        
        # Submit to PhishLabs with form data from modal
        from phishlabs import submit_to_phishlabs
        
        # Get form data from request
        brand = data.get('brand', 'Default Brand')
        case_type = data.get('caseType', 'threat')
        threat_type = data.get('threatType', 'phishing')
        threat_category = data.get('threatCategory')
        description = data.get('description', f"Manually submitted finding: {finding.get('domain_name')}")
        malware_type = data.get('malwareType')
        
        submission_data = {
            'domain': finding.get('domain_name'),
            'brand': brand,
            'case_type': case_type,
            'threat_type': threat_type,
            'threat_category': threat_category,
            'description': description,
            'malware_type': malware_type
        }
        
        success, result = submit_to_phishlabs(submission_data)
        
        if success:
            # Extract case number from result
            case_number = result.get('case_id') or result.get('incident_id') or 'N/A'
            
            # Update finding with PhishLabs submission data
            update_data = {
                'pl_submission': True,
                'phishlabs_case_number': case_number,
                'phishlabs_submission_timestamp': result.get('timestamp'),
                'phishlabs_submission_method': 'manual'
            }
            
            updated_finding = findings_manager.update_finding(finding_id, update_data)
            
            if updated_finding:
                return jsonify({
                    'success': True, 
                    'message': 'Finding submitted to PhishLabs successfully',
                    'case_number': case_number
                })
            else:
                return jsonify({'success': False, 'error': 'Failed to update finding with PhishLabs data'}), 500
        else:
            return jsonify({'success': False, 'error': result.get('error', 'PhishLabs submission failed')}), 500
            
    except Exception as e:
        logger.error(f"Error submitting finding to PhishLabs: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/findings/submit-phishlabs-bulk', methods=['POST'])
def submit_findings_to_phishlabs_bulk():
    """Submit multiple findings to PhishLabs and update findings with case numbers"""
    try:
        data = request.json
        findings = data.get('findings', [])
        
        if not findings or len(findings) == 0:
            return jsonify({'success': False, 'error': 'No findings provided'}), 400
        
        # Get form data from request
        brand = data.get('brand', 'Default Brand')
        case_type = data.get('caseType', 'threat')
        threat_type = data.get('threatType', 'phishing')
        threat_category = data.get('threatCategory')
        description = data.get('description', f"Bulk submitted findings")
        malware_type = data.get('malwareType')
        
        case_numbers = []
        successful_submissions = []
        failed_submissions = []
        
        # Submit each finding to PhishLabs
        from phishlabs import submit_to_phishlabs
        
        for finding in findings:
            try:
                submission_data = {
                    'domain': finding.get('domain_name'),
                    'brand': brand,
                    'case_type': case_type,
                    'threat_type': threat_type,
                    'threat_category': threat_category,
                    'description': f"{description} - {finding.get('domain_name')}",
                    'malware_type': malware_type
                }
                
                success, result = submit_to_phishlabs(submission_data)
                
                if success:
                    # Extract case number from result
                    case_number = result.get('case_id') or result.get('incident_id') or 'N/A'
                    case_numbers.append(case_number)
                    
                    # Update finding with PhishLabs submission data
                    update_data = {
                        'pl_submission': True,
                        'phishlabs_case_number': case_number,
                        'phishlabs_submission_timestamp': result.get('timestamp'),
                        'phishlabs_submission_method': 'bulk_manual'
                    }
                    
                    updated_finding = findings_manager.update_finding(finding.get('id'), update_data)
                    
                    if updated_finding:
                        successful_submissions.append(finding.get('domain_name'))
                    else:
                        failed_submissions.append(f"{finding.get('domain_name')}: Failed to update finding")
                else:
                    failed_submissions.append(f"{finding.get('domain_name')}: {result.get('error', 'PhishLabs submission failed')}")
                    
            except Exception as e:
                logger.error(f"Error submitting finding {finding.get('domain_name')} to PhishLabs: {e}")
                failed_submissions.append(f"{finding.get('domain_name')}: {str(e)}")
        
        # Return results
        if successful_submissions:
            response_data = {
                'success': True,
                'message': f'Successfully submitted {len(successful_submissions)} findings to PhishLabs',
                'case_numbers': case_numbers,
                'successful_submissions': successful_submissions
            }
            
            if failed_submissions:
                response_data['failed_submissions'] = failed_submissions
                response_data['message'] += f', {len(failed_submissions)} failed'
            
            return jsonify(response_data)
        else:
            return jsonify({
                'success': False,
                'error': 'All submissions failed',
                'failed_submissions': failed_submissions
            }), 500
            
    except Exception as e:
        logger.error(f"Error submitting findings to PhishLabs: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/findings/update-status', methods=['POST'])
def update_finding_status():
    """Update finding status (approve/reject/hold) - New endpoint"""
    try:
        data = request.json
        finding_id = data.get('id')
        status = data.get('status')  # 'approved', 'rejected', 'on_hold'
        
        if not finding_id or not status:
            return jsonify({'success': False, 'error': 'Missing finding ID or status'}), 400
        
        # Prepare additional data (exclude id and status)
        additional_data = {k: v for k, v in data.items() if k not in ['id', 'status']}
        
        # Update finding status with additional data
        success, message = findings_manager.update_finding_status(finding_id, status, additional_data)
        
        if success:
            return jsonify({'success': True, 'message': message})
        else:
            return jsonify({'success': False, 'error': message}), 400
            
    except Exception as e:
        logger.error(f"Error updating finding status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update_finding', methods=['POST'])
def update_finding():
    """Update finding status (approve/reject/hold) - Legacy endpoint"""
    try:
        data = request.json
        finding_id = data.get('id')
        action = data.get('action')  # 'approve', 'reject', 'hold'
        
        success, message = findings_manager.update_finding_status(finding_id, action)
        
        if success:
            logger.info(f"Finding {finding_id} status updated to: {action}")
            return jsonify({'success': True, 'message': f'Finding {action}ed'})
        else:
            logger.warning(f"Failed to update finding {finding_id} status to: {action}")
            return jsonify({'success': False, 'message': 'Finding not found'})
    except Exception as e:
        logger.error(f"Error updating finding status: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})


@app.route('/api/constants', methods=['GET'])
def get_constants():
    """Get centralized application constants"""
    try:
        return jsonify({
            'success': True,
            'constants': {
                'domaintools_fields': DOMAINTOOLS_FIELDS,
                'threat_categories': THREAT_CATEGORIES,
                'risk_score_thresholds': RISK_SCORE_THRESHOLDS,
                'finding_statuses': FINDING_STATUSES,
                'csv_export_columns': CSV_EXPORT_COLUMNS
            }
        })
    except Exception as e:
        logger.error(f"Error getting constants: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})


def apply_filters_to_findings(findings, filters):
    """Apply frontend filters to findings list"""
    try:
        if not filters:
            return findings
        
        filtered_findings = findings.copy()
        
        for filter_item in filters:
            param = filter_item.get('param')
            operator = filter_item.get('operator')
            value = filter_item.get('value')
            
            if not all([param, operator, value]):
                continue
                
            # Apply filter based on parameter and operator
            if operator == 'equals':
                filtered_findings = [f for f in filtered_findings if str(f.get(param, '')).lower() == str(value).lower()]
            elif operator == 'contains':
                filtered_findings = [f for f in filtered_findings if str(value).lower() in str(f.get(param, '')).lower()]
            elif operator == 'starts_with':
                filtered_findings = [f for f in filtered_findings if str(f.get(param, '')).lower().startswith(str(value).lower())]
            elif operator == 'ends_with':
                filtered_findings = [f for f in filtered_findings if str(f.get(param, '')).lower().endswith(str(value).lower())]
            elif operator == 'greater_than':
                try:
                    filter_value = float(value)
                    filtered_findings = [f for f in filtered_findings if float(f.get(param, 0)) > filter_value]
                except (ValueError, TypeError):
                    continue
            elif operator == 'less_than':
                try:
                    filter_value = float(value)
                    filtered_findings = [f for f in filtered_findings if float(f.get(param, 0)) < filter_value]
                except (ValueError, TypeError):
                    continue
            elif operator == 'is_null':
                filtered_findings = [f for f in filtered_findings if f.get(param) is None or f.get(param) == '']
            elif operator == 'is_not_null':
                filtered_findings = [f for f in filtered_findings if f.get(param) is not None and f.get(param) != '']
        
        return filtered_findings
        
    except Exception as e:
        logger.error(f"Error applying filters: {e}")
        return findings

@app.route('/api/findings/export', methods=['POST'])
def export_findings_simple():
    """Export findings to CSV/JSON with filtering options"""
    try:
        data = request.json or {}
        scope = data.get('scope', 'all')
        selected_ids = data.get('selectedIds', [])
        fields = data.get('fields', [])
        format_type = data.get('format', 'csv')
        filters = data.get('filters', [])
        
        logger.info(f"Export requested - Scope: {scope}, Selected IDs: {len(selected_ids)}, Format: {format_type}, Filters: {len(filters)}")
        
        # Get findings based on scope
        if scope == 'selected' and selected_ids:
            findings = []
            for fid in selected_ids:
                finding = findings_manager.get_finding_by_id(fid)
                if finding:
                    findings.append(finding)
            logger.info(f"Selected findings: {len(findings)}")
        elif scope == 'filtered' and filters:
            # Apply current filters
            all_findings = findings_manager.get_all_findings()
            findings = apply_filters_to_findings(all_findings, filters)
            logger.info(f"Filtered findings: {len(findings)} (from {len(all_findings)} total)")
        else:  # scope == 'all' or no filters
            findings = findings_manager.get_all_findings()
            logger.info(f"All findings: {len(findings)}")
        
        if not findings:
            return jsonify({'success': False, 'message': 'No findings to export'}), 400
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"findings_export_{timestamp}.{format_type}"
        filepath = os.path.join('exports', filename)
        
        os.makedirs('exports', exist_ok=True)
        
        # Export based on format
        if format_type == 'csv':
            success, result = export_findings_to_csv(findings, filepath, fields)
        else:  # JSON
            success, result = export_findings_to_json(findings, filepath, fields)
        
        if success:
            return send_file(filepath, as_attachment=True, download_name=filename)
        else:
            return jsonify({'success': False, 'message': result}), 500
            
    except Exception as e:
        logger.error(f"Error exporting findings: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@app.route('/api/export_csv', methods=['POST'])
def export_csv():
    """Export findings to CSV with advanced filtering"""
    try:
        data = request.json
        scope = data.get('scope', 'all')
        selected_ids = data.get('selectedIds', [])
        fields = data.get('fields', [])
        filters = data.get('filters', [])
        
        # Legacy filters for backward compatibility
        status_filter = data.get('status', 'all')
        risk_filter = data.get('risk', 'all')
        hash_filter = data.get('hash', 'all')
        
        logger.info(f"CSV export requested - Scope: {scope}, Selected IDs: {len(selected_ids)}, Filters: {len(filters)}, Legacy filters - Status: {status_filter}, Risk: {risk_filter}, Hash: {hash_filter}")
        
        # Get findings based on scope
        if scope == 'selected' and selected_ids:
            findings = []
            for fid in selected_ids:
                finding = findings_manager.get_finding_by_id(fid)
                if finding:
                    findings.append(finding)
            logger.info(f"Selected findings: {len(findings)}")
        elif scope == 'filtered' and filters:
            # Apply current filters
            all_findings = findings_manager.get_all_findings()
            findings = apply_filters_to_findings(all_findings, filters)
            logger.info(f"Filtered findings: {len(findings)} (from {len(all_findings)} total)")
        else:
            # Start with all findings
            findings = findings_manager.get_all_findings()
            logger.info(f"Total findings available: {len(findings)}")
            
            # Apply legacy filters if scope is not 'selected' or 'filtered'
            if scope not in ['selected', 'filtered']:
                # Apply status filter
                if status_filter != 'all':
                    findings = [f for f in findings if f.get('status') == status_filter]
                    logger.info(f"After status filter ({status_filter}): {len(findings)} findings")
                
                # Apply risk filter
                if risk_filter != 'all':
                    if risk_filter == 'high':
                        findings = [f for f in findings if f.get('risk_score', 0) >= 80]
                    elif risk_filter == 'medium':
                        findings = [f for f in findings if 50 <= f.get('risk_score', 0) < 80]
                    elif risk_filter == 'low':
                        findings = [f for f in findings if f.get('risk_score', 0) < 50]
                    logger.info(f"After risk filter ({risk_filter}): {len(findings)} findings")
                
                # Apply hash filter
                if hash_filter != 'all':
                    findings = [f for f in findings if f.get('hash_id') == hash_filter]
                    logger.info(f"After hash filter ({hash_filter}): {len(findings)} findings")
        
        logger.info(f"Final findings count for export: {len(findings)}")
        
        if not findings:
            logger.warning("No findings to export after filtering")
            return jsonify({
                'success': False, 
                'message': f'No findings found according to search criteria. Scope: {scope}, Selected: {len(selected_ids)}'
            })
        
        # Generate CSV file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"findings_export_{timestamp}.csv"
        filepath = os.path.join('exports', filename)
        
        os.makedirs('exports', exist_ok=True)
        
        success, result = export_findings_to_csv(findings, filepath)
        
        if success:
            logger.info(f"CSV export completed: {len(findings)} findings to {filepath}")
            return send_file(filepath, as_attachment=True, download_name=filename)
        else:
            logger.error(f"CSV export failed: {result}")
            return jsonify({'success': False, 'message': result})
            
    except Exception as e:
        logger.error(f"Error exporting CSV: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})


@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get current application settings"""
    try:
        env_file_path = os.path.join(os.path.dirname(__file__), '.env')
        settings = {}
        
        if os.path.exists(env_file_path):
            with open(env_file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        settings[key] = value
        
        # Return settings with field names that match config.py
        response_settings = {
            'SCAN_INTERVAL_MINUTES': int(settings.get('SCAN_INTERVAL_MINUTES', 60)),
            'ENABLE_AUTOMATIC_SCANNING': settings.get('ENABLE_AUTOMATIC_SCANNING', 'True').lower() == 'true',
            'RISK_THRESHOLD_HIGH': int(settings.get('RISK_THRESHOLD_HIGH', 80)),
            'RISK_THRESHOLD_MEDIUM': int(settings.get('RISK_THRESHOLD_MEDIUM', 50)),
            'AUTO_SUBMIT_THRESHOLD': int(settings.get('AUTO_SUBMIT_THRESHOLD', 90)),
            'PHISHLABS_ENABLED': settings.get('PHISHLABS_ENABLED', 'False').lower() == 'true',
            'PHISHLABS_USERNAME': settings.get('PHISHLABS_USERNAME', ''),
            'PHISHLABS_PASSWORD': settings.get('PHISHLABS_PASSWORD', ''),
            'PHISHLABS_CUSTID': settings.get('PHISHLABS_CUSTID', ''),
            'DOMAINTOOLS_USERNAME': settings.get('DOMAINTOOLS_USERNAME', ''),
            'DOMAINTOOLS_API_KEY': settings.get('DOMAINTOOLS_API_KEY', ''),
            'DOMAINTOOLS_BASE_URL': settings.get('DOMAINTOOLS_BASE_URL', 'https://api.domaintools.com/v1/iris-investigate/'),
            'API_TIMEOUT_SECONDS': int(settings.get('API_TIMEOUT_SECONDS', 30)),
            'API_RETRY_ATTEMPTS': int(settings.get('API_RETRY_ATTEMPTS', 3)),
            'MAX_RESULTS_PER_SCAN': int(settings.get('MAX_RESULTS_PER_SCAN', 1000)),
            'MAX_CONCURRENT_SCANS': int(settings.get('MAX_CONCURRENT_SCANS', 3)),
            'FINDINGS_FILE': settings.get('FINDINGS_FILE', 'findings.json'),
            'HASHES_FILE': settings.get('HASHES_FILE', 'search_hashes.json'),
            'ASRM_FILE': settings.get('ASRM_FILE', 'ASRM.json'),
            'TAGS_FILE': settings.get('TAGS_FILE', 'tags.json'),
            'SCAN_ACTIVITY_FILE': settings.get('SCAN_ACTIVITY_FILE', 'scan_activity.json'),
            'SCHEDULER_DATA_FILE': settings.get('SCHEDULER_DATA_FILE', 'scheduler_data.json'),
            'EXPORT_DIRECTORY': settings.get('EXPORT_DIRECTORY', 'exports'),
            'LOG_LEVEL': settings.get('LOG_LEVEL', 'INFO'),
            'LOG_DIRECTORY': settings.get('LOG_DIRECTORY', 'logs'),
            'MAX_RESULTS_PER_PAGE': int(settings.get('MAX_RESULTS_PER_PAGE', 100))
        }
        
        # Partially redact sensitive values
        if response_settings['PHISHLABS_PASSWORD']:
            response_settings['PHISHLABS_PASSWORD'] = response_settings['PHISHLABS_PASSWORD'][:3] + '***' + response_settings['PHISHLABS_PASSWORD'][-1] if len(response_settings['PHISHLABS_PASSWORD']) > 4 else '***'
        
        if response_settings['DOMAINTOOLS_API_KEY']:
            response_settings['DOMAINTOOLS_API_KEY'] = response_settings['DOMAINTOOLS_API_KEY'][:3] + '***' + response_settings['DOMAINTOOLS_API_KEY'][-1] if len(response_settings['DOMAINTOOLS_API_KEY']) > 4 else '***'
        
        return jsonify({'success': True, 'settings': response_settings})
        
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/settings', methods=['POST'])
def save_settings():
    """Save application settings"""
    try:
        data = request.get_json()
        logger.info(f"Received settings update: {data}")
        
        # Validate the settings
        scan_interval = int(data.get('SCAN_INTERVAL_MINUTES', 60))
        if scan_interval < 1 or scan_interval > 1440:  # 1 minute to 24 hours
            return jsonify({'success': False, 'message': 'Invalid scan interval'})
        
        # Handle PhishLabs configuration
        phishlabs_enabled = data.get('PHISHLABS_ENABLED', False)
        phishlabs_username = data.get('PHISHLABS_USERNAME', '')
        phishlabs_password = data.get('PHISHLABS_PASSWORD', '')
        phishlabs_custid = data.get('PHISHLABS_CUSTID', '')
        
        # Convert string values to boolean for validation
        if isinstance(phishlabs_enabled, str):
            phishlabs_enabled = phishlabs_enabled.lower() in ['true', '1', 'yes', 'on']
        
        if phishlabs_enabled:
            if not phishlabs_username or not phishlabs_password:
                return jsonify({'success': False, 'message': 'PhishLabs username and password are required when enabling PhishLabs integration'})
        
        # Save settings to .env file
        env_file_path = os.path.join(os.path.dirname(__file__), '.env')
        
        # Read existing .env file if it exists
        env_vars = {}
        if os.path.exists(env_file_path):
            with open(env_file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        # Remove comments from value
                        if '#' in value:
                            value = value.split('#')[0].strip()
                        env_vars[key] = value
        
        # Update with new values - using field names that match config.py
        env_vars['SCAN_INTERVAL_MINUTES'] = str(scan_interval)
        env_vars['ENABLE_AUTOMATIC_SCANNING'] = str(data.get('ENABLE_AUTOMATIC_SCANNING', True)).lower()
        env_vars['RISK_THRESHOLD_HIGH'] = str(data.get('RISK_THRESHOLD_HIGH', 80))
        env_vars['RISK_THRESHOLD_MEDIUM'] = str(data.get('RISK_THRESHOLD_MEDIUM', 50))
        
        # PhishLabs settings - always save if present in data
        if 'PHISHLABS_ENABLED' in data:
            env_vars['PHISHLABS_ENABLED'] = str(data.get('PHISHLABS_ENABLED', False)).lower()
        if 'PHISHLABS_USERNAME' in data:
            env_vars['PHISHLABS_USERNAME'] = data.get('PHISHLABS_USERNAME', '')
        if 'PHISHLABS_PASSWORD' in data:
            env_vars['PHISHLABS_PASSWORD'] = data.get('PHISHLABS_PASSWORD', '')
        if 'PHISHLABS_CUSTID' in data:
            env_vars['PHISHLABS_CUSTID'] = data.get('PHISHLABS_CUSTID', '')
        
        # DomainTools settings - always save if present in data
        if 'DOMAINTOOLS_USERNAME' in data:
            env_vars['DOMAINTOOLS_USERNAME'] = data.get('DOMAINTOOLS_USERNAME', '')
        if 'DOMAINTOOLS_API_KEY' in data:
            env_vars['DOMAINTOOLS_API_KEY'] = data.get('DOMAINTOOLS_API_KEY', '')
        if 'DOMAINTOOLS_BASE_URL' in data:
            env_vars['DOMAINTOOLS_BASE_URL'] = data.get('DOMAINTOOLS_BASE_URL', '')
        
        # API settings - always save if present in data
        if 'API_TIMEOUT_SECONDS' in data:
            env_vars['API_TIMEOUT_SECONDS'] = str(data.get('API_TIMEOUT_SECONDS', 30))
        if 'API_RETRY_ATTEMPTS' in data:
            env_vars['API_RETRY_ATTEMPTS'] = str(data.get('API_RETRY_ATTEMPTS', 3))
        
        # Scanning settings - always save if present in data
        if 'MAX_RESULTS_PER_SCAN' in data:
            env_vars['MAX_RESULTS_PER_SCAN'] = str(data.get('MAX_RESULTS_PER_SCAN', 1000))
        if 'MAX_CONCURRENT_SCANS' in data:
            env_vars['MAX_CONCURRENT_SCANS'] = str(data.get('MAX_CONCURRENT_SCANS', 10))
        
        # Data storage settings - always save if present in data
        if 'FINDINGS_FILE' in data:
            env_vars['FINDINGS_FILE'] = data.get('FINDINGS_FILE', 'findings.json')
        if 'HASHES_FILE' in data:
            env_vars['HASHES_FILE'] = data.get('HASHES_FILE', 'search_hashes.json')
        if 'ASRM_FILE' in data:
            env_vars['ASRM_FILE'] = data.get('ASRM_FILE', 'ASRM.json')
        if 'TAGS_FILE' in data:
            env_vars['TAGS_FILE'] = data.get('TAGS_FILE', 'tags.json')
        if 'SCAN_ACTIVITY_FILE' in data:
            env_vars['SCAN_ACTIVITY_FILE'] = data.get('SCAN_ACTIVITY_FILE', 'scan_activity.json')
        if 'SCHEDULER_DATA_FILE' in data:
            env_vars['SCHEDULER_DATA_FILE'] = data.get('SCHEDULER_DATA_FILE', 'scheduler_data.json')
        if 'EXPORT_DIRECTORY' in data:
            env_vars['EXPORT_DIRECTORY'] = data.get('EXPORT_DIRECTORY', 'exports')
        
        # Logging settings - always save if present in data
        if 'LOG_LEVEL' in data:
            log_level = data.get('LOG_LEVEL', 'INFO')
            env_vars['LOG_LEVEL'] = log_level
            # Auto-enable debug mode when log level is DEBUG
            if log_level.upper() == 'DEBUG':
                env_vars['ENABLE_DEBUG_MODE'] = 'true'
        else:
                env_vars['ENABLE_DEBUG_MODE'] = 'false'
        if 'LOG_DIRECTORY' in data:
            env_vars['LOG_DIRECTORY'] = data.get('LOG_DIRECTORY', 'logs')
        
        # UI settings - always save if present in data
        if 'MAX_RESULTS_PER_PAGE' in data:
            env_vars['MAX_RESULTS_PER_PAGE'] = str(data.get('MAX_RESULTS_PER_PAGE', 100))
        
        # Debug mode - always save if present in data
        if 'ENABLE_DEBUG_MODE' in data:
            env_vars['ENABLE_DEBUG_MODE'] = str(data.get('ENABLE_DEBUG_MODE', False)).lower()
        
        # Write back to .env file
        with open(env_file_path, 'w') as f:
            for key, value in env_vars.items():
                f.write(f"{key}={value}\n")
        
        logger.info(f"Settings saved to .env file - Scan interval: {scan_interval} minutes, PhishLabs enabled: {phishlabs_enabled}")
        logger.info(f"Received data keys: {list(data.keys())}")
        logger.info(f"Updated env_vars keys: {list(env_vars.keys())}")
        logger.info(f"DomainTools settings: USERNAME={env_vars.get('DOMAINTOOLS_USERNAME', 'NOT_SET')}, API_KEY={'SET' if env_vars.get('DOMAINTOOLS_API_KEY') else 'NOT_SET'}")
        
        # Update scheduler if scan interval changed and scheduler is running
        try:
            from scheduler import get_scheduler_status, update_scan_interval
            current_status = get_scheduler_status()
            if current_status.get('is_running'):
                logger.info(f"Updating scheduler interval from {current_status.get('interval_minutes', 'unknown')} to {scan_interval} minutes")
                update_scan_interval(scan_interval)
                logger.info("Scheduler interval updated successfully")
        except Exception as e:
            logger.error(f"Error updating scheduler interval: {e}")
            # Don't fail the settings save if scheduler update fails
        
        return jsonify({
            'success': True, 
            'message': 'Settings saved successfully to .env file. Scheduler interval updated if running.'
        })
        
    except Exception as e:
        logger.error(f"Error saving settings: {e}")
        return jsonify({'success': False, 'message': str(e)})

# PhishLabs API endpoints
@app.route('/api/phishlabs/brands', methods=['GET'])
def get_phishlabs_brands():
    """Get available brands from PhishLabs"""
    try:
        from phishlabs import get_phishlabs_brands
        brands = get_phishlabs_brands()
        return jsonify(brands)
    except Exception as e:
        logger.error(f"Error getting PhishLabs brands: {e}")
        return jsonify([]), 200

@app.route('/api/phishlabs/threat-types', methods=['GET'])
def get_phishlabs_threat_types():
    """Get available threat types from PhishLabs"""
    try:
        from phishlabs import get_phishlabs_threat_types
        threat_types = get_phishlabs_threat_types()
        return jsonify(threat_types)
    except Exception as e:
        logger.error(f"Error getting PhishLabs threat types: {e}")
        return jsonify([]), 200

@app.route('/api/phishlabs/case-types', methods=['GET'])
def get_phishlabs_case_types():
    """Get available case types from PhishLabs"""
    try:
        from phishlabs import get_phishlabs_case_types
        case_types = get_phishlabs_case_types()
        return jsonify(case_types)
    except Exception as e:
        logger.error(f"Error getting PhishLabs case types: {e}")
        return jsonify([]), 200

@app.route('/api/phishlabs/threat-categories', methods=['GET'])
def get_phishlabs_threat_categories():
    """Get available threat categories from PhishLabs"""
    try:
        from phishlabs import get_phishlabs_threat_categories
        threat_categories = get_phishlabs_threat_categories()
        return jsonify(threat_categories)
    except Exception as e:
        logger.error(f"Error getting PhishLabs threat categories: {e}")
        return jsonify([]), 200

@app.route('/api/hash/<hash_id>', methods=['GET'])
def get_hash_direct(hash_id):
    """Get specific hash by ID"""
    try:
        from core_operations import get_hash_endpoint
        return get_hash_endpoint(hash_id)
    except Exception as e:
        logger.error(f"Error getting hash {hash_id}: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Test endpoints for settings
@app.route('/api/test/domaintools', methods=['GET'])
@app.route('/test/domaintools', methods=['GET'])  # Add fallback route without /api prefix
def test_domaintools_connection():
    """Test DomainTools API connection"""
    try:
        logger.info("DomainTools connection test endpoint called")
        
        # Import and call the test function
        import domaintools
        logger.info("DomainTools module imported successfully")
        
        success, result = domaintools.test_domaintools_connection()
        logger.info(f"DomainTools test result: success={success}, result={result}")
        
        if success:
            message = result.get('message', 'Connection successful') if isinstance(result, dict) else str(result)
            return jsonify({'success': True, 'message': message})
        else:
            error_msg = result.get('error', str(result)) if isinstance(result, dict) else str(result)
            return jsonify({'success': False, 'message': error_msg}), 400
            
    except Exception as e:
        logger.error(f"Error testing DomainTools connection: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@app.route('/api/test/phishlabs', methods=['GET'])
@app.route('/test/phishlabs', methods=['GET'])  # Add fallback route without /api prefix
def test_phishlabs_connection():
    """Test PhishLabs API connection"""
    try:
        logger.info("PhishLabs connection test endpoint called")
        
        # Import and call the test function
        import phishlabs
        logger.info("PhishLabs module imported successfully")
        
        success, result = phishlabs.test_phishlabs_connection()
        logger.info(f"PhishLabs test result: success={success}, result={result}")
        
        if success:
            message = result.get('message', 'Connection successful') if isinstance(result, dict) else str(result)
            return jsonify({'success': True, 'message': message})
        else:
            error_msg = result.get('error', str(result)) if isinstance(result, dict) else str(result)
            # Return 200 but with success=false for credential issues (not server errors)
            return jsonify({'success': False, 'message': error_msg}), 200
            
    except Exception as e:
        logger.error(f"Error testing PhishLabs connection: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500


# Start Flask application
if __name__ == '__main__':
    try:
        app.run(
                host=config.FLASK_HOST, 
            port=config.FLASK_PORT,
            debug=config.FLASK_DEBUG
        )
    except Exception as e:
        logger.error(f"Failed to start Flask app: {e}")
