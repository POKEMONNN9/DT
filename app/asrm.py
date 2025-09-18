"""
Consolidated ASRM Module
Combines all ASRM engine, integration, and endpoints functionality
"""

import json
import os
import re
import uuid
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from flask import Blueprint, request, jsonify

from config import current_config as config
from logger import get_app_logger
from constants import get_domaintools_field_keys, get_field_info

logger = get_app_logger()

# =============================================================================
# ASRM ENGINE CLASS
# =============================================================================

class ASRMEngine:
    """
    Core ASRM Engine for rule management and matching.
    Completely independent of PhishLabs or any external integrations.
    """
    
    def __init__(self, rules_file_path: str = None):
        """Initialize ASRM Engine with rules file path"""
        if rules_file_path is None:
            self.rules_file_path = config.ASRM_FILE
        else:
            self.rules_file_path = rules_file_path
        self.rules_cache = []
        self.last_loaded = None
        self._load_rules()
    
    def _load_rules(self) -> bool:
        """Load rules from JSON file into cache"""
        try:
            if os.path.exists(self.rules_file_path):
                with open(self.rules_file_path, 'r', encoding='utf-8') as f:
                    self.rules_cache = json.load(f)
                    self.last_loaded = datetime.now()
                    logger.info(f"ASRM Engine: Loaded {len(self.rules_cache)} rules from {self.rules_file_path}")
                    return True
            else:
                logger.warning(f"ASRM Engine: Rules file {self.rules_file_path} not found")
                self.rules_cache = []
                return False
        except Exception as e:
            logger.error(f"ASRM Engine: Error loading rules: {e}")
            self.rules_cache = []
            return False
    
    def load_rules(self) -> List[Dict]:
        """Load rules from file"""
        self._load_rules()
        return self.rules_cache.copy()
    
    def reload_rules(self) -> bool:
        """Reload rules from file"""
        return self._load_rules()
    
    def get_all_rules(self) -> List[Dict]:
        """Get all rules"""
        return self.rules_cache.copy()
    
    def get_enabled_rules(self) -> List[Dict]:
        """Get only enabled rules"""
        return [rule for rule in self.rules_cache if rule.get('enabled', False)]
    
    def get_rules_for_hash(self, hash_id: str) -> List[Dict]:
        """Get rules for specific hash"""
        return [rule for rule in self.rules_cache if rule.get('hash_id') == hash_id]
    
    def get_rule_by_id(self, rule_id: str) -> Optional[Dict]:
        """Get rule by ID"""
        for rule in self.rules_cache:
            if rule.get('id') == rule_id:
                return rule
        return None
    
    def validate_rule(self, rule: Dict) -> bool:
        """Validate rule structure"""
        try:
            # Check required fields
            required_fields = ['id', 'name', 'hash_id', 'enabled', 'conditions']
            for field in required_fields:
                if field not in rule:
                    logger.warning(f"ASRM Engine: Rule missing required field: {field}")
                    return False
            
            # Validate conditions
            conditions = rule.get('conditions', [])
            if not isinstance(conditions, list) or len(conditions) == 0:
                logger.warning("ASRM Engine: Rule must have at least one condition")
                return False
            
            for condition in conditions:
                if not self.validate_condition_operator(condition.get('field'), condition.get('operator')):
                    return False
            
            return True
        except Exception as e:
            logger.error(f"ASRM Engine: Error validating rule: {e}")
            return False
    
    def validate_condition_operator(self, field: str, operator: str) -> bool:
        """Validate condition operator for field"""
        try:
            # Get field information
            field_info = get_field_info(field)
            if not field_info:
                logger.warning(f"ASRM Engine: Unknown field: {field}")
                return False
            
            # Get valid operators for field type
            field_operators = {
                'text': ['contains', 'not_contains', 'equals', 'not_equals', 'regex'],
                'number': ['>=', '>', '==', '<=', '<', '!='],
                'boolean': ['==', '!='],
                'list': ['contains', 'not_contains', 'in', 'not_in']
            }
            
            field_type = field_info.get('type', 'text')
            valid_operators = field_operators.get(field_type, ['contains', 'not_contains', 'equals'])
            
            if operator not in valid_operators:
                logger.warning(f"ASRM Engine: Invalid operator '{operator}' for field '{field}' of type '{field_type}'")
                return False
            
            return True
        except Exception as e:
            logger.error(f"ASRM Engine: Error validating condition operator: {e}")
            return False
    
    def evaluate_condition(self, finding: Dict, condition: Dict) -> bool:
        """Evaluate single condition against finding"""
        try:
            field = condition.get('field')
            operator = condition.get('operator')
            value = condition.get('value')
            logical_operator = condition.get('logical_operator', 'AND')
            
            if not field or not operator or value is None:
                return False
            
            # Get field value from finding (support nested fields)
            field_value = self._get_nested_field_value(finding, field)
            if field_value is None:
                return False
            
            # Handle array fields (like admin_contact.email)
            if isinstance(field_value, list):
                field_value_str = ' '.join(str(item) for item in field_value)
            else:
                field_value_str = str(field_value)
            
            # Evaluate based on operator
            if operator == 'contains':
                return str(value).lower() in field_value_str.lower()
            elif operator == 'not_contains':
                return str(value).lower() not in field_value_str.lower()
            elif operator == 'equals':
                return field_value_str.lower() == str(value).lower()
            elif operator == 'not_equals':
                return field_value_str.lower() != str(value).lower()
            elif operator == 'regex':
                try:
                    pattern = re.compile(str(value), re.IGNORECASE)
                    return bool(pattern.search(field_value_str))
                except re.error:
                    logger.warning(f"ASRM Engine: Invalid regex pattern: {value}")
                    return False
            elif operator == '>=':
                try:
                    return float(field_value) >= float(value)
                except (ValueError, TypeError):
                    return False
            elif operator == '>':
                try:
                    return float(field_value) > float(value)
                except (ValueError, TypeError):
                    return False
            elif operator == '==':
                try:
                    # Handle boolean values
                    if isinstance(field_value, bool):
                        return field_value == (str(value).lower() in ['true', '1', 'yes', 'on'])
                    # Handle numeric values
                    return float(field_value) == float(value)
                except (ValueError, TypeError):
                    # Handle string values
                    return str(field_value).lower() == str(value).lower()
            elif operator == '<=':
                try:
                    return float(field_value) <= float(value)
                except (ValueError, TypeError):
                    return False
            elif operator == '<':
                try:
                    return float(field_value) < float(value)
                except (ValueError, TypeError):
                    return False
            elif operator == '!=':
                try:
                    # Handle boolean values
                    if isinstance(field_value, bool):
                        return field_value != (str(value).lower() in ['true', '1', 'yes', 'on'])
                    # Handle numeric values
                    return float(field_value) != float(value)
                except (ValueError, TypeError):
                    # Handle string values
                    return str(field_value).lower() != str(value).lower()
            elif operator == 'in':
                try:
                    value_list = value if isinstance(value, list) else [value]
                    return str(field_value).lower() in [str(v).lower() for v in value_list]
                except (ValueError, TypeError):
                    return False
            elif operator == 'not_in':
                try:
                    value_list = value if isinstance(value, list) else [value]
                    return str(field_value).lower() not in [str(v).lower() for v in value_list]
                except (ValueError, TypeError):
                    return False
            
            return False
        except Exception as e:
            logger.error(f"ASRM Engine: Error evaluating condition: {e}")
            return False
    
    def _get_nested_field_value(self, finding: Dict, field_path: str) -> Any:
        """Get value from nested field path (e.g., 'threat_profile.phishing.score')"""
        try:
            if '.' not in field_path:
                return finding.get(field_path)
            
            # Split the path and navigate through nested objects
            keys = field_path.split('.')
            current_value = finding
            
            for key in keys:
                if isinstance(current_value, dict):
                    current_value = current_value.get(key)
                elif isinstance(current_value, list) and key.isdigit():
                    # Handle array access with numeric index
                    index = int(key)
                    if 0 <= index < len(current_value):
                        current_value = current_value[index]
                    else:
                        return None
                else:
                    return None
                
                if current_value is None:
                    return None
            
            return current_value
        except Exception as e:
            logger.error(f"ASRM Engine: Error getting nested field value for '{field_path}': {e}")
            return None
    
    def evaluate_rule_conditions(self, finding: Dict, conditions: List[Dict]) -> bool:
        """Evaluate rule conditions with logical operators"""
        try:
            if not conditions:
                return False
            
            # Start with first condition
            result = self.evaluate_condition(finding, conditions[0])
            
            # Process remaining conditions with logical operators
            for i in range(1, len(conditions)):
                condition = conditions[i]
                logical_operator = condition.get('logical_operator', 'AND')
                condition_result = self.evaluate_condition(finding, condition)
                
                if logical_operator == 'AND':
                    result = result and condition_result
                elif logical_operator == 'OR':
                    result = result or condition_result
                else:
                    logger.warning(f"ASRM Engine: Unknown logical operator: {logical_operator}")
                    result = result and condition_result
            
            return result
        except Exception as e:
            logger.error(f"ASRM Engine: Error evaluating rule conditions: {e}")
            return False
    
    def check_rule_match(self, finding: Dict, rule: Dict) -> bool:
        """Check if finding matches rule"""
        try:
            if not rule.get('enabled', False):
                return False
            
            conditions = rule.get('conditions', [])
            return self.evaluate_rule_conditions(finding, conditions)
        except Exception as e:
            logger.error(f"ASRM Engine: Error checking rule match: {e}")
            return False
    
    def find_matching_rules(self, finding: Dict) -> List[Tuple[str, Dict]]:
        """Find all matching rules for finding"""
        try:
            matching_rules = []
            finding_hash_id = finding.get('hash_id')
            
            for rule in self.rules_cache:
                # Check if rule is enabled
                if not rule.get('enabled', False):
                    continue
                
                # Check hash assignment (global rules or specific hash)
                rule_hash_id = rule.get('hash_id')
                if rule_hash_id != 'global' and rule_hash_id != finding_hash_id:
                    continue
                
                # Check if rule conditions match
                if self.check_rule_match(finding, rule):
                    matching_rules.append((rule.get('id'), rule))
            
            return matching_rules
        except Exception as e:
            logger.error(f"ASRM Engine: Error finding matching rules: {e}")
            return []
    
    def get_rule_submission_config(self, rule: Dict) -> Dict:
        """Get submission configuration for rule"""
        try:
            return {
                'rule_id': rule.get('id'),
                'rule_name': rule.get('name'),
                'case_type': rule.get('case_type', 'threat'),
                'brand': rule.get('brand'),
                'threat_type': rule.get('threat_type'),
                'threat_category': rule.get('threat_category'),
                'malware_type': rule.get('malware_type'),
                'tag': rule.get('tag')
            }
        except Exception as e:
            logger.error(f"ASRM Engine: Error getting rule submission config: {e}")
            return {}
    
    def get_engine_stats(self) -> Dict:
        """Get engine statistics"""
        try:
            total_rules = len(self.rules_cache)
            enabled_rules = len(self.get_enabled_rules())
            
            return {
                'total_rules': total_rules,
                'enabled_rules': enabled_rules,
                'disabled_rules': total_rules - enabled_rules,
                'last_loaded': self.last_loaded.isoformat() if self.last_loaded else None,
                'rules_file': self.rules_file_path
            }
        except Exception as e:
            logger.error(f"ASRM Engine: Error getting engine stats: {e}")
            return {}

