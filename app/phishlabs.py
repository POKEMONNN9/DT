"""
Consolidated PhishLabs Module
Combines all PhishLabs operations, service, rules, and endpoints functionality
"""

import requests
import json
import os
import uuid
import urllib.parse

requests.packages.urllib3.disable_warnings()
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from flask import Blueprint, request, jsonify
from requests.auth import HTTPBasicAuth

from config import current_config as config
from logger import get_phishlabs_logger, log_pl_api_request, log_pl_api_error, log_pl_submission_success, log_pl_submission_failed, log_pl_auto_submission, get_app_logger
from constants import (
    PHISHLABS_CASE_API_BASE_URL, PHISHLABS_MONITOR_API_BASE_URL,
    PHISHLABS_ENDPOINTS, THREAT_CATEGORIES
)

logger = get_phishlabs_logger()
app_logger = get_app_logger()

# =============================================================================
# PHISHLABS OPERATIONS
# =============================================================================

def make_phishlabs_api_call(endpoint, method='GET', data=None):
    """
    Make API call to PhishLabs following the actual API patterns
    
    Args:
        endpoint: API endpoint (brands, caseTypes, newCase, createincident, etc.)
        method: HTTP method (GET or POST)
        data: Request data for POST requests
        
    Returns:
        tuple: (success: bool, response_data: dict)
    """
    # Use direct configuration from config.py
    
    # Determine API URL and authentication based on endpoint
    if endpoint in ['brands', 'caseTypes', 'newCase'] or endpoint.startswith('attachFile'):
        # Case API - requires HTTP Basic Auth
        if not config.PHISHLABS_USERNAME or not config.PHISHLABS_PASSWORD:
            return False, {'error': 'PhishLabs credentials not configured'}
        
        url = f'{PHISHLABS_CASE_API_BASE_URL}{endpoint}'
        use_auth = True
        
    elif endpoint.startswith('createincident'):
        # Domain Monitor API - uses custid parameter, no auth
        if not config.PHISHLABS_CUSTID:
            return False, {'error': 'Customer ID required for Domain Monitor'}
        
        url = f'{PHISHLABS_MONITOR_API_BASE_URL}{endpoint}'
        use_auth = False
        
    else:
        return False, {'error': f'Unknown endpoint: {endpoint}'}
    
    try:
        # Log API request
        log_pl_api_request(endpoint, method)
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Make the request
        if method.upper() == 'GET':
            if use_auth:
                auth = HTTPBasicAuth(config.PHISHLABS_USERNAME, config.PHISHLABS_PASSWORD)
                response = requests.get(url, auth=auth, headers=headers, timeout=30, verify=False)
            else:
                response = requests.get(url, headers=headers, timeout=30, verify=False)
        elif method.upper() == 'POST':
            if use_auth:
                auth = HTTPBasicAuth(config.PHISHLABS_USERNAME, config.PHISHLABS_PASSWORD)
                response = requests.post(url, json=data, auth=auth, headers=headers, timeout=30, verify=False)
            else:
                response = requests.post(url, json=data, headers=headers, timeout=30, verify=False)
        else:
            return False, {'error': f'Unsupported HTTP method: {method}'}
        
        # Check response - match your exact status code handling
        if response.status_code in [200, 201, 202]:
            try:
                json_response = response.json()
                logger.info(f"PhishLabs API call successful: {endpoint}")
                return True, json_response
            except json.JSONDecodeError:
                logger.warning(f"PhishLabs API returned non-JSON response: {response.text}")
                return True, {'response': response.text}
        elif response.status_code == 400:
            try:
                error_data = response.json()
                return False, error_data
            except json.JSONDecodeError:
                return False, {'error': f'Bad Request: {response.text}'}
        elif response.status_code == 401:
            return False, {'error': 'Unauthorized: Check credentials'}
        else:
            try:
                error_data = response.json()
                return False, {'error': error_data.get('errorMessage', response.text)}
            except json.JSONDecodeError:
                return False, {'error': f'HTTP {response.status_code}: {response.text}'}
    
    except requests.exceptions.Timeout:
        return False, {'error': 'Request timeout (30s)'}
    except requests.exceptions.ConnectionError:
        return False, {'error': 'Connection error'}
    except Exception as e:
        return False, {'error': str(e)}

