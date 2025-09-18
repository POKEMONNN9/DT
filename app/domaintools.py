"""
Consolidated DomainTools Module
Combines all DomainTools operations and tagging functionality
"""

import requests
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any

from config import current_config as config
from logger import get_domaintools_logger, log_dt_api_request, log_dt_api_error, log_dt_api_success, get_app_logger

# Initialize logger
logger = get_domaintools_logger()
app_logger = get_app_logger()

# =============================================================================
# DOMAINTOOLS OPERATIONS
# =============================================================================

def fetch_domains_for_hash(hash_obj):
    """Fetch domains from DomainTools API for a given search hash"""
    try:
        params = {
            'search_hash': hash_obj['value'],
            'api_username': config.DOMAINTOOLS_USERNAME,
            'api_key': config.DOMAINTOOLS_API_KEY
        }
        
        # Add first_seen filter if this isn't the first scan
        if hash_obj.get('last_scan'):
            params['first_seen_since'] = hash_obj['last_scan']
        
        start_time = datetime.now()
        response = requests.get(
            config.DOMAINTOOLS_BASE_URL, 
            params=params, 
            timeout=config.API_TIMEOUT_SECONDS
        )
        response.raise_for_status()
        
        data = response.json()
        domains = data.get('response', {}).get('results', [])
        
        # Log successful API request
        log_dt_api_request(
            endpoint=config.DOMAINTOOLS_BASE_URL,
            params=params,
            response_time=(datetime.now() - start_time).total_seconds()
        )
        
        logger.info(f"Successfully fetched {len(domains)} domains for hash '{hash_obj['name']}'")
        return domains
        
    except requests.exceptions.RequestException as e:
        log_dt_api_error(
            endpoint=config.DOMAINTOOLS_BASE_URL,
            error=str(e),
            params=params
        )
        logger.error(f"DomainTools API request failed for hash '{hash_obj['name']}': {e}")
        return []
    except Exception as e:
        log_dt_api_error(
            endpoint=config.DOMAINTOOLS_BASE_URL,
            error=str(e),
            params=params
        )
        logger.error(f"Unexpected error fetching domains for hash '{hash_obj['name']}': {e}")
        return []

def tag_domain_in_domaintools(domain, tag):
    """
    Tag a domain in DomainTools (placeholder function)
    Note: DomainTools API doesn't support tagging, so this is a placeholder
    """
    try:
        logger.info(f"Tagging domain '{domain}' with tag '{tag}' (placeholder - DomainTools doesn't support tagging)")
        return True, {'message': 'Tagging not supported by DomainTools API', 'domain': domain, 'tag': tag}
    except Exception as e:
        logger.error(f"Error tagging domain '{domain}': {e}")
        return False, {'error': str(e)}