# Global ASRM engine instance
asrm_engine = ASRMEngine()

# =============================================================================
# ASRM INTEGRATION CLASS
# =============================================================================

class ASRMPhishLabsIntegration:
    """
    Integration layer between ASRM Engine and PhishLabs operations.
    Handles the auto-submission workflow while keeping concerns separated.
    """
    
    def __init__(self):
        """Initialize the integration"""
        self.submission_history = []
    
    def process_finding_for_auto_submission(self, finding: Dict) -> Dict:
        """
        Process a finding through ASRM rules and determine auto-submission actions.
        
        Args:
            finding: The finding data to process
            
        Returns:
            Dict: Processing result with matched rules and submission recommendations
        """
        # Handle None or invalid finding
        if finding is None:
            return {
                'finding_id': None,
                'domain_name': None,
                'hash_id': None,
                'matched_rules': [],
                'should_auto_submit': False,
                'submission_config': None,
                'processing_timestamp': datetime.now().isoformat(),
                'errors': ['Finding is None']
            }
        
        if not isinstance(finding, dict):
            return {
                'finding_id': None,
                'domain_name': None,
                'hash_id': None,
                'matched_rules': [],
                'should_auto_submit': False,
                'submission_config': None,
                'processing_timestamp': datetime.now().isoformat(),
                'errors': ['Finding is not a dictionary']
            }
        
        result = {
            'finding_id': finding.get('id'),
            'domain_name': finding.get('domain_name'),
            'hash_id': finding.get('hash_id'),
            'matched_rules': [],
            'should_auto_submit': False,
            'submission_config': None,
            'processing_timestamp': datetime.now().isoformat(),
            'errors': []
        }
        
        try:
            # Find matching rules using ASRM engine
            matching_rules = asrm_engine.find_matching_rules(finding)
            
            if not matching_rules:
                logger.debug(f"ASRM Integration: No matching rules for {finding.get('domain_name')}")
                return result
            
            # Process matched rules
            for rule_id, rule in matching_rules:
                rule_info = {
                    'rule_id': rule_id,
                    'rule_name': rule.get('name'),
                    'priority': rule.get('priority', 0)
                }
                result['matched_rules'].append(rule_info)
            
            # Select highest priority rule for auto-submission
            if matching_rules:
                # Sort by priority (if available) or use first match
                selected_rule_id, selected_rule = matching_rules[0]
                result['should_auto_submit'] = True
                result['submission_config'] = asrm_engine.get_rule_submission_config(selected_rule)
                
                logger.info(f"ASRM Integration: Found {len(matching_rules)} matching rules for {finding.get('domain_name')}, selected rule: {selected_rule.get('name')}")
        
        except Exception as e:
            error_msg = f"Error processing finding for auto-submission: {e}"
            logger.error(f"ASRM Integration: {error_msg}")
            result['errors'].append(error_msg)
        
        return result
    
    def auto_submit_finding(self, finding: Dict) -> Tuple[bool, Dict]:
        """
        Auto-submit a finding to PhishLabs if it matches ASRM rules.
        
        Args:
            finding: The finding data to potentially submit
            
        Returns:
            Tuple[bool, Dict]: (success, result_data)
        """
        try:
            # Process finding through ASRM
            processing_result = self.process_finding_for_auto_submission(finding)
            
            if not processing_result['should_auto_submit']:
                return False, {
                    'message': 'No matching auto-submission rules found',
                    'processing_result': processing_result
                }
            
            submission_config = processing_result['submission_config']
            
            # Import PhishLabs operations here to avoid circular imports
            from phishlabs_operations import auto_submit_to_phishlabs
            
            # Create rule object for PhishLabs submission
            rule_for_submission = {
                'id': submission_config['rule_id'],
                'name': submission_config['rule_name'],
                'case_type': submission_config['case_type'],
                'brand': submission_config['brand'],
                'threat_type': submission_config['threat_type'],
                'threat_category': submission_config['threat_category'],
                'malware_type': submission_config['malware_type'],
                'tag': submission_config['tag']
            }
            
            # Submit to PhishLabs
            success, phishlabs_result = auto_submit_to_phishlabs(finding, rule_for_submission)
            
            # Record submission attempt
            submission_record = {
                'timestamp': datetime.now().isoformat(),
                'finding_id': finding.get('id'),
                'domain_name': finding.get('domain_name'),
                'rule_id': submission_config['rule_id'],
                'rule_name': submission_config['rule_name'],
                'success': success,
                'phishlabs_result': phishlabs_result
            }
            self.submission_history.append(submission_record)
            
            return success, {
                'message': 'Auto-submission processed',
                'processing_result': processing_result,
                'submission_result': phishlabs_result,
                'submission_record': submission_record
            }
        
        except Exception as e:
            error_msg = f"Error in auto-submission workflow: {e}"
            logger.error(f"ASRM Integration: {error_msg}")
            return False, {'error': error_msg}
    
    def get_rules_summary_for_hash(self, hash_id: str) -> Dict:
        """
        Get a summary of rules configured for a specific hash.
        
        Args:
            hash_id: The hash ID to get rules for
            
        Returns:
            Dict: Summary of rules for the hash
        """
        try:
            rules = asrm_engine.get_rules_for_hash(hash_id)
            
            summary = {
                'hash_id': hash_id,
                'total_rules': len(rules),
                'rules': []
            }
            
            for rule in rules:
                rule_summary = {
                    'id': rule.get('id'),
                    'name': rule.get('name'),
                    'enabled': rule.get('enabled', False),
                    'case_type': rule.get('case_type'),
                    'brand': rule.get('brand'),
                    'threat_type': rule.get('threat_type'),
                    'condition_count': len(rule.get('conditions', []))
                }
                summary['rules'].append(rule_summary)
            
            return summary
        
        except Exception as e:
            logger.error(f"ASRM Integration: Error getting rules summary for hash {hash_id}: {e}")
            return {'error': str(e)}
    
    def validate_rule_configuration(self, rule: Dict) -> Tuple[bool, List[str]]:
        """
        Validate a rule configuration for completeness and correctness.
        
        Args:
            rule: The rule to validate
            
        Returns:
            Tuple[bool, List[str]]: (is_valid, list_of_errors)
        """
        errors = []
        
        # Required fields
        required_fields = ['id', 'name', 'hash_id', 'enabled', 'conditions', 'case_type', 'brand']
        for field in required_fields:
            if field not in rule:
                errors.append(f"Missing required field: {field}")
        
        # Validate conditions
        conditions = rule.get('conditions', [])
        if not conditions:
            errors.append("Rule must have at least one condition")
        else:
            for i, condition in enumerate(conditions):
                if not isinstance(condition, dict):
                    errors.append(f"Condition {i} is not a dictionary")
                    continue
                
                required_condition_fields = ['field', 'operator', 'value']
                for field in required_condition_fields:
                    if field not in condition:
                        errors.append(f"Condition {i} missing required field: {field}")
        
        # Validate case_type
        valid_case_types = ['threat', 'monitor']
        if rule.get('case_type') not in valid_case_types:
            errors.append(f"Invalid case_type. Must be one of: {valid_case_types}")
        
        # Validate threat_type if case_type is 'threat'
        if rule.get('case_type') == 'threat' and not rule.get('threat_type'):
            errors.append("threat_type is required when case_type is 'threat'")
        
        return len(errors) == 0, errors
    
    def get_submission_history(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Get the history of auto-submissions.
        
        Args:
            limit: Optional limit on number of records to return
            
        Returns:
            List[Dict]: List of submission records
        """
        history = list(self.submission_history)
        if limit:
            history = history[-limit:]
        return history
    
    def clear_submission_history(self):
        """Clear the submission history"""
        self.submission_history.clear()
        logger.info("ASRM Integration: Submission history cleared")

# Global integration instance
asrm_integration = ASRMPhishLabsIntegration()

# =============================================================================
# ASRM ENDPOINTS
# =============================================================================

# Create blueprints for ASRM endpoints
asrm_bp = Blueprint('asrm', __name__)
asrm_modern_bp = Blueprint('asrm_modern', __name__, url_prefix='/api/asrm/v2')

# Legacy ASRM endpoints
@asrm_bp.route('/list', methods=['GET'])
def list_rules():
    """Get all ASRM rules"""
    try:
        rules = asrm_engine.get_all_rules()
        logger.info(f"Retrieved {len(rules)} ASRM rules")
        return jsonify({'success': True, 'rules': rules}), 200
    except Exception as e:
        logger.error(f"Error listing ASRM rules: {e}")
        return jsonify({'success': False, 'message': f'Error loading rules: {str(e)}'}), 500

@asrm_bp.route('/add', methods=['POST'])
def add_rule_endpoint():
    """Add new ASRM rule"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        # Validate required fields
        required_fields = ['name', 'hash_id', 'conditions', 'case_type', 'brand', 'threat_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Generate rule ID
        rule_id = str(uuid.uuid4())
        data['id'] = rule_id
        data['created_at'] = datetime.now().isoformat()
        data['updated_at'] = datetime.now().isoformat()
        
        # Validate rule
        if not asrm_engine.validate_rule(data):
            return jsonify({'success': False, 'message': 'Invalid rule configuration'}), 400
        
        # Add to rules cache
        asrm_engine.rules_cache.append(data)
        
        # Save to file
        try:
            with open(asrm_engine.rules_file_path, 'w', encoding='utf-8') as f:
                json.dump(asrm_engine.rules_cache, f, indent=2, ensure_ascii=False)
            logger.info(f"Added new ASRM rule: {data['name']}")
            return jsonify({'success': True, 'message': 'Rule added successfully', 'rule_id': rule_id}), 201
        except Exception as e:
            # Remove from cache if save failed
            asrm_engine.rules_cache.remove(data)
            logger.error(f"Error saving rule to file: {e}")
            return jsonify({'success': False, 'message': f'Error saving rule: {str(e)}'}), 500
        
    except Exception as e:
        logger.error(f"Error adding ASRM rule: {e}")
        return jsonify({'success': False, 'message': f'Error adding rule: {str(e)}'}), 500

@asrm_bp.route('/update/<rule_id>', methods=['PUT'])
def update_rule_endpoint(rule_id):
    """Update existing ASRM rule"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        # Find rule in cache
        rule_index = None
        for i, rule in enumerate(asrm_engine.rules_cache):
            if rule.get('id') == rule_id:
                rule_index = i
                break
        
        if rule_index is None:
            return jsonify({'success': False, 'message': 'Rule not found'}), 404
        
        # Update rule data
        data['id'] = rule_id
        data['updated_at'] = datetime.now().isoformat()
        
        # Validate rule
        if not asrm_engine.validate_rule(data):
            return jsonify({'success': False, 'message': 'Invalid rule configuration'}), 400
        
        # Update in cache
        asrm_engine.rules_cache[rule_index] = data
        
        # Save to file
        try:
            with open(asrm_engine.rules_file_path, 'w', encoding='utf-8') as f:
                json.dump(asrm_engine.rules_cache, f, indent=2, ensure_ascii=False)
            logger.info(f"Updated ASRM rule: {data['name']}")
            return jsonify({'success': True, 'message': 'Rule updated successfully'}), 200
        except Exception as e:
            logger.error(f"Error saving updated rule to file: {e}")
            return jsonify({'success': False, 'message': f'Error saving rule: {str(e)}'}), 500
        
    except Exception as e:
        logger.error(f"Error updating ASRM rule: {e}")
        return jsonify({'success': False, 'message': f'Error updating rule: {str(e)}'}), 500

@asrm_bp.route('/delete/<rule_id>', methods=['DELETE'])
def delete_rule_endpoint(rule_id):
    """Delete ASRM rule"""
    try:
        # Find and remove rule from cache
        rule_found = False
        for i, rule in enumerate(asrm_engine.rules_cache):
            if rule.get('id') == rule_id:
                asrm_engine.rules_cache.pop(i)
                rule_found = True
                break
        
        if not rule_found:
            return jsonify({'success': False, 'message': 'Rule not found'}), 404
        
        # Save to file
        try:
            with open(asrm_engine.rules_file_path, 'w', encoding='utf-8') as f:
                json.dump(asrm_engine.rules_cache, f, indent=2, ensure_ascii=False)
            logger.info(f"Deleted ASRM rule: {rule_id}")
            return jsonify({'success': True, 'message': 'Rule deleted successfully'}), 200
        except Exception as e:
            logger.error(f"Error saving after rule deletion: {e}")
            return jsonify({'success': False, 'message': f'Error saving changes: {str(e)}'}), 500
        
    except Exception as e:
        logger.error(f"Error deleting ASRM rule: {e}")
        return jsonify({'success': False, 'message': f'Error deleting rule: {str(e)}'}), 500

@asrm_bp.route('/toggle/<rule_id>', methods=['PUT'])
def toggle_rule_endpoint(rule_id):
    """Toggle rule enabled/disabled"""
    try:
        # Find rule in cache
        rule_found = False
        updated_rule = None
        for rule in asrm_engine.rules_cache:
            if rule.get('id') == rule_id:
                rule['enabled'] = not rule.get('enabled', False)
                rule['updated_at'] = datetime.now().isoformat()
                updated_rule = rule
                rule_found = True
                break
        
        if not rule_found:
            return jsonify({'success': False, 'message': 'Rule not found'}), 404
        
        # Save to file
        try:
            with open(asrm_engine.rules_file_path, 'w', encoding='utf-8') as f:
                json.dump(asrm_engine.rules_cache, f, indent=2, ensure_ascii=False)
            logger.info(f"Toggled ASRM rule: {rule_id}")
            return jsonify({
                'success': True, 
                'message': 'Rule toggled successfully',
                'rule': updated_rule
            }), 200
        except Exception as e:
            logger.error(f"Error saving after rule toggle: {e}")
            return jsonify({'success': False, 'message': f'Error saving changes: {str(e)}'}), 500
        
    except Exception as e:
        logger.error(f"Error toggling ASRM rule: {e}")
        return jsonify({'success': False, 'message': f'Error toggling rule: {str(e)}'}), 500

@asrm_bp.route('/get/<rule_id>', methods=['GET'])
def get_rule_endpoint(rule_id):
    """Get specific ASRM rule"""
    try:
        rule = asrm_engine.get_rule_by_id(rule_id)
        if not rule:
            return jsonify({'success': False, 'message': 'Rule not found'}), 404
        
        return jsonify({'success': True, 'rule': rule}), 200
    except Exception as e:
        logger.error(f"Error getting ASRM rule: {e}")
        return jsonify({'success': False, 'message': f'Error getting rule: {str(e)}'}), 500

@asrm_bp.route('/stats', methods=['GET'])
def get_rules_stats():
    """Get ASRM statistics"""
    try:
        stats = asrm_engine.get_engine_stats()
        return jsonify({'success': True, 'stats': stats}), 200
    except Exception as e:
        logger.error(f"Error getting ASRM stats: {e}")
        return jsonify({'success': False, 'message': f'Error getting stats: {str(e)}'}), 500

@asrm_bp.route('/field-options', methods=['GET'])
def get_field_options():
    """Get available field options for rule conditions"""
    try:
        field_keys = get_domaintools_field_keys()
        field_options = []
        
        for field_key in field_keys:
            field_info = get_field_info(field_key)
            if field_info:
                field_options.append({
                    'key': field_key,
                    'display_name': field_info.get('display_name', field_key),
                    'description': field_info.get('description', ''),
                    'type': field_info.get('type', 'text'),
                    'operator_type': field_info.get('operator_type', field_info.get('type', 'text')),
                    'default_operator': field_info.get('operator', '=')
                })
        
        return jsonify({'success': True, 'fields': field_options}), 200
    except Exception as e:
        logger.error(f"Error getting field options: {e}")
        return jsonify({'success': False, 'message': f'Error getting field options: {str(e)}'}), 500

@asrm_bp.route('/operators/<field_type>', methods=['GET'])
def get_operators(field_type):
    """Get valid operators for field type"""
    try:
        operators = {
            'text': ['contains', 'not_contains', 'equals', 'not_equals', 'regex'],
            'string': ['contains', 'not_contains', 'equals', 'not_equals', 'regex'],
            'number': ['>=', '>', '==', '<=', '<', '!='],
            'boolean': ['==', '!='],
            'list': ['contains', 'not_contains', 'in', 'not_in'],
            'exact_match': ['==', '!=', 'equals', 'not_equals']
        }
        
        valid_operators = operators.get(field_type, ['contains', 'not_contains', 'equals'])
        
        # Convert to objects with value and label
        operator_objects = []
        for op in valid_operators:
            operator_objects.append({
                'value': op,
                'label': op.replace('_', ' ').title()
            })
        
        return jsonify({'success': True, 'operators': operator_objects}), 200
    except Exception as e:
        logger.error(f"Error getting operators: {e}")
        return jsonify({'success': False, 'message': f'Error getting operators: {str(e)}'}), 500

# Modern ASRM endpoints
@asrm_modern_bp.route('/rules', methods=['GET'])
def get_all_asrm_rules():
    """Get all ASRM rules with filtering options"""
    try:
        # Get query parameters
        enabled_only = request.args.get('enabled_only', 'false').lower() == 'true'
        hash_id = request.args.get('hash_id')
        
        if enabled_only:
            rules = asrm_engine.get_enabled_rules()
        else:
            rules = asrm_engine.get_all_rules()
        
        # Filter by hash_id if provided
        if hash_id:
            rules = [rule for rule in rules if rule.get('hash_id') == hash_id]
        
        return jsonify({
            'success': True,
            'data': rules,
            'count': len(rules),
            'filters': {
                'enabled_only': enabled_only,
                'hash_id': hash_id
            }
        })
    
    except Exception as e:
        logger.error(f"Error getting ASRM rules: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asrm_modern_bp.route('/rules/<rule_id>', methods=['GET'])
def get_asrm_rule(rule_id):
    """Get a specific ASRM rule by ID"""
    try:
        rule = asrm_engine.get_rule_by_id(rule_id)
        
        if not rule:
            return jsonify({'success': False, 'error': 'Rule not found'}), 404
        
        return jsonify({
            'success': True,
            'data': rule
        })
    
    except Exception as e:
        logger.error(f"Error getting ASRM rule {rule_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asrm_modern_bp.route('/rules/<rule_id>/test', methods=['POST'])
def test_asrm_rule(rule_id):
    """Test a rule against sample finding data"""
    try:
        rule = asrm_engine.get_rule_by_id(rule_id)
        
        if not rule:
            return jsonify({'success': False, 'error': 'Rule not found'}), 404
        
        # Get test finding data from request
        test_finding = request.json.get('finding', {})
        
        if not test_finding:
            return jsonify({'success': False, 'error': 'Test finding data required'}), 400
        
        # Test the rule
        matches = asrm_engine.check_rule_match(test_finding, rule)
        
        # Get detailed condition evaluation
        conditions = rule.get('conditions', [])
        condition_results = []
        
        for i, condition in enumerate(conditions):
            condition_match = asrm_engine.evaluate_condition(test_finding, condition)
            condition_results.append({
                'condition_index': i,
                'field': condition.get('field'),
                'operator': condition.get('operator'),
                'value': condition.get('value'),
                'logical_operator': condition.get('logical_operator', 'AND' if i > 0 else ''),
                'matches': condition_match
            })
        
        return jsonify({
            'success': True,
            'data': {
                'rule_id': rule_id,
                'rule_name': rule.get('name'),
                'overall_match': matches,
                'test_finding': test_finding,
                'condition_results': condition_results
            }
        })
    
    except Exception as e:
        logger.error(f"Error testing ASRM rule {rule_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asrm_modern_bp.route('/findings/<finding_id>/match', methods=['POST'])
def match_finding_against_rules(finding_id):
    """Match a finding against all relevant ASRM rules"""
    try:
        # Get finding data from request
        finding = request.json.get('finding', {})
        
        if not finding:
            return jsonify({'success': False, 'error': 'Finding data required'}), 400
        
        # Process finding through ASRM
        processing_result = asrm_integration.process_finding_for_auto_submission(finding)
        
        return jsonify({
            'success': True,
            'data': processing_result
        })
    
    except Exception as e:
        logger.error(f"Error matching finding {finding_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asrm_modern_bp.route('/findings/<finding_id>/auto-submit', methods=['POST'])
def auto_submit_finding(finding_id):
    """Auto-submit a finding through ASRM if rules match"""
    try:
        # Get finding data from request
        finding = request.json.get('finding', {})
        
        if not finding:
            return jsonify({'success': False, 'error': 'Finding data required'}), 400
        
        # Process auto-submission
        success, result = asrm_integration.auto_submit_finding(finding)
        
        return jsonify({
            'success': success,
            'data': result
        })
    
    except Exception as e:
        logger.error(f"Error auto-submitting finding {finding_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asrm_modern_bp.route('/hash/<hash_id>/rules', methods=['GET'])
def get_rules_for_hash(hash_id):
    """Get all rules configured for a specific hash with summary"""
    try:
        summary = asrm_integration.get_rules_summary_for_hash(hash_id)
        
        return jsonify({
            'success': True,
            'data': summary
        })
    
    except Exception as e:
        logger.error(f"Error getting rules for hash {hash_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asrm_modern_bp.route('/engine/stats', methods=['GET'])
def get_engine_stats():
    """Get statistics about the ASRM engine"""
    try:
        stats = asrm_engine.get_engine_stats()
        
        return jsonify({
            'success': True,
            'data': stats
        })
    
    except Exception as e:
        logger.error(f"Error getting engine stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asrm_modern_bp.route('/engine/reload', methods=['POST'])
def reload_engine():
    """Reload the ASRM engine rules from file"""
    try:
        success = asrm_engine.reload_rules()
        stats = asrm_engine.get_engine_stats()
        
        return jsonify({
            'success': success,
            'message': 'Rules reloaded successfully' if success else 'Failed to reload rules',
            'data': stats
        })
    
    except Exception as e:
        logger.error(f"Error reloading engine: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asrm_modern_bp.route('/rules/<rule_id>/validate', methods=['POST'])
def validate_rule(rule_id):
    """Validate a rule configuration"""
    try:
        rule = asrm_engine.get_rule_by_id(rule_id)
        
        if not rule:
            return jsonify({'success': False, 'error': 'Rule not found'}), 404
        
        is_valid, errors = asrm_integration.validate_rule_configuration(rule)
        
        return jsonify({
            'success': True,
            'data': {
                'rule_id': rule_id,
                'is_valid': is_valid,
                'errors': errors,
                'rule_name': rule.get('name')
            }
        })
    
    except Exception as e:
        logger.error(f"Error validating rule {rule_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asrm_modern_bp.route('/submission-history', methods=['GET'])
def get_submission_history():
    """Get auto-submission history"""
    try:
        limit = request.args.get('limit', type=int)
        history = asrm_integration.get_submission_history(limit)
        
        return jsonify({
            'success': True,
            'data': history,
            'count': len(history)
        })
    
    except Exception as e:
        logger.error(f"Error getting submission history: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asrm_modern_bp.route('/field-options', methods=['GET'])
def get_field_options_modern():
    """Get available field options for rule conditions"""
    try:
        field_options = {
            'fields': [
                # Core domain fields
                {
                    'value': 'domain_name',
                    'label': 'Domain Name',
                    'description': 'Domain name',
                    'operators': ['contains', 'not_contains', 'equals', 'starts_with', 'ends_with', 'regex']
                },
                {
                    'value': 'website_title',
                    'label': 'Website Title',
                    'description': 'Website title',
                    'operators': ['contains', 'not_contains', 'equals', 'starts_with', 'ends_with', 'regex']
                },
                {
                    'value': 'registrar',
                    'label': 'Registrar',
                    'description': 'Domain registrar information',
                    'operators': ['contains', 'not_contains', 'equals']
                },
                {
                    'value': 'risk_score',
                    'label': 'Risk Score',
                    'description': 'Risk score',
                    'operators': ['>=', '>', '==', '<=', '<', '!=']
                },
                {
                    'value': 'is_active',
                    'label': 'Is Active',
                    'description': 'Domain active status',
                    'operators': ['equals', 'not_equals']
                },
                
                # IP and infrastructure
                {
                    'value': 'ip_address',
                    'label': 'IP Address',
                    'description': 'IP address',
                    'operators': ['contains', 'not_contains', 'equals', 'starts_with', 'ends_with', 'regex']
                },
                {
                    'value': 'ip_country',
                    'label': 'IP Country',
                    'description': 'Country code of IP address',
                    'operators': ['==', '!=', 'contains', 'not_contains']
                },
                {
                    'value': 'ip_asn',
                    'label': 'IP ASN',
                    'description': 'IP ASN',
                    'operators': ['contains', 'not_contains', 'equals']
                },
                {
                    'value': 'ip_isp',
                    'label': 'IP ISP',
                    'description': 'IP ISP',
                    'operators': ['contains', 'not_contains', 'equals']
                },
                
                # Server information
                {
                    'value': 'name_servers_data',
                    'label': 'Name Servers',
                    'description': 'DNS name servers',
                    'operators': ['contains', 'not_contains']
                },
                {
                    'value': 'mail_servers_data',
                    'label': 'Mail Servers',
                    'description': 'Mail servers',
                    'operators': ['contains', 'not_contains']
                },
                {
                    'value': 'server_type',
                    'label': 'Server Type',
                    'description': 'Server type',
                    'operators': ['contains', 'not_contains', 'equals']
                },
                {
                    'value': 'response_code',
                    'label': 'Response Code',
                    'description': 'HTTP response code',
                    'operators': ['>=', '>', '==', '<=', '<', '!=']
                },
                
                # Contact information (nested)
                {
                    'value': 'admin_contact.country',
                    'label': 'Admin Country',
                    'description': 'Admin contact country',
                    'operators': ['==', '!=', 'contains', 'not_contains']
                },
                {
                    'value': 'admin_contact.org',
                    'label': 'Admin Organization',
                    'description': 'Admin contact organization',
                    'operators': ['contains', 'not_contains', 'equals']
                },
                {
                    'value': 'admin_contact.name',
                    'label': 'Admin Name',
                    'description': 'Admin contact name',
                    'operators': ['contains', 'not_contains', 'equals']
                },
                {
                    'value': 'admin_contact.email',
                    'label': 'Admin Email',
                    'description': 'Admin contact email',
                    'operators': ['contains', 'not_contains', 'equals']
                },
                {
                    'value': 'registrant_contact.country',
                    'label': 'Registrant Country',
                    'description': 'Registrant contact country',
                    'operators': ['==', '!=', 'contains', 'not_contains']
                },
                {
                    'value': 'registrant_contact.org',
                    'label': 'Registrant Organization',
                    'description': 'Registrant contact organization',
                    'operators': ['contains', 'not_contains', 'equals']
                },
                {
                    'value': 'registrant_contact.name',
                    'label': 'Registrant Name',
                    'description': 'Registrant contact name',
                    'operators': ['contains', 'not_contains', 'equals']
                },
                {
                    'value': 'registrant_contact.email',
                    'label': 'Registrant Email',
                    'description': 'Registrant contact email',
                    'operators': ['contains', 'not_contains', 'equals']
                },
                
                # Threat profile (nested)
                {
                    'value': 'threat_profile.phishing.score',
                    'label': 'Phishing Score',
                    'description': 'Phishing threat score',
                    'operators': ['>=', '>', '==', '<=', '<', '!=']
                },
                {
                    'value': 'threat_profile.malware.score',
                    'label': 'Malware Score',
                    'description': 'Malware threat score',
                    'operators': ['>=', '>', '==', '<=', '<', '!=']
                },
                {
                    'value': 'threat_profile.spam.score',
                    'label': 'Spam Score',
                    'description': 'Spam threat score',
                    'operators': ['>=', '>', '==', '<=', '<', '!=']
                },
                
                
            ],
            'logical_operators': [
                {'value': 'AND', 'label': 'AND', 'description': 'Both conditions must be true'},
                {'value': 'OR', 'label': 'OR', 'description': 'Either condition can be true'}
            ]
        }
        
        return jsonify({
            'success': True,
            'data': field_options
        })
    
    except Exception as e:
        logger.error(f"Error getting field options: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_matching_rules_for_finding(finding: Dict) -> List[Tuple[str, Dict]]:
    """Get matching rules for finding"""
    return asrm_engine.find_matching_rules(finding)

def get_rules_for_hash(hash_id: str) -> List[Dict]:
    """Get rules for hash"""
    return asrm_engine.get_rules_for_hash(hash_id)

def get_all_rules() -> List[Dict]:
    """Get all rules"""
    return asrm_engine.get_all_rules()

def reload_rules():
    """Reload rules"""
    return asrm_engine.reload_rules()

def check_if_finding_matches_rule(finding: Dict, rule: Dict) -> bool:
    """Check if finding matches rule"""
    return asrm_engine.check_rule_match(finding, rule)

def process_finding_for_auto_submission(finding: Dict) -> Dict:
    """Process a finding for auto-submission"""
    return asrm_integration.process_finding_for_auto_submission(finding)

def auto_submit_finding_via_asrm(finding: Dict) -> Tuple[bool, Dict]:
    """Auto-submit a finding via ASRM"""
    return asrm_integration.auto_submit_finding(finding)

def get_asrm_rules_for_hash(hash_id: str) -> Dict:
    """Get ASRM rules summary for a hash"""
    return asrm_integration.get_rules_summary_for_hash(hash_id)