def test_phishlabs_connection():
    try:
        # Reload environment variables to get fresh credentials
        from dotenv import load_dotenv
        import os
        load_dotenv('.env', override=True)  # Force reload with override
        
        # Get fresh credentials from environment
        username = os.getenv('PHISHLABS_USERNAME')
        password = os.getenv('PHISHLABS_PASSWORD')
        custid = os.getenv('PHISHLABS_CUSTID')
        
        # Check if credentials are configured
        if not username or not password:
            logger.warning("PhishLabs credentials not configured")
            return False, {'error': 'PhishLabs credentials not configured. Please enter username and password in settings.'}
        
        # Test Case API connection by calling brands endpoint directly with fresh credentials
        url = f'{PHISHLABS_CASE_API_BASE_URL}brands'
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        try:
            from requests.auth import HTTPBasicAuth
            auth = HTTPBasicAuth(username, password)
            
            logger.info(f"Making PhishLabs API call to: {url}")
            logger.info(f"Using username: {username}")
            logger.info(f"Using password length: {len(password)} characters")
            logger.info(f"Password starts with: {password[:3]}... ends with: ...{password[-3:]}")
            
            response = requests.get(url, auth=auth, headers=headers, timeout=30, verify=False)
            
            logger.info(f"PhishLabs API response status: {response.status_code}")
            try:
                response_data = response.json()
                logger.info(f"PhishLabs response data: {response_data}")
            except:
                logger.info(f"PhishLabs response text: {response.text[:200]}")
            
            if response.status_code in [200, 201, 202]:
                logger.info("PhishLabs connection test successful")
                return True, {'message': 'PhishLabs connection successful - API is reachable and credentials are valid'}
            elif response.status_code == 401:
                logger.warning("PhishLabs authentication failed - 401 Unauthorized")
                return False, {'error': 'PhishLabs credentials are invalid. Please check your username and password in settings.'}
            elif response.status_code == 400:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', 'Bad Request')
                except:
                    error_msg = response.text
                logger.warning(f"PhishLabs API returned 400: {error_msg}")
                return False, {'error': f'PhishLabs API error: {error_msg}'}
            else:
                logger.warning(f"PhishLabs API returned {response.status_code}: {response.text}")
                return False, {'error': f'PhishLabs API error: HTTP {response.status_code}'}
                
        except requests.exceptions.Timeout:
            return False, {'error': 'PhishLabs API timeout - please try again'}
        except requests.exceptions.ConnectionError:
            return False, {'error': 'Cannot connect to PhishLabs API - check internet connection'}
        except Exception as e:
            logger.error(f"Error making PhishLabs API call: {e}")
            return False, {'error': f'PhishLabs API call failed: {str(e)}'}
                
    except Exception as e:
        error_msg = f"Error testing PhishLabs connection: {str(e)}"
        logger.error(error_msg)
        return False, {'error': error_msg}