def test_domaintools_connection():
    """
    Test connection to DomainTools API
    
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        # Reload environment variables to get fresh credentials
        from dotenv import load_dotenv
        import os
        load_dotenv('.env', override=True)  # Force reload with override
        
        # Get fresh credentials from environment
        username = os.getenv('DOMAINTOOLS_USERNAME')
        api_key = os.getenv('DOMAINTOOLS_API_KEY')
        base_url = os.getenv('DOMAINTOOLS_BASE_URL', 'https://api.domaintools.com/v1/iris-investigate/')
        
        # logger.info(f"Testing with username: {username}")
        # logger.info(f"Testing with API key: {'SET' if api_key else 'NOT SET'}")
        logger.info(f"Testing with base URL: {base_url}")
        
        if not username or not api_key:
            return False, {'error': 'DomainTools credentials not configured in .env file'}
        
        # Simple test - try to make a basic API call with a test domain
        params = {
            'domain': 'example.com',
            'api_username': username,
            'api_key': api_key
        }
        
        start_time = datetime.now()
        response = requests.get(
            base_url, 
            params=params, 
            timeout=10
        )
        response.raise_for_status()
        
        # Log successful API request
        log_dt_api_request(
            endpoint=base_url,
            params=params,
            response_time=(datetime.now() - start_time).total_seconds()
        )
        
        logger.info("DomainTools connection test successful")
        return True, {'message': 'DomainTools connection successful'}
        
    except requests.exceptions.RequestException as e:
        log_dt_api_error(
            endpoint=config.DOMAINTOOLS_BASE_URL,
            error=str(e),
            params=params
        )
        logger.error(f"DomainTools connection test failed: {e}")
        return False, {'error': str(e)}
    except Exception as e:
        log_dt_api_error(
            endpoint=config.DOMAINTOOLS_BASE_URL,
            error=str(e),
            params=params
        )
        logger.error(f"Unexpected error in DomainTools connection test: {e}")
        return False, {'error': str(e)}

def extract_domain_fields(domain_data, hash_obj):
    """
    Extract relevant fields from DomainTools API response
    
    Args:
        domain_data: Raw domain data from DomainTools API
        hash_obj: Hash object for context
        
    Returns:
        dict: Extracted domain fields
    """
    try:
        # Extract basic domain information
        domain_fields = {
            'domain_name': domain_data.get('domain'),
            'hash_id': hash_obj['id'],
            'hash_name': hash_obj['name'],
            'first_seen': domain_data.get('first_seen'),
            'create_date': domain_data.get('create_date', {}).get('value'),
            'expiration_date': domain_data.get('expiration_date', {}).get('value'),
            'website_title': domain_data.get('website_title', {}).get('value'),
            
            # Registrar information
            'registrar': domain_data.get('registrar', {}).get('value'),
            'registrar_count': domain_data.get('registrar', {}).get('count', 0),
            
            # Contact information
            'admin_contact': {
                'name': domain_data.get('admin_contact', {}).get('name', {}).get('value'),
                'org': domain_data.get('admin_contact', {}).get('org', {}).get('value'),
                'email': [email.get('value') for email in domain_data.get('admin_contact', {}).get('email', [])],
                'phone': domain_data.get('admin_contact', {}).get('phone', {}).get('value'),
                'country': domain_data.get('admin_contact', {}).get('country', {}).get('value'),
                'city': domain_data.get('admin_contact', {}).get('city', {}).get('value'),
                'state': domain_data.get('admin_contact', {}).get('state', {}).get('value')
            },
            
            'registrant_contact': {
                'name': domain_data.get('registrant_contact', {}).get('name', {}).get('value'),
                'org': domain_data.get('registrant_contact', {}).get('org', {}).get('value'),
                'email': [email.get('value') for email in domain_data.get('registrant_contact', {}).get('email', [])],
                'phone': domain_data.get('registrant_contact', {}).get('phone', {}).get('value'),
                'country': domain_data.get('registrant_contact', {}).get('country', {}).get('value'),
                'city': domain_data.get('registrant_contact', {}).get('city', {}).get('value'),
                'state': domain_data.get('registrant_contact', {}).get('state', {}).get('value')
            },
            
            # IP information (first IP)
            'ip_address': domain_data.get('ip', [{}])[0].get('address', {}).get('value'),
            'ip_address_count': domain_data.get('ip', [{}])[0].get('address', {}).get('count', 0),
            'ip_country': domain_data.get('ip', [{}])[0].get('country_code', {}).get('value'),
            'ip_country_count': domain_data.get('ip', [{}])[0].get('country_code', {}).get('count', 0),
            'ip_isp': domain_data.get('ip', [{}])[0].get('isp', {}).get('value'),
            'ip_isp_count': domain_data.get('ip', [{}])[0].get('isp', {}).get('count', 0),
            'ip_asn': domain_data.get('ip', [{}])[0].get('asn', [{}])[0].get('value'),
            'ip_asn_count': domain_data.get('ip', [{}])[0].get('asn', [{}])[0].get('count', 0),
            
            # Name servers
            'name_servers_data': [
                {
                    'host': ns.get('host', {}).get('value'),
                    'host_count': ns.get('host', {}).get('count', 0),
                    'domain': ns.get('domain', {}).get('value'),
                    'domain_count': ns.get('domain', {}).get('count', 0),
                    'ip': [ip.get('value') for ip in ns.get('ip', [])]
                }
                for ns in domain_data.get('name_server', [])
            ],
            
            # Mail servers
            'mail_servers_data': [
                {
                    'host': ms.get('host', {}).get('value'),
                    'host_count': ms.get('host', {}).get('count', 0),
                    'domain': ms.get('domain', {}).get('value'),
                    'domain_count': ms.get('domain', {}).get('count', 0),
                    'ip': [ip.get('value') for ip in ms.get('ip', [])]
                }
                for ms in domain_data.get('mail_server', [])
            ],
            
            # SSL certificates
            'ssl_certificates': [
                {
                    'hash': cert.get('hash', {}).get('value'),
                    'hash_count': cert.get('hash', {}).get('count', 0),
                    'subject': cert.get('subject', {}).get('value'),
                    'subject_count': cert.get('subject', {}).get('count', 0),
                    'subject_organization': cert.get('subject_organization', {}).get('value'),
                    'subject_org_count': cert.get('subject_organization', {}).get('count', 0),
                    'issuer': cert.get('issuer', {}).get('value'),
                    'issuer_count': cert.get('issuer', {}).get('count', 0),
                    'email': [email.get('value') for email in cert.get('email', [])]
                }
                for cert in domain_data.get('ssl_certificate', [])
            ],
            
            # Risk and threat scores
            'risk_score': domain_data.get('risk_score', 0),
            'threat_profile': {
                'phishing': {
                    'score': domain_data.get('threat_profile', {}).get('phishing', {}).get('score', 0),
                    'evidence': domain_data.get('threat_profile', {}).get('phishing', {}).get('evidence', [])
                },
                'malware': {
                    'score': domain_data.get('threat_profile', {}).get('malware', {}).get('score', 0),
                    'evidence': domain_data.get('threat_profile', {}).get('malware', {}).get('evidence', [])
                },
                'spam': {
                    'score': domain_data.get('threat_profile', {}).get('spam', {}).get('score', 0),
                    'evidence': domain_data.get('threat_profile', {}).get('spam', {}).get('evidence', [])
                }
            },
            
            # Additional metadata
            'server_type': domain_data.get('server_type', {}).get('value'),
            'server_type_count': domain_data.get('server_type', {}).get('count', 0),
            'response_code': domain_data.get('response_code', {}).get('value'),
            'google_analytics_id': domain_data.get('google_analytics', {}).get('value'),
            'google_analytics_id_count': domain_data.get('google_analytics', {}).get('count', 0),
            
            # Hash information
            'hash_id': hash_obj.get('id'),
            'hash_name': hash_obj.get('name')
        }
        
        
        # Add timestamps
        domain_fields['discovered_at'] = datetime.now().isoformat()  # When finding was ingested into findings.json
        domain_fields['last_updated'] = datetime.now().isoformat()
        
        return domain_fields
        
    except Exception as e:
        logger.error(f"Error extracting domain fields: {e}")
        return {
            'domain_name': domain_data.get('domain', 'unknown'),
            'hash_id': hash_obj.get('id', 'unknown'),
            'hash_name': hash_obj.get('name', 'unknown'),
            'error': str(e)
        }

def get_infrastructure_stats(domains=None):
    """
    Get infrastructure statistics from domains
    
    Args:
        domains: List of domain data (optional)
        
    Returns:
        dict: Infrastructure statistics
    """
    try:
        if not domains:
            return {
                'total_domains': 0,
                'unique_registrars': 0,
                'unique_countries': 0,
                'unique_name_servers': 0,
                'average_risk_score': 0,
                'high_risk_domains': 0
            }
        
        # Calculate statistics
        total_domains = len(domains)
        registrars = set()
        countries = set()
        name_servers = set()
        risk_scores = []
        high_risk_domains = 0
        
        for domain in domains:
            if domain.get('registrar'):
                registrars.add(domain['registrar'])
            if domain.get('ip_country'):
                countries.add(domain['ip_country'])
            if domain.get('name_servers_data'):
                for ns_data in domain['name_servers_data']:
                    if ns_data.get('host'):
                        name_servers.add(ns_data['host'])
            
            risk_score = domain.get('risk_score', 0)
            risk_scores.append(risk_score)
            if risk_score >= 70:  # High risk threshold
                high_risk_domains += 1
        
        average_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        
        return {
            'total_domains': total_domains,
            'unique_registrars': len(registrars),
            'unique_countries': len(countries),
            'unique_name_servers': len(name_servers),
            'average_risk_score': round(average_risk_score, 2),
            'high_risk_domains': high_risk_domains,
            'registrars': list(registrars),
            'countries': list(countries)
        }
        
    except Exception as e:
        logger.error(f"Error calculating infrastructure stats: {e}")
        return {
            'total_domains': 0,
            'unique_registrars': 0,
            'unique_countries': 0,
            'unique_name_servers': 0,
            'average_risk_score': 0,
            'high_risk_domains': 0,
            'error': str(e)
        }

def scan_single_hash(hash_obj):
    """
    Scan a single hash and return findings
    
    Args:
        hash_obj: Hash object to scan
        
    Returns:
        dict: Scan results
    """
    try:
        logger.info(f"Starting scan for hash '{hash_obj['name']}'")
        
        # Fetch domains from DomainTools
        domains = fetch_domains_for_hash(hash_obj)
        
        if not domains:
            logger.info(f"No domains found for hash '{hash_obj['name']}'")
            return {
                'success': True,
                'hash_id': hash_obj['id'],
                'hash_name': hash_obj['name'],
                'domains_found': 0,
                'findings': [],
                'message': 'No domains found'
            }
        
        # Extract domain fields and save to findings.json
        findings = []
        saved_count = 0
        
        for domain_data in domains:
            domain_fields = extract_domain_fields(domain_data, hash_obj)
            
            # Add additional backend fields
            domain_fields.update({
                'status': 'pending',
                'created_at': datetime.now().isoformat(),
                'last_updated': datetime.now().isoformat()
            })
            
            # Save finding to findings.json
            try:
                from core_operations import FindingsManager
                findings_manager = FindingsManager()
                
                # Process through ASRM rules if available
                asrm_rule = None
                try:
                    from asrm import process_finding_for_auto_submission
                    asrm_result = process_finding_for_auto_submission(domain_fields)
                    if asrm_result.get('should_auto_submit'):
                        asrm_rule = {
                            'id': asrm_result['submission_config']['rule_id'],
                            'name': asrm_result['submission_config']['rule_name']
                        }
                except Exception as e:
                    logger.warning(f"ASRM processing failed for domain {domain_fields.get('domain_name', 'unknown')}: {e}")
                
                # Add finding to database
                success, message, saved_finding = findings_manager.add_finding(domain_fields, asrm_rule)
                if success:
                    saved_count += 1
                    findings.append(saved_finding)
                else:
                    logger.error(f"Failed to save finding for domain {domain_fields.get('domain_name', 'unknown')}: {message}")
                    findings.append(domain_fields)  # Still include in results even if save failed
                    
            except Exception as e:
                logger.error(f"Error saving finding for domain {domain_fields.get('domain_name', 'unknown')}: {e}")
                findings.append(domain_fields)  # Still include in results even if save failed
        
        # Get infrastructure stats
        stats = get_infrastructure_stats(findings)
        
        logger.info(f"Scan completed for hash '{hash_obj['name']}': {len(findings)} domains found, {saved_count} new findings saved")
        
        return {
            'success': True,
            'hash_id': hash_obj['id'],
            'hash_name': hash_obj['name'],
            'domains_found': len(findings),
            'findings_saved': saved_count,
            'findings': findings,
            'infrastructure_stats': stats,
            'message': f'Found {len(findings)} domains, {saved_count} new findings saved'
        }
        
    except Exception as e:
        logger.error(f"Error scanning hash '{hash_obj['name']}': {e}")
        return {
            'success': False,
            'hash_id': hash_obj['id'],
            'hash_name': hash_obj['name'],
            'domains_found': 0,
            'findings': [],
            'error': str(e)
        }

def scan_all_hashes(hashes):
    """
    Scan all hashes and return combined results
    
    Args:
        hashes: List of hash objects to scan
        
    Returns:
        dict: Combined scan results
    """
    try:
        logger.info(f"Starting scan for {len(hashes)} hashes")
        
        all_findings = []
        scan_results = []
        total_domains = 0
        total_saved = 0
        
        for hash_obj in hashes:
            if not hash_obj.get('active', True):
                continue
                
            result = scan_single_hash(hash_obj)
            scan_results.append(result)
            
            if result['success']:
                all_findings.extend(result['findings'])
                total_domains += result['domains_found']
                total_saved += result.get('findings_saved', 0)
        
        # Get combined infrastructure stats
        combined_stats = get_infrastructure_stats(all_findings)
        
        logger.info(f"Scan completed for {len(hashes)} hashes: {total_domains} total domains found, {total_saved} new findings saved")
        
        return {
            'success': True,
            'hashes_scanned': len(hashes),
            'total_domains': total_domains,
            'total_findings_saved': total_saved,
            'findings': all_findings,
            'infrastructure_stats': combined_stats,
            'individual_results': scan_results,
            'message': f'Scanned {len(hashes)} hashes, found {total_domains} domains, {total_saved} new findings saved'
        }
        
    except Exception as e:
        logger.error(f"Error scanning all hashes: {e}")
        return {
            'success': False,
            'hashes_scanned': 0,
            'total_domains': 0,
            'findings': [],
            'error': str(e)
        }

# =============================================================================
# DOMAINTOOLS TAGGING
# =============================================================================

def add_domain_tag(domain, tag, finding_id=None):
    """
    Add a tag to a domain internally and store it in findings.json
    This function is for internal tracking purposes only.
    
    Args:
        domain: Domain to tag
        tag: Tag name to add
        finding_id: Optional finding ID to update directly
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        from core_operations import FindingsManager
        findings_manager = FindingsManager()
        
        # If finding_id is provided, update that specific finding
        if finding_id:
            finding = findings_manager.get_finding_by_id(finding_id)
            if finding:
                # Get current tags or initialize empty list
                current_tags = finding.get('tags', [])
                
                # Add tag if not already present
                if tag not in current_tags:
                    current_tags.append(tag)
                    
                    # Update the finding with new tags
                    updates = {'tags': current_tags}
                    updated_finding = findings_manager.update_finding(finding_id, updates)
                    
                    if updated_finding:
                        app_logger.info(f"Internal tag '{tag}' added to finding {finding_id} for domain '{domain}'")
                        return True, {
                            'message': f'Internal tag "{tag}" added to finding {finding_id}',
                            'tags': current_tags,
                            'note': 'Tag stored in findings.json for internal tracking'
                        }
                    else:
                        return False, {'error': 'Failed to update finding with tag'}
                else:
                    app_logger.info(f"Tag '{tag}' already exists for finding {finding_id}")
                    return True, {
                        'message': f'Tag "{tag}" already exists for finding {finding_id}',
                        'tags': current_tags,
                        'note': 'Tag already present'
                    }
            else:
                return False, {'error': f'Finding {finding_id} not found'}
        
        # If no finding_id, find the finding by domain
        else:
            # Get all findings and find the one matching the domain
            all_findings = findings_manager.get_all_findings()
            target_finding = None
            
            for finding in all_findings:
                if finding.get('domain_name') == domain:
                    target_finding = finding
                    break
            
            if target_finding:
                finding_id = target_finding['id']
                current_tags = target_finding.get('tags', [])
                
                # Add tag if not already present
                if tag not in current_tags:
                    current_tags.append(tag)
                    
                    # Update the finding with new tags
                    updates = {'tags': current_tags}
                    updated_finding = findings_manager.update_finding(finding_id, updates)
                    
                    if updated_finding:
                        app_logger.info(f"Internal tag '{tag}' added to finding {finding_id} for domain '{domain}'")
                        return True, {
                            'message': f'Internal tag "{tag}" added to finding {finding_id}',
                            'tags': current_tags,
                            'note': 'Tag stored in findings.json for internal tracking'
                        }
                    else:
                        return False, {'error': 'Failed to update finding with tag'}
                else:
                    app_logger.info(f"Tag '{tag}' already exists for domain '{domain}'")
                    return True, {
                        'message': f'Tag "{tag}" already exists for domain "{domain}"',
                        'tags': current_tags,
                        'note': 'Tag already present'
                    }
            else:
                return False, {'error': f'No finding found for domain "{domain}"'}
        
    except Exception as e:
        app_logger.error(f"Error adding internal tag '{tag}' for domain '{domain}': {e}")
        return False, {'error': str(e)}

