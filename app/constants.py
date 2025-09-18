"""
Optimized Constants for DomainTools Monitor
Simplified, focused constants with better organization
"""
from typing import Dict, List, Any

# =============================================================================
# DOMAINTOOLS API RESPONSE FIELDS
# =============================================================================
DOMAINTOOLS_FIELDS = {
    # Core domain information
    'domain_name': {
        'key': 'domain_name',
        'display_name': 'Domain Name',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'registrar': {
        'key': 'registrar',
        'display_name': 'Registrar',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'ip_country': {
        'key': 'ip_country',
        'display_name': 'Country',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'ip_address': {
        'key': 'ip_address',
        'display_name': 'IP Address',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'risk_score': {
        'key': 'risk_score',
        'display_name': 'Risk Score',
        'type': 'number',
        'operator_type': 'number',
        'operator': '>=',
        'csv_export': True,
        'dashboard_stats': True
    },
    'phishing_score': {
        'key': 'threat_profile.phishing.score',
        'display_name': 'Phishing Score',
        'type': 'number',
        'operator_type': 'number',
        'operator': '>=',
        'csv_export': True,
        'dashboard_stats': True
    },
    'malware_score': {
        'key': 'threat_profile.malware.score',
        'display_name': 'Malware Score',
        'type': 'number',
        'operator_type': 'number',
        'operator': '>=',
        'csv_export': True,
        'dashboard_stats': True
    },
    'spam_score': {
        'key': 'threat_profile.spam.score',
        'display_name': 'Spam Score',
        'type': 'number',
        'operator_type': 'number',
        'operator': '>=',
        'csv_export': True,
        'dashboard_stats': True
    },
    'ip_isp': {
        'key': 'ip_isp',
        'display_name': 'ISP',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'ip_asn': {
        'key': 'ip_asn',
        'display_name': 'ASN',
        'type': 'number',
        'operator_type': 'number',
        'operator': '==',
        'csv_export': True,
        'dashboard_stats': True
    },
    'website_title': {
        'key': 'website_title',
        'display_name': 'Website Title',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'server_type': {
        'key': 'server_type',
        'display_name': 'Server Type',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'ssl_issuer': {
        'key': 'ssl_issuer',
        'display_name': 'SSL Issuer',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'ssl_subject': {
        'key': 'ssl_subject',
        'display_name': 'SSL Subject',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'create_date': {
        'key': 'create_date',
        'display_name': 'Creation Date',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'registrant_name': {
        'key': 'registrant_name',
        'display_name': 'Registrant Name',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'registrant_org': {
        'key': 'registrant_org',
        'display_name': 'Registrant Organization',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'admin_email': {
        'key': 'admin_contact.email',
        'display_name': 'Admin Email',
        'type': 'array',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'admin_org': {
        'key': 'admin_contact.org',
        'display_name': 'Admin Organization',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'admin_country': {
        'key': 'admin_contact.country',
        'display_name': 'Admin Country',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'equals',
        'csv_export': True,
        'dashboard_stats': True
    },
    'registrant_email': {
        'key': 'registrant_contact.email',
        'display_name': 'Registrant Email',
        'type': 'array',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'registrant_org': {
        'key': 'registrant_contact.org',
        'display_name': 'Registrant Organization',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'registrant_country': {
        'key': 'registrant_contact.country',
        'display_name': 'Registrant Country',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'equals',
        'csv_export': True,
        'dashboard_stats': True
    },
    'response_code': {
        'key': 'response_code',
        'display_name': 'HTTP Response Code',
        'type': 'number',
        'operator_type': 'number',
        'operator': '==',
        'csv_export': True,
        'dashboard_stats': True
    },
    'first_seen': {
        'key': 'first_seen',
        'display_name': 'First Seen',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'expiration_date': {
        'key': 'expiration_date',
        'display_name': 'Expiration Date',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'admin_name': {
        'key': 'admin_contact.name',
        'display_name': 'Admin Name',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'admin_phone': {
        'key': 'admin_contact.phone',
        'display_name': 'Admin Phone',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'admin_city': {
        'key': 'admin_contact.city',
        'display_name': 'Admin City',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'admin_state': {
        'key': 'admin_contact.state',
        'display_name': 'Admin State',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'registrant_name': {
        'key': 'registrant_contact.name',
        'display_name': 'Registrant Name',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'registrant_phone': {
        'key': 'registrant_contact.phone',
        'display_name': 'Registrant Phone',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'registrant_city': {
        'key': 'registrant_contact.city',
        'display_name': 'Registrant City',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'registrant_state': {
        'key': 'registrant_contact.state',
        'display_name': 'Registrant State',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'google_analytics_id': {
        'key': 'google_analytics_id',
        'display_name': 'Google Analytics ID',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'is_active': {
        'key': 'is_active',
        'display_name': 'Is Active',
        'type': 'boolean',
        'operator_type': 'boolean',
        'operator': 'equals',
        'csv_export': True,
        'dashboard_stats': True
    },
    'name_servers_data': {
        'key': 'name_servers_data',
        'display_name': 'Name Servers Data',
        'type': 'array',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'mail_servers_data': {
        'key': 'mail_servers_data',
        'display_name': 'Mail Servers Data',
        'type': 'array',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'ip_address': {
        'key': 'ip_address',
        'display_name': 'IP Address',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'ip_asn': {
        'key': 'ip_asn',
        'display_name': 'IP ASN',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'ip_isp': {
        'key': 'ip_isp',
        'display_name': 'IP ISP',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'response_code': {
        'key': 'response_code',
        'display_name': 'Response Code',
        'type': 'number',
        'operator_type': 'number',
        'operator': '==',
        'csv_export': True,
        'dashboard_stats': True
    },
    'status': {
        'key': 'status',
        'display_name': 'Status',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'equals',
        'csv_export': True,
        'dashboard_stats': True
    },
    'asrm_triggered': {
        'key': 'asrm_triggered',
        'display_name': 'ASRM Triggered',
        'type': 'boolean',
        'operator_type': 'boolean',
        'operator': 'equals',
        'csv_export': True,
        'dashboard_stats': True
    },
    'asrm_rule_applied': {
        'key': 'asrm_rule_applied',
        'display_name': 'ASRM Rule Applied',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'pl_submission': {
        'key': 'pl_submission',
        'display_name': 'PhishLabs Submission',
        'type': 'boolean',
        'operator_type': 'boolean',
        'operator': 'equals',
        'csv_export': True,
        'dashboard_stats': True
    },
    'phishlabs_case_number': {
        'key': 'phishlabs_case_number',
        'display_name': 'PhishLabs Case Number',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'tags': {
        'key': 'tags',
        'display_name': 'Tags',
        'type': 'array',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': True
    },
    'hash_name': {
        'key': 'hash_name',
        'display_name': 'Hash Name',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'discovered_at': {
        'key': 'discovered_at',
        'display_name': 'Discovered At',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'create_date': {
        'key': 'create_date',
        'display_name': 'Create Date',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    },
    'expiration_date': {
        'key': 'expiration_date',
        'display_name': 'Expiration Date',
        'type': 'string',
        'operator_type': 'string',
        'operator': 'contains',
        'csv_export': True,
        'dashboard_stats': False
    }
}

# =============================================================================
# PHISHLABS INTEGRATION CONSTANTS
# =============================================================================

# PhishLabs API URLs and Endpoints
PHISHLABS_CASE_API_BASE_URL = 'https://caseapi.phishlabs.com/v1/create/'
PHISHLABS_MONITOR_API_BASE_URL = 'https://feed.phishlabs.com/'

# PhishLabs API Endpoints
PHISHLABS_ENDPOINTS = {
    'brands': 'brands',
    'case_types': 'caseTypes',
    'new_case': 'newCase',
    'attach_file': 'attachFile',  # Will append /{caseId}
    'create_incident': 'createincident'  # For domain monitoring
}

# PhishLabs Case Types and Request Patterns
PHISHLABS_CASE_TYPES = ['threat', 'domain']

# NOTE: PhishLabs case types are DYNAMIC and fetched from the API
# These are NOT hardcoded constants - they come from /api/refresh endpoint
# The constants below are for reference only

# Threat categories are STATIC with code-to-name mapping
# API expects the code, but users see the display name
THREAT_CATEGORIES = {
    '1201': 'Domain without Content',
    '1229': 'Redirects to your Website',
    '1208': 'Corporate logo',
    '1204': 'Parked Domain',
    '1213': 'Content Related to your Organization',
    '1205': 'Content Unrelated to your Organization',
    '1209': 'Content Related to your Industry',
    '1210': 'Monetized links',
    '1219': 'Malicious Activity',
    '1222': 'Redirects to Third Party',
    '1228': 'Redirects to Competitor',
    '1224': 'Content Unavailable - Site Login Required',
    '1211': 'Adult content',
    '1221': 'Phishing',
    '1233': 'Cryptocurrency Scam',
    '0': 'Unknown'
}

# =============================================================================
# RISK SCORE THRESHOLDS
# =============================================================================
RISK_SCORE_THRESHOLDS = {
    'high': 80,
    'medium': 50,
    'low': 0
}

# =============================================================================
# FINDING STATUSES
# =============================================================================
FINDING_STATUSES = [
    'pending', 'approved', 'rejected', 'on_hold'
]

# =============================================================================
# CSV EXPORT COLUMNS
# =============================================================================
CSV_EXPORT_COLUMNS = [
    'domain_name', 'hash_name', 'discovery_date', 'status',
    'risk_score', 'phishing_score', 'malware_score', 'spam_score',
    'ip_address', 'ip_country', 'ip_isp', 'registrar',
    'website_title', 'create_date', 'phishlabs_submitted',
    'phishlabs_case_number', 'phishlabs_submission_method'
]

# =============================================================================
# RULE CONDITION FIELDS
# =============================================================================
RULE_CONDITION_FIELDS = [
    'domain_name', 'website_title', 'registrar', 'ip_country', 'ip_address', 'ip_asn', 'ip_isp',
    'risk_score', 'threat_profile.phishing.score', 'threat_profile.malware.score', 'threat_profile.spam.score',
    'server_type', 'response_code', 'name_servers_data', 'mail_servers_data',
    'admin_contact.country', 'admin_contact.org', 'admin_contact.name', 'admin_contact.email',
    'registrant_contact.country', 'registrant_contact.org', 'registrant_contact.name', 'registrant_contact.email',
    'is_active'
]

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
def get_domaintools_field_keys() -> List[str]:
    """Get list of available DomainTools field keys"""
    return list(DOMAINTOOLS_FIELDS.keys())

def get_rule_condition_fields() -> List[str]:
    """Get list of available rule condition fields"""
    return RULE_CONDITION_FIELDS.copy()

def get_field_info(field_key: str) -> Dict[str, Any]:
    """Get information about a specific field"""
    return DOMAINTOOLS_FIELDS.get(field_key, {})

def get_exportable_fields() -> List[str]:
    """Get list of fields that should be included in CSV export"""
    return [key for key, info in DOMAINTOOLS_FIELDS.items() if info.get('csv_export', False)]

def get_dashboard_stats_fields() -> List[str]:
    """Get list of fields that should be included in dashboard statistics"""
    return [key for key, info in DOMAINTOOLS_FIELDS.items() if info.get('dashboard_stats', False)]

def get_threat_category_name(code: str) -> str:
    """Get threat category display name from code"""
    return THREAT_CATEGORIES.get(code, 'Unknown')

def get_threat_category_code(name: str) -> str:
    """Get threat category code from display name"""
    for code, display_name in THREAT_CATEGORIES.items():
        if display_name.lower() == name.lower():
            return code
    return '0'  # Default to Unknown

def get_all_threat_category_codes() -> List[str]:
    """Get list of all available threat category codes"""
    return list(THREAT_CATEGORIES.keys())

def get_all_threat_category_names() -> List[str]:
    """Get list of all available threat category display names"""
    return list(THREAT_CATEGORIES.values())