def create_threat_case(ioc, brand, case_type, description="", malware_type=None):
    """
    Create a threat case in PhishLabs
    
    Args:
        ioc: Indicator of Compromise (domain, URL, etc.)
        brand: Brand name
        case_type: Type of case (phishing, crimeware, etc.)
        description: Optional description
        malware_type: Optional malware type
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        # Prepare case data
        case_data = {
            'ioc': ioc,
            'brand': brand,
            'caseType': case_type,
            'description': description
        }
        
        if malware_type:
            case_data['malwareType'] = malware_type
        
        # Make API call
        success, result = make_phishlabs_api_call('newCase', 'POST', case_data)
        
        if success:
            log_pl_submission_success(None, result.get('caseId', 'unknown'))
            logger.info(f"Threat case created successfully: {ioc}")
            return True, result
        else:
            log_pl_submission_failed(None, result.get('error', 'Unknown error'))
            logger.error(f"Failed to create threat case: {result}")
            return False, result
    
    except Exception as e:
        error_msg = f"Error creating threat case: {str(e)}"
        logger.error(error_msg)
        return False, {'error': error_msg}

def create_monitor_case(domain, brand, threat_category):
    """
    Create a domain monitoring case in PhishLabs
    
    Args:
        domain: Domain to monitor
        brand: Brand name
        threat_category: Threat category code
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        # Prepare case data
        case_data = {
            'domain': domain,
            'brand': brand,
            'threatCategory': threat_category,
            'custid': config.PHISHLABS_CUSTID
        }
        
        # Make API call
        success, result = make_phishlabs_api_call('createincident', 'POST', case_data)
        
        if success:
            log_pl_submission_success(None, result.get('incidentId', 'unknown'))
            logger.info(f"Monitor case created successfully: {domain}")
            return True, result
        else:
            log_pl_submission_failed(None, result.get('error', 'Unknown error'))
            logger.error(f"Failed to create monitor case: {result}")
            return False, result
    
    except Exception as e:
        error_msg = f"Error creating monitor case: {str(e)}"
        logger.error(error_msg)
        return False, {'error': error_msg}

def submit_case(domain, brand, case_type, threat_type=None, threat_category=None, description="", malware_type=None):
    """
    Submit a case to PhishLabs (threat or monitor)
    
    Args:
        domain: Domain to submit
        brand: Brand name
        case_type: Type of case ('threat' or 'monitor')
        threat_type: Threat type (for threat cases)
        threat_category: Threat category (for monitor cases)
        description: Optional description
        malware_type: Optional malware type
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        if case_type == 'threat':
            if not threat_type:
                return False, {'error': 'threat_type is required for threat cases'}
            return create_threat_case(domain, brand, threat_type, description, malware_type)
        elif case_type == 'monitor':
            if not threat_category:
                return False, {'error': 'threat_category is required for monitor cases'}
            return create_monitor_case(domain, brand, threat_category)
        else:
            return False, {'error': f'Invalid case_type: {case_type}. Must be "threat" or "monitor"'}
    
    except Exception as e:
        error_msg = f"Error submitting case: {str(e)}"
        logger.error(error_msg)
        return False, {'error': error_msg}

def get_phishlabs_brands():
    """
    Get available brands from PhishLabs
    
    Returns:
        list: List of available brands
    """
    try:
        success, result = make_phishlabs_api_call('brands', 'GET')
        if success:
            brands = result.get('brands', [])
            if 'TD Easy Web' in brands:
                brands.append('Interac - TD EasyWeb')
            logger.info(f"Retrieved {len(brands)} brands from PhishLabs")
            return brands
        else:
            logger.error(f"Failed to get brands: {result}")
            return []
    except Exception as e:
        logger.error(f"Error getting PhishLabs brands: {e}")
        return []

def get_phishlabs_case_types():
    """
    Get available case types from PhishLabs
    
    Returns:
        list: List of available case types
    """
    try:
        success, result = make_phishlabs_api_call('caseTypes', 'GET')
        if success:
            types = result.get('caseType', [])
            logger.info(f"Retrieved {len(types)} case types from PhishLabs")
            return types
        else:
            logger.error(f"Failed to get case types: {result}")
            return []
    except Exception as e:
        logger.error(f"Error getting PhishLabs case types: {e}")
        return []

def get_phishlabs_threat_types():
    """
    Get available threat types from PhishLabs caseTypes API
    
    Returns:
        list: List of available threat types
    """
    try:
        success, result = make_phishlabs_api_call('caseTypes', 'GET')
        if success:
            types = result.get('caseType', [])
            logger.info(f"Retrieved {len(types)} threat types from PhishLabs")
            return types
        else:
            logger.error(f"Failed to get threat types: {result}")
            return []
    except Exception as e:
        logger.error(f"Error getting PhishLabs threat types: {e}")
        return []


def process_case_result(ok, result, ioc, timestamp):
    """
    Process the result of a case submission
    
    Args:
        ok: Whether the submission was successful
        result: The result data
        ioc: The IOC that was submitted
        timestamp: Timestamp of submission
        
    Returns:
        dict: Processed result
    """
    try:
        if ok:
            case_id = result.get('caseId') or result.get('incidentId', 'unknown')
            return {
                'success': True,
                'case_id': case_id,
                'ioc': ioc,
                'timestamp': timestamp,
                'message': 'Case submitted successfully',
                'raw_result': result
            }
        else:
            return {
                'success': False,
                'ioc': ioc,
                'timestamp': timestamp,
                'error': result.get('error', 'Unknown error'),
                'raw_result': result
            }
    except Exception as e:
        logger.error(f"Error processing case result: {e}")
        return {
            'success': False,
            'ioc': ioc,
            'timestamp': timestamp,
            'error': f'Error processing result: {str(e)}',
            'raw_result': result
        }

def submit_to_phishlabs(submission_data):
    """
    Submit finding to PhishLabs
    
    Args:
        submission_data: Dictionary containing submission information
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        domain = submission_data.get('domain')
        brand = submission_data.get('brand')
        case_type = submission_data.get('case_type', 'threat')
        threat_type = submission_data.get('threat_type')
        threat_category = submission_data.get('threat_category')
        description = submission_data.get('description', '')
        malware_type = submission_data.get('malware_type')
        
        if not domain or not brand:
            return False, {'error': 'Domain and brand are required'}
        
        # Submit the case
        success, result = submit_case(
            domain=domain,
            brand=brand,
            case_type=case_type,
            threat_type=threat_type,
            threat_category=threat_category,
            description=description,
            malware_type=malware_type
        )
        
        # Process the result
        processed_result = process_case_result(success, result, domain, datetime.now().isoformat())
        
        return success, processed_result
    
    except Exception as e:
        error_msg = f"Error submitting to PhishLabs: {str(e)}"
        logger.error(error_msg)
        return False, {'error': error_msg}

