import os
import pytz
from datetime import datetime
from typing import Dict, List, Optional
import requests
from requests.auth import HTTPBasicAuth
import urllib3

# Suppress InsecureRequestWarning for requests with verify=False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class MissingFieldsAnalyzer:
    BASE_URL = "https://api.phishlabs.com/pdapi"
    LEGACY_URL = "https://caseapi.phishlabs.com/v1/data"

    REQUIRED_FIELDS = [
        'url', 'urlType', 'ipAddress', 'isp', 'country',
        'targetedBrands', 'fqdn', 'domain', 'tld', 'registrar_iana_id'
    ]

    def __init__(self, username: str, password: str, use_legacy: bool = False):
        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth(username, password)
        self.session.verify = False
        self.base_url = self.LEGACY_URL if use_legacy else self.BASE_URL

    def convert_est_to_utc(self, date_str: str, time_str: str = "00:00:00", date_only: bool = False) -> str:
        est = pytz.timezone('America/New_York')
        dt_est = est.localize(datetime.strptime(f"{date_str} {time_str}", '%Y-%m-%d %H:%M:%S'))
        dt_utc = dt_est.astimezone(pytz.UTC)
        return dt_utc.strftime('%Y-%m-%d') if date_only else dt_utc.strftime('%Y-%m-%dT%H:%M:%SZ')

    def fetch_cases(self, date_begin: str, date_end: str, case_types: List[str], date_field: str = "caseOpen", max_records: int = 100, offset: int = 0) -> Dict:
        endpoint = f"{self.base_url}/cases"
        query_params = {
            "caseType": case_types,
            "dateField": [date_field],
            "format": "json",
            "maxRecords": max_records,
            "offset": offset,
            "dateBegin": date_begin,
            "dateEnd": date_end
        }
        # Basic auth header (API sometimes needs explicit header)
        import base64
        auth_string = base64.b64encode(f"{self.session.auth.username}:{self.session.auth.password}".encode()).decode()
        headers = {"Authorization": f"Basic {auth_string}"}

        try:
            # Use params for GET request (not json) - flatten caseType list
            get_params = {}
            for key, value in query_params.items():
                if key == 'caseType' and isinstance(value, list):
                    # Handle caseType as a list - API might expect multiple params or comma-separated
                    get_params[key] = ','.join(value) if value else ''
                elif key == 'dateField' and isinstance(value, list):
                    get_params[key] = value[0] if value else ''
                else:
                    get_params[key] = value
            
            response = requests.get(endpoint, params=get_params, headers=headers, auth=self.session.auth, timeout=60, verify=False)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            # Log HTTP errors (like 404, 401, etc.)
            import logging
            logger = logging.getLogger(__name__)
            error_text = e.response.text[:500] if e.response else 'No response'
            logger.error(f"PhishLabs API HTTP error: {e.response.status_code} - URL: {endpoint} - Error: {error_text}")
            return {'error': f'PhishLabs API returned {e.response.status_code}: {error_text}'}
        except requests.exceptions.RequestException as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"PhishLabs API request error: {str(e)}")
            return {'error': f'PhishLabs API request failed: {str(e)}'}

    def fetch_all_cases(self, date_begin: str, date_end: str, case_types: List[str], date_field: str = "caseOpen", max_per_request: int = 100) -> List[Dict]:
        all_cases: List[Dict] = []
        offset = 0
        
        # Check for error on first request
        res = self.fetch_cases(date_begin, date_end, case_types, date_field, max_per_request, offset)
        if isinstance(res, dict) and 'error' in res:
            return res  # Return error immediately
        
        while True:
            cases = res.get('data', [])
            if not cases:
                break
            all_cases.extend(cases)
            if len(cases) < max_per_request:
                break
            offset += max_per_request
            
            # Fetch next batch
            res = self.fetch_cases(date_begin, date_end, case_types, date_field, max_per_request, offset)
            if isinstance(res, dict) and 'error' in res:
                return res  # Return error if subsequent request fails
                
        return all_cases

    def check_field_in_object(self, obj: Dict, field: str) -> bool:
        field_mapping = {
            'ipAddress': ['ipAddress', 'ip', 'ip_address'],
            'isp': ['isp', 'host_isp'],
            'country': ['country', 'host_country']
        }
        fields_to_check = field_mapping.get(field, [field])
        for f in fields_to_check:
            value = obj.get(f)
            if value is None or value == '' or value == 'N/A':
                continue
            if isinstance(value, (list, dict)):
                if len(value) > 0:
                    return True
            else:
                return True
        if field == 'registrar_iana_id':
            parsed_whois = obj.get('parsed_whois', {})
            if isinstance(parsed_whois, dict):
                registrar = parsed_whois.get('registrar', {})
                if isinstance(registrar, dict) and registrar.get('iana_id') and registrar.get('iana_id') != 'N/A':
                    return True
        return False

    def check_field_in_any_source(self, case: Dict, field: str) -> bool:
        for obj in case.get('attackSources', []) or []:
            if self.check_field_in_object(obj, field):
                return True
        for obj in case.get('associatedURLs', []) or []:
            if self.check_field_in_object(obj, field):
                return True
        return False

    def analyze_case_for_missing_fields(self, case: Dict) -> Optional[Dict]:
        attack_sources = case.get('attackSources', [])
        associated_urls = case.get('associatedURLs', [])
        if len(attack_sources) == 0 and len(associated_urls) == 0:
            return None
        missing_fields: List[str] = []
        for field in self.REQUIRED_FIELDS:
            if not self.check_field_in_any_source(case, field):
                missing_fields.append(field)
        if not missing_fields:
            return None
        brand = case.get('brand', 'N/A')
        if isinstance(brand, list):
            brand = ', '.join(brand) if brand else 'N/A'
        return {
            'caseId': case.get('caseId', 'Unknown'),
            'caseNumber': case.get('caseNumber', 'Unknown'),
            'brand': brand,
            'dateCreated': case.get('dateCreated', 'N/A'),
            'caseStatus': case.get('caseStatus', 'Unknown'),
            'sourceName': case.get('sourceName', 'N/A'),
            'caseType': case.get('caseType', 'Unknown'),
            'title': case.get('title', 'N/A'),
            'dateClosed': case.get('dateClosed', 'N/A'),
            'dateModified': case.get('dateModified', 'N/A'),
            'totalAttackSources': len(attack_sources),
            'totalAssociatedURLs': len(associated_urls),
            'missingFields': missing_fields,
            'missingFieldsCount': len(missing_fields),
            'missingFieldsList': ', '.join(missing_fields)
        }

    def generate_missing_fields_report(self, cases: List[Dict]) -> Dict:
        analyzed_cases: List[Dict] = []
        for case in cases:
            analysis = self.analyze_case_for_missing_fields(case)
            if analysis:
                analyzed_cases.append(analysis)
        total_cases = len(cases)
        field_missing_count = {field: 0 for field in self.REQUIRED_FIELDS}
        for c in analyzed_cases:
            for f in c['missingFields']:
                field_missing_count[f] += 1
        sorted_field_counts = dict(sorted(field_missing_count.items(), key=lambda x: x[1], reverse=True))
        return {
            'summary': {
                'totalCasesAnalyzed': total_cases,
                'casesWithMissingFields': len(analyzed_cases),
                'casesComplete': total_cases - len(analyzed_cases),
                'percentageWithMissingFields': round((len(analyzed_cases) / total_cases * 100) if total_cases else 0, 2),
                'percentageComplete': round(((total_cases - len(analyzed_cases)) / total_cases * 100) if total_cases else 0, 2),
                'fieldMissingCount': sorted_field_counts,
                'mostMissingField': max(sorted_field_counts, key=sorted_field_counts.get) if sorted_field_counts else None,
                'generatedAt': datetime.now().isoformat()
            },
            'cases': analyzed_cases
        }