def remove_domain_tag(domain, tag, finding_id=None):
    """
    Remove a tag from a domain internally
    
    Args:
        domain: Domain to remove tag from
        tag: Tag name to remove
        finding_id: Optional finding ID to update directly
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        from core_operations import FindingsManager
        findings_manager = FindingsManager()
        
        # If finding_id is provided, update that specific finding
        if finding_id:
            finding = findings_manager.get_finding_by_id(finding_id)
            if finding:
                current_tags = finding.get('tags', [])
                
                if tag in current_tags:
                    current_tags.remove(tag)
                    
                    # Update the finding with updated tags
                    updates = {'tags': current_tags}
                    updated_finding = findings_manager.update_finding(finding_id, updates)
                    
                    if updated_finding:
                        app_logger.info(f"Internal tag '{tag}' removed from finding {finding_id} for domain '{domain}'")
                        return True, {
                            'message': f'Internal tag "{tag}" removed from finding {finding_id}',
                            'tags': current_tags
                        }
                    else:
                        return False, {'error': 'Failed to update finding with tag removal'}
                else:
                    return False, {'error': f'Tag "{tag}" not found for finding {finding_id}'}
            else:
                return False, {'error': f'Finding {finding_id} not found'}
        
        # If no finding_id, find the finding by domain
        else:
            all_findings = findings_manager.get_all_findings()
            target_finding = None
            
            for finding in all_findings:
                if finding.get('domain_name') == domain:
                    target_finding = finding
                    break
            
            if target_finding:
                finding_id = target_finding['id']
                current_tags = target_finding.get('tags', [])
                
                if tag in current_tags:
                    current_tags.remove(tag)
                    
                    # Update the finding with updated tags
                    updates = {'tags': current_tags}
                    updated_finding = findings_manager.update_finding(finding_id, updates)
                    
                    if updated_finding:
                        app_logger.info(f"Internal tag '{tag}' removed from finding {finding_id} for domain '{domain}'")
                        return True, {
                            'message': f'Internal tag "{tag}" removed from finding {finding_id}',
                            'tags': current_tags
                        }
                    else:
                        return False, {'error': 'Failed to update finding with tag removal'}
                else:
                    return False, {'error': f'Tag "{tag}" not found for domain "{domain}"'}
            else:
                return False, {'error': f'No finding found for domain "{domain}"'}
        
    except Exception as e:
        app_logger.error(f"Error removing internal tag '{tag}' for domain '{domain}': {e}")
        return False, {'error': str(e)}

def get_domain_tags(domain, finding_id=None):
    """
    Get tags for a domain
    
    Args:
        domain: Domain to get tags for
        finding_id: Optional finding ID to get tags from directly
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        from core_operations import FindingsManager
        findings_manager = FindingsManager()
        
        # If finding_id is provided, get tags from that specific finding
        if finding_id:
            finding = findings_manager.get_finding_by_id(finding_id)
            if finding:
                tags = finding.get('tags', [])
                return True, {
                    'domain': domain,
                    'finding_id': finding_id,
                    'tags': tags
                }
            else:
                return False, {'error': f'Finding {finding_id} not found'}
        
        # If no finding_id, find the finding by domain
        else:
            all_findings = findings_manager.get_all_findings()
            target_finding = None
            
            for finding in all_findings:
                if finding.get('domain_name') == domain:
                    target_finding = finding
                    break
            
            if target_finding:
                tags = target_finding.get('tags', [])
                return True, {
                    'domain': domain,
                    'finding_id': target_finding['id'],
                    'tags': tags
                }
            else:
                return False, {'error': f'No finding found for domain "{domain}"'}
        
    except Exception as e:
        app_logger.error(f"Error getting tags for domain '{domain}': {e}")
        return False, {'error': str(e)}