def auto_submit_to_phishlabs(finding, rule):
    """
    Auto-submit finding to PhishLabs based on ASRM rule
    
    Args:
        finding: Finding data
        rule: ASRM rule configuration
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        # Log auto-submission attempt
        log_pl_auto_submission(finding.get('id'), rule.get('id'))
        
        # Prepare submission data
        submission_data = {
            'domain': finding.get('domain_name'),
            'brand': rule.get('brand'),
            'case_type': rule.get('case_type', 'threat'),
            'threat_type': rule.get('threat_type'),
            'threat_category': rule.get('threat_category'),
            'description': f"Auto-submitted via ASRM rule: {rule.get('name')}",
            'malware_type': rule.get('malware_type')
        }
        
        # Submit to PhishLabs
        success, result = submit_to_phishlabs(submission_data)
        
        if success:
            logger.info(f"Auto-submission successful for finding {finding.get('id')} via rule {rule.get('id')}")
            
            # Update finding with PhishLabs case number and tag
            case_number = result.get('case_id') or result.get('incident_id') or 'N/A'
            try:
                from core_operations import FindingsManager
                findings_manager = FindingsManager()
                
                update_data = {
                    'pl_submission': True,
                    'phishlabs_case_number': case_number,
                    'phishlabs_submission_timestamp': result.get('timestamp'),
                    'phishlabs_submission_method': 'asrm_auto',
                    'asrm_triggered': True
                }
                
                # Handle tagging if specified in rule
                rule_tag = rule.get('tag')
                if rule_tag and rule_tag.strip():
                    try:
                        # Add tag to finding
                        success_tag = add_tag_to_finding(finding.get('id'), rule_tag.strip())
                        if success_tag:
                            logger.info(f"Added tag '{rule_tag}' to finding {finding.get('id')} via ASRM rule")
                        else:
                            logger.warning(f"Failed to add tag '{rule_tag}' to finding {finding.get('id')}")
                    except Exception as tag_error:
                        logger.error(f"Error adding tag '{rule_tag}' to finding {finding.get('id')}: {tag_error}")
                
                updated_finding = findings_manager.update_finding(finding.get('id'), update_data)
                if updated_finding:
                    logger.info(f"Updated finding {finding.get('id')} with PhishLabs case number: {case_number}")
                else:
                    logger.warning(f"Failed to update finding {finding.get('id')} with PhishLabs data")
                    
            except Exception as e:
                logger.error(f"Error updating finding with PhishLabs data: {e}")
        else:
            logger.error(f"Auto-submission failed for finding {finding.get('id')}: {result}")
        
        return success, result
    
    except Exception as e:
        error_msg = f"Error in auto-submission: {str(e)}"
        logger.error(error_msg)
        return False, {'error': error_msg}

def add_tag_to_finding(finding_id, tag_name):
    """
    Add a tag to a finding
    
    Args:
        finding_id: ID of the finding
        tag_name: Name of the tag to add
        
    Returns:
        bool: Success status
    """
    try:
        from core_operations import FindingsManager
        findings_manager = FindingsManager()
        
        # Get the finding
        finding = findings_manager.get_finding_by_id(finding_id)
        if not finding:
            logger.error(f"Finding {finding_id} not found for tagging")
            return False
        
        # Get current tags or initialize empty list
        current_tags = finding.get('tags', [])
        
        # Add tag if not already present
        if tag_name not in current_tags:
            current_tags.append(tag_name)
            
            # Update the finding with new tags
            updates = {'tags': current_tags}
            updated_finding = findings_manager.update_finding(finding_id, updates)
            
            if updated_finding:
                logger.info(f"Successfully added tag '{tag_name}' to finding {finding_id}")
                return True
            else:
                logger.error(f"Failed to update finding {finding_id} with tag '{tag_name}'")
                return False
        else:
            logger.info(f"Tag '{tag_name}' already exists on finding {finding_id}")
            return True  # Consider this a success since the tag is already there
            
    except Exception as e:
        logger.error(f"Error adding tag '{tag_name}' to finding {finding_id}: {e}")
        return False

def save_phishlabs_submission_to_finding(finding_id, submission_result):
    """
    Save PhishLabs submission result to finding
    
    Args:
        finding_id: ID of the finding
        submission_result: Result of the submission
        
    Returns:
        bool: Success status
    """
    try:
        # This would typically update the finding in the database
        # For now, just log the submission
        logger.info(f"PhishLabs submission saved for finding {finding_id}: {submission_result}")
        return True
    except Exception as e:
        logger.error(f"Error saving PhishLabs submission: {e}")
        return False

def get_phishlabs_submission_summary():
    """
    Get summary of PhishLabs submissions
    
    Returns:
        dict: Submission summary
    """
    try:
        # This would typically query the database for submission history
        # For now, return a placeholder
        return {
            'total_submissions': 0,
            'successful_submissions': 0,
            'failed_submissions': 0,
            'last_submission': None
        }
    except Exception as e:
        logger.error(f"Error getting PhishLabs submission summary: {e}")
        return {}

# =============================================================================
# PHISHLABS SERVICE LAYER
# =============================================================================

def submit_threat_case(domain, brand, threat_type, description=""):
    """
    Submit a threat case to PhishLabs
    
    Args:
        domain: Domain to submit
        brand: Brand name
        threat_type: Type of threat (phishing, crimeware, etc.)
        description: Optional description
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        success, result = create_threat_case(domain, brand, threat_type, description)
        if success:
            # Process the result to get standardized format
            processed_result = process_case_result(success, result, domain, "")
            return True, processed_result
        else:
            return False, result
    except Exception as e:
        app_logger.error(f"Error submitting threat case: {e}")
        return False, {'error': str(e)}

