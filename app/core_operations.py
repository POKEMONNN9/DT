"""
Consolidated Core Operations Module
Combines all core operations functionality including findings, hashes, tags, scanning, and utilities
"""

import json
import os
import uuid
import csv
import re
import pytz
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple

from config import current_config as config
from logger import get_app_logger, get_findings_logger, log_finding_discovered, log_finding_processed, log_risk_assessment
from domaintools import scan_single_hash, scan_all_hashes

logger = get_app_logger()
findings_logger = get_findings_logger()

# =============================================================================
# FINDINGS OPERATIONS
# =============================================================================

class FindingsManager:
    def __init__(self, findings_file: str = None):
        if findings_file is None:
            self.findings_file = config.FINDINGS_FILE
        else:
            self.findings_file = findings_file
        self.ensure_findings_file()
    
    def ensure_findings_file(self):
        """Ensure the findings file exists with proper structure"""
        if not os.path.exists(self.findings_file):
            initial_data = {
                "findings": [],
                "metadata": {
                    "created_at": datetime.now().isoformat(),
                    "last_updated": datetime.now().isoformat(),
                    "total_findings": 0
                }
            }
            self._save_findings(initial_data)
    
    def _load_findings(self) -> Dict[str, Any]:
        """Load findings from JSON file"""
        try:
            with open(self.findings_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # Handle legacy format (array of findings)
                if isinstance(data, list):
                    new_format = {
                        "findings": data,
                        "metadata": {
                            "created_at": datetime.now().isoformat(),
                            "last_updated": datetime.now().isoformat(),
                            "total_findings": len(data)
                        }
                    }
                    self._save_findings(new_format)
                    return new_format
                
                return data
        except Exception as e:
            logger.error(f"Error loading findings: {e}")
            return {"findings": [], "metadata": {"total_findings": 0}}
    
    def _save_findings(self, data: Dict[str, Any]):
        """Save findings to JSON file"""
        try:
            data["metadata"]["last_updated"] = datetime.now().isoformat()
            data["metadata"]["total_findings"] = len(data["findings"])
            
            with open(self.findings_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error saving findings: {e}")
            return False
    
    def add_finding(self, finding_data: Dict[str, Any], asrm_rule: Dict = None) -> Tuple[bool, str, Optional[Dict]]:
        """Add new finding with optional ASRM rule"""
        try:
            # Generate unique ID
            finding_id = str(uuid.uuid4())
            finding_data['id'] = finding_id
            finding_data['created_at'] = datetime.now().isoformat()
            finding_data['last_updated'] = datetime.now().isoformat()
            # finding_data['updated_at'] = finding_data['last_updated']  # Alias for consistency
            
            # Add ASRM rule info if provided
            if asrm_rule:
                finding_data['asrm_rule_id'] = asrm_rule.get('id')
                finding_data['asrm_rule_name'] = asrm_rule.get('name')
                finding_data['asrm_rule_applied'] = asrm_rule.get('name')  # Store rule name for filtering
                finding_data['asrm_triggered'] = True
                finding_data['auto_submitted'] = True
            else:
                # Set default values for ASRM fields
                finding_data['asrm_rule_applied'] = None
                finding_data['asrm_triggered'] = False
            
            # Load current findings
            data = self._load_findings()
            data["findings"].append(finding_data)
            
            # Save updated findings
            if self._save_findings(data):
                log_finding_discovered(
                    finding_data.get('domain_name', 'unknown'),
                    finding_data.get('risk_score', 0),
                    finding_data.get('hash_name', 'unknown')
                )
                return True, f"Finding added successfully", finding_data
            else:
                return False, "Failed to save finding", None
                
        except Exception as e:
            logger.error(f"Error adding finding: {e}")
            return False, f"Error adding finding: {str(e)}", None
    
    def get_all_findings(self, filters: Dict = None) -> List[Dict]:
        """Get all findings with optional filters"""
        try:
            data = self._load_findings()
            findings = data.get("findings", [])
            
            if not filters:
                return findings
            
            # Apply filters
            filtered_findings = []
            for finding in findings:
                match = True
                
                for key, value in filters.items():
                    if key not in finding or finding[key] != value:
                        match = False
                        break
                
                if match:
                    filtered_findings.append(finding)
            
            return filtered_findings
            
        except Exception as e:
            logger.error(f"Error getting findings: {e}")
            return []
    
    def get_finding_by_id(self, finding_id: str) -> Optional[Dict]:
        """Get specific finding by ID"""
        try:
            data = self._load_findings()
            for finding in data.get("findings", []):
                if finding.get('id') == finding_id:
                    return finding
            return None
        except Exception as e:
            logger.error(f"Error getting finding by ID: {e}")
            return None
    
    def get_finding_by_domain(self, domain: str) -> Optional[Dict]:
        """Get finding by domain name"""
        try:
            data = self._load_findings()
            for finding in data.get("findings", []):
                if finding.get('domain_name') == domain:
                    return finding
            return None
        except Exception as e:
            logger.error(f"Error getting finding by domain: {e}")
            return None
    
    def update_finding(self, finding_id: str, updates: Dict[str, Any]) -> Optional[Dict]:
        """Update existing finding"""
        try:
            data = self._load_findings()
            for i, finding in enumerate(data["findings"]):
                if finding.get('id') == finding_id:
                    # Update fields
                    for key, value in updates.items():
                        finding[key] = value
                    
                    finding['last_updated'] = datetime.now().isoformat()
                    # finding['updated_at'] = finding['last_updated']  # Keep in sync
                    data["findings"][i] = finding
                    
                    if self._save_findings(data):
                        log_finding_processed(finding_id, updates.get('status', 'updated'))
                        return finding
                    else:
                        return None
            return None
        except Exception as e:
            logger.error(f"Error updating finding: {e}")
            return None
    
    def delete_finding(self, finding_id: str) -> bool:
        """Delete finding"""
        try:
            data = self._load_findings()
            for i, finding in enumerate(data["findings"]):
                if finding.get('id') == finding_id:
                    data["findings"].pop(i)
                    return self._save_findings(data)
            return False
        except Exception as e:
            logger.error(f"Error deleting finding: {e}")
            return False
    
    def get_findings_by_tags(self, tags: List[str]) -> List[Dict]:
        """Get findings by tags"""
        try:
            data = self._load_findings()
            findings = data.get("findings", [])
            
            filtered_findings = []
            for finding in findings:
                finding_tags = finding.get('tags', [])
                if any(tag in finding_tags for tag in tags):
                    filtered_findings.append(finding)
            
            return filtered_findings
        except Exception as e:
            logger.error(f"Error getting findings by tags: {e}")
            return []
    
    def get_findings_by_status(self, status: str) -> List[Dict]:
        """Get findings by status"""
        try:
            data = self._load_findings()
            findings = data.get("findings", [])
            
            filtered_findings = []
            for finding in findings:
                if finding.get('status') == status:
                    filtered_findings.append(finding)
            
            return filtered_findings
        except Exception as e:
            logger.error(f"Error getting findings by status: {e}")
            return []
    
    def get_findings_by_asrm_rule(self, rule_id: str) -> List[Dict]:
        """Get findings by ASRM rule"""
        try:
            data = self._load_findings()
            findings = data.get("findings", [])
            
            filtered_findings = []
            for finding in findings:
                # Check both asrm_rule_id and asrm_rule_applied for compatibility
                if (finding.get('asrm_rule_id') == rule_id or 
                    finding.get('asrm_rule_applied') == rule_id):
                    filtered_findings.append(finding)
            
            return filtered_findings
        except Exception as e:
            logger.error(f"Error getting findings by ASRM rule: {e}")
            return []
    
    def get_findings_summary(self) -> Dict[str, Any]:
        """Get findings summary statistics"""
        try:
            data = self._load_findings()
            findings = data.get("findings", [])
            
            total_findings = len(findings)
            status_counts = {}
            tag_counts = {}
            risk_score_ranges = {'low': 0, 'medium': 0, 'high': 0}
            
            for finding in findings:
                # Status counts
                status = finding.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
                
                # Tag counts
                tags = finding.get('tags', [])
                for tag in tags:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
                
                # Risk score ranges
                risk_score = finding.get('risk_score', 0)
                if risk_score >= 70:
                    risk_score_ranges['high'] += 1
                elif risk_score >= 40:
                    risk_score_ranges['medium'] += 1
                else:
                    risk_score_ranges['low'] += 1
            
            return {
                'total_findings': total_findings,
                'status_counts': status_counts,
                'tag_counts': tag_counts,
                'risk_score_ranges': risk_score_ranges,
                'last_updated': data.get("metadata", {}).get("last_updated")
            }
        except Exception as e:
            logger.error(f"Error getting findings summary: {e}")
            return {}
    
    def get_findings_stats(self) -> Dict[str, Any]:
        """Get detailed findings statistics"""
        try:
            data = self._load_findings()
            findings = data.get("findings", [])
            
            if not findings:
                return {
                    'total_findings': 0,
                    'average_risk_score': 0,
                    'high_risk_findings': 0,
                    'recent_findings': 0
                }
            
            # Calculate statistics
            risk_scores = [f.get('risk_score', 0) for f in findings]
            average_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
            
            # Risk level counts - only for approved findings
            approved_findings_list = [f for f in findings if f.get('status') == 'approved']
            high_risk_findings = len([f for f in approved_findings_list if f.get('risk_score', 0) >= 70])
            medium_risk_findings = len([f for f in approved_findings_list if 50 <= f.get('risk_score', 0) < 70])
            low_risk_findings = len([f for f in approved_findings_list if f.get('risk_score', 0) < 50])
            
            # Status counts
            pending_findings = len([f for f in findings if f.get('status') == 'pending'])
            approved_findings = len([f for f in findings if f.get('status') == 'approved'])
            
            # Recent findings (last 24 hours)
            recent_cutoff = datetime.now().timestamp() - 86400
            recent_findings = len([
                f for f in findings 
                if datetime.fromisoformat(f.get('created_at', '1970-01-01')).timestamp() > recent_cutoff
            ])
            
            # Infrastructure stats - only for approved findings
            unique_registrars = len(set(f.get('registrar') for f in approved_findings_list if f.get('registrar')))
            unique_countries = len(set(f.get('ip_country') for f in approved_findings_list if f.get('ip_country')))
            unique_isps = len(set(f.get('ip_isp') for f in approved_findings_list if f.get('ip_isp')))
            
            # Activity stats - only for approved findings
            auto_submissions = len([f for f in approved_findings_list if f.get('asrm_triggered', False)])
            manual_submissions = len([f for f in approved_findings_list if f.get('pl_submission', False) and not f.get('asrm_triggered', False)])
            
            # Calculate submission rate
            total_submissions = auto_submissions + manual_submissions
            submission_rate = f"{(total_submissions / len(approved_findings_list) * 100):.1f}%" if approved_findings_list else "0%"
            
            return {
                'total_findings': len(findings),
                'average_risk_score': round(average_risk_score, 2),
                'high_risk_findings': high_risk_findings,
                'medium_risk_findings': medium_risk_findings,
                'low_risk_findings': low_risk_findings,
                'pending_findings': pending_findings,
                'approved_findings': approved_findings,
                'recent_findings': recent_findings,
                'unique_registrars': unique_registrars,
                'unique_countries': unique_countries,
                'unique_isps': unique_isps,
                'auto_submissions': auto_submissions,
                'manual_submissions': manual_submissions,
                'submission_rate': submission_rate
            }
        except Exception as e:
            logger.error(f"Error getting findings stats: {e}")
            return {}
    
    def update_finding_status(self, finding_id: str, status: str, additional_data: Dict = None) -> Tuple[bool, str]:
        """Update finding status with optional additional data"""
        try:
            updates = {'status': status}
            if additional_data:
                updates.update(additional_data)
            
            result = self.update_finding(finding_id, updates)
            if result is not None:
                return True, f"Finding status updated to {status}"
            else:
                return False, "Finding not found"
        except Exception as e:
            logger.error(f"Error updating finding status: {e}")
            return False, f"Error updating finding status: {str(e)}"
    
    def get_phishlabs_submission_stats(self) -> Dict[str, Any]:
        """Get PhishLabs submission statistics"""
        try:
            data = self._load_findings()
            findings = data.get("findings", [])
            
            total_submissions = len([f for f in findings if f.get('auto_submitted', False)])
            successful_submissions = len([f for f in findings if f.get('phishlabs_submitted', False)])
            
            return {
                'total_submissions': total_submissions,
                'successful_submissions': successful_submissions,
                'failed_submissions': total_submissions - successful_submissions
            }
        except Exception as e:
            logger.error(f"Error getting PhishLabs submission stats: {e}")
            return {}
    
    def purge_old_findings(self, days_old: int = 90) -> int:
        """Purge old findings"""
        try:
            data = self._load_findings()
            findings = data.get("findings", [])
            
            cutoff_date = datetime.now().timestamp() - (days_old * 86400)
            original_count = len(findings)
            
            # Filter out old findings
            filtered_findings = []
            for finding in findings:
                created_at = finding.get('created_at', '1970-01-01')
                try:
                    finding_timestamp = datetime.fromisoformat(created_at).timestamp()
                    if finding_timestamp > cutoff_date:
                        filtered_findings.append(finding)
                except:
                    # Keep findings with invalid timestamps
                    filtered_findings.append(finding)
            
            data["findings"] = filtered_findings
            if self._save_findings(data):
                purged_count = original_count - len(filtered_findings)
                logger.info(f"Purged {purged_count} findings older than {days_old} days")
                return purged_count
            else:
                return 0
        except Exception as e:
            logger.error(f"Error purging old findings: {e}")
            return 0

# =============================================================================
# HASH OPERATIONS
# =============================================================================

def load_hashes():
    """Load search hashes from JSON file"""
    hashes_file = config.HASHES_FILE
    if not os.path.exists(hashes_file):
        return []
    
    try:
        with open(hashes_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading hashes from {hashes_file}: {e}")
        return []

def save_hashes(hashes):
    """Save search hashes to JSON file"""
    hashes_file = config.HASHES_FILE
    try:
        with open(hashes_file, 'w') as f:
            json.dump(hashes, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving hashes to {hashes_file}: {e}")
        return False

def add_hash(name_or_data, hash_value=None, description=''):
    """Add new search hash - accepts either individual parameters or a dictionary"""
    # Handle both dictionary and individual parameter formats
    if isinstance(name_or_data, dict):
        data = name_or_data
        name = data.get('name')
        hash_value = data.get('value') or data.get('hash')  # Support both 'value' and 'hash' fields
        description = data.get('description', '')
    else:
        name = name_or_data
    
    # Validate required fields
    if not name or not hash_value:
        return False, "Name and hash value are required"
    
    # Load existing hashes
    hashes = load_hashes()
    
    # Check for duplicates
    for existing_hash in hashes:
        if existing_hash.get('value') == hash_value:
            return False, "Hash already exists"
    
    # Create new hash
    new_hash = {
        'id': str(uuid.uuid4()),
        'name': name,
        'value': hash_value,
        'description': description,
        'active': True,
        'created_at': datetime.now().isoformat(),
        'last_scan': None,
        'scan_count': 0
    }
    
    # Add to list
    hashes.append(new_hash)
    
    # Save to file
    if save_hashes(hashes):
        logger.info(f"Added new hash: {name}")
        return True, f"Hash '{name}' added successfully"
    else:
        return False, "Failed to save hash"

def update_hash(hash_id, name_or_data, hash_value=None, description=None, active=None):
    """Update existing hash - accepts either individual parameters or a dictionary"""
    # Handle both dictionary and individual parameter formats
    if isinstance(name_or_data, dict):
        data = name_or_data
        name = data.get('name')
        hash_value = data.get('value') or data.get('hash')
        description = data.get('description')
        active = data.get('active')
    else:
        name = name_or_data
    
    # Load existing hashes
    hashes = load_hashes()
    
    # Find and update hash
    for i, existing_hash in enumerate(hashes):
        if existing_hash.get('id') == hash_id:
            # Update fields
            if name is not None:
                existing_hash['name'] = name
            if hash_value is not None:
                existing_hash['value'] = hash_value
            if description is not None:
                existing_hash['description'] = description
            if active is not None:
                existing_hash['active'] = active
            
            existing_hash['last_updated'] = datetime.now().isoformat()
            
            # Save to file
            if save_hashes(hashes):
                logger.info(f"Updated hash: {existing_hash['name']}")
                return True, f"Hash '{existing_hash['name']}' updated successfully"
            else:
                return False, "Failed to save hash"
    
    return False, "Hash not found"

def delete_hash(hash_id):
    """Delete hash"""
    hashes = load_hashes()
    
    # Find and remove hash
    for i, existing_hash in enumerate(hashes):
        if existing_hash.get('id') == hash_id:
            hash_name = existing_hash['name']
            hashes.pop(i)
            
            # Save to file
            if save_hashes(hashes):
                logger.info(f"Deleted hash: {hash_name}")
                return True, f"Hash '{hash_name}' deleted successfully"
            else:
                return False, "Failed to save hash"
    
    return False, "Hash not found"

def get_hash_by_id(hash_id):
    """Get hash by ID"""
    hashes = load_hashes()
    for hash_obj in hashes:
        if hash_obj.get('id') == hash_id:
            return hash_obj
    return None

def get_all_hashes():
    """Get all hashes"""
    return load_hashes()

def get_active_hashes():
    """Get only active hashes"""
    hashes = load_hashes()
    return [h for h in hashes if h.get('active', True)]

def get_hash_stats():
    """Get hash statistics"""
    hashes = load_hashes()
    active_hashes = [h for h in hashes if h.get('active', True)]
    
    return {
        'total_hashes': len(hashes),
        'active_hashes': len(active_hashes),
        'inactive_hashes': len(hashes) - len(active_hashes)
    }

# =============================================================================
# TAG OPERATIONS
# =============================================================================

class TagManager:
    def __init__(self, tags_file: str = None):
        if tags_file is None:
            self.tags_file = config.TAGS_FILE
        else:
            self.tags_file = tags_file
        self.ensure_tags_file()
    
    def ensure_tags_file(self):
        """Ensure tags.json exists with empty structure"""
        if not os.path.exists(self.tags_file):
            self._save_tags([])
    
    def _load_tags(self) -> List[Dict]:
        """Load tags from JSON file"""
        try:
            with open(self.tags_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_tags(self, tags: List[Dict]):
        """Save tags to JSON file"""
        try:
            with open(self.tags_file, 'w', encoding='utf-8') as f:
                json.dump(tags, f, indent=4, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error saving tags: {e}")
            return False
    
    def get_all_tags(self) -> List[Dict]:
        """Get all tags"""
        return self._load_tags()
    
    def get_tag_by_id(self, tag_id: str) -> Optional[Dict]:
        """Get tag by ID"""
        tags = self._load_tags()
        for tag in tags:
            if tag.get('id') == tag_id:
                return tag
        return None
    
    def get_tag_by_name(self, name: str) -> Optional[Dict]:
        """Get tag by name"""
        tags = self._load_tags()
        for tag in tags:
            if tag.get('name') == name:
                return tag
        return None
    
    def add_tag(self, name: str, description: str = "") -> Tuple[bool, str, Optional[Dict]]:
        """Add new tag"""
        try:
            # Check if tag already exists
            if self.get_tag_by_name(name):
                return False, f"Tag '{name}' already exists", None
            
            # Create new tag
            tag = {
                'id': str(uuid.uuid4()),
                'name': name,
                'description': description,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            # Add to list
            tags = self._load_tags()
            tags.append(tag)
            
            # Save to file
            if self._save_tags(tags):
                logger.info(f"Added new tag: {name}")
                return True, f"Tag '{name}' added successfully", tag
            else:
                return False, "Failed to save tag", None
                
        except Exception as e:
            logger.error(f"Error adding tag: {e}")
            return False, f"Error adding tag: {str(e)}", None
    
    def update_tag(self, tag_id: str, name: str, description: str = "") -> Tuple[bool, str]:
        """Update existing tag"""
        try:
            tags = self._load_tags()
            for i, tag in enumerate(tags):
                if tag.get('id') == tag_id:
                    # Check if new name conflicts with existing tag
                    if name != tag.get('name') and self.get_tag_by_name(name):
                        return False, f"Tag name '{name}' already exists"
                    
                    # Update tag
                    tag['name'] = name
                    tag['description'] = description
                    tag['updated_at'] = datetime.now().isoformat()
                    tags[i] = tag
                    
                    # Save to file
                    if self._save_tags(tags):
                        logger.info(f"Updated tag: {name}")
                        return True, f"Tag '{name}' updated successfully"
                    else:
                        return False, "Failed to save tag"
            
            return False, "Tag not found"
        except Exception as e:
            logger.error(f"Error updating tag: {e}")
            return False, f"Error updating tag: {str(e)}"
    
    def delete_tag(self, tag_id: str) -> Tuple[bool, str]:
        """Delete tag"""
        try:
            tags = self._load_tags()
            for i, tag in enumerate(tags):
                if tag.get('id') == tag_id:
                    tag_name = tag.get('name')
                    tags.pop(i)
                    
                    # Save to file
                    if self._save_tags(tags):
                        logger.info(f"Deleted tag: {tag_name}")
                        return True, f"Tag '{tag_name}' deleted successfully"
                    else:
                        return False, "Failed to save tag"
            
            return False, "Tag not found"
        except Exception as e:
            logger.error(f"Error deleting tag: {e}")
            return False, f"Error deleting tag: {str(e)}"
    
    def search_tags(self, query: str) -> List[Dict]:
        """Search tags by query"""
        try:
            tags = self._load_tags()
            query_lower = query.lower()
            
            matching_tags = []
            for tag in tags:
                if (query_lower in tag.get('name', '').lower() or 
                    query_lower in tag.get('description', '').lower()):
                    matching_tags.append(tag)
            
            return matching_tags
        except Exception as e:
            logger.error(f"Error searching tags: {e}")
            return []
    
    def get_tags_count(self) -> int:
        """Get total number of tags"""
        try:
            tags = self._load_tags()
            return len(tags)
        except Exception as e:
            logger.error(f"Error getting tags count: {e}")
            return 0

# Global tag manager instance
tag_manager = TagManager()

# Convenience functions
def get_all_tags() -> List[Dict]:
    """Get all tags"""
    return tag_manager.get_all_tags()

def add_tag(name: str, description: str = "") -> Tuple[bool, str, Optional[Dict]]:
    """Add new tag"""
    return tag_manager.add_tag(name, description)

def update_tag(tag_id: str, name: str, description: str = "") -> Tuple[bool, str]:
    """Update existing tag"""
    return tag_manager.update_tag(tag_id, name, description)

def delete_tag(tag_id: str) -> Tuple[bool, str]:
    """Delete tag"""
    return tag_manager.delete_tag(tag_id)

def get_tag_by_id(tag_id: str) -> Optional[Dict]:
    """Get tag by ID"""
    return tag_manager.get_tag_by_id(tag_id)

def get_tag_by_name(name: str) -> Optional[Dict]:
    """Get tag by name"""
    return tag_manager.get_tag_by_name(name)

# =============================================================================
# SCAN ACTIVITY MANAGER
# =============================================================================

def get_est_now():
    """Get current time in EST timezone"""
    try:
        est = pytz.timezone('US/Eastern')
        return datetime.now(est)
    except Exception:
        # Fallback to UTC if timezone not available
        return datetime.now()

def format_est_datetime(dt):
    """Format datetime in EST timezone"""
    try:
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt)
        
        est = pytz.timezone('US/Eastern')
        if dt.tzinfo is None:
            dt = est.localize(dt)
        else:
            dt = dt.astimezone(est)
        
        return dt.strftime('%Y-%m-%d %I:%M:%S %p EST')
    except Exception:
        return str(dt)

class ScanActivityManager:
    def __init__(self, data_file: str = None):
        if data_file is None:
            self.data_file = config.SCAN_ACTIVITY_FILE
        else:
            self.data_file = data_file
        self.ensure_data_file()
    
    def ensure_data_file(self):
        """Ensure the data file exists"""
        if not os.path.exists(self.data_file):
            initial_data = {
                "scan_activity": [],
                "metadata": {
                    "created_at": datetime.now().isoformat(),
                    "last_updated": datetime.now().isoformat()
                }
            }
            self._save_data(initial_data)
    
    def _load_data(self) -> Dict[str, Any]:
        """Load data from JSON file"""
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading scan activity data: {e}")
            return {"scan_activity": [], "metadata": {}}
    
    def _save_data(self, data: Dict[str, Any]):
        """Save data to JSON file"""
        try:
            data["metadata"]["last_updated"] = datetime.now().isoformat()
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error saving scan activity data: {e}")
            return False
    
    def get_scan_activity(self) -> List[Dict]:
        """Get scan activity"""
        try:
            data = self._load_data()
            return data.get("scan_activity", [])
        except Exception as e:
            logger.error(f"Error getting scan activity: {e}")
            return []
    
    def add_scan_activity(self, activity: Dict[str, Any]):
        """Add scan activity"""
        try:
            data = self._load_data()
            activity['timestamp'] = datetime.now().isoformat()
            activity['timestamp_est'] = get_est_now().isoformat()
            activity['timestamp_est_formatted'] = format_est_datetime(get_est_now())
            
            data["scan_activity"].append(activity)
            
            # Keep only last 1000 activities
            if len(data["scan_activity"]) > 1000:
                data["scan_activity"] = data["scan_activity"][-1000:]
            
            self._save_data(data)
            return True
        except Exception as e:
            logger.error(f"Error adding scan activity: {e}")
            return False
    
    def get_scan_history(self, limit: int = 50) -> List[Dict]:
        """Get scan history"""
        try:
            activities = self.get_scan_activity()
            return activities[-limit:] if activities else []
        except Exception as e:
            logger.error(f"Error getting scan history: {e}")
            return []
    
    def export_scan_history(self) -> List[Dict]:
        """Export scan history"""
        try:
            return self.get_scan_activity()
        except Exception as e:
            logger.error(f"Error exporting scan history: {e}")
            return []

# Global scan activity manager instance
scan_activity = ScanActivityManager()

# =============================================================================
# SCANNING OPERATIONS
# =============================================================================

def scan_hash(hash_obj):
    """Scan individual hash object"""
    try:
        from domaintools import scan_single_hash
        return scan_single_hash(hash_obj)
    except Exception as e:
        logger.error(f"Error scanning hash: {e}")
        return {
            'success': False,
            'hash_id': hash_obj.get('id'),
            'hash_name': hash_obj.get('name'),
            'domains_found': 0,
            'findings': [],
            'error': str(e)
        }

def scan_all_hashes():
    """Scan all hashes"""
    try:
        from domaintools import scan_all_hashes
        active_hashes = get_active_hashes()
        return scan_all_hashes(active_hashes)
    except Exception as e:
        logger.error(f"Error scanning all hashes: {e}")
        return {
            'success': False,
            'hashes_scanned': 0,
            'total_domains': 0,
            'findings': [],
            'error': str(e)
        }

def scan_specific_hash(hash_id):
    """Scan specific hash by ID"""
    try:
        hash_obj = get_hash_by_id(hash_id)
        if not hash_obj:
            return {
                'success': False,
                'hash_id': hash_id,
                'domains_found': 0,
                'findings': [],
                'error': 'Hash not found'
            }
        
        return scan_hash(hash_obj)
    except Exception as e:
        logger.error(f"Error scanning specific hash: {e}")
        return {
            'success': False,
            'hash_id': hash_id,
            'domains_found': 0,
            'findings': [],
            'error': str(e)
        }

def get_scan_statistics():
    """Get scan statistics"""
    try:
        findings_manager = FindingsManager()
        stats = findings_manager.get_findings_stats()
        
        # Add scan activity stats
        activities = scan_activity.get_scan_activity()
        recent_scans = len([a for a in activities if a.get('type') == 'scan_completed'])
        
        stats['recent_scans'] = recent_scans
        stats['total_scan_activities'] = len(activities)
        
        return stats
    except Exception as e:
        logger.error(f"Error getting scan statistics: {e}")
        return {}

def validate_hash_for_scanning(hash_obj):
    """Validate hash before scanning"""
    try:
        if not hash_obj:
            return False, "Hash object is None"
        
        if not hash_obj.get('active', True):
            return False, "Hash is not active"
        
        if not hash_obj.get('value'):
            return False, "Hash value is missing"
        
        return True, "Hash is valid for scanning"
    except Exception as e:
        logger.error(f"Error validating hash: {e}")
        return False, f"Validation error: {str(e)}"

def prepare_scan_environment():
    """Prepare environment for scanning"""
    try:
        # Check if DomainTools credentials are configured
        if not config.DOMAINTOOLS_USERNAME or not config.DOMAINTOOLS_API_KEY:
            return False, "DomainTools credentials not configured"
        
        # Check if findings file exists
        findings_manager = FindingsManager()
        if not os.path.exists(findings_manager.findings_file):
            findings_manager.ensure_findings_file()
        
        return True, "Scan environment is ready"
    except Exception as e:
        logger.error(f"Error preparing scan environment: {e}")
        return False, f"Environment preparation error: {str(e)}"

# =============================================================================
# UTILITIES OPERATIONS
# =============================================================================

def export_findings_to_csv(findings, filename, fields=None):
    """Export findings to CSV file"""
    try:
        if not findings:
            return False, "No findings to export"
        
        # Define default CSV columns
        default_columns = [
            'id', 'domain_name', 'hash_id', 'hash_name', 'first_seen', 'last_seen',
            'registrar', 'registrant_org', 'registrant_country', 'ip_address',
            'ip_country', 'ip_city', 'ip_region', 'risk_score', 'threat_score',
            'malware_score', 'phishing_score', 'spam_score',
            'status', 'created_at', 'last_updated', 'tags', 'phishlabs_case_number',
            'asrm_triggered', 'asrm_rule_applied'
        ]
        
        # Use specified fields or default columns
        columns = fields if fields else default_columns
        
        # Create CSV file
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=columns)
            writer.writeheader()
            
            for finding in findings:
                # Flatten the finding data
                row = {}
                for col in columns:
                    row[col] = finding.get(col, '')
                writer.writerow(row)
        
        logger.info(f"Exported {len(findings)} findings to {filename}")
        return True, f"Exported {len(findings)} findings to {filename}"
    except Exception as e:
        logger.error(f"Error exporting findings to CSV: {e}")
        return False, f"Export error: {str(e)}"

def export_findings_to_json(findings, filename, fields=None):
    """Export findings to JSON file"""
    try:
        if not findings:
            return False, "No findings to export"
        
        # If specific fields are requested, filter the data
        if fields:
            filtered_findings = []
            for finding in findings:
                filtered_finding = {}
                for field in fields:
                    if field in finding:
                        filtered_finding[field] = finding[field]
                filtered_findings.append(filtered_finding)
            findings = filtered_findings
        
        # Create JSON file
        with open(filename, 'w', encoding='utf-8') as jsonfile:
            json.dump(findings, jsonfile, indent=2, ensure_ascii=False, default=str)
        
        logger.info(f"Exported {len(findings)} findings to {filename}")
        return True, f"Exported {len(findings)} findings to {filename}"
    except Exception as e:
        logger.error(f"Error exporting findings to JSON: {e}")
        return False, f"Export error: {str(e)}"

def validate_domain_name(domain):
    """Validate domain name format"""
    try:
        if not domain:
            return False, "Domain name is empty"
        
        # Basic domain validation regex
        domain_pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
        
        if not re.match(domain_pattern, domain):
            return False, "Invalid domain name format"
        
        return True, "Domain name is valid"
    except Exception as e:
        logger.error(f"Error validating domain name: {e}")
        return False, f"Validation error: {str(e)}"

def validate_hash_value(hash_value):
    """Validate hash value format"""
    try:
        if not hash_value:
            return False, "Hash value is empty"
        
        # Basic hash validation (alphanumeric and common hash characters)
        hash_pattern = r'^[a-zA-Z0-9+/=_-]+$'
        
        if not re.match(hash_pattern, hash_value):
            return False, "Invalid hash value format"
        
        return True, "Hash value is valid"
    except Exception as e:
        logger.error(f"Error validating hash value: {e}")
        return False, f"Validation error: {str(e)}"

def format_risk_score(score):
    """Format risk score for display"""
    try:
        if score is None:
            return "N/A"
        
        score = float(score)
        if score >= 70:
            return f"{score:.1f} (High)"
        elif score >= 40:
            return f"{score:.1f} (Medium)"
        else:
            return f"{score:.1f} (Low)"
    except Exception as e:
        logger.error(f"Error formatting risk score: {e}")
        return "N/A"

def format_datetime(dt_string):
    """Format datetime string"""
    try:
        if not dt_string:
            return "N/A"
        
        dt = datetime.fromisoformat(dt_string)
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except Exception as e:
        logger.error(f"Error formatting datetime: {e}")
        return str(dt_string)

def truncate_text(text, max_length=100):
    """Truncate text to max length"""
    try:
        if not text:
            return ""
        
        if len(text) <= max_length:
            return text
        
        return text[:max_length-3] + "..."
    except Exception as e:
        logger.error(f"Error truncating text: {e}")
        return str(text)

def sanitize_filename(filename):
    """Sanitize filename for safe use"""
    try:
        # Remove or replace invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        filename = filename.strip()
        
        # Ensure filename is not empty
        if not filename:
            filename = "untitled"
        
        return filename
    except Exception as e:
        logger.error(f"Error sanitizing filename: {e}")
        return "untitled"

def calculate_file_size(file_path):
    """Calculate file size in bytes"""
    try:
        if os.path.exists(file_path):
            return os.path.getsize(file_path)
        return 0
    except Exception as e:
        logger.error(f"Error calculating file size: {e}")
        return 0

def clean_old_exports(days_old=7):
    """Clean old export files"""
    try:
        export_dir = config.EXPORT_DIRECTORY
        if not os.path.exists(export_dir):
            return 0
        
        cutoff_time = datetime.now().timestamp() - (days_old * 86400)
        cleaned_count = 0
        
        for filename in os.listdir(export_dir):
            file_path = os.path.join(export_dir, filename)
            if os.path.isfile(file_path):
                file_time = os.path.getmtime(file_path)
                if file_time < cutoff_time:
                    os.remove(file_path)
                    cleaned_count += 1
        
        logger.info(f"Cleaned {cleaned_count} old export files")
        return cleaned_count
    except Exception as e:
        logger.error(f"Error cleaning old exports: {e}")
        return 0

# =============================================================================
# REGEX VALIDATOR
# =============================================================================

def validate_regex(pattern):
    """Validate regex pattern"""
    try:
        re.compile(pattern)
        return True, "Valid regex pattern"
    except re.error as e:
        return False, f"Invalid regex pattern: {str(e)}"

def test_regex_pattern(pattern, text):
    """Test regex pattern against text"""
    try:
        compiled_pattern = re.compile(pattern)
        matches = compiled_pattern.findall(text)
        return True, f"Pattern matched {len(matches)} times", matches
    except re.error as e:
        return False, f"Invalid regex pattern: {str(e)}", []
    except Exception as e:
        return False, f"Error testing pattern: {str(e)}", []

def get_regex_suggestions(pattern):
    """Get regex suggestions"""
    try:
        suggestions = []
        
        # Common regex suggestions
        if not pattern:
            suggestions.append("Start with basic patterns like .* or ^.*$")
        elif pattern == ".*":
            suggestions.append("Consider more specific patterns like ^[a-zA-Z0-9]+$")
        elif ".*" in pattern and len(pattern) < 10:
            suggestions.append("Add more specific character classes like [a-zA-Z0-9]")
        
        return suggestions
    except Exception as e:
        logger.error(f"Error getting regex suggestions: {e}")
        return []

# =============================================================================
# HASH ENDPOINTS
# =============================================================================

from flask import Blueprint, request, jsonify

hash_bp = Blueprint('hash', __name__)

@hash_bp.route('/add', methods=['POST'])
def add_hash_endpoint():
    """Add new search hash"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
            
        name = data.get('name', '').strip()
        hash_value = data.get('value', '').strip()
        description = data.get('description', '').strip()
        
        if not name or not hash_value:
            return jsonify({'success': False, 'message': 'Name and value are required'}), 400
        
        success, result = add_hash(name, hash_value, description)
        
        if success:
            logger.info(f"New search hash added: {name}")
            created_hash = get_hash_by_id(result)
            if created_hash:
                return jsonify({'success': True, 'message': 'Hash created successfully', 'id': result, 'data': created_hash}), 201
            else:
                return jsonify({'success': True, 'message': 'Hash created successfully', 'id': result}), 201
        else:
            logger.warning(f"Failed to add hash: {result}")
            return jsonify({'success': False, 'message': result}), 400
            
    except Exception as e:
        logger.error(f"Error adding hash: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@hash_bp.route('/update/<hash_id>', methods=['PUT'])
def update_hash_endpoint(hash_id):
    """Update existing search hash"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        success, result = update_hash(hash_id, data)
        
        if success:
            logger.info(f"Search hash updated: {hash_id}")
            return jsonify({'success': True, 'message': result}), 200
        else:
            return jsonify({'success': False, 'message': result}), 400
            
    except Exception as e:
        logger.error(f"Error updating hash: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@hash_bp.route('/delete/<hash_id>', methods=['DELETE'])
def delete_hash_endpoint(hash_id):
    """Delete search hash"""
    try:
        success, result = delete_hash(hash_id)
        
        if success:
            logger.info(f"Search hash deleted: {hash_id}")
            return jsonify({'success': True, 'message': result}), 200
        else:
            return jsonify({'success': False, 'message': result}), 400
            
    except Exception as e:
        logger.error(f"Error deleting hash: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@hash_bp.route('/get/<hash_id>', methods=['GET'])
def get_hash_endpoint(hash_id):
    """Get specific hash"""
    try:
        hash_obj = get_hash_by_id(hash_id)
        if hash_obj:
            return jsonify({'success': True, 'hash': hash_obj}), 200
        else:
            return jsonify({'success': False, 'message': 'Hash not found'}), 404
            
    except Exception as e:
        logger.error(f"Error getting hash: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@hash_bp.route('/list', methods=['GET'])
def list_hashes_endpoint():
    """Get all hashes"""
    try:
        hashes = get_all_hashes()
        stats = get_hash_stats()
        
        return jsonify({
            'success': True, 
            'hashes': hashes,
            'stats': stats
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing hashes: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@hash_bp.route('/toggle/<hash_id>', methods=['PUT'])
def toggle_hash_endpoint(hash_id):
    """Toggle hash active status"""
    try:
        # Get current hash
        hash_obj = get_hash_by_id(hash_id)
        if not hash_obj:
            return jsonify({'success': False, 'message': 'Hash not found'}), 404
        
        # Toggle active status
        new_active = not hash_obj.get('active', False)
        success, result = update_hash(hash_id, {'active': new_active})
        
        if success:
            logger.info(f"Hash {hash_id} toggled to {'active' if new_active else 'inactive'}")
            return jsonify({
                'success': True, 
                'message': f'Hash {"activated" if new_active else "deactivated"} successfully',
                'active': new_active
            }), 200
        else:
            return jsonify({'success': False, 'message': result}), 400
            
    except Exception as e:
        logger.error(f"Error toggling hash: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

# =============================================================================
# FINDINGS ENDPOINTS
# =============================================================================

findings_bp = Blueprint('findings', __name__)

@findings_bp.route('/list', methods=['GET'])
def list_findings_endpoint():
    """Get all findings with optional filters"""
    try:
        findings_manager = FindingsManager()
        
        filters = {}
        if request.args.get('status'):
            filters['status'] = request.args.get('status')
        if request.args.get('hash_id'):
            filters['hash_id'] = request.args.get('hash_id')
        
        findings = findings_manager.get_all_findings(filters)
        summary = findings_manager.get_findings_summary()
        
        return jsonify({
            'success': True,
            'findings': findings,
            'summary': summary
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing findings: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@findings_bp.route('/get/<finding_id>', methods=['GET'])
def get_finding_endpoint(finding_id):
    """Get specific finding"""
    try:
        findings_manager = FindingsManager()
        finding = findings_manager.get_finding_by_id(finding_id)
        
        if finding:
            return jsonify({'success': True, 'finding': finding}), 200
        else:
            return jsonify({'success': False, 'message': 'Finding not found'}), 404
            
    except Exception as e:
        logger.error(f"Error getting finding: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@findings_bp.route('/update/<finding_id>', methods=['PUT'])
def update_finding_endpoint(finding_id):
    """Update finding"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        findings_manager = FindingsManager()
        updated_finding = findings_manager.update_finding(finding_id, data)
        
        if updated_finding:
            logger.info(f"Finding updated: {finding_id}")
            return jsonify({'success': True, 'finding': updated_finding}), 200
        else:
            return jsonify({'success': False, 'message': 'Finding not found or update failed'}), 404
            
    except Exception as e:
        logger.error(f"Error updating finding: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@findings_bp.route('/delete/<finding_id>', methods=['DELETE'])
def delete_finding_endpoint(finding_id):
    """Delete finding"""
    try:
        findings_manager = FindingsManager()
        success = findings_manager.delete_finding(finding_id)
        
        if success:
            logger.info(f"Finding deleted: {finding_id}")
            return jsonify({'success': True, 'message': 'Finding deleted successfully'}), 200
        else:
            return jsonify({'success': False, 'message': 'Finding not found'}), 404
            
    except Exception as e:
        logger.error(f"Error deleting finding: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@findings_bp.route('/stats', methods=['GET'])
def get_findings_stats_endpoint():
    """Get findings statistics"""
    try:
        findings_manager = FindingsManager()
        stats = findings_manager.get_findings_stats()
        
        return jsonify({'success': True, 'stats': stats}), 200
        
    except Exception as e:
        logger.error(f"Error getting findings stats: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@findings_bp.route('/export', methods=['GET'])
def export_findings_endpoint():
    """Export findings to CSV"""
    try:
        findings_manager = FindingsManager()
        findings = findings_manager.get_all_findings()
        
        if not findings:
            return jsonify({'success': False, 'message': 'No findings to export'}), 400
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"findings_export_{timestamp}.csv"
        filepath = os.path.join('exports', filename)
        
        os.makedirs('exports', exist_ok=True)
        
        success, result = export_findings_to_csv(findings, filepath)
        
        if success:
            from flask import send_file
            return send_file(filepath, as_attachment=True, download_name=filename)
        else:
            return jsonify({'success': False, 'message': result}), 500
            
    except Exception as e:
        logger.error(f"Error exporting findings: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

# =============================================================================
# SCANNING ENDPOINTS
# =============================================================================

scanning_bp = Blueprint('scanning', __name__)

@scanning_bp.route('/start', methods=['POST'])
def start_scan_endpoint():
    """Start scanning process"""
    try:
        active_hashes = get_all_hashes()
        active_hashes = [h for h in active_hashes if h.get('active', True)]
        
        if not active_hashes:
            return jsonify({
                'success': False,
                'message': 'No active hashes found for scanning'
            }), 400
        
        results = scan_all_hashes()
        
        scan_activity.add_scan_activity({
            'type': 'scan_started',
            'hashes_count': len(active_hashes),
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'message': 'Scan started successfully',
            'results': results
        }), 200
        
    except Exception as e:
        logger.error(f"Error starting scan: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@scanning_bp.route('/run_single', methods=['POST'])
def run_single_scan_endpoint():
    """Run scan for a single hash"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        hash_id = data.get('hash_id')
        if not hash_id:
            return jsonify({'success': False, 'message': 'Hash ID is required'}), 400
        
        # Record scan activity
        scan_activity.add_scan_activity({
            'type': 'single_hash_scan',
            'hash_id': hash_id,
            'timestamp': datetime.now().isoformat()
        })
        
        # Get hash object first
        hash_obj = get_hash_by_id(hash_id)
        if not hash_obj:
            return jsonify({'success': False, 'message': 'Hash not found'}), 404
        
        # Run single hash scan
        result = scan_single_hash(hash_obj)
        
        if result.get('success', False):
            logger.info(f"Single hash scan completed for hash {hash_id}")
            return jsonify({
                'success': True, 
                'message': 'Single hash scan completed successfully',
                'result': result
            }), 200
        else:
            logger.warning(f"Failed to run single hash scan: {result.get('message', 'Unknown error')}")
            return jsonify({'success': False, 'message': result.get('message', 'Unknown error')}), 400
            
    except Exception as e:
        logger.error(f"Error running single hash scan: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@scanning_bp.route('/status', methods=['GET'])
def get_scan_status_endpoint():
    """Get scan status"""
    try:
        stats = get_scan_statistics()
        
        return jsonify({
            'success': True,
            'status': 'ready',
            'stats': stats
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting scan status: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

# =============================================================================
# TAG ENDPOINTS
# =============================================================================

tag_bp = Blueprint('tag', __name__)

@tag_bp.route('/list', methods=['GET'])
def list_tags_endpoint():
    """Get all tags"""
    try:
        tags = get_all_tags()
        
        return jsonify({
            'success': True,
            'tags': tags,
            'count': len(tags)
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing tags: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@tag_bp.route('/add', methods=['POST'])
def add_tag_endpoint():
    """Add new tag"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        
        if not name:
            return jsonify({'success': False, 'message': 'Tag name is required'}), 400
        
        success, result, tag = add_tag(name, description)
        
        if success:
            logger.info(f"Tag added: {name}")
            return jsonify({'success': True, 'message': result, 'tag': tag}), 201
        else:
            return jsonify({'success': False, 'message': result}), 400
            
    except Exception as e:
        logger.error(f"Error adding tag: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@tag_bp.route('/update/<tag_id>', methods=['PUT'])
def update_tag_endpoint(tag_id):
    """Update existing tag"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        
        if not name:
            return jsonify({'success': False, 'message': 'Tag name is required'}), 400
        
        success, result = update_tag(tag_id, name, description)
        
        if success:
            logger.info(f"Tag updated: {tag_id}")
            return jsonify({'success': True, 'message': result}), 200
        else:
            return jsonify({'success': False, 'message': result}), 400
            
    except Exception as e:
        logger.error(f"Error updating tag: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@tag_bp.route('/delete/<tag_id>', methods=['DELETE'])
def delete_tag_endpoint(tag_id):
    """Delete tag"""
    try:
        success, result = delete_tag(tag_id)
        
        if success:
            logger.info(f"Tag deleted: {tag_id}")
            return jsonify({'success': True, 'message': result}), 200
        else:
            return jsonify({'success': False, 'message': result}), 400
            
    except Exception as e:
        logger.error(f"Error deleting tag: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@tag_bp.route('/get/<tag_id>', methods=['GET'])
def get_tag_endpoint(tag_id):
    """Get specific tag"""
    try:
        tag = get_tag_by_id(tag_id)
        if tag:
            return jsonify({'success': True, 'tag': tag}), 200
        else:
            return jsonify({'success': False, 'message': 'Tag not found'}), 404
            
    except Exception as e:
        logger.error(f"Error getting tag: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

# =============================================================================
# UTILS ENDPOINTS
# =============================================================================

utils_bp = Blueprint('utils', __name__)

@utils_bp.route('/validate/domain', methods=['POST'])
def validate_domain_endpoint():
    """Validate domain name"""
    try:
        data = request.json
        if not data or 'domain' not in data:
            return jsonify({'success': False, 'message': 'Domain is required'}), 400
        
        domain = data['domain'].strip()
        is_valid, message = validate_domain_name(domain)
        
        return jsonify({
            'success': True,
            'is_valid': is_valid,
            'message': message,
            'domain': domain
        }), 200
        
    except Exception as e:
        logger.error(f"Error validating domain: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@utils_bp.route('/validate/hash', methods=['POST'])
def validate_hash_endpoint():
    """Validate hash value"""
    try:
        data = request.json
        if not data or 'hash' not in data:
            return jsonify({'success': False, 'message': 'Hash is required'}), 400
        
        hash_value = data['hash'].strip()
        is_valid, message = validate_hash_value(hash_value)
        
        return jsonify({
            'success': True,
            'is_valid': is_valid,
            'message': message,
            'hash': hash_value
        }), 200
        
    except Exception as e:
        logger.error(f"Error validating hash: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@utils_bp.route('/health', methods=['GET'])
def health_check_endpoint():
    """Health check endpoint"""
    try:
        return jsonify({
            'success': True,
            'status': 'healthy',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500

@utils_bp.route('/log_error', methods=['POST'])
def log_error_endpoint():
    """Log error from frontend"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        error_message = data.get('message', 'Unknown error')
        error_source = data.get('source', 'frontend')
        
        logger.error(f"Frontend error from {error_source}: {error_message}")
        
        return jsonify({
            'success': True,
            'message': 'Error logged successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error logging frontend error: {e}")
        return jsonify({'success': False, 'message': f'Internal error: {str(e)}'}), 500