def get_all_tags():
    """
    Get all unique tags from all findings
    
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        from core_operations import FindingsManager
        findings_manager = FindingsManager()
        
        all_findings = findings_manager.get_all_findings()
        all_tags = set()
        
        for finding in all_findings:
            tags = finding.get('tags', [])
            all_tags.update(tags)
        
        return True, {
            'tags': list(all_tags),
            'count': len(all_tags)
        }
        
    except Exception as e:
        app_logger.error(f"Error getting all tags: {e}")
        return False, {'error': str(e)}

def create_tag(tag_name):
    """
    Create a new tag (placeholder function)
    
    Args:
        tag_name: Name of the tag to create
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        app_logger.info(f"Creating tag '{tag_name}' (placeholder - tags are created when added to findings)")
        return True, {
            'message': f'Tag "{tag_name}" will be created when added to a finding',
            'tag': tag_name
        }
    except Exception as e:
        app_logger.error(f"Error creating tag '{tag_name}': {e}")
        return False, {'error': str(e)}

def delete_tag(tag_name):
    """
    Delete a tag from all findings
    
    Args:
        tag_name: Name of the tag to delete
        
    Returns:
        tuple: (success: bool, result: dict)
    """
    try:
        from core_operations import FindingsManager
        findings_manager = FindingsManager()
        
        all_findings = findings_manager.get_all_findings()
        updated_count = 0
        
        for finding in all_findings:
            tags = finding.get('tags', [])
            if tag_name in tags:
                tags.remove(tag_name)
                updates = {'tags': tags}
                findings_manager.update_finding(finding['id'], updates)
                updated_count += 1
        
        app_logger.info(f"Tag '{tag_name}' deleted from {updated_count} findings")
        return True, {
            'message': f'Tag "{tag_name}" deleted from {updated_count} findings',
            'updated_count': updated_count
        }
        
    except Exception as e:
        app_logger.error(f"Error deleting tag '{tag_name}': {e}")
        return False, {'error': str(e)}