def submit_domain_case(domain, brand, threat_category, description=""):
    """
    Submit a domain monitoring case to PhishLabs
    
    Args:
        domain: Domain to monitor
        brand: Brand name
        threat_category: Threat category code (e.g., '1201')
        description: Optional description
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        success, result = create_monitor_case(domain, brand, threat_category)
        if success:
            # Process the result to get standardized format
            processed_result = process_case_result(success, result, domain, "")
            return True, processed_result
        else:
            return False, result
    except Exception as e:
        app_logger.error(f"Error submitting domain case: {e}")
        return False, {'error': str(e)}

def add_domaintools_tag(domain, tag, finding_id=None):
    """
    Add a tag to a domain internally (DomainTools API doesn't support tagging)
    
    Args:
        domain: Domain to tag
        tag: Tag name to add
        finding_id: Optional finding ID to update directly
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        from domaintools_tagging import add_domain_tag
        success, result = add_domain_tag(domain, tag, finding_id)
        return success, result
    except Exception as e:
        app_logger.error(f"Error adding internal tag: {e}")
        return False, {'error': str(e)}

# =============================================================================
# PHISHLABS RULES OPERATIONS
# =============================================================================

def load_rules_from_json():
    """Load rules from JSON file, return empty list if file doesn't exist"""
    rules_file = config.ASRM_FILE
    
    if os.path.exists(rules_file):
        try:
            with open(rules_file, 'r', encoding='utf-8') as f:
                rules = json.load(f)
                if isinstance(rules, list):
                    app_logger.info(f"Loaded {len(rules)} rules from {rules_file}")
                    return rules
                else:
                    app_logger.warning(f"Rules file {rules_file} is not a list, returning empty list")
                    return []
        except Exception as e:
            app_logger.error(f"Error loading rules from {rules_file}: {e}")
            return []
    else:
        app_logger.info(f"Rules file {rules_file} does not exist, starting with empty rules")
        return []

def save_rules_to_json(rules):
    """Save rules to JSON file"""
    rules_file = config.ASRM_FILE
    try:
        with open(rules_file, 'w', encoding='utf-8') as f:
            json.dump(rules, f, indent=2, ensure_ascii=False)
        app_logger.info(f"Saved {len(rules)} rules to {rules_file}")
        return True
    except Exception as e:
        app_logger.error(f"Error saving rules to {rules_file}: {e}")
        return False

# Load rules from JSON file
AUTO_SUBMISSION_RULES = load_rules_from_json()

def get_rules_for_hash(hash_id):
    """Get rules for specific hash"""
    return [rule for rule in AUTO_SUBMISSION_RULES if rule.get('hash_id') == hash_id]

def get_all_enabled_rules():
    """Get all enabled rules"""
    return [rule for rule in AUTO_SUBMISSION_RULES if rule.get('enabled', False)]

def get_all_rules():
    """Get all rules"""
    return AUTO_SUBMISSION_RULES.copy()

def get_rule_by_id(rule_id):
    """Get rule by ID"""
    for rule in AUTO_SUBMISSION_RULES:
        if rule.get('id') == rule_id:
            return rule
    return None

def check_if_finding_matches_rule(finding, rule):
    """Check if finding matches rule"""
    try:
        if not rule.get('enabled', False):
            return False
        
        conditions = rule.get('conditions', [])
        if not conditions:
            return False
        
        # Simple condition matching (can be enhanced)
        for condition in conditions:
            field = condition.get('field')
            operator = condition.get('operator')
            value = condition.get('value')
            
            if not field or not operator or value is None:
                continue
            
            finding_value = finding.get(field)
            if finding_value is None:
                continue
            
            # Basic matching logic
            if operator == 'contains':
                if str(value).lower() not in str(finding_value).lower():
                    return False
            elif operator == 'equals':
                if str(finding_value).lower() != str(value).lower():
                    return False
            elif operator == '>=':
                try:
                    if float(finding_value) < float(value):
                        return False
                except (ValueError, TypeError):
                    return False
        
        return True
    except Exception as e:
        app_logger.error(f"Error checking rule match: {e}")
        return False

def evaluate_conditions_with_logic(finding, conditions):
    """Evaluate conditions with logical operators"""
    try:
        if not conditions:
            return False
        
        # Start with first condition
        result = check_if_finding_matches_rule(finding, {'conditions': [conditions[0]]})
        
        # Process remaining conditions with logical operators
        for i in range(1, len(conditions)):
            condition = conditions[i]
            logical_operator = condition.get('logical_operator', 'AND')
            condition_result = check_if_finding_matches_rule(finding, {'conditions': [condition]})
            
            if logical_operator == 'AND':
                result = result and condition_result
            elif logical_operator == 'OR':
                result = result or condition_result
        
        return result
    except Exception as e:
        app_logger.error(f"Error evaluating conditions: {e}")
        return False

def check_condition(finding, field, operator, value):
    """Check single condition"""
    try:
        finding_value = finding.get(field)
        if finding_value is None:
            return False
        
        if operator == 'contains':
            return str(value).lower() in str(finding_value).lower()
        elif operator == 'equals':
            return str(finding_value).lower() == str(value).lower()
        elif operator == '>=':
            try:
                return float(finding_value) >= float(value)
            except (ValueError, TypeError):
                return False
        elif operator == '>':
            try:
                return float(finding_value) > float(value)
            except (ValueError, TypeError):
                return False
        elif operator == '<=':
            try:
                return float(finding_value) <= float(value)
            except (ValueError, TypeError):
                return False
        elif operator == '<':
            try:
                return float(finding_value) < float(value)
            except (ValueError, TypeError):
                return False
        
        return False
    except Exception as e:
        app_logger.error(f"Error checking condition: {e}")
        return False

def get_matching_rules_for_finding(finding):
    """Get matching rules for finding"""
    matching_rules = []
    for rule in AUTO_SUBMISSION_RULES:
        if check_if_finding_matches_rule(finding, rule):
            matching_rules.append((rule.get('id'), rule))
    return matching_rules

def add_rule(rule_data):
    """Add new rule"""
    try:
        rule_id = str(uuid.uuid4())
        rule_data['id'] = rule_id
        rule_data['created_at'] = datetime.now().isoformat()
        rule_data['updated_at'] = datetime.now().isoformat()
        
        AUTO_SUBMISSION_RULES.append(rule_data)
        return save_rules_to_json(AUTO_SUBMISSION_RULES)
    except Exception as e:
        app_logger.error(f"Error adding rule: {e}")
        return False

def update_rule(rule_id, rule_data):
    """Update existing rule"""
    try:
        for i, rule in enumerate(AUTO_SUBMISSION_RULES):
            if rule.get('id') == rule_id:
                rule_data['id'] = rule_id
                rule_data['updated_at'] = datetime.now().isoformat()
                AUTO_SUBMISSION_RULES[i] = rule_data
                return save_rules_to_json(AUTO_SUBMISSION_RULES)
        return False
    except Exception as e:
        app_logger.error(f"Error updating rule: {e}")
        return False

def delete_rule(rule_id):
    """Delete rule"""
    try:
        for i, rule in enumerate(AUTO_SUBMISSION_RULES):
            if rule.get('id') == rule_id:
                AUTO_SUBMISSION_RULES.pop(i)
                return save_rules_to_json(AUTO_SUBMISSION_RULES)
        return False
    except Exception as e:
        app_logger.error(f"Error deleting rule: {e}")
        return False

def toggle_rule(rule_id):
    """Toggle rule enabled/disabled"""
    try:
        for rule in AUTO_SUBMISSION_RULES:
            if rule.get('id') == rule_id:
                rule['enabled'] = not rule.get('enabled', False)
                rule['updated_at'] = datetime.now().isoformat()
                return save_rules_to_json(AUTO_SUBMISSION_RULES)
        return False
    except Exception as e:
        app_logger.error(f"Error toggling rule: {e}")
        return False

def reload_rules():
    """Reload rules from file"""
    try:
        global AUTO_SUBMISSION_RULES
        AUTO_SUBMISSION_RULES = load_rules_from_json()
        return True
    except Exception as e:
        app_logger.error(f"Error reloading rules: {e}")
        return False

# =============================================================================
# PHISHLABS ENDPOINTS
# =============================================================================

# Create blueprint for PhishLabs endpoints
phishlabs_bp = Blueprint('phishlabs', __name__)

@phishlabs_bp.route('/test_connection', methods=['GET'])
def test_connection_endpoint():
    """Test connection to PhishLabs API Client"""
    try:
        success, result = test_phishlabs_connection()
        if success:
            return jsonify({'success': True, 'message': 'PhishLabs connection successful'})
        else:
            return jsonify({'success': False, 'message': f'PhishLabs connection failed: {result}'})
    except Exception as e:
        app_logger.error(f"Error testing PhishLabs connection: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@phishlabs_bp.route('/get_brands', methods=['GET'])
def get_brands_endpoint():
    """Get available brands from PhishLabs"""
    try:
        brands = get_phishlabs_brands()
        return jsonify({'success': True, 'brands': brands})
    except Exception as e:
        app_logger.error(f"Error getting PhishLabs brands: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@phishlabs_bp.route('/get_case_types', methods=['GET'])
def get_case_types_endpoint():
    """Get available case types from PhishLabs"""
    try:
        case_types = get_phishlabs_case_types()
        return jsonify({'success': True, 'case_types': case_types})
    except Exception as e:
        app_logger.error(f"Error getting PhishLabs case types: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@phishlabs_bp.route('/get_threat_types', methods=['GET'])
def get_threat_types_endpoint():
    """Get available threat types from PhishLabs"""
    try:
        threat_types = get_phishlabs_threat_types()
        return jsonify({'success': True, 'threat_types': threat_types})
    except Exception as e:
        app_logger.error(f"Error getting PhishLabs threat types: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})

@phishlabs_bp.route('/submit_finding', methods=['POST'])
def submit_finding_endpoint():
    """Submit finding to PhishLabs"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        # Validate required fields
        required_fields = ['domain', 'brand', 'case_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Submit to PhishLabs
        success, result = submit_to_phishlabs(data)
        
        if success:
            app_logger.info(f"Finding submitted to PhishLabs: {data['domain']}")
            return jsonify({'success': True, 'message': 'Finding submitted successfully', 'result': result}), 200
        else:
            app_logger.error(f"Failed to submit finding to PhishLabs: {result}")
            return jsonify({'success': False, 'message': f'Submission failed: {result.get("error", "Unknown error")}'}), 500
        
    except Exception as e:
        app_logger.error(f"Error submitting finding to PhishLabs: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@phishlabs_bp.route('/create_case', methods=['POST'])
def create_case_endpoint():
    """Create PhishLabs case"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        case_type = data.get('case_type', 'threat')
        
        if case_type == 'threat':
            success, result = submit_threat_case(
                domain=data.get('domain'),
                brand=data.get('brand'),
                threat_type=data.get('threat_type'),
                description=data.get('description', '')
            )
        elif case_type == 'monitor':
            success, result = submit_domain_case(
                domain=data.get('domain'),
                brand=data.get('brand'),
                threat_category=data.get('threat_category'),
                description=data.get('description', '')
            )
        else:
            return jsonify({'success': False, 'message': 'Invalid case type'}), 400
        
        if success:
            return jsonify({'success': True, 'message': 'Case created successfully', 'result': result}), 200
        else:
            return jsonify({'success': False, 'message': f'Case creation failed: {result.get("error", "Unknown error")}'}), 500
        
    except Exception as e:
        app_logger.error(f"Error creating PhishLabs case: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@phishlabs_bp.route('/get_cases', methods=['GET'])
def get_cases_endpoint():
    """Get PhishLabs cases"""
    try:
        # This would typically query the database for cases
        # For now, return a placeholder
        cases = []
        return jsonify({'success': True, 'cases': cases}), 200
    except Exception as e:
        app_logger.error(f"Error getting PhishLabs cases: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@phishlabs_bp.route('/test-connection', methods=['POST'])
def test_connection_post_endpoint():
    """Test PhishLabs connection (POST method)"""
    try:
        success, result = test_phishlabs_connection()
        if success:
            return jsonify({'success': True, 'message': 'PhishLabs connection successful'})
        else:
            return jsonify({'success': False, 'message': f'PhishLabs connection failed: {result}'})
    except Exception as e:
        app_logger.error(f"Error testing PhishLabs connection: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'})