def analyze_missing_fields(date_begin_est: str, date_end_est: str, use_legacy: bool = False, username: Optional[str] = None, password: Optional[str] = None) -> Dict:
    user = username or os.getenv('PHISHLABS_USER')
    pw = password or os.getenv('PHISHLABS_PASS')
    
    # Log credential status (without showing actual values)
    import logging
    logger = logging.getLogger(__name__)
    has_user_env = bool(os.getenv('PHISHLABS_USER'))
    has_pass_env = bool(os.getenv('PHISHLABS_PASS'))
    has_user_req = bool(username)
    has_pass_req = bool(password)
    logger.info(f"Credential check - Env: USER={has_user_env}, PASS={has_pass_env}, Request: USER={has_user_req}, PASS={has_pass_req}")
    
    if not user or not pw:
        return { 'error': 'Missing PhishLabs credentials. Set PHISHLABS_USER/PHISHLABS_PASS in .env file or provide in request body.' }
    
    try:
        analyzer = MissingFieldsAnalyzer(user, pw, use_legacy)
        date_begin_utc = analyzer.convert_est_to_utc(date_begin_est, "00:00:00", date_only=True)
        date_end_utc = analyzer.convert_est_to_utc(date_end_est, "23:59:59", date_only=True)
        case_types = ["Crimeware", "Mobile Abuse", "Phishing", "Phishing Redirect"]
        logger.info(f"Fetching cases from PhishLabs API: {date_begin_utc} to {date_end_utc}, types: {case_types}")
        cases = analyzer.fetch_all_cases(date_begin_utc, date_end_utc, case_types, date_field="caseOpen")
        
        # Check if fetch_all_cases returned an error
        if isinstance(cases, dict) and 'error' in cases:
            return cases
            
        logger.info(f"Fetched {len(cases)} cases from PhishLabs API")
        report = analyzer.generate_missing_fields_report(cases or [])
        return report
    except Exception as e:
        logger.error(f"Error in analyze_missing_fields: {str(e)}", exc_info=True)
        return {'error': f'Analysis failed: {str(e)}'}
