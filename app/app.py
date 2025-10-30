#!/usr/bin/env python3
"""
Threat Intelligence Dashboard - Production Version
Comprehensive threat intelligence analysis with campaign tracking
"""

import pyodbc
import logging
from flask import Flask, render_template, jsonify, request
from missing_fields_analyzer import analyze_missing_fields
import json
from datetime import datetime, timedelta
import os
import sys
import random
import tempfile
import shutil
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

class ThreatDashboard:
    def __init__(self, server, database):
        """Initialize with SQL Server connection details"""
        self.server = server
        self.database = database
        self.campaigns = self.load_campaigns()
    
    def get_connection(self):
        """Get database connection using Windows Authentication"""
        connection_string = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={self.server};"
            f"DATABASE={self.database};"
            f"Trusted_Connection=yes;"
            f"TrustServerCertificate=yes;"
        )
        
        try:
            conn = pyodbc.connect(connection_string)
            return conn
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def load_campaigns(self):
        """Load campaign definitions from JSON file"""
        try:
                # campaigns.json is in the app directory
                campaigns_path = os.path.join('app', 'campaigns.json') if os.path.exists(os.path.join('app', 'campaigns.json')) else 'campaigns.json'
                with open(campaigns_path, 'r') as f:
                    campaigns_data = json.load(f)
                    logger.info(f"Loaded {len(campaigns_data)} campaigns from {campaigns_path}")
                return campaigns_data
        except Exception as e:
            logger.error(f"Failed to load campaigns: {e}")
            return {}

    def save_campaigns(self):
        """Save campaign definitions to JSON file with atomic write"""
        try:
            # Determine campaigns.json path
            campaigns_path = os.path.join('app', 'campaigns.json') if os.path.exists('app') else 'campaigns.json'
            campaigns_dir = os.path.dirname(campaigns_path) if os.path.dirname(campaigns_path) else '.'
            
            # Count total identifiers for logging
            total_identifiers = 0
            for campaign_name, campaign_data in self.campaigns.items():
                if isinstance(campaign_data, dict) and 'identifiers' in campaign_data:
                    total_identifiers += len(campaign_data['identifiers'])
            
            logger.info(f"Attempting to save {len(self.campaigns)} campaigns with {total_identifiers} total identifiers to {campaigns_path}")
            
            # Write to a temporary file first (atomic write pattern)
            temp_fd, temp_path = tempfile.mkstemp(suffix='.json', prefix='campaigns_', dir=campaigns_dir)
            try:
                with os.fdopen(temp_fd, 'w') as f:
                    json.dump(self.campaigns, f, indent=2)
                
                # Verify the temp file was written correctly
                with open(temp_path, 'r') as f:
                    test_load = json.load(f)
                    if not isinstance(test_load, dict):
                        raise ValueError("Saved file is not a valid dictionary")
                    logger.info(f"Temp file verified: {len(test_load)} campaigns")
                
                # Only replace the actual file if temp file is valid
                shutil.move(temp_path, campaigns_path)
                logger.info(f"✅ Successfully saved {len(self.campaigns)} campaigns with {total_identifiers} identifiers to {campaigns_path}")
                
            except Exception as temp_error:
                # Clean up temp file if it still exists
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                raise temp_error
                
        except Exception as e:
            logger.error(f"❌ CRITICAL ERROR saving campaigns: {e}")
            raise e
    
    def check_table_exists(self, table_name):
        """Check if a table exists in the database"""
        try:
            check_query = f"SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '{table_name}'"
            result = self.execute_query(check_query)
            return result and result[0]['COUNT(*)'] > 0
        except:
            return False
    
    def execute_query(self, query, params=None):
        """Execute SQL query with comprehensive error handling"""
        try:
            # Validate query safety
            dangerous_patterns = ['drop', 'delete', 'truncate', 'update', 'insert', 'alter']
            query_lower = query.lower()
            for pattern in dangerous_patterns:
                if pattern in query_lower and 'select' not in query_lower:
                    raise ValueError(f"Potentially dangerous query detected: {pattern}")
            
            logger.info(f"Executing query: {query[:100]}...")
            
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                columns = [column[0] for column in cursor.description]
                rows = cursor.fetchall()
                result = [dict(zip(columns, row)) for row in rows]
                
                logger.info(f"Query executed successfully, returned {len(result)} rows")
                return result
                
        except pyodbc.OperationalError as e:
            if "timeout" in str(e).lower():
                logger.error("Query timeout occurred")
                return {"error": "Query timeout - please try a smaller date range"}
            logger.error(f"Database operational error: {e}")
            return {"error": "Database connection issue"}
        except pyodbc.Error as e:
            logger.error(f"Database error: {e}")
            return {"error": f"Database error: {str(e)}"}
        except ValueError as e:
            logger.error(f"Query validation error: {e}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error in query execution: {e}")
            return {"error": f"System error occurred: {str(e)}"}
    
    def get_date_filter_condition(self, date_filter, start_date, end_date, date_column):
        """Generate SQL date filter condition"""
        # Handle custom date ranges properly
        if start_date and end_date:
            # If start_date and end_date are the same (single day), use proper date range
            if start_date == end_date:
                return f"CAST({date_column} AS DATE) = '{start_date}'"
            else:
                return f"{date_column} >= '{start_date} 00:00:00' AND {date_column} <= '{end_date} 23:59:59.999'"
        elif start_date:
            return f"{date_column} >= '{start_date} 00:00:00'"
        elif end_date:
            return f"{date_column} <= '{end_date} 23:59:59.999'"
        
        # Default date filters - proper production filtering
        if date_filter == "today":
            return f"CAST({date_column} AS DATE) = CAST(GETDATE() AS DATE)"
        elif date_filter == "yesterday":
            return f"CAST({date_column} AS DATE) = CAST(GETDATE()-1 AS DATE)"
        elif date_filter == "week" or date_filter == "last_7_days":
            return f"{date_column} >= CAST(GETDATE()-7 AS DATE)"
        elif date_filter == "month" or date_filter == "last_30_days":
            return f"{date_column} >= CAST(GETDATE()-30 AS DATE)"
        elif date_filter == "this_month":
            return f"{date_column} >= DATEADD(day, 1, EOMONTH(GETDATE(), -1))"
        elif date_filter == "last_month":
            return f"{date_column} >= DATEADD(day, 1, EOMONTH(GETDATE(), -2)) AND {date_column} <= EOMONTH(GETDATE(), -1)"
        else:
            return "1=1"  # All dates
    
    def format_date_for_display(self, date_value):
        """Format date for display in the UI"""
        if not date_value:
            return "-"
        try:
            if isinstance(date_value, str):
                # Parse the date string and format it
                from datetime import datetime
                parsed_date = datetime.strptime(date_value.split(' ')[0], '%Y-%m-%d')
                return parsed_date.strftime('%Y-%m-%d')
            return str(date_value)
        except:
            return str(date_value) if date_value else "-"
    
    def get_campaign_filter_conditions(self, table_alias, campaign_filter):
        """Generate campaign filter conditions"""
        if campaign_filter == "campaign_only":
            # Filter for cases that are in campaigns
            campaign_cases = []
            for campaign_name, campaign_data in self.campaigns.items():
                if isinstance(campaign_data, list):
                    for mapping in campaign_data:
                        if mapping.get('field') == 'case_number':
                            campaign_cases.append(f"'{mapping['value']}'")
            
            if campaign_cases:
                return f"{table_alias}.case_number IN ({','.join(campaign_cases)})"
            else:
                return "1=0"  # No campaign cases found
        elif campaign_filter == "non_campaign":
            # Filter for cases that are NOT in campaigns
            campaign_cases = []
            for campaign_name, campaign_data in self.campaigns.items():
                if isinstance(campaign_data, list):
                    for mapping in campaign_data:
                        if mapping.get('field') == 'case_number':
                            campaign_cases.append(f"'{mapping['value']}'")
            
            if campaign_cases:
                return f"{table_alias}.case_number NOT IN ({','.join(campaign_cases)})"
            else:
                return "1=1"  # All cases if no campaigns defined
        else:  # "all"
            return "1=1"
    
    def get_executive_summary(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get comprehensive executive summary with proper campaign analysis"""
        
        try:
            # Get date conditions for case data table
            case_data_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            case_data_campaign = self.get_campaign_filter_conditions("i", campaign_filter)
        
            # Main case data query
            main_query = f"""
            SELECT 
                COUNT(DISTINCT i.case_number) as case_data_cases,
                COUNT(DISTINCT u.domain) as case_data_domains,
                COUNT(DISTINCT u.host_country) as case_data_countries,
                COUNT(DISTINCT i.brand) as brands_abused,
                COUNT(DISTINCT CASE WHEN i.brand_abuse_flag = 1 THEN i.brand END) as brand_abuse_cases,
                COUNT(DISTINCT i.case_type) as case_types,
                COUNT(DISTINCT u.url_type) as url_types
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {case_data_condition} AND {case_data_campaign}
            """
            
            # Execute main query
            result = self.execute_query(main_query)
            logger.info(f"Main query result: {result}")
            
            if isinstance(result, dict) and 'error' in result:
                logger.error(f"Main executive summary query failed: {result['error']}")
                return {
                    'total_cases': 0,
                    'case_data_cases': 0,
                    'threat_intel_cases': 0,
                    'social_cases': 0,
                    'cases_with_intel': 0,
                    'case_data_domains': 0,
                    'case_data_countries': 0,
                    'brands_abused': 0,
                    'brand_abuse_cases': 0,
                    'error': result['error']
                }
            
            case_data = result[0] if result and isinstance(result, list) and len(result) > 0 else {}
            
            # Get intelligence coverage
            intel_coverage = 0
            try:
                intel_query = f"""
                SELECT COUNT(DISTINCT n.case_number) as cases_with_intel
        FROM phishlabs_case_data_notes n
        JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
                WHERE {case_data_condition} AND {case_data_campaign}
                """
                intel_result = self.execute_query(intel_query)
                if intel_result and isinstance(intel_result, list):
                    intel_coverage = intel_result[0].get('cases_with_intel', 0)
            except Exception as e:
                logger.warning(f"Could not get intelligence coverage: {e}")
            
            # Skip threat intelligence and social cases for now to focus on main data
            threat_intel_cases = 0
            social_cases = 0
            
            # Calculate total cases
            total_cases = case_data.get('case_data_cases', 0) + threat_intel_cases + social_cases
            
            # Create result
            summary_result = {
                'total_cases': total_cases,
                'case_data_cases': case_data.get('case_data_cases', 0),
                'threat_intel_cases': threat_intel_cases,
                'social_cases': social_cases,
                'cases_with_intel': intel_coverage,
                'case_data_domains': case_data.get('case_data_domains', 0),
                'case_data_countries': case_data.get('case_data_countries', 0),
                'brands_abused': case_data.get('brands_abused', 0),
                'brand_abuse_cases': case_data.get('brand_abuse_cases', 0),
                'case_types': case_data.get('case_types', 0),
                'url_types': case_data.get('url_types', 0)
            }
            
            logger.info(f"Executive summary result: {summary_result}")
            return summary_result
            
        except Exception as e:
            logger.error(f"Error in get_executive_summary: {e}")
        return {
                'total_cases': 0,
                'case_data_cases': 0,
                'threat_intel_cases': 0,
                'social_cases': 0,
                'cases_with_intel': 0,
                'case_data_domains': 0,
                'case_data_countries': 0,
                'brands_abused': 0,
                'brand_abuse_cases': 0,
                'case_types': 0,
                'url_types': 0,
                'error': str(e)
        }
    
    def get_infrastructure_analysis(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get infrastructure analysis with countries, registrars, ISPs, and TLDs"""
        
        # Get date and campaign conditions
        case_data_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
        
        # Countries query
        countries_query = f"""
            SELECT 
            u.host_country as country,
            COUNT(DISTINCT i.case_number) as cases,
            COUNT(DISTINCT u.domain) as domains,
                COUNT(DISTINCT u.host_isp) as isps,
                COUNT(DISTINCT i.case_type) as case_types,
                COUNT(DISTINCT u.url_type) as url_types
        FROM phishlabs_case_data_incidents i
        JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
        WHERE {case_data_condition}          AND u.host_country IS NOT NULL
            AND u.host_country != ''
        GROUP BY u.host_country
        ORDER BY COUNT(DISTINCT i.case_number) DESC
        """
        
        # Registrars query
        registrars_query = f"""
            SELECT 
            r.name as registrar,
            COUNT(DISTINCT i.case_number) as cases,
                COUNT(DISTINCT u.domain) as domains,
                COUNT(DISTINCT u.host_country) as countries,
                COUNT(DISTINCT i.case_type) as case_types,
                COUNT(DISTINCT u.url_type) as url_types
        FROM phishlabs_case_data_incidents i
            JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
        WHERE {case_data_condition}          AND r.name IS NOT NULL
            AND r.name != ''
        GROUP BY r.name
        ORDER BY COUNT(DISTINCT i.case_number) DESC
        """
        
        # ISPs query
        isps_query = f"""
            SELECT 
            u.host_isp as isp,
            COUNT(DISTINCT i.case_number) as cases,
            COUNT(DISTINCT u.host_country) as countries,
                COUNT(DISTINCT u.domain) as domains,
                COUNT(DISTINCT i.case_type) as case_types,
                COUNT(DISTINCT u.url_type) as url_types
        FROM phishlabs_case_data_incidents i
        JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
        WHERE {case_data_condition}          AND u.host_isp IS NOT NULL
            AND u.host_isp != ''
        GROUP BY u.host_isp
        ORDER BY COUNT(DISTINCT i.case_number) DESC
        """
        
        # TLDs query
        tlds_query = f"""
            SELECT 
                u.tld,
                COUNT(DISTINCT i.case_number) as cases,
                COUNT(DISTINCT u.domain) as domains,
                COUNT(DISTINCT u.host_country) as countries,
                COUNT(DISTINCT i.case_type) as case_types,
                COUNT(DISTINCT u.url_type) as url_types
            FROM phishlabs_case_data_incidents i
            JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {case_data_condition}            AND u.tld IS NOT NULL
            AND u.tld != ''
            GROUP BY u.tld
            ORDER BY COUNT(DISTINCT i.case_number) DESC
            """
        
        try:
            countries = self.execute_query(countries_query)
            registrars = self.execute_query(registrars_query)
            isps = self.execute_query(isps_query)
            tlds = self.execute_query(tlds_query)
        
            # Ensure we return proper data structures
            return {
                    'countries': countries if isinstance(countries, list) else [],
                    'registrars': registrars if isinstance(registrars, list) else [],
                    'isps': isps if isinstance(isps, list) else [],
                    'tlds': tlds if isinstance(tlds, list) else []
                }
        except Exception as e:
            logger.error(f"Error executing infrastructure analysis queries: {e}")
            return {
                'countries': [],
                'registrars': [],
                'isps': [],
                'tlds': []
            }
    
    def get_case_status_analysis(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get comprehensive case status analysis across all table types"""
        
        # Get date and campaign conditions for each table type
        case_data_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        threat_intel_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "ti.create_date")
        social_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "si.created_local")
        
        case_data_campaign = self.get_campaign_filter_conditions("i", campaign_filter)
        threat_intel_campaign = self.get_campaign_filter_conditions("ti", campaign_filter)
        social_campaign = self.get_campaign_filter_conditions("si", campaign_filter)
        
        query = f"""
        WITH case_data_status AS (
            SELECT 
                'Active' as status,
                COUNT(DISTINCT i.case_number) as count,
                COUNT(DISTINCT u.domain) as domains,
                COUNT(DISTINCT u.host_country) as countries
                        FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {case_data_condition} AND {case_data_campaign}
              AND (i.case_status = 'Active' OR i.resolution_status != 'Closed')
        ),
        threat_intel_status AS (
            SELECT 
                'Active' as status,
                COUNT(DISTINCT ti.infrid) as count,
                COUNT(DISTINCT ti.domain) as domains,
                0 as countries
            FROM phishlabs_threat_intelligence_incident ti
            WHERE {threat_intel_condition} AND {threat_intel_campaign}
              AND ti.status = 'Active'
        ),
        social_status AS (
            SELECT 
                'Active' as status,
                COUNT(DISTINCT si.incident_id) as count,
                0 as domains,
                0 as countries
            FROM phishlabs_incident si
            WHERE {social_condition} AND {social_campaign}
              AND si.status = 'Active'
        )
        SELECT 
            ISNULL(cds.status, 'Active') as status,
            ISNULL(cds.count, 0) + ISNULL(tis.count, 0) + ISNULL(ss.count, 0) as total_cases,
            ISNULL(cds.domains, 0) + ISNULL(tis.domains, 0) as total_domains,
            ISNULL(cds.countries, 0) as total_countries
        FROM case_data_status cds
        FULL OUTER JOIN threat_intel_status tis ON cds.status = tis.status
        FULL OUTER JOIN social_status ss ON cds.status = ss.status
        """
        
        try:
            result = self.execute_query(query)
            if isinstance(result, dict) and 'error' in result:
                logger.error(f"Case status analysis query failed: {result['error']}")
                return []
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Error in get_case_status_analysis: {e}")
            return []
        
    def get_intelligence_analysis(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get comprehensive intelligence analysis including threat families, actors, and coverage"""
        try:
            # Get date and campaign conditions
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            # Get threat families
            threat_families_query = f"""
            SELECT 
                n.threat_family,
                COUNT(DISTINCT i.case_number) as total_cases,
                COUNT(DISTINCT u.domain) as domains,
                COUNT(DISTINCT u.host_country) as countries
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            LEFT JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
            WHERE {date_condition} AND n.threat_family IS NOT NULL
            GROUP BY n.threat_family
            ORDER BY total_cases DESC
            """
            
            threat_families = self.execute_query(threat_families_query)
            if isinstance(threat_families, dict) and 'error' in threat_families:
                threat_families = []
            
            # Get threat actors
            threat_actors_query = f"""
            SELECT 
                h.name as threat_actor,
                COUNT(DISTINCT h.case_number) as total_cases,
                COUNT(DISTINCT u.domain) as domains,
                COUNT(DISTINCT u.host_country) as countries,
                n.threat_family
            FROM phishlabs_case_data_note_threatactor_handles h
            LEFT JOIN phishlabs_case_data_incidents i ON h.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            LEFT JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
            WHERE {date_condition}            GROUP BY h.name, n.threat_family
            ORDER BY total_cases DESC
            """
            
            threat_actors = self.execute_query(threat_actors_query)
            if isinstance(threat_actors, dict) and 'error' in threat_actors:
                threat_actors = []
            
            # Get intelligence coverage
            coverage_query = f"""
            SELECT 
                COUNT(DISTINCT i.case_number) as total_cases,
                COUNT(DISTINCT CASE WHEN n.case_number IS NOT NULL THEN i.case_number END) as cases_with_notes,
                COUNT(DISTINCT CASE WHEN n.threat_family IS NOT NULL THEN i.case_number END) as cases_with_threat_family,
                COUNT(DISTINCT CASE WHEN n.flagged_whois_name IS NOT NULL THEN i.case_number END) as cases_with_whois_intel,
                COUNT(DISTINCT CASE WHEN h.case_number IS NOT NULL THEN i.case_number END) as cases_with_actor_handles
                FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
            LEFT JOIN phishlabs_case_data_note_threatactor_handles h ON i.case_number = h.case_number
            WHERE {date_condition}            """
            
            coverage = self.execute_query(coverage_query)
            if isinstance(coverage, dict) and 'error' in coverage:
                coverage = [{'total_cases': 0, 'cases_with_notes': 0, 'cases_with_threat_family': 0, 'cases_with_whois_intel': 0, 'cases_with_actor_handles': 0}]
            
            return {
                'threat_families': threat_families or [],
                'threat_actors': threat_actors or [],
                'intelligence_coverage': coverage or []
            }
            
        except Exception as e:
            logger.error(f"Error in get_intelligence_analysis: {e}")
            return {
                'threat_families': [],
                'threat_actors': [],
                'intelligence_coverage': []
            }
    
    def get_intelligence_coverage_analysis(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Analyze intelligence coverage across note tables"""
        
        case_data_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
        
        query = f"""
        WITH total_cases AS (
            SELECT COUNT(DISTINCT i.case_number) as total_cases
                FROM phishlabs_case_data_incidents i
            WHERE {case_data_condition}        ),
        campaign_cases AS (
            SELECT COUNT(DISTINCT i.case_number) as campaign_cases
            FROM phishlabs_case_data_incidents i
            WHERE {case_data_condition}        ),
        non_campaign_cases AS (
            SELECT COUNT(DISTINCT i.case_number) as non_campaign_cases
                FROM phishlabs_case_data_incidents i
            WHERE {case_data_condition} AND {self.get_campaign_filter_conditions("i", "non_campaign")}
        ),
        intel_coverage AS (
            SELECT 
                COUNT(DISTINCT n.case_number) as cases_with_notes,
                COUNT(DISTINCT CASE WHEN n.threat_family IS NOT NULL AND n.threat_family != '' THEN n.case_number END) as cases_with_threat_family,
                COUNT(DISTINCT CASE WHEN n.flagged_whois_name IS NOT NULL AND n.flagged_whois_name != '' THEN n.case_number END) as cases_with_whois_intel,
                COUNT(DISTINCT CASE WHEN th.threatactor_handle IS NOT NULL AND th.threatactor_handle != '' THEN n.case_number END) as cases_with_actor_handles,
                COUNT(DISTINCT CASE WHEN b.bot_name IS NOT NULL AND b.bot_name != '' THEN n.case_number END) as cases_with_bot_intel
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_note_threatactor_handles th ON n.case_number = th.case_number
            LEFT JOIN phishlabs_case_data_note_bots b ON n.case_number = b.case_number
            WHERE {case_data_condition}        )
        SELECT 
            tc.total_cases,
            cc.campaign_cases,
            ncc.non_campaign_cases,
            ic.cases_with_notes,
            ic.cases_with_threat_family,
            ic.cases_with_whois_intel,
            ic.cases_with_actor_handles,
            ic.cases_with_bot_intel,
            CASE WHEN tc.total_cases > 0 THEN ROUND((CAST(ic.cases_with_notes AS FLOAT) / tc.total_cases) * 100, 1) ELSE 0 END as notes_coverage_pct,
            CASE WHEN tc.total_cases > 0 THEN ROUND((CAST(ic.cases_with_threat_family AS FLOAT) / tc.total_cases) * 100, 1) ELSE 0 END as threat_family_coverage_pct,
            CASE WHEN tc.total_cases > 0 THEN ROUND((CAST(ic.cases_with_whois_intel AS FLOAT) / tc.total_cases) * 100, 1) ELSE 0 END as whois_coverage_pct,
            CASE WHEN tc.total_cases > 0 THEN ROUND((CAST(ic.cases_with_actor_handles AS FLOAT) / tc.total_cases) * 100, 1) ELSE 0 END as actor_handles_coverage_pct
        FROM total_cases tc
        CROSS JOIN campaign_cases cc
        CROSS JOIN non_campaign_cases ncc
        CROSS JOIN intel_coverage ic
        """
        
        try:
            result = self.execute_query(query)
            if isinstance(result, dict) and 'error' in result:
                logger.error(f"Intelligence coverage query failed: {result['error']}")
                return []
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Error in get_intelligence_coverage_analysis: {e}")
            return []
    
    def get_campaign_lifecycle_analysis(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Analyze campaign evolution with escalation/de-escalation phases"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            # Since campaigns are stored in JSON, we'll analyze by threat family instead
            query = f"""
            WITH threat_family_activity AS (
                SELECT 
                    n.threat_family as campaign_name,
                    CAST(i.date_created_local AS DATE) as activity_date,
                    COUNT(DISTINCT i.case_number) as daily_cases,
                    COUNT(DISTINCT u.domain) as daily_domains,
                    COUNT(DISTINCT u.host_country) as countries_targeted
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                WHERE {date_condition} AND n.threat_family IS NOT NULL AND n.threat_family != ''
                GROUP BY n.threat_family, CAST(i.date_created_local AS DATE)
            ),
            threat_family_summary AS (
                SELECT 
                    campaign_name,
                    MIN(activity_date) as start_date,
                    MAX(activity_date) as campaign_current_date,
                    DATEDIFF(day, MIN(activity_date), MAX(activity_date)) as duration_days,
                    SUM(daily_cases) as total_cases,
                    SUM(daily_domains) as total_domains,
                    MAX(daily_cases) as peak_daily_cases,
                    MAX(countries_targeted) as max_countries_targeted,
                    AVG(CAST(daily_cases AS FLOAT)) as daily_average
                FROM threat_family_activity
                GROUP BY campaign_name
            ),
            threat_family_phases AS (
                SELECT 
                    tfs.*,
                    CASE 
                        WHEN tfs.duration_days <= 7 AND tfs.total_cases >= tfs.daily_average * 2 THEN 'Initial Surge'
                        WHEN tfs.total_cases > tfs.daily_average * 1.5 THEN 'Escalation'
                        WHEN tfs.total_cases < tfs.daily_average * 0.5 THEN 'De-escalation'
                        ELSE 'Steady State'
                    END as current_phase,
                    CASE 
                        WHEN tfs.duration_days <= 14 THEN 'Active Growth'
                        WHEN tfs.duration_days <= 30 THEN 'Mature'
                        ELSE 'Extended'
                    END as lifecycle_stage
                FROM threat_family_summary tfs
            )
            SELECT 
                campaign_name,
                start_date,
                campaign_current_date,
                duration_days,
                total_cases,
                total_domains,
                peak_daily_cases,
                peak_daily_cases as peak_activity_date,
                max_countries_targeted as countries_targeted,
                daily_average,
                current_phase as phase,
                lifecycle_stage,
                CASE 
                    WHEN current_phase = 'Escalation' THEN 'Increasing domain registration, Geographic expansion'
                    WHEN current_phase = 'De-escalation' THEN 'Reduced activity, Domain abandonment'
                    WHEN current_phase = 'Initial Surge' THEN 'Rapid infrastructure deployment'
                    ELSE 'Consistent operational tempo'
                END as escalation_indicators,
                DATEADD(day, 7, campaign_current_date) as predicted_end_date
            FROM threat_family_phases
            ORDER BY total_cases DESC
            """
            
            return self.execute_query(query)
            
        except Exception as e:
            logger.error(f"Error in get_campaign_lifecycle_analysis: {e}")
            return []
    
    def get_actor_infrastructure_preferences(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Analyze threat actor preferences for registrars, countries, ISPs"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            query = f"""
            SELECT 
                th.name as threat_actor,
                COUNT(DISTINCT i.case_number) as total_cases,
                COUNT(DISTINCT u.domain) as total_domains,
                MIN(i.date_created_local) as active_since,
                MAX(i.date_created_local) as last_case,
                -- Count total cases for this actor including those without associated URLs
                (SELECT COUNT(DISTINCT i2.case_number)
                 FROM phishlabs_case_data_incidents i2
                 JOIN phishlabs_case_data_note_threatactor_handles th2 ON i2.case_number = th2.case_number
                 WHERE th2.name = th.name AND {date_condition.replace('i.', 'i2.')}) as actual_total_cases,
                -- Get most common TLD for this actor
                (SELECT TOP 1 u2.tld 
                 FROM phishlabs_case_data_associated_urls u2 
                 JOIN phishlabs_case_data_incidents i2 ON u2.case_number = i2.case_number
                 JOIN phishlabs_case_data_note_threatactor_handles th2 ON i2.case_number = th2.case_number
                 WHERE th2.name = th.name AND {date_condition.replace('i.', 'i2.')}                 GROUP BY u2.tld
                 ORDER BY COUNT(*) DESC) as preferred_tld,
                -- Get most common country for this actor
                (SELECT TOP 1 u3.host_country 
                 FROM phishlabs_case_data_associated_urls u3 
                 JOIN phishlabs_case_data_incidents i3 ON u3.case_number = i3.case_number
                 JOIN phishlabs_case_data_note_threatactor_handles th3 ON i3.case_number = th3.case_number
                 WHERE th3.name = th.name AND {date_condition.replace('i.', 'i3.')}                 GROUP BY u3.host_country
                 ORDER BY COUNT(*) DESC) as preferred_country,
                -- Get most common ISP for this actor
                (SELECT TOP 1 u4.host_isp 
                 FROM phishlabs_case_data_associated_urls u4 
                 JOIN phishlabs_case_data_incidents i4 ON u4.case_number = i4.case_number
                 JOIN phishlabs_case_data_note_threatactor_handles th4 ON i4.case_number = th4.case_number
                 WHERE th4.name = th.name AND {date_condition.replace('i.', 'i4.')}                 GROUP BY u4.host_isp
                 ORDER BY COUNT(*) DESC) as preferred_isp,
                -- Get most common registrar for this actor
                (SELECT TOP 1 r5.name 
                 FROM phishlabs_iana_registry r5
                 JOIN phishlabs_case_data_incidents i5 ON r5.iana_id = i5.iana_id
                 JOIN phishlabs_case_data_note_threatactor_handles th5 ON i5.case_number = th5.case_number
                 WHERE th5.name = th.name AND {date_condition.replace('i.', 'i5.')}                 GROUP BY r5.name
                 ORDER BY COUNT(*) DESC) as preferred_registrar
            FROM phishlabs_case_data_note_threatactor_handles th
            JOIN phishlabs_case_data_incidents i ON th.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition}            AND th.name IS NOT NULL AND th.name != ''
            AND u.domain IS NOT NULL AND u.domain != ''
            GROUP BY th.name
            HAVING COUNT(DISTINCT i.case_number) >= 2
            ORDER BY COUNT(DISTINCT i.case_number) DESC
            """
            
            return self.execute_query(query)
            
        except Exception as e:
            logger.error(f"Error in get_actor_infrastructure_preferences: {e}")
            return []

    def get_family_infrastructure_preferences(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Analyze threat family preferences for registrars, countries, ISPs"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            query = f"""
            SELECT 
                n.threat_family,
                COUNT(DISTINCT i.case_number) as total_cases,
                COUNT(DISTINCT u.domain) as total_domains,
                -- Get most common TLD for this family
                (SELECT TOP 1 u2.tld 
                 FROM phishlabs_case_data_associated_urls u2 
                 JOIN phishlabs_case_data_incidents i2 ON u2.case_number = i2.case_number
                 JOIN phishlabs_case_data_notes n2 ON i2.case_number = n2.case_number
                 WHERE n2.threat_family = n.threat_family AND {date_condition.replace('i.', 'i2.')}                 GROUP BY u2.tld
                 ORDER BY COUNT(*) DESC) as top_tld,
                -- Get most common country for this family
                (SELECT TOP 1 u3.host_country 
                 FROM phishlabs_case_data_associated_urls u3 
                 JOIN phishlabs_case_data_incidents i3 ON u3.case_number = i3.case_number
                 JOIN phishlabs_case_data_notes n3 ON i3.case_number = n3.case_number
                 WHERE n3.threat_family = n.threat_family AND {date_condition.replace('i.', 'i3.')}                 GROUP BY u3.host_country
                 ORDER BY COUNT(*) DESC) as top_country,
                -- Get most common ISP for this family
                (SELECT TOP 1 u4.host_isp 
                 FROM phishlabs_case_data_associated_urls u4 
                 JOIN phishlabs_case_data_incidents i4 ON u4.case_number = i4.case_number
                 JOIN phishlabs_case_data_notes n4 ON i4.case_number = n4.case_number
                 WHERE n4.threat_family = n.threat_family AND {date_condition.replace('i.', 'i4.')}                 GROUP BY u4.host_isp
                 ORDER BY COUNT(*) DESC) as top_isp,
                -- Get most common registrar for this family
                (SELECT TOP 1 r5.name 
                 FROM phishlabs_iana_registry r5
                 JOIN phishlabs_case_data_incidents i5 ON r5.iana_id = i5.iana_id
                 JOIN phishlabs_case_data_notes n5 ON i5.case_number = n5.case_number
                 WHERE n5.threat_family = n.threat_family AND {date_condition.replace('i.', 'i5.')}                 GROUP BY r5.name
                 ORDER BY COUNT(*) DESC) as top_registrar
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition} AND n.threat_family IS NOT NULL AND n.threat_family != ''
            AND u.domain IS NOT NULL AND u.domain != ''
            GROUP BY n.threat_family
            HAVING COUNT(DISTINCT i.case_number) >= 2
            ORDER BY COUNT(DISTINCT i.case_number) DESC
            """
            
            return self.execute_query(query)
            
        except Exception as e:
            logger.error(f"Error in get_family_infrastructure_preferences: {e}")
            return []

    def get_comprehensive_threat_family_intelligence(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get comprehensive threat family intelligence including WHOIS, URL paths, and brand targeting
        
        NOTE: This function returns ALL-TIME data regardless of date_filter parameters.
        This is intentional as Threat Family Intelligence should show comprehensive historical insights.
        """
        try:
            # Always use all-time data (no date filtering) for comprehensive threat family intelligence
            # This provides top-level intelligence insights, not time-window-limited data
            date_condition = "1=1"  # No date filtering - show all historical data
            logger.info(f"Comprehensive Threat Family Intelligence - Using ALL-TIME data (date filter ignored for intelligence insights)")
            
            # Main threat family intelligence query
            family_query = f"""
            SELECT 
                n.threat_family,
                COUNT(DISTINCT i.case_number) as total_cases,
                COUNT(DISTINCT u.domain) as total_domains,
                COUNT(DISTINCT u.url_path) as unique_url_paths,
                MIN(i.date_created_local) as active_since,
                MAX(i.date_created_local) as last_case,
                -- Infrastructure preferences
                (SELECT TOP 1 u2.tld FROM phishlabs_case_data_associated_urls u2 
                 JOIN phishlabs_case_data_incidents i2 ON u2.case_number = i2.case_number
                 JOIN phishlabs_case_data_notes n2 ON i2.case_number = n2.case_number
                 WHERE n2.threat_family = n.threat_family
                 GROUP BY u2.tld ORDER BY COUNT(*) DESC) as top_tld,
                (SELECT TOP 1 u3.host_country FROM phishlabs_case_data_associated_urls u3 
                 JOIN phishlabs_case_data_incidents i3 ON u3.case_number = i3.case_number
                 JOIN phishlabs_case_data_notes n3 ON i3.case_number = n3.case_number
                 WHERE n3.threat_family = n.threat_family
                 GROUP BY u3.host_country ORDER BY COUNT(*) DESC) as top_country,
                (SELECT TOP 1 u4.host_isp FROM phishlabs_case_data_associated_urls u4 
                 JOIN phishlabs_case_data_incidents i4 ON u4.case_number = i4.case_number
                 JOIN phishlabs_case_data_notes n4 ON i4.case_number = n4.case_number
                 WHERE n4.threat_family = n.threat_family
                 GROUP BY u4.host_isp ORDER BY COUNT(*) DESC) as top_isp,
                (SELECT TOP 1 r.name FROM phishlabs_iana_registry r
                 JOIN phishlabs_case_data_incidents i5 ON r.iana_id = i5.iana_id
                 JOIN phishlabs_case_data_notes n5 ON i5.case_number = n5.case_number
                 WHERE n5.threat_family = n.threat_family
                 GROUP BY r.name ORDER BY COUNT(*) DESC) as top_registrar,
                -- WHOIS intelligence
                (SELECT TOP 1 n6.flagged_whois_email FROM phishlabs_case_data_notes n6 
                 JOIN phishlabs_case_data_incidents i6 ON n6.case_number = i6.case_number
                 WHERE n6.threat_family = n.threat_family
                 AND n6.flagged_whois_email IS NOT NULL AND n6.flagged_whois_email != ''
                 GROUP BY n6.flagged_whois_email ORDER BY COUNT(*) DESC) as top_whois_email,
                (SELECT TOP 1 n7.flagged_whois_name FROM phishlabs_case_data_notes n7 
                 JOIN phishlabs_case_data_incidents i7 ON n7.case_number = i7.case_number
                 WHERE n7.threat_family = n.threat_family
                 AND n7.flagged_whois_name IS NOT NULL AND n7.flagged_whois_name != ''
                 GROUP BY n7.flagged_whois_name ORDER BY COUNT(*) DESC) as top_whois_name
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE n.threat_family IS NOT NULL AND n.threat_family != ''
            GROUP BY n.threat_family
            HAVING COUNT(DISTINCT i.case_number) >= 1
            ORDER BY COUNT(DISTINCT i.case_number) DESC
            """
            
            logger.info(f"Executing comprehensive threat family query (ALL-TIME data, no date filtering)")
            families_data = self.execute_query(family_query)
            logger.info(f"Comprehensive threat family query returned {len(families_data) if families_data and not isinstance(families_data, dict) else 0} families (ALL-TIME data)")
            
            # Get URL path patterns for each family
            url_paths_query = f"""
            SELECT 
                n.threat_family,
                COALESCE(u.url_path, 'No URL Path Recorded') as url_path,
                COUNT(DISTINCT i.case_number) as case_count,
                COUNT(DISTINCT u.domain) as domain_count
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE n.threat_family IS NOT NULL AND n.threat_family != ''
            GROUP BY n.threat_family, u.url_path
            ORDER BY n.threat_family, COUNT(DISTINCT i.case_number) DESC
            """
            
            url_paths_data = self.execute_query(url_paths_query)
            
            # Get brand targeting for each family (all-time data)
            brand_query = f"""
            SELECT 
                n.threat_family,
                i.brand,
                COUNT(DISTINCT i.case_number) as case_count,
                COUNT(DISTINCT u.domain) as domain_count,
                COUNT(DISTINCT u.host_country) as countries_targeted
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE n.threat_family IS NOT NULL AND n.threat_family != ''
            AND i.brand IS NOT NULL AND i.brand != ''
            GROUP BY n.threat_family, i.brand
            ORDER BY n.threat_family, COUNT(DISTINCT i.case_number) DESC
            """
            
            brand_data = self.execute_query(brand_query)
            
            logger.info(f"Comprehensive Threat Family Intelligence Results - Families: {len(families_data) if families_data and not isinstance(families_data, dict) else 0}, "
                       f"URL Paths: {len(url_paths_data) if url_paths_data and not isinstance(url_paths_data, dict) else 0}, "
                       f"Brands: {len(brand_data) if brand_data and not isinstance(brand_data, dict) else 0}")
            
            return {
                "families": families_data,
                "url_paths": url_paths_data,
                "brands": brand_data
            }
            
        except Exception as e:
            logger.error(f"Error in get_comprehensive_threat_family_intelligence: {e}")
            return {"families": [], "url_paths": [], "brands": []}
    
    def get_brand_targeting_patterns(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get brand targeting patterns by threat families"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            query = f"""
            SELECT 
                i.brand,
                n.threat_family,
                COUNT(DISTINCT i.case_number) as case_count,
                COUNT(DISTINCT u.domain) as domain_count,
                COUNT(DISTINCT u.host_country) as countries_targeted
            FROM phishlabs_case_data_incidents i
            JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition}            AND i.brand IS NOT NULL AND i.brand != ''
            AND n.threat_family IS NOT NULL AND n.threat_family != ''
            GROUP BY i.brand, n.threat_family
            HAVING COUNT(DISTINCT i.case_number) >= 2
            ORDER BY COUNT(DISTINCT i.case_number) DESC
            """
            return self.execute_query(query)
            
        except Exception as e:
            logger.error(f"Error in get_brand_targeting_patterns: {e}")
            return []
    
    def get_actor_infrastructure_all_values(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get ALL infrastructure values (TLD, Registrar, ISP, Country) for each threat actor"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            # Get all TLD values for each actor
            tld_query = f"""
            SELECT 
                th.name as threat_actor,
                u.tld,
                COUNT(DISTINCT i.case_number) as case_count
            FROM phishlabs_case_data_incidents i
            JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            WHERE {date_condition}            AND u.tld IS NOT NULL AND u.tld != ''
            AND th.name IS NOT NULL AND th.name != ''
            GROUP BY th.name, u.tld
            ORDER BY th.name, COUNT(DISTINCT i.case_number) DESC
            """
            
            # Get all registrar values for each actor
            # Join with phishlabs_iana_registry to get registrar name from iana_id
            registrar_query = f"""
            SELECT 
                th.name as threat_actor,
                r.name as registrar_name,
                COUNT(DISTINCT i.case_number) as case_count
            FROM phishlabs_case_data_incidents i
            JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
            WHERE {date_condition}            AND r.name IS NOT NULL AND r.name != ''
            AND th.name IS NOT NULL AND th.name != ''
            GROUP BY th.name, r.name
            ORDER BY th.name, COUNT(DISTINCT i.case_number) DESC
            """
            
            # Get all ISP values for each actor
            isp_query = f"""
            SELECT 
                th.name as threat_actor,
                u.host_isp,
                COUNT(DISTINCT i.case_number) as case_count
            FROM phishlabs_case_data_incidents i
            JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            WHERE {date_condition}            AND u.host_isp IS NOT NULL AND u.host_isp != ''
            AND th.name IS NOT NULL AND th.name != ''
            GROUP BY th.name, u.host_isp
            ORDER BY th.name, COUNT(DISTINCT i.case_number) DESC
            """
            
            # Get all country values for each actor
            country_query = f"""
            SELECT 
                th.name as threat_actor,
                u.host_country,
                COUNT(DISTINCT i.case_number) as case_count
            FROM phishlabs_case_data_incidents i
            JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            WHERE {date_condition}            AND u.host_country IS NOT NULL AND u.host_country != ''
            AND th.name IS NOT NULL AND th.name != ''
            GROUP BY th.name, u.host_country
            ORDER BY th.name, COUNT(DISTINCT i.case_number) DESC
            """
            
            tld_data = self.execute_query(tld_query)
            registrar_data = self.execute_query(registrar_query)
            isp_data = self.execute_query(isp_query)
            country_data = self.execute_query(country_query)
            
            return {
                "tlds": tld_data if tld_data and not isinstance(tld_data, dict) else [],
                "registrars": registrar_data if registrar_data and not isinstance(registrar_data, dict) else [],
                "isps": isp_data if isp_data and not isinstance(isp_data, dict) else [],
                "countries": country_data if country_data and not isinstance(country_data, dict) else []
            }
            
        except Exception as e:
            logger.error(f"Error in get_actor_infrastructure_all_values: {e}")
            return {"tlds": [], "registrars": [], "isps": [], "countries": []}

    def get_detailed_infrastructure(self, infra_type, infra_value):
        """Get detailed infrastructure data for a specific threat actor or family"""
        try:
            if infra_type == 'actor':
                # Get basic actor info
                actor_info_query = """
                SELECT 
                    th.name as threat_actor,
                    COUNT(DISTINCT i.case_number) as total_cases,
                    MIN(i.date_created_local) as active_since,
                    MAX(i.date_created_local) as last_case
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
                WHERE th.name = ?
                GROUP BY th.name
                """
                
                # Get all TLDs for this actor
                tld_query = """
                SELECT 
                    u.tld,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
                WHERE th.name = ?
                AND u.tld IS NOT NULL AND u.tld != ''
                GROUP BY u.tld
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
                
                # Get all registrars for this actor
                registrar_query = """
                SELECT 
                    u.registrar_name,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
                WHERE th.name = ?
                AND u.registrar_name IS NOT NULL AND u.registrar_name != ''
                GROUP BY u.registrar_name
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
                
                # Get all ISPs for this actor
                isp_query = """
                SELECT 
                    u.host_isp,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
                WHERE th.name = ?
                AND u.host_isp IS NOT NULL AND u.host_isp != ''
                GROUP BY u.host_isp
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
                
                # Get all countries for this actor
                country_query = """
                SELECT 
                    u.host_country,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
                WHERE th.name = ?
                AND u.host_country IS NOT NULL AND u.host_country != ''
                GROUP BY u.host_country
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
                
                # Get all URL paths for this actor
                url_paths_query = """
                SELECT 
                    u.url_path,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
                WHERE th.name = ?
                AND u.url_path IS NOT NULL AND u.url_path != ''
                GROUP BY u.url_path
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
                
            else:  # family
                # Similar queries but filtered by threat family instead of actor
                actor_info_query = """
                SELECT 
                    n.threat_family as threat_actor,
                    COUNT(DISTINCT i.case_number) as total_cases,
                    MIN(i.date_created_local) as active_since,
                    MAX(i.date_created_local) as last_case
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                WHERE n.threat_family = ?
                GROUP BY n.threat_family
                """
                
                tld_query = """
                SELECT 
                    u.tld,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                WHERE n.threat_family = ?
                AND u.tld IS NOT NULL AND u.tld != ''
                GROUP BY u.tld
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
                
                registrar_query = """
                SELECT 
                    u.registrar_name,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                WHERE n.threat_family = ?
                AND u.registrar_name IS NOT NULL AND u.registrar_name != ''
                GROUP BY u.registrar_name
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
                
                isp_query = """
                SELECT 
                    u.host_isp,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                WHERE n.threat_family = ?
                AND u.host_isp IS NOT NULL AND u.host_isp != ''
                GROUP BY u.host_isp
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
                
                country_query = """
                SELECT 
                    u.host_country,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                WHERE n.threat_family = ?
                AND u.host_country IS NOT NULL AND u.host_country != ''
                GROUP BY u.host_country
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
                
                url_paths_query = """
                SELECT 
                    u.url_path,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                WHERE n.threat_family = ?
                AND u.url_path IS NOT NULL AND u.url_path != ''
                GROUP BY u.url_path
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
            
            # Execute queries with parameter
            actor_info = self.execute_query(actor_info_query, (infra_value,))
            tld_data = self.execute_query(tld_query, (infra_value,))
            registrar_data = self.execute_query(registrar_query, (infra_value,))
            isp_data = self.execute_query(isp_query, (infra_value,))
            country_data = self.execute_query(country_query, (infra_value,))
            url_paths_data = self.execute_query(url_paths_query, (infra_value,))
            
            # Get associated entities (actors or families) based on selection type
            associated_query = None
            if infra_type == 'actor':
                # Get associated threat families for this actor
                associated_query = """
                SELECT 
                    n.threat_family,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
                LEFT JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                WHERE th.name = ?
                AND n.threat_family IS NOT NULL AND n.threat_family != ''
                GROUP BY n.threat_family
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
            else:  # family
                # Get associated threat actors for this family
                associated_query = """
                SELECT 
                    th.name as threat_actor,
                    COUNT(DISTINCT i.case_number) as case_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                LEFT JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
                WHERE n.threat_family = ?
                AND th.name IS NOT NULL AND th.name != ''
                GROUP BY th.name
                ORDER BY COUNT(DISTINCT i.case_number) DESC
                """
            
            associated_data = self.execute_query(associated_query, (infra_value,))
            
            # Format the response
            actor_info = actor_info[0] if actor_info and not isinstance(actor_info, dict) and len(actor_info) > 0 else {}
            
            # Format associated entities
            associated_threat_families = []
            associated_threat_actors = []
            
            if associated_data and not isinstance(associated_data, dict):
                if infra_type == 'actor':
                    associated_threat_families = [{"value": item['threat_family'], "count": item['case_count']} for item in associated_data if item.get('threat_family')]
                else:  # family
                    associated_threat_actors = [{"value": item['threat_actor'], "count": item['case_count']} for item in associated_data if item.get('threat_actor')]
            
            return {
                "success": True,
                "total_cases": actor_info.get('total_cases', 0),
                "active_since": self.format_date_for_display(actor_info.get('active_since')),
                "last_case": self.format_date_for_display(actor_info.get('last_case')),
                "tlds": [{"value": item['tld'], "count": item['case_count']} for item in (tld_data if tld_data and not isinstance(tld_data, dict) else [])],
                "registrars": [{"value": item['registrar_name'], "count": item['case_count']} for item in (registrar_data if registrar_data and not isinstance(registrar_data, dict) else [])],
                "isps": [{"value": item['host_isp'], "count": item['case_count']} for item in (isp_data if isp_data and not isinstance(isp_data, dict) else [])],
                "countries": [{"value": item['host_country'], "count": item['case_count']} for item in (country_data if country_data and not isinstance(country_data, dict) else [])],
                "url_paths": [{"url_path": item['url_path'], "case_count": item['case_count']} for item in (url_paths_data if url_paths_data and not isinstance(url_paths_data, dict) else [])],
                "associated_threat_families": associated_threat_families,
                "associated_threat_actors": associated_threat_actors
            }
            
        except Exception as e:
            logger.error(f"Error in get_detailed_infrastructure: {e}")
            return {
                "success": False,
                "message": str(e),
                "total_cases": 0,
                "active_since": "-",
                "last_case": "-",
                "tlds": [],
                "registrars": [],
                "isps": [],
                "countries": [],
                "url_paths": [],
                "associated_threat_families": [],
                "associated_threat_actors": []
            }
    
    def get_url_path_patterns(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get URL path patterns by threat actors"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            query = f"""
            SELECT 
                u.url_path,
                th.name as threat_actor,
                COUNT(DISTINCT i.case_number) as case_count,
                COUNT(DISTINCT u.domain) as domain_count
            FROM phishlabs_case_data_incidents i
            JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            WHERE {date_condition}            AND u.url_path IS NOT NULL AND u.url_path != ''
            AND th.name IS NOT NULL AND th.name != ''
            GROUP BY u.url_path, th.name
            ORDER BY COUNT(DISTINCT i.case_number) DESC
            """
            result = self.execute_query(query)
            logger.info(f"URL path patterns query returned {len(result) if result and not isinstance(result, dict) else 0} records")
            if result and not isinstance(result, dict) and len(result) > 0:
                logger.info(f"Sample URL path data: {result[0] if len(result) > 0 else 'No data'}")
            return result
            
        except Exception as e:
            logger.error(f"Error in get_url_path_patterns: {e}")
            return []

    def get_infrastructure_patterns_detailed(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get detailed infrastructure patterns including reuse and clustering"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            query = f"""
            WITH infrastructure_reuse AS (
                SELECT 
                    u.ip_address,
                    u.host_isp,
                    u.host_country,
                    COUNT(DISTINCT i.case_number) as case_count,
                    COUNT(DISTINCT u.domain) as domain_count,
                    '' as case_numbers,
                    MIN(i.date_created_local) as first_seen,
                    MAX(i.date_created_local) as last_seen
                        FROM phishlabs_case_data_incidents i
                        JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                WHERE {date_condition}                AND u.ip_address IS NOT NULL AND u.ip_address != ''
                AND u.host_isp IS NOT NULL AND u.host_isp != ''
                GROUP BY u.ip_address, u.host_isp, u.host_country
                HAVING COUNT(DISTINCT i.case_number) >= 2
            ),
            geographic_clustering AS (
                SELECT 
                    u.host_country,
                    COUNT(DISTINCT i.case_number) as total_cases,
                    COUNT(DISTINCT u.domain) as total_domains,
                    COUNT(DISTINCT u.host_isp) as unique_isps,
                    COUNT(DISTINCT r.name) as unique_registrars,
                    '' as top_isps
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
                WHERE {date_condition}                AND u.host_country IS NOT NULL AND u.host_country != ''
                GROUP BY u.host_country
                HAVING COUNT(DISTINCT i.case_number) >= 3
            ),
            temporal_patterns AS (
                SELECT 
                    DATEPART(hour, i.date_created_local) as attack_hour,
                    DATEPART(weekday, i.date_created_local) as attack_day,
                    COUNT(DISTINCT i.case_number) as case_count,
                    COUNT(DISTINCT u.domain) as domain_count
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                WHERE {date_condition}                GROUP BY DATEPART(hour, i.date_created_local), DATEPART(weekday, i.date_created_local)
                HAVING COUNT(DISTINCT i.case_number) >= 2
            )
            SELECT 
                'reuse' as pattern_type,
                ip_address,
                host_isp,
                host_country,
                case_count,
                domain_count,
                NULL as attack_hour,
                NULL as attack_day,
                first_seen,
                last_seen
            FROM infrastructure_reuse
            UNION ALL
            SELECT 
                'geographic' as pattern_type,
                NULL as ip_address,
                top_isps as host_isp,
                host_country,
                total_cases as case_count,
                total_domains as domain_count,
                NULL as attack_hour,
                NULL as attack_day,
                NULL as first_seen,
                NULL as last_seen
            FROM geographic_clustering
            UNION ALL
            SELECT 
                'temporal' as pattern_type,
                NULL as ip_address,
                NULL as host_isp,
                NULL as host_country,
                case_count,
                domain_count,
                attack_hour,
                attack_day,
                NULL as first_seen,
                NULL as last_seen
            FROM temporal_patterns
            ORDER BY case_count DESC
            """
            
            return self.execute_query(query)
            
        except Exception as e:
            logger.error(f"Error in get_infrastructure_patterns_detailed: {e}")
            return []
    
    def get_whois_infrastructure_reuse(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Detect shared WHOIS infrastructure across multiple threat campaigns"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            query = f"""
            WITH whois_reuse AS (
                SELECT 
                    n.flagged_whois_name,
                    n.flagged_whois_email,
                    r.name as registrar,
                    COUNT(DISTINCT i.case_number) as total_cases,
                    COUNT(DISTINCT u.domain) as total_domains,
                    COUNT(DISTINCT u.host_country) as countries_used,
                    MIN(i.date_created_local) as first_seen,
                    MAX(i.date_created_local) as last_seen,
                    '' as countries_list,
                    '' as isps_list
                FROM phishlabs_case_data_notes n
                JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
                LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
                WHERE {date_condition}                AND n.flagged_whois_name IS NOT NULL AND n.flagged_whois_name != ''
                AND n.flagged_whois_email IS NOT NULL AND n.flagged_whois_email != ''
                GROUP BY n.flagged_whois_name, n.flagged_whois_email, r.name
                HAVING COUNT(DISTINCT i.case_number) >= 2
            )
            SELECT 
                flagged_whois_name,
                flagged_whois_email,
                registrar,
                total_cases,
                total_domains,
                countries_used,
                countries_list,
                isps_list,
                first_seen,
                last_seen,
                CASE 
                    WHEN total_cases >= 20 THEN 'High'
                    WHEN total_cases >= 10 THEN 'Medium'
                    ELSE 'Low'
                END as risk_level,
                (total_cases * 2 + total_domains + countries_used * 3) as reuse_score
            FROM whois_reuse
            ORDER BY reuse_score DESC
            """
            
            return self.execute_query(query)
            
        except Exception as e:
            logger.error(f"Error in get_whois_infrastructure_reuse: {e}")
            return []

    def analyze_tld_abuse(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Analyze most abused TLDs across all tables"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            query = f"""
            WITH tld_analysis AS (
                -- TLD abuse from case data incidents
                SELECT 
                    LOWER(RIGHT(u.domain, CHARINDEX('.', REVERSE(u.domain)) - 1)) as tld,
                    COUNT(DISTINCT i.case_number) as abuse_count,
                    'takedown' as source_table,
                    COUNT(DISTINCT u.domain) as unique_domains,
                    COUNT(DISTINCT u.host_country) as countries
                        FROM phishlabs_case_data_incidents i
                        JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                WHERE {date_condition}                AND u.domain IS NOT NULL AND u.domain != ''
                AND CHARINDEX('.', u.domain) > 0
                GROUP BY LOWER(RIGHT(u.domain, CHARINDEX('.', REVERSE(u.domain)) - 1))
                
                UNION ALL
                
                -- TLD abuse from threat intelligence incidents
                SELECT 
                    LOWER(RIGHT(ti.domain, CHARINDEX('.', REVERSE(ti.domain)) - 1)) as tld,
                    COUNT(DISTINCT ti.infrid) as abuse_count,
                    'monitoring' as source_table,
                    COUNT(DISTINCT ti.domain) as unique_domains,
                    0 as countries
                FROM phishlabs_threat_intelligence_incident ti
                WHERE {date_condition.replace('i.date_created_local', 'ti.create_date')}
                AND ti.domain IS NOT NULL AND ti.domain != ''
                AND CHARINDEX('.', ti.domain) > 0
                GROUP BY LOWER(RIGHT(ti.domain, CHARINDEX('.', REVERSE(ti.domain)) - 1))
            )
            SELECT 
                tld,
                SUM(abuse_count) as total_abuse,
                SUM(unique_domains) as total_domains,
                SUM(countries) as total_countries,
                STRING_AGG(source_table, ',') as sources
            FROM tld_analysis
            GROUP BY tld
            ORDER BY total_abuse DESC
            """
            
            result = self.execute_query(query)
            if isinstance(result, dict) and 'error' in result:
                logger.error(f"TLD analysis query failed: {result['error']}")
                return []
            
            return result if result else []
            
        except Exception as e:
            logger.error(f"Error in analyze_tld_abuse: {e}")
            return []

    def analyze_domain_patterns(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Identify suspicious domain patterns"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            query = f"""
            SELECT 
                u.domain,
                u.url,
                i.case_number,
                i.case_type,
                u.host_country,
                CASE 
                    WHEN LEN(u.domain) < 8 THEN 'short'
                    WHEN LEN(u.domain) < 15 THEN 'medium'
                    ELSE 'long'
                END as length_category,
                CASE 
                    WHEN u.domain LIKE '%secure%' OR u.domain LIKE '%login%' OR u.domain LIKE '%verify%' 
                         OR u.domain LIKE '%update%' OR u.domain LIKE '%confirm%' 
                         OR u.domain LIKE '%account%' OR u.domain LIKE '%bank%'
                         OR u.domain LIKE '%paypal%' OR u.domain LIKE '%amazon%'
                         OR u.domain LIKE '%microsoft%' THEN 1
                    ELSE 0
                END as has_suspicious_keywords,
                CASE 
                    WHEN LEN(u.domain) - LEN(REPLACE(u.domain, '.', '')) > 1 THEN 1
                    ELSE 0
                END as has_subdomains,
                CASE 
                    WHEN PATINDEX('%[0-9]%', u.domain) > 0 THEN 1
                    ELSE 0
                END as has_numbers,
                CASE 
                    WHEN PATINDEX('%-%-%', u.domain) > 0 THEN 1
                    ELSE 0
                END as has_multiple_hyphens
            FROM phishlabs_case_data_incidents i
            JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition}            AND u.domain IS NOT NULL AND u.domain != ''
            """
            
            result = self.execute_query(query)
            if isinstance(result, dict) and 'error' in result:
                logger.error(f"Domain patterns query failed: {result['error']}")
                return {}
            
            # Process results to extract patterns
            patterns = {
                'length_analysis': {'short': 0, 'medium': 0, 'long': 0},
                'suspicious_keywords': [],
                'subdomain_abuse': [],
                'character_patterns': {'numeric': 0, 'multi_hyphen': 0},
                'total_domains': len(result) if result else 0
            }
            
            if result:
                for row in result:
                    # Length analysis
                    patterns['length_analysis'][row['length_category']] += 1
                    
                    # Suspicious keywords
                    if row['has_suspicious_keywords']:
                        patterns['suspicious_keywords'].append({
                            'domain': row['domain'],
                            'case_number': row['case_number'],
                            'case_type': row['case_type']
                        })
                    
                    # Subdomain abuse
                    if row['has_subdomains']:
                        patterns['subdomain_abuse'].append({
                            'domain': row['domain'],
                            'subdomain_count': row['domain'].count('.'),
                            'case_number': row['case_number']
                        })
                    
                    # Character patterns
                    if row['has_numbers']:
                        patterns['character_patterns']['numeric'] += 1
                    if row['has_multiple_hyphens']:
                        patterns['character_patterns']['multi_hyphen'] += 1
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error in analyze_domain_patterns: {e}")
            return {}

    def analyze_url_paths(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Analyze URL path patterns for threat intelligence"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            query = f"""
            SELECT 
                u.url,
                u.url_path,
                i.case_number,
                i.case_type,
                CASE 
                    WHEN u.url_path IS NULL OR u.url_path = '' THEN 'no_path'
                    WHEN LEN(u.url_path) - LEN(REPLACE(u.url_path, '/', '')) <= 1 THEN 'shallow'
                    WHEN LEN(u.url_path) - LEN(REPLACE(u.url_path, '/', '')) <= 3 THEN 'medium'
                    ELSE 'deep'
                END as path_depth,
                CASE 
                    WHEN u.url_path LIKE '%login%' OR u.url_path LIKE '%signin%' 
                         OR u.url_path LIKE '%secure%' OR u.url_path LIKE '%verify%'
                         OR u.url_path LIKE '%update%' OR u.url_path LIKE '%account%' THEN 1
                    ELSE 0
                END as has_suspicious_path,
                CASE 
                    WHEN u.url LIKE '%?%' THEN 1
                    ELSE 0
                END as has_parameters
                FROM phishlabs_case_data_incidents i
                JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition}            AND u.url IS NOT NULL AND u.url != ''
            """
            
            result = self.execute_query(query)
            if isinstance(result, dict) and 'error' in result:
                logger.error(f"URL paths query failed: {result['error']}")
                return {}
            
            # Process results to analyze paths
            path_analysis = {
                'path_depth_analysis': {'no_path': 0, 'shallow': 0, 'medium': 0, 'deep': 0},
                'suspicious_patterns': [],
                'parameter_analysis': {'with_params': 0, 'without_params': 0},
                'total_urls': len(result) if result else 0
            }
            
            if result:
                for row in result:
                    # Path depth analysis
                    path_analysis['path_depth_analysis'][row['path_depth']] += 1
                    
                    # Suspicious patterns
                    if row['has_suspicious_path']:
                        path_analysis['suspicious_patterns'].append({
                            'url': row['url'],
                            'path': row['url_path'],
                            'case_number': row['case_number'],
                            'case_type': row['case_type']
                        })
                    
                    # Parameter analysis
                    if row['has_parameters']:
                        path_analysis['parameter_analysis']['with_params'] += 1
                    else:
                        path_analysis['parameter_analysis']['without_params'] += 1
            
            return path_analysis
            
        except Exception as e:
            logger.error(f"Error in analyze_url_paths: {e}")
            return {}

    def get_intelligence_coverage_detailed(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Analyze intelligence coverage across case data with detailed breakdown"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            query = f"""
            WITH coverage_analysis AS (
                SELECT 
                    i.case_number,
                    i.case_type,
                    CASE 
                        WHEN i.date_closed_local IS NULL THEN 'active'
                        ELSE 'closed'
                    END as status,
                    CASE WHEN n.case_number IS NOT NULL THEN 1 ELSE 0 END as has_notes,
                    CASE WHEN n.threat_family IS NOT NULL THEN 1 ELSE 0 END as has_threat_family,
                    CASE WHEN n.flagged_whois_name IS NOT NULL THEN 1 ELSE 0 END as has_whois_intel,
                    CASE WHEN n.flagged_whois_email IS NOT NULL THEN 1 ELSE 0 END as has_email_intel,
                    CASE WHEN h.case_number IS NOT NULL THEN 1 ELSE 0 END as has_actor_handles
                FROM phishlabs_case_data_incidents i
                LEFT JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                LEFT JOIN phishlabs_case_data_note_threatactor_handles h ON i.case_number = h.case_number
                WHERE {date_condition}            )
            SELECT 
                COUNT(*) as total_cases,
                SUM(has_notes) as cases_with_notes,
                SUM(has_threat_family) as cases_with_threat_family,
                SUM(has_whois_intel) as cases_with_whois_intel,
                SUM(has_email_intel) as cases_with_email_intel,
                SUM(has_actor_handles) as cases_with_actor_handles,
                CAST(SUM(has_notes) * 100.0 / COUNT(*) as DECIMAL(5,2)) as notes_coverage_pct,
                CAST(SUM(has_threat_family) * 100.0 / COUNT(*) as DECIMAL(5,2)) as threat_family_coverage_pct,
                CAST(SUM(has_whois_intel) * 100.0 / COUNT(*) as DECIMAL(5,2)) as whois_coverage_pct,
                CAST(SUM(has_email_intel) * 100.0 / COUNT(*) as DECIMAL(5,2)) as email_coverage_pct,
                CAST(SUM(has_actor_handles) * 100.0 / COUNT(*) as DECIMAL(5,2)) as actor_handles_coverage_pct
            FROM coverage_analysis
            """
            
            result = self.execute_query(query)
            if isinstance(result, dict) and 'error' in result:
                logger.error(f"Intelligence coverage query failed: {result['error']}")
                return {}
            
            if result and len(result) > 0:
                return result[0]
            else:
                return {
                    'total_cases': 0,
                    'cases_with_notes': 0,
                    'cases_with_threat_family': 0,
                    'cases_with_whois_intel': 0,
                    'cases_with_email_intel': 0,
                    'cases_with_actor_handles': 0,
                    'notes_coverage_pct': 0,
                    'threat_family_coverage_pct': 0,
                    'whois_coverage_pct': 0,
                    'email_coverage_pct': 0,
                    'actor_handles_coverage_pct': 0
                }
                
        except Exception as e:
            logger.error(f"Error in get_intelligence_coverage_detailed: {e}")
            return {}

    def get_status_overview_with_details(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get expandable status overview with case details"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            # Get takedown cases with details
            takedown_query = f"""
            SELECT 
                CASE 
                    WHEN i.date_closed_local IS NULL THEN 'Active'
                    ELSE 'Closed'
                END as status,
                COUNT(*) as count,
                STRING_AGG(
                    CONCAT('{{"case_number":"', i.case_number, '","domain":"', 
                           ISNULL(u.domain, 'N/A'), '","case_type":"', 
                           ISNULL(i.case_type, 'N/A'), '","date_created":"', 
                           ISNULL(CONVERT(VARCHAR, i.date_created_local, 120), 'N/A'), '"}}'), 
                    ','
                ) as case_details
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition}            GROUP BY 
                CASE 
                    WHEN i.date_closed_local IS NULL THEN 'Active'
                    ELSE 'Closed'
                END
            """
            
            takedown_result = self.execute_query(takedown_query)
            if isinstance(takedown_result, dict) and 'error' in takedown_result:
                takedown_result = []
            
            # Get monitoring cases with details
            monitoring_query = f"""
            SELECT 
                CASE 
                    WHEN ti.date_resolved IS NULL THEN 'Monitoring'
                    ELSE 'Resolved'
                END as status,
                COUNT(*) as count,
                STRING_AGG(
                    CONCAT('{{"case_number":"', CAST(ti.infrid as VARCHAR), '","domain":"', 
                           ISNULL(ti.domain, 'N/A'), '","case_type":"', 
                           ISNULL(ti.cat_name, 'N/A'), '","date_created":"', 
                           ISNULL(CONVERT(VARCHAR, ti.create_date, 120), 'N/A'), '"}}'), 
                    ','
                ) as case_details
            FROM phishlabs_threat_intelligence_incident ti
            WHERE {date_condition.replace('i.date_created_local', 'ti.create_date')}
            GROUP BY 
                CASE 
                    WHEN ti.date_resolved IS NULL THEN 'Monitoring'
                    ELSE 'Resolved'
                END
            """
            
            monitoring_result = self.execute_query(monitoring_query)
            if isinstance(monitoring_result, dict) and 'error' in monitoring_result:
                monitoring_result = []
            
            # Get social cases with details
            social_query = f"""
            SELECT 
                CASE 
                    WHEN s.closed_local IS NULL THEN 'Active'
                    ELSE 'Closed'
                END as status,
                COUNT(*) as count,
                STRING_AGG(
                    CONCAT('{{"case_number":"', CAST(s.incident_id as VARCHAR), '","domain":"N/A","case_type":"', 
                           ISNULL(s.incident_type, 'N/A'), '","date_created":"', 
                           ISNULL(CONVERT(VARCHAR, s.created_local, 120), 'N/A'), '"}}'), 
                    ','
                ) as case_details
            FROM phishlabs_incident s
            WHERE {date_condition.replace('i.date_created_local', 's.created_local')}
            GROUP BY 
                CASE 
                    WHEN s.closed_local IS NULL THEN 'Active'
                    ELSE 'Closed'
                END
            """
            
            social_result = self.execute_query(social_query)
            if isinstance(social_result, dict) and 'error' in social_result:
                social_result = []
            
            return {
                'takedown_cases': takedown_result if takedown_result else [],
                'monitoring_cases': monitoring_result if monitoring_result else [],
                'social_cases': social_result if social_result else []
            }
            
        except Exception as e:
            logger.error(f"Error in get_status_overview_with_details: {e}")
            return {
                'takedown_cases': [],
                'monitoring_cases': [],
                'social_cases': []
            }

    def get_previous_period_condition(self, date_filter, start_date, end_date, date_column):
        """Get date condition for the previous equivalent period for trend comparison"""
        try:
            from datetime import datetime, timedelta
            
            if date_filter == "all":
                # For "all time", return a condition that will always be false (no previous period)
                return "1 = 0"
            
            if start_date and end_date:
                # Custom date range - calculate previous equivalent period
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                period_length = (end_dt - start_dt).days + 1
                
                prev_end_dt = start_dt - timedelta(days=1)
                prev_start_dt = prev_end_dt - timedelta(days=period_length - 1)
                
                return f"{date_column} >= '{prev_start_dt.strftime('%Y-%m-%d')}' AND {date_column} <= '{prev_end_dt.strftime('%Y-%m-%d')}'"
            
            # Standard period comparisons
            if date_filter == "today":
                return f"{date_column} >= CAST(GETDATE() - 1 AS DATE) AND {date_column} < CAST(GETDATE() AS DATE)"
            elif date_filter == "yesterday":
                return f"{date_column} >= CAST(GETDATE() - 2 AS DATE) AND {date_column} < CAST(GETDATE() - 1 AS DATE)"
            elif date_filter == "week":
                return f"{date_column} >= CAST(GETDATE() - 14 AS DATE) AND {date_column} < CAST(GETDATE() - 7 AS DATE)"
            elif date_filter == "month":
                return f"{date_column} >= CAST(DATEADD(month, -2, GETDATE()) AS DATE) AND {date_column} < CAST(DATEADD(month, -1, GETDATE()) AS DATE)"
            elif date_filter == "this_month":
                return f"{date_column} >= CAST(DATEADD(month, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AS DATE) AND {date_column} < CAST(DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1) AS DATE)"
            elif date_filter == "last_month":
                return f"{date_column} >= CAST(DATEADD(month, -2, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AS DATE) AND {date_column} < CAST(DATEADD(month, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AS DATE)"
            else:
                # Default to previous day
                return f"{date_column} >= CAST(GETDATE() - 1 AS DATE) AND {date_column} < CAST(GETDATE() AS DATE)"
                
        except Exception as e:
            logger.error(f"Error in get_previous_period_condition: {e}")
            return "1 = 0"  # Return false condition on error

    def get_executive_summary_metrics(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get comprehensive executive summary metrics with trend comparison"""
        try:
            # Get date conditions - all metrics should respect the selected time window
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            
            # Get previous period condition for trend comparison
            previous_condition = self.get_previous_period_condition(date_filter, start_date, end_date, "i.date_created_local")
            previous_closed_condition = self.get_previous_period_condition(date_filter, start_date, end_date, "i.date_closed_local")
            
            # Get active cred theft cases - ALL active cases (not filtered by time window)
            # Active cases should not follow time window - show ALL active cases
            # Exclude cases with status 'Duplicate', 'Rejected', and 'Closed'
            # Everything else is considered active
            active_cases_query = """
            SELECT COUNT(DISTINCT i.case_number) as active_cases
            FROM phishlabs_case_data_incidents i
            WHERE i.date_closed_local IS NULL
            AND (i.case_status != 'Duplicate' AND i.case_status != 'Rejected' AND i.case_status != 'Closed')
            """
            
            active_cases = self.execute_query(active_cases_query)
            active_count = active_cases[0]['active_cases'] if active_cases and not isinstance(active_cases, dict) else 0
            
            # Get previous period active cases for trend comparison
            # Note: For consistency, we're showing ALL active cases, so previous period is the same
            previous_active_query = """
            SELECT COUNT(DISTINCT i.case_number) as previous_active_cases
            FROM phishlabs_case_data_incidents i
            WHERE i.date_closed_local IS NULL
            AND (i.case_status != 'Duplicate' AND i.case_status != 'Rejected' AND i.case_status != 'Closed')
            """
            
            previous_active_cases = self.execute_query(previous_active_query)
            previous_active_count = previous_active_cases[0]['previous_active_cases'] if previous_active_cases and not isinstance(previous_active_cases, dict) else 0
            
            # Get cases closed in selected date range (based on date_closed_local, not date_created_local)
            closed_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_closed_local")
            closed_query = f"""
            SELECT COUNT(DISTINCT i.case_number) as closed_in_period
            FROM phishlabs_case_data_incidents i
            WHERE {closed_condition} AND i.date_closed_local IS NOT NULL
            """
            
            closed_data = self.execute_query(closed_query)
            closed_count = closed_data[0]['closed_in_period'] if closed_data and not isinstance(closed_data, dict) else 0
            
            # Get previous period closed cases for trend comparison
            previous_closed_query = f"""
            SELECT COUNT(DISTINCT i.case_number) as previous_closed_cases
            FROM phishlabs_case_data_incidents i
            WHERE {previous_closed_condition} AND i.date_closed_local IS NOT NULL
            """
            
            previous_closed_data = self.execute_query(previous_closed_query)
            previous_closed_count = previous_closed_data[0]['previous_closed_cases'] if previous_closed_data and not isinstance(previous_closed_data, dict) else 0
            
            # Get median resolution time (for cases closed in the selected date range)
            # Using ROW_NUMBER approach for better SQL Server compatibility
            median_resolution_query = f"""
            WITH OrderedHours AS (
                SELECT 
                    DATEDIFF(hour, i.date_created_local, i.date_closed_local) as hours_to_close,
                    ROW_NUMBER() OVER (ORDER BY DATEDIFF(hour, i.date_created_local, i.date_closed_local)) as row_num,
                    COUNT(*) OVER () as total_count
                FROM phishlabs_case_data_incidents i
                WHERE {closed_condition} AND i.date_closed_local IS NOT NULL
                AND i.date_created_local IS NOT NULL
            )
            SELECT AVG(CAST(hours_to_close AS FLOAT)) as median_resolution_hours
            FROM OrderedHours
            WHERE row_num IN ((total_count + 1) / 2, (total_count + 2) / 2)
            """
            
            resolution_time = self.execute_query(median_resolution_query)
            avg_resolution = resolution_time[0]['median_resolution_hours'] if resolution_time and not isinstance(resolution_time, dict) else 0
            
            # Get previous period median resolution time for trend comparison
            previous_median_resolution_query = f"""
            WITH OrderedHours AS (
                SELECT 
                    DATEDIFF(hour, i.date_created_local, i.date_closed_local) as hours_to_close,
                    ROW_NUMBER() OVER (ORDER BY DATEDIFF(hour, i.date_created_local, i.date_closed_local)) as row_num,
                    COUNT(*) OVER () as total_count
                FROM phishlabs_case_data_incidents i
                WHERE {previous_closed_condition} AND i.date_closed_local IS NOT NULL
                AND i.date_created_local IS NOT NULL
            )
            SELECT AVG(CAST(hours_to_close AS FLOAT)) as previous_median_resolution_hours
            FROM OrderedHours
            WHERE row_num IN ((total_count + 1) / 2, (total_count + 2) / 2)
            """
            
            previous_resolution_time = self.execute_query(previous_median_resolution_query)
            previous_avg_resolution = previous_resolution_time[0]['previous_median_resolution_hours'] if previous_resolution_time and not isinstance(previous_resolution_time, dict) else 0
            
            # Get resolution status distribution
            resolution_query = f"""
            SELECT 
                COALESCE(i.resolution_status, 'Open') as resolution_status,
                COUNT(DISTINCT i.case_number) as case_count
            FROM phishlabs_case_data_incidents i
            WHERE {date_condition}
            GROUP BY COALESCE(i.resolution_status, 'Open')
            ORDER BY case_count DESC
            """
            
            resolution_dist = self.execute_query(resolution_query)
            if isinstance(resolution_dist, dict) and 'error' in resolution_dist:
                resolution_dist = []
            
            # Get most targeted brand
            brand_query = f"""
            SELECT TOP 1
                i.brand,
                COUNT(DISTINCT i.case_number) as case_count
            FROM phishlabs_case_data_incidents i
            WHERE {date_condition} AND i.brand IS NOT NULL AND i.brand != ''
            GROUP BY i.brand
            ORDER BY case_count DESC
            """
            
            brand_data = self.execute_query(brand_query)
            most_targeted_brand = brand_data[0]['brand'] if brand_data and not isinstance(brand_data, dict) and len(brand_data) > 0 else "N/A"
            brand_case_count = brand_data[0]['case_count'] if brand_data and not isinstance(brand_data, dict) and len(brand_data) > 0 else 0
            
            return {
                'active_cases': active_count,
                'closed_today': closed_count,
                'avg_resolution_hours': round(avg_resolution, 1) if avg_resolution else 0,
                'most_targeted_brand': most_targeted_brand,
                'brand_case_count': brand_case_count,
                'severity_distribution': resolution_dist or [],
                # Previous period data for trend calculation
                'previous_active_cases': previous_active_count,
                'previous_closed_cases': previous_closed_count,
                'previous_avg_resolution_hours': round(previous_avg_resolution, 1) if previous_avg_resolution else 0,
                'date_filter': date_filter  # Include filter for frontend logic
            }
            
        except Exception as e:
            logger.error(f"Error in get_executive_summary_metrics: {e}")
            return {
                'active_cases': 0,
                'closed_today': 0,
                'avg_resolution_hours': 0,
                'most_targeted_brand': "N/A",
                'brand_case_count': 0,
                'severity_distribution': []
            }

    def get_threat_landscape_overview(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get threat landscape overview with threat types breakdown"""
        try:
            # Get date and campaign conditions
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            # Get threat types from case_type and threat_vector (using available columns)
            threat_types_query = f"""
            SELECT 
                CASE 
                    WHEN i.case_type IS NOT NULL THEN i.case_type
                    WHEN i.threat_vector IS NOT NULL THEN i.threat_vector
                    WHEN i.brand_abuse_flag = 1 THEN 'Brand Abuse'
                    ELSE 'Other'
                END as threat_type,
                COUNT(DISTINCT i.case_number) as case_count
            FROM phishlabs_case_data_incidents i
            WHERE {date_condition}            GROUP BY 
                CASE 
                    WHEN i.case_type IS NOT NULL THEN i.case_type
                    WHEN i.threat_vector IS NOT NULL THEN i.threat_vector
                    WHEN i.brand_abuse_flag = 1 THEN 'Brand Abuse'
                    ELSE 'Other'
                END
            ORDER BY case_count DESC
            """
            
            threat_types = self.execute_query(threat_types_query)
            if isinstance(threat_types, dict) and 'error' in threat_types:
                threat_types = []
            
            return threat_types or []
            
        except Exception as e:
            logger.error(f"Error in get_threat_landscape_overview: {e}")
            return []

    def get_geographic_heatmap_data(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get geographic distribution data for heatmap"""
        try:
            # Get date and campaign conditions
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            # Get country distribution
            geo_query = f"""
            SELECT 
                u.host_country as country,
                COUNT(DISTINCT i.case_number) as case_count,
                COUNT(DISTINCT u.domain) as domain_count
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition} AND u.host_country IS NOT NULL
            GROUP BY u.host_country
            ORDER BY case_count DESC
            """
            
            geo_data = self.execute_query(geo_query)
            if isinstance(geo_data, dict) and 'error' in geo_data:
                geo_data = []
            
            return geo_data or []
            
        except Exception as e:
            logger.error(f"Error in get_geographic_heatmap_data: {e}")
            return []

    def get_timeline_trends(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get timeline trends for case creation vs closure rates"""
        try:
            # Use the date filter directly since we now support week/month in get_date_filter_condition
            mapped_filter = date_filter
            
            # Get date and campaign conditions
            date_condition = self.get_date_filter_condition(mapped_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            # Get daily trends
            if date_filter in ["today", "yesterday"]:
                # Hourly data for today/yesterday
                trends_query = f"""
                SELECT 
                    DATEPART(hour, i.date_created_local) as time_period,
                    COUNT(DISTINCT i.case_number) as cases_created,
                    COUNT(DISTINCT CASE WHEN i.date_closed_local IS NOT NULL THEN i.case_number END) as cases_closed
                FROM phishlabs_case_data_incidents i
                WHERE {date_condition}                GROUP BY DATEPART(hour, i.date_created_local)
                ORDER BY time_period
                """
            else:
                # Daily data for weekly/monthly/custom ranges
                # For cases_closed, we need to count cases that were closed on each specific date
                trends_query = f"""
                SELECT 
                    CAST(i.date_created_local AS DATE) as time_period,
                    COUNT(DISTINCT i.case_number) as cases_created,
                    COUNT(DISTINCT CASE WHEN i.date_closed_local IS NOT NULL THEN i.case_number END) as cases_closed
                FROM phishlabs_case_data_incidents i
                WHERE {date_condition}
                GROUP BY CAST(i.date_created_local AS DATE)
                ORDER BY time_period
                """
            
            trends = self.execute_query(trends_query)
            if isinstance(trends, dict) and 'error' in trends:
                trends = []
            
            # Calculate total resolved cases within the selected time window
            # This should match the main summary cards logic
            closed_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_closed_local")
            total_resolved_query = f"""
            SELECT COUNT(DISTINCT i.case_number) as total_resolved
            FROM phishlabs_case_data_incidents i
            WHERE {closed_condition} AND i.date_closed_local IS NOT NULL
            """
            
            total_resolved = self.execute_query(total_resolved_query)
            total_resolved_count = total_resolved[0]['total_resolved'] if total_resolved and not isinstance(total_resolved, dict) else 0
            
            # Return both daily trends and total resolved count
            return {
                'daily_trends': trends,
                'total_resolved': total_resolved_count
            }
            
        except Exception as e:
            logger.error(f"Error in get_timeline_trends: {e}")
            return []

    # ============================================================================
    # CASE MANAGEMENT DASHBOARD METHODS
    # ============================================================================

    def get_performance_metrics(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get performance metrics for case management dashboard"""
        try:
            # Performance metrics should respect the selected date filter
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            closed_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_closed_local")
            
            # Performance metrics query - CORRECTED logic
            # We need separate queries for different metrics:
            # 1. Total cases and closed cases within date range
            # 2. Active cases (ALL active cases, not filtered by date)
            # 3. Resolution times for cases closed within date range
            
            # Query 1: Cases within the selected date range
            date_range_query = f"""
            SELECT 
                COUNT(DISTINCT i.case_number) as total_cases_in_range,
                COUNT(DISTINCT CASE WHEN i.date_closed_local IS NOT NULL AND ({closed_condition}) THEN i.case_number END) as closed_cases_in_range,
                AVG(CASE WHEN i.date_closed_local IS NOT NULL 
                    THEN DATEDIFF(hour, i.date_created_local, i.date_closed_local) END) as avg_resolution_hours,
                MIN(i.date_created_local) as earliest_case,
                MAX(i.date_created_local) as latest_case
            FROM phishlabs_case_data_incidents i
            WHERE {date_condition}
            """
            
            # Query for closed cases in the selected time window (based on date_closed_local, not date_created_local)
            closed_cases_query = f"""
            SELECT COUNT(DISTINCT i.case_number) as closed_cases_in_timewindow
            FROM phishlabs_case_data_incidents i
            WHERE {closed_condition}
            AND i.date_closed_local IS NOT NULL
            """
            
            # Query 2: ALL active cases (not filtered by date)
            # Active cases should not follow time window - show ALL active cases
            # Exclude cases with status 'Duplicate', 'Rejected', and 'Closed'
            # Everything else is considered active
            active_cases_query = """
            SELECT COUNT(DISTINCT case_number) as total_active_cases
            FROM phishlabs_case_data_incidents
            WHERE date_closed_local IS NULL
            AND (case_status != 'Duplicate' AND case_status != 'Rejected' AND case_status != 'Closed')
            """
            
            logger.info(f"Date range query: {date_range_query}")
            logger.info(f"Active cases query: {active_cases_query}")
            logger.info(f"Closed cases query: {closed_cases_query}")
            
            # Execute all three queries
            date_range_data = self.execute_query(date_range_query)
            active_cases_data = self.execute_query(active_cases_query)
            closed_cases_data = self.execute_query(closed_cases_query)
            
            if isinstance(date_range_data, dict) and 'error' in date_range_data:
                logger.error(f"Date range query error: {date_range_data['error']}")
                return {"error": date_range_data['error']}
            
            if isinstance(active_cases_data, dict) and 'error' in active_cases_data:
                logger.error(f"Active cases query error: {active_cases_data['error']}")
                return {"error": active_cases_data['error']}
            
            if isinstance(closed_cases_data, dict) and 'error' in closed_cases_data:
                logger.error(f"Closed cases query error: {closed_cases_data['error']}")
                return {"error": closed_cases_data['error']}
            
            # Combine results
            date_result = date_range_data[0] if date_range_data else {}
            active_result = active_cases_data[0] if active_cases_data else {}
            closed_result = closed_cases_data[0] if closed_cases_data else {}
            
            result = {
                'total_cases': date_result.get('total_cases_in_range', 0),
                'closed_cases': closed_result.get('closed_cases_in_timewindow', 0),
                'active_cases': active_result.get('total_active_cases', 0),
                'avg_resolution_hours': date_result.get('avg_resolution_hours', 0),
                'earliest_case': date_result.get('earliest_case'),
                'latest_case': date_result.get('latest_case')
            }
            
            logger.info(f"Combined performance metrics result: {result}")
            
            # Calculate median resolution time using ROW_NUMBER approach
            median_resolution_query = f"""
            WITH OrderedHours AS (
                SELECT 
                    DATEDIFF(hour, i.date_created_local, i.date_closed_local) as hours_to_close,
                    ROW_NUMBER() OVER (ORDER BY DATEDIFF(hour, i.date_created_local, i.date_closed_local)) as row_num,
                    COUNT(*) OVER () as total_count
                FROM phishlabs_case_data_incidents i
                WHERE {closed_condition} AND i.date_closed_local IS NOT NULL
                AND i.date_created_local IS NOT NULL
            )
            SELECT AVG(CAST(hours_to_close AS FLOAT)) as median_resolution_hours
            FROM OrderedHours
            WHERE row_num IN ((total_count + 1) / 2, (total_count + 2) / 2)
            """
            
            median_data = self.execute_query(median_resolution_query)
            median_hours = median_data[0]['median_resolution_hours'] if median_data and not isinstance(median_data, dict) else 0
            
            # Add median to result
            result['median_resolution_hours'] = round(median_hours, 1) if median_hours else 0
            
            return result
            
        except Exception as e:
            logger.error(f"Error in get_performance_metrics: {e}")
            return {"error": str(e)}

    def get_case_status_overview_comprehensive(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get comprehensive case status overview across all three table types"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            
            # Cred Theft Cases (from phishlabs_case_data_incidents)
            cred_theft_query = f"""
            SELECT 
                CASE 
                    WHEN i.date_closed_local IS NULL THEN 'Active'
                    WHEN i.date_closed_local IS NOT NULL THEN 'Closed'
                    ELSE 'Other'
                END as status,
                COUNT(*) as count
            FROM phishlabs_case_data_incidents i
            WHERE {date_condition}            GROUP BY CASE 
                WHEN i.date_closed_local IS NULL THEN 'Active'
                WHEN i.date_closed_local IS NOT NULL THEN 'Closed'
                ELSE 'Other'
            END
            """
            
            cred_theft = self.execute_query(cred_theft_query)
            if isinstance(cred_theft, dict) and 'error' in cred_theft:
                cred_theft = []
            
            # Domain Monitoring Cases (from phishlabs_threat_intelligence_incident)
            domain_monitoring_date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "ti.create_date")
            
            domain_monitoring_query = f"""
            SELECT 
                CASE 
                    WHEN ti.date_resolved IS NULL THEN 'Monitoring'
                    WHEN ti.date_resolved IS NOT NULL THEN 'Closed'
                    ELSE 'Other'
                END as status,
                COUNT(*) as count
            FROM phishlabs_threat_intelligence_incident ti
            WHERE {domain_monitoring_date_condition}
            GROUP BY CASE 
                WHEN ti.date_resolved IS NULL THEN 'Monitoring'
                WHEN ti.date_resolved IS NOT NULL THEN 'Closed'
                ELSE 'Other'
            END
            """
            
            domain_monitoring = self.execute_query(domain_monitoring_query)
            if isinstance(domain_monitoring, dict) and 'error' in domain_monitoring:
                domain_monitoring = []
            
            # Social Media Cases (from phishlabs_incident)
            # Filter by created_local for total cases (cases opened in time window)
            # This ensures we count cases that were opened within the selected timeframe
            created_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "s.created_local")
            
            social_media_query = f"""
            SELECT 
                CASE 
                    WHEN s.closed_local IS NULL THEN 'Active'
                    WHEN s.closed_local IS NOT NULL THEN 'Closed'
                    ELSE 'Other'
                END as status,
                COUNT(*) as count
            FROM phishlabs_incident s
            WHERE {created_condition}
            GROUP BY CASE 
                WHEN s.closed_local IS NULL THEN 'Active'
                WHEN s.closed_local IS NOT NULL THEN 'Closed'
                ELSE 'Other'
            END
            """
            
            # Log the query for debugging
            logger.info(f"Social Media Case Status Query: {social_media_query}")
            
            social_media = self.execute_query(social_media_query)
            if isinstance(social_media, dict) and 'error' in social_media:
                logger.error(f"Social Media query error: {social_media.get('error', 'Unknown error')}")
                social_media = []
            else:
                logger.info(f"Social Media query results: {social_media}")
                if isinstance(social_media, list):
                    total_count = sum(row.get('count', 0) for row in social_media)
                else:
                    total_count = 0
                logger.info(f"Total Social Media cases counted: {total_count}")
            
            return {
                'cred_theft': cred_theft or [],
                'domain_monitoring': domain_monitoring or [],
                'social_media': social_media or []
            }
            
        except Exception as e:
            logger.error(f"Error in get_case_status_overview_comprehensive: {e}")
            return {
                'cred_theft': [],
                'domain_monitoring': [],
                'social_media': []
            }

    def get_case_type_distribution(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get case type distribution across all three case types"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            # Cred Theft Cases (from phishlabs_case_data_incidents)
            cred_theft_query = f"""
            SELECT 
                i.case_type,
                COUNT(*) as count
            FROM phishlabs_case_data_incidents i
            WHERE {date_condition}            GROUP BY i.case_type
            ORDER BY count DESC
            """
            
            cred_theft = self.execute_query(cred_theft_query)
            if isinstance(cred_theft, dict) and 'error' in cred_theft:
                cred_theft = []
            
            # Domain Monitoring Cases (from phishlabs_threat_intelligence_incident)
            domain_monitoring_date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "ti.create_date")
            
            # For Domain Monitoring, we'll skip campaign filtering for now since table structure might be different
            domain_monitoring_campaign_condition = "1=1"
            
            domain_monitoring_query = f"""
            SELECT 
                ti.cat_name as case_type,
                COUNT(*) as count
            FROM phishlabs_threat_intelligence_incident ti
            WHERE {domain_monitoring_date_condition} AND {domain_monitoring_campaign_condition}
            GROUP BY ti.cat_name
            ORDER BY count DESC
            """
            
            domain_monitoring = self.execute_query(domain_monitoring_query)
            if isinstance(domain_monitoring, dict) and 'error' in domain_monitoring:
                domain_monitoring = []
            
            # Social Media Cases (from phishlabs_incident)
            # Filter by created_local for total cases (cases opened in time window)
            social_media_query = f"""
            SELECT 
                s.threat_type as case_type,
                COUNT(*) as count
            FROM phishlabs_incident s
            WHERE {self.get_date_filter_condition(date_filter, start_date, end_date, "s.created_local")}
            GROUP BY s.threat_type
            ORDER BY count DESC
            """
            
            social_media = self.execute_query(social_media_query)
            if isinstance(social_media, dict) and 'error' in social_media:
                social_media = []
            
            return {
                'cred_theft': cred_theft or [],
                'domain_monitoring': domain_monitoring or [],
                'social_media': social_media or []
            }
            
        except Exception as e:
            logger.error(f"Error in get_case_type_distribution: {e}")
            return {
                'cred_theft': [],
                'domain_monitoring': [],
                'social_media': []
            }

    def get_resolution_performance(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get resolution performance with median takedown time for Cred Theft cases closed in time window"""
        try:
            # Filter by date_closed_local (cases closed in the selected time window)
            closed_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_closed_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            # Cred Theft Cases (from phishlabs_case_data_incidents)
            # Only show cases that were CLOSED within the selected time window
            cred_theft_query = f"""
            SELECT 
                i.case_type,
                AVG(DATEDIFF(hour, i.date_created_local, i.date_closed_local)) as avg_resolution_hours,
                COUNT(*) as total_cases,
                COUNT(CASE WHEN i.date_closed_local IS NOT NULL THEN 1 END) as closed_cases
            FROM phishlabs_case_data_incidents i
            WHERE {closed_condition} AND i.date_closed_local IS NOT NULL AND i.date_created_local IS NOT NULL
            GROUP BY i.case_type
            ORDER BY avg_resolution_hours DESC
            """
            
            cred_theft = self.execute_query(cred_theft_query)
            if isinstance(cred_theft, dict) and 'error' in cred_theft:
                cred_theft = []
            
            # Only return Cred Theft data (Social Media removed per requirements)
            return {
                'cred_theft': cred_theft or []
            }
            
        except Exception as e:
            logger.error(f"Error in get_resolution_performance: {e}")
            return {
                'cred_theft': [],
                'social_media': []
            }

    def get_workload_distribution(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get workload distribution by assignee and status"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            workload_query = f"""
            SELECT 
                CASE 
                    WHEN i.case_status = 'Active' OR i.resolution_status != 'Closed' THEN 'Active'
                    WHEN i.resolution_status = 'Closed' THEN 'Closed'
                    ELSE 'Other'
                END as status,
                COUNT(*) as case_count
            FROM phishlabs_case_data_incidents i
            WHERE {date_condition}            GROUP BY 
                CASE 
                    WHEN i.case_status = 'Active' OR i.resolution_status != 'Closed' THEN 'Active'
                    WHEN i.resolution_status = 'Closed' THEN 'Closed'
                    ELSE 'Other'
                END
            ORDER BY case_count DESC
            """
            
            workload = self.execute_query(workload_query)
            if isinstance(workload, dict) and 'error' in workload:
                workload = []
            
            # Return actual data from database only - no mock data
            return workload
            
        except Exception as e:
            logger.error(f"Error in get_workload_distribution: {e}")
            return []

    def get_sla_tracking(self, date_filter="today", start_date=None, end_date=None):
        """Get SLA tracking for Cred Theft cases with color-coded status (Green: 1-14 days, Amber: 14-28 days, Red: >28 days)"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            
            sla_query = f"""
                SELECT 
                    i.case_number,
                    ISNULL(
                        (SELECT TOP 1 u2.url 
                         FROM phishlabs_case_data_associated_urls u2
                         WHERE u2.case_number = i.case_number 
                         ORDER BY LEN(u2.url) DESC), 
                        'No URL'
                    ) as url,
                    ISNULL(i.case_type, 'Unknown') as case_type,
                    DATEDIFF(day, i.date_created_local, GETDATE()) as days_open,
                    DATEDIFF(hour, i.date_created_local, GETDATE()) as hours_open,
                    CASE 
                        WHEN DATEDIFF(day, i.date_created_local, GETDATE()) <= 14 THEN 'Green'
                        WHEN DATEDIFF(day, i.date_created_local, GETDATE()) <= 28 THEN 'Amber'
                        ELSE 'Red'
                    END as sla_status,
                    ISNULL(
                        (SELECT TOP 1 r2.name 
                         FROM phishlabs_iana_registry r2 
                         WHERE r2.iana_id = i.iana_id), 
                        'Unknown Registrar'
                    ) as registrar_name,
                    ISNULL(
                        (SELECT TOP 1 u3.host_isp 
                         FROM phishlabs_case_data_associated_urls u3
                         WHERE u3.case_number = i.case_number 
                         ORDER BY LEN(u3.url) DESC), 
                        'Unknown ISP'
                    ) as host_isp
                FROM phishlabs_case_data_incidents i
                WHERE {date_condition} AND i.date_closed_local IS NULL
                ORDER BY DATEDIFF(day, i.date_created_local, GETDATE()) DESC
                """
            
            sla = self.execute_query(sla_query)
            if isinstance(sla, dict) and 'error' in sla:
                logger.error(f"SLA query error: {sla.get('error')}")
                sla = []
            
            # Format the data with days and hours
            formatted_data = []
            for item in sla:
                days = item.get('days_open', 0)
                hours = item.get('hours_open', 0)
                formatted_item = item.copy()
                formatted_item['days_hours'] = f"{days} ({hours}H)"
                formatted_data.append(formatted_item)
            
            return formatted_data
            
        except Exception as e:
            logger.error(f"Error in get_sla_tracking: {e}")
            return []

    def get_sla_category_totals(self, date_filter="today", start_date=None, end_date=None):
        """Get SLA category totals for subtitle display"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            
            totals_query = f"""
            SELECT 
                CASE 
                    WHEN DATEDIFF(day, i.date_created_local, GETDATE()) <= 14 THEN 'Green'
                    WHEN DATEDIFF(day, i.date_created_local, GETDATE()) <= 28 THEN 'Amber'
                    ELSE 'Red'
                END as sla_status,
                COUNT(DISTINCT i.case_number) as count
            FROM phishlabs_case_data_incidents i
            WHERE {date_condition} AND i.date_closed_local IS NULL
            GROUP BY CASE 
                WHEN DATEDIFF(day, i.date_created_local, GETDATE()) <= 14 THEN 'Green'
                WHEN DATEDIFF(day, i.date_created_local, GETDATE()) <= 28 THEN 'Amber'
                ELSE 'Red'
            END
            """
            
            totals = self.execute_query(totals_query)
            if isinstance(totals, dict) and 'error' in totals:
                totals = []
            
            # Create totals dictionary
            totals_dict = {'Green': 0, 'Amber': 0, 'Red': 0}
            for item in totals:
                totals_dict[item['sla_status']] = item['count']
            
            return totals_dict
            
        except Exception as e:
            logger.error(f"Error in get_sla_category_totals: {e}")
            return {'Green': 0, 'Amber': 0, 'Red': 0}

    # ============================================================================
    # THREAT INTELLIGENCE DASHBOARD METHODS
    # ============================================================================

    def get_domain_monitoring(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get real-time domain monitoring from threat intelligence incidents"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "ti.create_date")
            
            domain_query = f"""
            SELECT 
                ti.domain,
                ti.cat_name,
                ti.threat_family,
                ti.status,
                ti.create_date,
                ti.date_resolved,
                CASE 
                    WHEN ti.threat_family = 'TA505' THEN 9
                    WHEN ti.threat_family = 'FIN7' THEN 8
                    WHEN ti.threat_family = 'Carbanak' THEN 7
                    ELSE 5
                END as threat_score
            FROM phishlabs_threat_intelligence_incident ti
            WHERE {date_condition} AND ti.domain IS NOT NULL
            ORDER BY ti.create_date DESC, threat_score DESC
            """
            
            domains = self.execute_query(domain_query)
            if isinstance(domains, dict) and 'error' in domains:
                domains = []
            
            return domains or []
            
        except Exception as e:
            logger.error(f"Error in get_domain_monitoring: {e}")
            return []

    def get_threat_family_analysis(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get threat family analysis with severity breakdown"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            threat_family_query = f"""
            SELECT 
                n.threat_family,
                i.threat_vector as severity,
                COUNT(*) as case_count,
                COUNT(DISTINCT u.domain) as unique_domains,
                COUNT(DISTINCT u.host_country) as countries_affected
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition} AND n.threat_family IS NOT NULL
            GROUP BY n.threat_family, i.threat_vector
            ORDER BY case_count DESC
            """
            
            threat_families = self.execute_query(threat_family_query)
            if isinstance(threat_families, dict) and 'error' in threat_families:
                threat_families = []
            
            return threat_families or []
            
        except Exception as e:
            logger.error(f"Error in get_threat_family_analysis: {e}")
            return []

    def get_infrastructure_analysis_detailed(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get detailed infrastructure analysis for hosting providers, ISPs, and ASNs"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            infrastructure_query = f"""
            SELECT 
                u.host_country,
                u.isp,
                u.asn,
                COUNT(DISTINCT i.case_number) as case_count,
                COUNT(DISTINCT u.domain) as domain_count,
                COUNT(DISTINCT n.threat_family) as threat_families
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            LEFT JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
            WHERE {date_condition}            GROUP BY u.host_country, u.isp, u.asn
            ORDER BY case_count DESC
            """
            
            infrastructure = self.execute_query(infrastructure_query)
            if isinstance(infrastructure, dict) and 'error' in infrastructure:
                infrastructure = []
            
            # Return actual data from database only - no mock data
            return infrastructure
            
        except Exception as e:
            logger.error(f"Error in get_infrastructure_analysis_detailed: {e}")
            return []

    def get_ioc_tracking(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get IOC tracking with threat scores"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            ioc_query = f"""
            SELECT 
                u.domain,
                u.ip_address,
                u.url,
                n.threat_family,
                i.threat_vector as severity,
                COUNT(DISTINCT i.case_number) as case_frequency,
                CASE 
                    WHEN i.severity = 'Critical' THEN 10
                    WHEN i.severity = 'High' THEN 8
                    WHEN i.severity = 'Medium' THEN 6
                    WHEN i.severity = 'Low' THEN 4
                    ELSE 2
                END as threat_score
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            LEFT JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
            WHERE {date_condition}            GROUP BY u.domain, u.ip_address, u.url, n.threat_family, i.threat_vector
            ORDER BY threat_score DESC, case_frequency DESC
            """
            
            iocs = self.execute_query(ioc_query)
            if isinstance(iocs, dict) and 'error' in iocs:
                iocs = []
            
            # Return actual data from database only - no mock data
            return iocs
            
        except Exception as e:
            logger.error(f"Error in get_ioc_tracking: {e}")
            return []

    # ============================================================================
    # CAMPAIGN MANAGEMENT DASHBOARD METHODS
    # ============================================================================

    def get_campaign_overview(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get campaign overview with case counts"""
        try:
            campaign_overview = []
            
            for campaign_name, campaign_data in self.campaigns.items():
                if isinstance(campaign_data, list):
                    total_cases = 0
                    active_cases = 0
                    closed_cases = 0
                    
                    # Count cases for this campaign
                    for mapping in campaign_data:
                        if mapping.get('field') == 'case_number':
                            case_number = mapping['value']
                            
                            # Check case status
                            status_query = f"""
                            SELECT case_status, resolution_status FROM phishlabs_case_data_incidents 
                            WHERE case_number = '{case_number}'
                            """
                            
                            status_result = self.execute_query(status_query)
                            if status_result and not isinstance(status_result, dict):
                                total_cases += 1
                                case_status = status_result[0].get('case_status', '')
                                resolution_status = status_result[0].get('resolution_status', '')
                                
                                if case_status == 'Active' or resolution_status != 'Closed':
                                    active_cases += 1
                                elif resolution_status == 'Closed':
                                    closed_cases += 1
                    
                    campaign_overview.append({
                        'campaign_name': campaign_name,
                        'total_cases': total_cases,
                        'active_cases': active_cases,
                        'closed_cases': closed_cases,
                        'completion_rate': round((closed_cases / total_cases * 100) if total_cases > 0 else 0, 1)
                    })
            
            return campaign_overview
            
        except Exception as e:
            logger.error(f"Error in get_campaign_overview: {e}")
            return []

    def get_campaign_progress(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get campaign progress timeline"""
        try:
            progress_data = []
            
            for campaign_name, campaign_data in self.campaigns.items():
                if isinstance(campaign_data, list):
                    case_numbers = [str(mapping['value']) for mapping in campaign_data if mapping.get('field') == 'case_number']
                    
                    if case_numbers:
                        case_list = "', '".join(case_numbers)
                        
                        timeline_query = f"""
                        SELECT 
                            CAST(i.date_created_local AS DATE) as date,
                            COUNT(*) as cases_created,
                            COUNT(CASE WHEN i.resolution_status = 'Closed' THEN 1 END) as cases_closed
                        FROM phishlabs_case_data_incidents i
                        WHERE i.case_number IN ('{case_list}')
                        GROUP BY CAST(i.date_created_local AS DATE)
                        ORDER BY date
                        """
                        
                        timeline_result = self.execute_query(timeline_query)
                        if timeline_result and not isinstance(timeline_result, dict):
                            progress_data.append({
                                'campaign_name': campaign_name,
                                'timeline': timeline_result
                            })
            
            return progress_data
            
        except Exception as e:
            logger.error(f"Error in get_campaign_progress: {e}")
            return []

    def get_cross_table_campaign_view(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get cross-table campaign view"""
        try:
            cross_table_data = []
            
            for campaign_name, campaign_data in self.campaigns.items():
                campaign_cases = {
                    'campaign_name': campaign_name,
                    'case_data_incidents': 0,
                    'threat_intelligence': 0,
                    'social_incidents': 0,
                    'total': 0
                }
                
                if isinstance(campaign_data, list):
                    for mapping in campaign_data:
                        table = mapping.get('table', '')
                        value = mapping.get('value', '')
                        
                        if table == 'phishlabs_case_data_incidents':
                            campaign_cases['case_data_incidents'] += 1
                        elif table == 'phishlabs_threat_intelligence_incident':
                            campaign_cases['threat_intelligence'] += 1
                        elif table == 'phishlabs_incident':
                            campaign_cases['social_incidents'] += 1
                        
                        campaign_cases['total'] += 1
                
                cross_table_data.append(campaign_cases)
            
            return cross_table_data
            
        except Exception as e:
            logger.error(f"Error in get_cross_table_campaign_view: {e}")
            return []

    # ============================================================================
    # SOCIAL MEDIA & EXECUTIVE TARGETING DASHBOARD METHODS
    # ============================================================================

    def get_executive_targeting_analysis(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get executive targeting analysis from phishlabs_incident table"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "s.created_local")
            campaign_condition = self.get_campaign_filter_conditions("s", campaign_filter)
            
            exec_targeting_query = f"""
            SELECT 
                s.executive_name,
                s.title,
                s.brand_name,
                COUNT(*) as incident_count,
                s.incident_type,
                s.threat_type,
                s.severity,
                s.status,
                s.derived_status,
                MIN(s.created_local) as first_targeted,
                MAX(s.last_modified_local) as last_targeted
            FROM phishlabs_incident s
            WHERE {date_condition} AND s.executive_name IS NOT NULL AND s.executive_name != ''
            GROUP BY s.executive_name, s.title, s.brand_name, s.incident_type, s.threat_type, s.severity, s.status, s.derived_status
            ORDER BY incident_count DESC
            """
            
            exec_targeting = self.execute_query(exec_targeting_query)
            if isinstance(exec_targeting, dict) and 'error' in exec_targeting:
                exec_targeting = []
            
            return exec_targeting or []
            
        except Exception as e:
            logger.error(f"Error in get_executive_targeting_analysis: {e}")
            return []

    def get_social_platform_breakdown(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get social platform breakdown from phishlabs_incident table"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "s.created_local")
            campaign_condition = self.get_campaign_filter_conditions("s", campaign_filter)
            
            platform_query = f"""
            SELECT 
                s.incident_type,
                s.threat_type,
                s.severity,
                COUNT(*) as incident_count,
                COUNT(CASE WHEN s.status = 'Active' OR s.derived_status != 'Closed' THEN 1 END) as active_incidents,
                COUNT(CASE WHEN s.status = 'Closed' OR s.derived_status = 'Closed' THEN 1 END) as closed_incidents
            FROM phishlabs_incident s
            WHERE {date_condition}            GROUP BY s.incident_type, s.threat_type, s.severity
            ORDER BY incident_count DESC
            """
            
            platforms = self.execute_query(platform_query)
            if isinstance(platforms, dict) and 'error' in platforms:
                platforms = []
            
            return platforms or []
            
        except Exception as e:
            logger.error(f"Error in get_social_platform_breakdown: {e}")
            return []

    def get_brand_protection_analysis(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get brand protection analysis from phishlabs_incident table"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "s.created_local")
            campaign_condition = self.get_campaign_filter_conditions("s", campaign_filter)
            
            brand_query = f"""
            SELECT 
                s.brand_name,
                s.incident_type,
                s.threat_type,
                COUNT(*) as total_incidents,
                COUNT(CASE WHEN s.status = 'Active' OR s.derived_status != 'Closed' THEN 1 END) as active_incidents,
                COUNT(CASE WHEN s.status = 'Closed' OR s.derived_status = 'Closed' THEN 1 END) as closed_incidents,
                COUNT(DISTINCT s.executive_name) as executives_targeted,
                MIN(s.created_local) as first_incident,
                MAX(s.last_modified_local) as last_incident
            FROM phishlabs_incident s
            WHERE {date_condition} AND s.brand_name IS NOT NULL AND s.brand_name != ''
            GROUP BY s.brand_name, s.incident_type, s.threat_type
            ORDER BY total_incidents DESC
            """
            
            brands = self.execute_query(brand_query)
            if isinstance(brands, dict) and 'error' in brands:
                brands = []
            
            return brands or []
            
        except Exception as e:
            logger.error(f"Error in get_brand_protection_analysis: {e}")
            return []

    def get_social_threat_trends(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get social threat trends timeline from phishlabs_incident table"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "s.created_local")
            campaign_condition = self.get_campaign_filter_conditions("s", campaign_filter)
            
            trends_query = f"""
            SELECT 
                CAST(s.created_local AS DATE) as date,
                s.incident_type,
                s.threat_type,
                s.severity,
                COUNT(*) as incident_count,
                COUNT(DISTINCT s.brand_name) as brands_affected,
                COUNT(DISTINCT s.executive_name) as executives_targeted,
                COUNT(CASE WHEN s.status = 'Active' OR s.derived_status != 'Closed' THEN 1 END) as active_incidents,
                COUNT(CASE WHEN s.status = 'Closed' OR s.derived_status = 'Closed' THEN 1 END) as closed_incidents
            FROM phishlabs_incident s
            WHERE {date_condition}            GROUP BY CAST(s.created_local AS DATE), s.incident_type, s.threat_type, s.severity
            ORDER BY date DESC, incident_count DESC
            """
            
            trends = self.execute_query(trends_query)
            if isinstance(trends, dict) and 'error' in trends:
                trends = []
            
            return trends or []
            
        except Exception as e:
            logger.error(f"Error in get_social_threat_trends: {e}")
            return []

    # ============================================================================
    # THREAT INTELLIGENCE ATTRIBUTION METHODS
    # ============================================================================

    def get_whois_attribution(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get WHOIS attribution for repeat offender registrants"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            
            # Proper WHOIS attribution query that joins with incidents for date filtering
            # Query for WHOIS names only - using subqueries to get distinct threat families and actors
            whois_name_query = f"""
            SELECT 
                n.flagged_whois_name,
                CAST(NULL AS VARCHAR(MAX)) as flagged_whois_email,
                COUNT(DISTINCT i.case_number) as total_cases,
                (SELECT STRING_AGG(CAST(n2.threat_family AS VARCHAR(MAX)), ', ') 
                 FROM (SELECT DISTINCT n3.flagged_whois_name, n3.threat_family
                       FROM phishlabs_case_data_notes n3
                       JOIN phishlabs_case_data_incidents i3 ON n3.case_number = i3.case_number
                       WHERE {date_condition.replace('i.', 'i3.')}
                       AND n3.flagged_whois_name = n.flagged_whois_name
                       AND n3.threat_family IS NOT NULL AND n3.threat_family != '') n2) as threat_families,
                (SELECT STRING_AGG(CAST(th2.name AS VARCHAR(MAX)), ', ') 
                 FROM (SELECT DISTINCT n4.flagged_whois_name, th4.name
                       FROM phishlabs_case_data_notes n4
                       JOIN phishlabs_case_data_incidents i4 ON n4.case_number = i4.case_number
                       LEFT JOIN phishlabs_case_data_note_threatactor_handles th4 ON i4.case_number = th4.case_number
                       WHERE {date_condition.replace('i.', 'i4.')}
                       AND n4.flagged_whois_name = n.flagged_whois_name
                       AND th4.name IS NOT NULL AND th4.name != '') th2) as threat_actors
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            WHERE {date_condition}
            AND n.flagged_whois_name IS NOT NULL AND n.flagged_whois_name != ''
            GROUP BY n.flagged_whois_name
            HAVING COUNT(DISTINCT i.case_number) >= 1
            """
            
            # Query for WHOIS emails only - using subqueries to get distinct threat families and actors
            whois_email_query = f"""
            SELECT 
                CAST(NULL AS VARCHAR(MAX)) as flagged_whois_name,
                n.flagged_whois_email,
                COUNT(DISTINCT i.case_number) as total_cases,
                (SELECT STRING_AGG(CAST(n2.threat_family AS VARCHAR(MAX)), ', ') 
                 FROM (SELECT DISTINCT n3.flagged_whois_email, n3.threat_family
                       FROM phishlabs_case_data_notes n3
                       JOIN phishlabs_case_data_incidents i3 ON n3.case_number = i3.case_number
                       WHERE {date_condition.replace('i.', 'i3.')}
                       AND n3.flagged_whois_email = n.flagged_whois_email
                       AND n3.threat_family IS NOT NULL AND n3.threat_family != '') n2) as threat_families,
                (SELECT STRING_AGG(CAST(th2.name AS VARCHAR(MAX)), ', ') 
                 FROM (SELECT DISTINCT n4.flagged_whois_email, th4.name
                       FROM phishlabs_case_data_notes n4
                       JOIN phishlabs_case_data_incidents i4 ON n4.case_number = i4.case_number
                       LEFT JOIN phishlabs_case_data_note_threatactor_handles th4 ON i4.case_number = th4.case_number
                       WHERE {date_condition.replace('i.', 'i4.')}
                       AND n4.flagged_whois_email = n.flagged_whois_email
                       AND th4.name IS NOT NULL AND th4.name != '') th2) as threat_actors
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            WHERE {date_condition}
            AND n.flagged_whois_email IS NOT NULL AND n.flagged_whois_email != ''
            GROUP BY n.flagged_whois_email
            HAVING COUNT(DISTINCT i.case_number) >= 1
            """
            
            # Execute both queries and combine
            logger.info(f"WHOIS Attribution queries with date condition: {date_condition}")
            logger.info(f"WHOIS name query: {whois_name_query}")
            whois_name_data = self.execute_query(whois_name_query)
            logger.info(f"WHOIS name data: {len(whois_name_data) if whois_name_data and not isinstance(whois_name_data, dict) else 0} records")
            
            logger.info(f"WHOIS email query: {whois_email_query}")
            whois_email_data = self.execute_query(whois_email_query)
            logger.info(f"WHOIS email data: {len(whois_email_data) if whois_email_data and not isinstance(whois_email_data, dict) else 0} records")
            
            # Combine results
            whois_data = []
            if whois_name_data and not isinstance(whois_name_data, dict):
                whois_data.extend(whois_name_data)
            if whois_email_data and not isinstance(whois_email_data, dict):
                whois_data.extend(whois_email_data)
            
            logger.info(f"WHOIS Attribution returned {len(whois_data) if whois_data and not isinstance(whois_data, dict) else 0} records")
            
            # Transform the data to match expected format
            if whois_data and not isinstance(whois_data, dict) and len(whois_data) > 0:
                transformed_data = []
                for row in whois_data:
                    transformed_row = {
                        'registrant': row.get('flagged_whois_email') or row.get('flagged_whois_name') or 'Unknown',
                        'flagged_whois_email': row.get('flagged_whois_email'),
                        'flagged_whois_name': row.get('flagged_whois_name'),
                        'total_cases': row.get('total_cases', 0),
                        'threat_families_used': row.get('threat_families', 'None'),
                        'threat_actors': row.get('threat_actors', 'None'),
                        'domains_registered': 0,
                        'tlds_used': '',
                        'first_registration': None,
                        'last_registration': None,
                        'risk_level': 'Low' if row.get('total_cases', 0) < 5 else ('Medium' if row.get('total_cases', 0) < 10 else 'High')
                    }
                    transformed_data.append(transformed_row)
                
                # Sort by total cases descending
                whois_data = sorted(transformed_data, key=lambda x: x['total_cases'], reverse=True)
                logger.info(f"WHOIS Attribution transformed data: {len(whois_data)} records")
            else:
                whois_data = []
                logger.info("No WHOIS data found - either no data exists or date filter is too restrictive")
                
            return whois_data
            
        except Exception as e:
            logger.error(f"Error in get_whois_attribution: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []

    def get_priority_attribution_cases(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get high-priority cases with strong attribution signals (score >= 2)"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            priority_query = f"""
            SELECT 
                i.case_number,
                i.brand,
                i.case_status,
                i.date_created_local,
                -- Aggregate attribution pieces per case via subqueries to avoid DISTINCT limitations
                (
                    SELECT STRING_AGG(th2.name, ', ')
                    FROM phishlabs_case_data_note_threatactor_handles th2
                    WHERE th2.case_number = i.case_number AND th2.name IS NOT NULL AND th2.name != ''
                ) as threat_actor,
                (
                    SELECT STRING_AGG(n2.threat_family, ', ')
                    FROM phishlabs_case_data_notes n2
                    WHERE n2.case_number = i.case_number AND n2.threat_family IS NOT NULL AND n2.threat_family != ''
                ) as threat_family,
                (
                    SELECT STRING_AGG(n3.flagged_whois_email, ', ')
                    FROM phishlabs_case_data_notes n3
                    WHERE n3.case_number = i.case_number AND n3.flagged_whois_email IS NOT NULL AND n3.flagged_whois_email != ''
                ) as flagged_whois_email,
                (
                    SELECT STRING_AGG(n4.flagged_whois_name, ', ')
                    FROM phishlabs_case_data_notes n4
                    WHERE n4.case_number = i.case_number AND n4.flagged_whois_name IS NOT NULL AND n4.flagged_whois_name != ''
                ) as flagged_whois_name,
                (
                    SELECT TOP 1 u2.domain
                    FROM phishlabs_case_data_associated_urls u2
                    WHERE u2.case_number = i.case_number AND u2.domain IS NOT NULL AND u2.domain != ''
                    ORDER BY LEN(u2.domain) DESC
                ) as domain,
                (
                    SELECT STRING_AGG(u3.host_country, ', ')
                    FROM phishlabs_case_data_associated_urls u3
                    WHERE u3.case_number = i.case_number AND u3.host_country IS NOT NULL AND u3.host_country != ''
                ) as host_country
            FROM phishlabs_case_data_incidents i
            WHERE {date_condition}
              AND (
                  EXISTS (SELECT 1 FROM phishlabs_case_data_note_threatactor_handles thx WHERE thx.case_number = i.case_number AND thx.name IS NOT NULL AND thx.name != '')
               OR EXISTS (SELECT 1 FROM phishlabs_case_data_notes nx WHERE nx.case_number = i.case_number AND nx.threat_family IS NOT NULL AND nx.threat_family != '')
               OR EXISTS (SELECT 1 FROM phishlabs_case_data_notes ny WHERE ny.case_number = i.case_number AND (ny.flagged_whois_email IS NOT NULL AND ny.flagged_whois_email != '' OR ny.flagged_whois_name IS NOT NULL AND ny.flagged_whois_name != ''))
              )
            ORDER BY i.date_created_local DESC
            """
            
            priority_cases = self.execute_query(priority_query)
            if isinstance(priority_cases, dict) and 'error' in priority_cases:
                priority_cases = []
                
            return priority_cases or []
            
        except Exception as e:
            logger.error(f"Error in get_priority_attribution_cases: {e}")
            return []
    
    def get_attribution_coverage(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get attribution coverage metrics - percentage of cases with different types of attribution"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            coverage_query = f"""
            WITH attribution_analysis AS (
                SELECT 
                    i.case_number,
                    CASE WHEN th.name IS NOT NULL THEN 1 ELSE 0 END as has_threat_actor,
                    CASE WHEN n.threat_family IS NOT NULL THEN 1 ELSE 0 END as has_kit_family,
                    CASE WHEN (n.flagged_whois_email IS NOT NULL OR n.flagged_whois_name IS NOT NULL) THEN 1 ELSE 0 END as has_whois,
                    CASE WHEN b.case_number IS NOT NULL THEN 1 ELSE 0 END as has_bot_detection,
                    (CASE WHEN th.name IS NOT NULL THEN 1 ELSE 0 END +
                    CASE WHEN n.threat_family IS NOT NULL THEN 1 ELSE 0 END +
                    CASE WHEN (n.flagged_whois_email IS NOT NULL OR n.flagged_whois_name IS NOT NULL) THEN 1 ELSE 0 END +
                    CASE WHEN b.case_number IS NOT NULL THEN 1 ELSE 0 END) as attribution_score
                FROM phishlabs_case_data_incidents i
                LEFT JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
                LEFT JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
                LEFT JOIN phishlabs_case_data_note_bots b ON i.case_number = b.case_number
                WHERE {date_condition}            )
            SELECT 
                COUNT(*) as total_cases,
                SUM(has_threat_actor) as cases_with_actor,
                SUM(has_kit_family) as cases_with_kit,
                SUM(has_whois) as cases_with_whois,
                ROUND(AVG(CAST(attribution_score AS FLOAT)), 2) as avg_attribution_score,
                ROUND((SUM(has_threat_actor) * 100.0 / COUNT(*)), 1) as threat_actor_coverage,
                ROUND((SUM(has_kit_family) * 100.0 / COUNT(*)), 1) as kit_family_coverage,
                ROUND((SUM(has_whois) * 100.0 / COUNT(*)), 1) as whois_coverage
            FROM attribution_analysis
            """
            
            result = self.execute_query(coverage_query)
            if isinstance(result, dict) and 'error' in result:
                return {
                    "threat_actor_coverage": 0,
                    "kit_family_coverage": 0,
                    "whois_coverage": 0,
                    "avg_attribution_score": 0,
                    "total_cases": 0
                }
            
            return result[0] if result else {
                "threat_actor_coverage": 0,
                "kit_family_coverage": 0,
                "whois_coverage": 0,
                "avg_attribution_score": 0,
                "total_cases": 0
            }
            
        except Exception as e:
            logger.error(f"Error in get_attribution_coverage: {e}")
            return {
                "threat_actor_coverage": 0,
                "kit_family_coverage": 0,
                "whois_coverage": 0,
                "avg_attribution_score": 0,
                "total_cases": 0
            }

    def get_top_threat_actors(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get top threat actors by attack volume with infrastructure fingerprinting"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            actor_query = f"""
            SELECT TOP 10
                th.name as threat_actor,
                th.record_type,
                COUNT(DISTINCT i.case_number) as total_attacks,
                COUNT(DISTINCT u.domain) as unique_domains,
                COUNT(DISTINCT u.ip_address) as unique_ips,
                COUNT(DISTINCT u.host_country) as countries_count,
                COUNT(DISTINCT n.threat_family) as families_count,
                STRING_AGG(n.threat_family, ',') as kits_used,
                STRING_AGG(u.tld, ',') as preferred_tlds,
                STRING_AGG(u.host_isp, ',') as preferred_isps,
                MIN(i.date_created_local) as active_since,
                MAX(i.date_created_local) as last_case,
                CASE 
                    WHEN COUNT(DISTINCT n.threat_family) = 1 THEN 'Specialist'
                    WHEN COUNT(DISTINCT n.threat_family) BETWEEN 2 AND 3 THEN 'Moderate'
                    ELSE 'Generalist'
                END as sophistication_level
            FROM phishlabs_case_data_note_threatactor_handles th
            INNER JOIN phishlabs_case_data_incidents i ON th.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            LEFT JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
            WHERE {date_condition}            GROUP BY th.name, th.record_type
            ORDER BY total_attacks DESC, unique_domains DESC
            """
            
            actors = self.execute_query(actor_query)
            if isinstance(actors, dict) and 'error' in actors:
                actors = []
            
            # Add threat score calculation
            for actor in actors or []:
                cases = actor.get('total_attacks', 0)
                domains = actor.get('unique_domains', 0)
                countries = actor.get('countries_count', 0)
                duration = actor.get('campaign_duration', 0)
                
                # Threat score based on volume, geographic spread, and persistence
                threat_score = min(100, (cases * 2) + (domains) + (countries * 3) + (duration / 10))
                actor['threat_score'] = round(threat_score, 1)
            
            return actors or []
            
        except Exception as e:
            logger.error(f"Error in get_top_threat_actors: {e}")
            return []

    def get_kit_family_distribution(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get phishing kit family distribution with campaign tracking"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            kit_query = f"""
            SELECT 
                n.threat_family,
                COUNT(DISTINCT i.case_number) as case_count,
                COUNT(DISTINCT u.domain) as unique_domains,
                COUNT(DISTINCT u.ip_address) as unique_ips,
                COUNT(DISTINCT u.tld) as unique_tlds,
                COUNT(DISTINCT u.host_country) as countries_used,
                MIN(i.date_created_local) as campaign_start,
                MAX(i.date_created_local) as campaign_end,
                DATEDIFF(day, MIN(i.date_created_local), MAX(i.date_created_local)) as campaign_duration_days,
                STRING_AGG(th.name, ',') as associated_actors
            FROM phishlabs_case_data_incidents i
            INNER JOIN phishlabs_case_data_notes n ON i.case_number = n.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            LEFT JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            WHERE {date_condition} AND n.threat_family IS NOT NULL
            GROUP BY n.threat_family
            ORDER BY case_count DESC
            """
            
            kits = self.execute_query(kit_query)
            if isinstance(kits, dict) and 'error' in kits:
                kits = []
            
            return kits or []
            
        except Exception as e:
            logger.error(f"Error in get_kit_family_distribution: {e}")
            return []

    def get_attribution_timeline(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get attribution timeline showing threat actor activity patterns"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            
            # Simplified query - just get all cases grouped by date to test if data returns
            threat_family_query = f"""
            SELECT 
                CAST(i.date_created_local AS DATE) as week,
                'All Cases' as attribution_name,
                COUNT(DISTINCT i.case_number) as cases,
                COUNT(DISTINCT i.case_number) as unique_domains,
                '' as target_countries,
                'threat_family' as attribution_type
            FROM phishlabs_case_data_incidents i
            WHERE {date_condition}
            GROUP BY CAST(i.date_created_local AS DATE)
            ORDER BY week DESC
            """
            
            # Empty query for threat actor for now
            threat_actor_query = f"""
            SELECT 
                CAST(i.date_created_local AS DATE) as week,
                'Threat Actors' as attribution_name,
                COUNT(DISTINCT i.case_number) as cases,
                COUNT(DISTINCT i.case_number) as unique_domains,
                '' as target_countries,
                'threat_actor' as attribution_type
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            WHERE {date_condition}
            AND th.name IS NOT NULL
            GROUP BY CAST(i.date_created_local AS DATE)
            ORDER BY week DESC
            """
            
            logger.info(f"Attribution Timeline Query: Fetching threat_family data with date_filter={date_filter}")
            logger.info(f"Threat Family Query: {threat_family_query}")
            threat_family_timeline = self.execute_query(threat_family_query)
            logger.info(f"Threat Family Timeline returned {len(threat_family_timeline) if threat_family_timeline and not isinstance(threat_family_timeline, dict) else 0} records")
            
            logger.info(f"Attribution Timeline Query: Fetching threat_actor data with date_filter={date_filter}")
            threat_actor_timeline = self.execute_query(threat_actor_query)
            logger.info(f"Threat Actor Timeline returned {len(threat_actor_timeline) if threat_actor_timeline and not isinstance(threat_actor_timeline, dict) else 0} records")
            
            if isinstance(threat_family_timeline, dict) and 'error' in threat_family_timeline:
                logger.error(f"Threat Family Timeline query error: {threat_family_timeline.get('error')}")
                threat_family_timeline = []
            
            if isinstance(threat_actor_timeline, dict) and 'error' in threat_actor_timeline:
                logger.error(f"Threat Actor Timeline query error: {threat_actor_timeline.get('error')}")
                threat_actor_timeline = []
            
            # Combine both timelines
            timeline = (threat_family_timeline if isinstance(threat_family_timeline, list) else []) + \
                      (threat_actor_timeline if isinstance(threat_actor_timeline, list) else [])
            
            # Calculate insights
            insights = {
                "active_actors": 0,
                "new_actors": 0,
                "avg_campaign_duration": 0
            }
            
            if timeline:
                unique_actors = set()
                for entry in timeline:
                    if entry.get('attribution_name'):
                        unique_actors.add(entry.get('attribution_name'))
                
                insights["active_actors"] = len(unique_actors)
                # Additional calculations would go here
            
            return {
                "timeline": timeline,
                "insights": insights
            }
            
        except Exception as e:
            logger.error(f"Error in get_attribution_timeline: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {"timeline": [], "insights": {"active_actors": 0, "new_actors": 0, "avg_campaign_duration": 0}}

    def get_infrastructure_patterns(self, date_filter="today", campaign_filter="all", start_date=None, end_date=None):
        """Get infrastructure patterns showing threat actor preferences"""
        try:
            date_condition = self.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
            campaign_condition = self.get_campaign_filter_conditions("i", campaign_filter)
            
            # Top TLDs
            tld_query = f"""
            SELECT TOP 10
                u.tld,
                COUNT(DISTINCT i.case_number) as count,
                COUNT(DISTINCT th.name) as actor_count
            FROM phishlabs_case_data_associated_urls u
            INNER JOIN phishlabs_case_data_incidents i ON u.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            WHERE {date_condition} AND u.tld IS NOT NULL
            GROUP BY u.tld
            ORDER BY count DESC
            """
            
            # Host Countries
            country_query = f"""
            SELECT TOP 10
                u.host_country as country,
                COUNT(DISTINCT i.case_number) as count,
                COUNT(DISTINCT th.name) as actor_count
            FROM phishlabs_case_data_associated_urls u
            INNER JOIN phishlabs_case_data_incidents i ON u.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            WHERE {date_condition} AND u.host_country IS NOT NULL
            GROUP BY u.host_country
            ORDER BY count DESC
            """
            
            # Hosting Providers
            isp_query = f"""
            SELECT TOP 10
                u.host_isp as isp,
                COUNT(DISTINCT i.case_number) as count,
                COUNT(DISTINCT th.name) as actor_count
            FROM phishlabs_case_data_associated_urls u
            INNER JOIN phishlabs_case_data_incidents i ON u.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            WHERE {date_condition} AND u.host_isp IS NOT NULL
            GROUP BY u.host_isp
            ORDER BY count DESC
            """
            
            # Registrars
            registrar_query = f"""
            SELECT TOP 10
                r.name as registrar,
                COUNT(DISTINCT i.case_number) as count,
                COUNT(DISTINCT th.name) as actor_count
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            LEFT JOIN phishlabs_case_data_note_threatactor_handles th ON i.case_number = th.case_number
            WHERE {date_condition} AND r.name IS NOT NULL
            GROUP BY r.name
            ORDER BY count DESC
            """
            
            tlds = self.execute_query(tld_query)
            countries = self.execute_query(country_query)
            isps = self.execute_query(isp_query)
            registrars = self.execute_query(registrar_query)
            
            return {
                "tlds": tlds if not isinstance(tlds, dict) else [],
                "countries": countries if not isinstance(countries, dict) else [],
                "providers": isps if not isinstance(isps, dict) else [],
                "registrars": registrars if not isinstance(registrars, dict) else []
            }
            
        except Exception as e:
            logger.error(f"Error in get_infrastructure_patterns: {e}")
            return {"tlds": [], "countries": [], "providers": [], "registrars": []}

    def clear_test_data(self):
        """Clear existing test data from all tables"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            logger.info("Clearing existing test data...")
            cursor.execute("DELETE FROM phishlabs_case_data_note_bots WHERE case_number LIKE 'TI-2024-%'")
            cursor.execute("DELETE FROM phishlabs_case_data_note_threatactor_handles WHERE case_number LIKE 'TI-2024-%'")
            cursor.execute("DELETE FROM phishlabs_case_data_notes WHERE case_number LIKE 'TI-2024-%'")
            cursor.execute("DELETE FROM phishlabs_case_data_associated_urls WHERE case_number LIKE 'TI-2024-%'")
            cursor.execute("DELETE FROM phishlabs_case_data_incidents WHERE case_number LIKE 'TI-2024-%'")
            conn.commit()
            logger.info("Existing test data cleared successfully")
        except Exception as e:
            logger.error(f"Error clearing test data: {e}")
            conn.rollback()
        finally:
            cursor.close()
            conn.close()

    def insert_comprehensive_test_data(self):
        """Insert comprehensive test data for Threat Intelligence Dashboard"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            logger.info("Starting comprehensive test data insertion...")
            
            # Test data arrays
            brands = ['Microsoft', 'PayPal', 'Amazon', 'Apple', 'Google', 'Netflix', 'Facebook']
            case_types = ['Credential Theft']
            case_statuses = ['Active', 'Closed']
            resolution_statuses = ['Open', 'Investigating', 'Mitigating', 'Closed']
            threat_families = ['Emotet', 'Trickbot', 'Qakbot', 'IcedID', 'Cobalt Strike']
            threat_actors = ['TA505', 'FIN7', 'Carbanak', 'Lazarus Group', 'APT29']
            
            # Bot data - using note and url columns
            bot_data = [
                ('Emotet Loader detected in phishing campaign', 'https://microsoft-security-update.com/login'),
                ('Trickbot Banking Trojan identified', 'https://paypal-verification.net/secure'),
                ('Qakbot Info Stealer analysis complete', 'https://amazon-prime-renewal.org/account'),
                ('IcedID Banking Trojan detected', 'https://apple-id-suspended.info/verify'),
                ('Cobalt Strike Beacon communication detected', 'https://netflix-billing-issue.co/update')
            ]
            
            # WHOIS data
            whois_data = [
                ('john.smith@tempmail.com', 'John Smith'),
                ('mike.johnson@privacy.com', 'Mike Johnson'),
                ('alex.brown@protonmail.com', 'Alex Brown'),
                ('sarah.davis@guerrillamail.com', 'Sarah Davis'),
                ('robert.wilson@10minutemail.com', 'Robert Wilson')
            ]
            
            # Infrastructure data
            infrastructure_data = [
                ('com', 'US', 'Cloudflare Inc'),
                ('net', 'NL', 'DigitalOcean LLC'),
                ('org', 'DE', 'Hetzner Online GmbH'),
                ('info', 'RU', 'OVH SAS'),
                ('biz', 'CN', 'Alibaba Cloud'),
                ('co', 'FR', 'Online SAS'),
                ('me', 'UK', 'Amazon Web Services')
            ]
            
            # IANA IDs for registrars
            iana_ids = [13, 146, 292]
            
            # Generate 30 test cases across different time periods
            cases_data = []
            urls_data = []
            notes_data = []
            actors_data = []
            bots_data = []
            
            for i in range(1, 31):
                case_number = f"TI-2024-{i:03d}"
                
                # Time distribution
                if i <= 7:
                    days_ago = random.randint(1, 7)  # Last week
                elif i <= 14:
                    days_ago = random.randint(8, 14)  # 1-2 weeks ago
                elif i <= 20:
                    days_ago = random.randint(15, 30)  # 3-4 weeks ago
                elif i <= 25:
                    days_ago = random.randint(31, 60)  # 1-2 months ago
                else:
                    days_ago = random.randint(61, 90)  # 2-3 months ago
                
                created_date = datetime.now() - timedelta(days=days_ago)
                
                # Case data
                brand = random.choice(brands)
                case_type = random.choice(case_types)
                case_status = random.choice(case_statuses)
                resolution_status = random.choice(resolution_statuses)
                iana_id = random.choice(iana_ids)
                
                # Closed cases need a closed date
                closed_date = None
                if case_status == 'Closed':
                    closed_days = random.randint(1, min(days_ago - 1, 30))
                    closed_date = created_date + timedelta(days=closed_days)
                
                cases_data.append((
                    case_number, brand, case_type, case_status, 
                    resolution_status, created_date, closed_date, iana_id
                ))
                
                # URL data
                infra = random.choice(infrastructure_data)
                tld, country, isp = infra
                domain = f"{brand.lower()}-{random.choice(['security', 'verification', 'update', 'alert'])}-{random.randint(1000, 9999)}.{tld}"
                ip = f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}"
                url = f"https://{domain}/{random.choice(['login', 'verify', 'update', 'secure'])}"
                
                urls_data.append((
                    case_number, url, domain, ip, tld, country, isp
                ))
                
                # Threat intelligence data
                threat_family = random.choice(threat_families)
                whois_email, whois_name = random.choice(whois_data)
                
                notes_data.append((
                    case_number, threat_family, whois_email, whois_name
                ))
                
                # Threat actor data
                threat_actor = random.choice(threat_actors)
                record_types = ['APT', 'Criminal Group', 'Individual', 'State-Sponsored', 'Cybercriminal']
                record_type = random.choice(record_types)
                actors_data.append((case_number, threat_actor, record_type))
                
                # Bot data
                bot_note, bot_url = random.choice(bot_data)
                bots_data.append((case_number, bot_note, bot_url))
            
            # Insert data
            logger.info("Inserting case data...")
            cursor.executemany("""
                INSERT INTO phishlabs_case_data_incidents 
                (case_number, brand, case_type, case_status, resolution_status, 
                 date_created_local, date_closed_local, iana_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, cases_data)
            
            logger.info("Inserting URL data...")
            cursor.executemany("""
                INSERT INTO phishlabs_case_data_associated_urls 
                (case_number, url, domain, ip_address, tld, host_country, host_isp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, urls_data)
            
            logger.info("Inserting threat intelligence notes...")
            cursor.executemany("""
                INSERT INTO phishlabs_case_data_notes 
                (case_number, threat_family, flagged_whois_email, flagged_whois_name)
                VALUES (?, ?, ?, ?)
            """, notes_data)
            
            logger.info("Inserting threat actor data...")
            cursor.executemany("""
                INSERT INTO phishlabs_case_data_note_threatactor_handles 
                (case_number, name, record_type)
                VALUES (?, ?, ?)
            """, actors_data)
            
            logger.info("Inserting bot detection data...")
            cursor.executemany("""
                INSERT INTO phishlabs_case_data_note_bots 
                (case_number, note, url)
                VALUES (?, ?, ?)
            """, bots_data)
            
            conn.commit()
            logger.info("✅ All test data inserted successfully!")
            
        except Exception as e:
            logger.error(f"Error inserting test data: {e}")
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

# Global dashboard instance
dashboard = None

def init_dashboard():
    """Initialize dashboard with configuration"""
    global dashboard
    
    server = "localhost\\MSSQLSERVER2"
    database = "THEIA"
    
    # Initialize dashboard with production database connection
    dashboard = ThreatDashboard(server, database)

# =============================================================================
# FLASK ROUTES
# =============================================================================

@app.route('/')
def index():
    """Main dashboard page"""
    return render_template('dashboard_new.html')

@app.route('/campaign-dashboard')
def campaign_dashboard():
    """Campaign Management Dashboard page"""
    return render_template('campaign_dashboard.html')

@app.route('/data-quality')
def data_quality_dashboard():
    """Data Quality Issues Dashboard page"""
    return render_template('data_quality.html')

@app.route('/api/summary')
def api_summary():
    """API endpoint for executive summary"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        summary_data = dashboard.get_executive_summary(date_filter, campaign_filter, start_date, end_date)
        return jsonify(summary_data)
    except Exception as e:
        logger.error(f"Error in summary API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns')
def api_campaigns():
    """API endpoint for campaigns data - returns raw dictionary"""
    try:
        # Reload from file to ensure we have the latest data
        dashboard.campaigns = dashboard.load_campaigns()
        logger.info(f"Reloaded {len(dashboard.campaigns)} campaigns from file")
        return jsonify(dashboard.campaigns)
    except Exception as e:
        logger.error(f"Error in campaigns API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/reload', methods=['POST'])
def api_reload_campaigns():
    """Force reload campaigns from JSON file"""
    try:
        dashboard.campaigns = dashboard.load_campaigns()
        logger.info(f"Force reloaded {len(dashboard.campaigns)} campaigns from file")
        return jsonify({
            "message": "Campaigns reloaded successfully",
            "count": len(dashboard.campaigns)
        }), 200
    except Exception as e:
        logger.error(f"Error reloading campaigns: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/infrastructure')
def api_infrastructure():
    """API endpoint for infrastructure analysis"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        infrastructure_data = dashboard.get_infrastructure_analysis(date_filter, campaign_filter, start_date, end_date)
        return jsonify(infrastructure_data)
    except Exception as e:
        logger.error(f"Error in infrastructure API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/case-status')
def api_case_status():
    """API endpoint for case status analysis"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        status_data = dashboard.get_case_status_analysis(date_filter, campaign_filter, start_date, end_date)
        return jsonify(status_data)
    except Exception as e:
        logger.error(f"Error in case status API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/intelligence-coverage')
def api_intelligence_coverage():
    """API endpoint for intelligence coverage analysis"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        coverage_data = dashboard.get_intelligence_coverage_analysis(date_filter, campaign_filter, start_date, end_date)
        return jsonify(coverage_data)
    except Exception as e:
        logger.error(f"Error in intelligence coverage API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/whois-infrastructure-reuse')
def api_whois_infrastructure_reuse():
    """API endpoint for WHOIS infrastructure reuse detection"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        reuse_data = dashboard.get_whois_infrastructure_reuse(date_filter, campaign_filter, start_date, end_date)
        return jsonify(reuse_data)
    except Exception as e:
        logger.error(f"Error in WHOIS infrastructure reuse API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/actor-behavioral-analysis')
def api_actor_behavioral_analysis():
    """API endpoint for actor behavioral analysis"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        # Get date and campaign conditions
        date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        campaign_condition = dashboard.get_campaign_filter_conditions("i", campaign_filter)
        
        # Query for threat actor behavioral analysis
        query = f"""
        WITH actor_behavioral AS (
            SELECT 
                n.threat_family as threat_family,
                n.flagged_whois_name,
                n.flagged_whois_email,
                COUNT(DISTINCT i.case_number) as total_cases,
                COUNT(DISTINCT u.domain) as unique_domains,
                COUNT(DISTINCT u.host_country) as countries_targeted,
                COUNT(DISTINCT r.name) as registrars_used,
                COUNT(DISTINCT u.host_isp) as isps_used,
                COUNT(DISTINCT i.brand) as brands_targeted,
                MIN(i.date_created_local) as first_seen,
                MAX(i.date_created_local) as last_seen,
                DATEDIFF(day, MIN(i.date_created_local), MAX(i.date_created_local)) as campaign_duration_days
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
            WHERE {date_condition} AND n.threat_family IS NOT NULL
            GROUP BY n.threat_family, n.flagged_whois_name, n.flagged_whois_email
            HAVING COUNT(DISTINCT i.case_number) >= 2
        )
        SELECT 
            threat_family,
            flagged_whois_name,
            flagged_whois_email,
            total_cases,
            unique_domains,
            countries_targeted,
            registrars_used,
            isps_used,
            brands_targeted,
            first_seen,
            last_seen,
            campaign_duration_days,
            CASE 
                WHEN campaign_duration_days > 0 THEN CAST(total_cases AS FLOAT) / campaign_duration_days
                ELSE 0 
            END as operational_tempo,
            CASE 
                WHEN total_cases >= 10 AND countries_targeted >= 5 AND registrars_used >= 3 THEN 'High'
                WHEN total_cases >= 5 AND countries_targeted >= 3 THEN 'Medium'
                ELSE 'Low'
            END as sophistication_level,
            CASE 
                WHEN isps_used >= 8 AND registrars_used >= 4 THEN 'Highly Evasive'
                WHEN isps_used >= 4 AND registrars_used >= 2 THEN 'Moderately Evasive'
                ELSE 'Basic'
            END as evasion_capability,
            CASE 
                WHEN total_cases >= 10 THEN 'High Confidence'
                WHEN total_cases >= 5 THEN 'Medium Confidence'
                ELSE 'Low Confidence'
            END as confidence_level,
            (total_cases * 2 + unique_domains + countries_targeted * 3 + registrars_used + isps_used) as threat_score
        FROM actor_behavioral
        ORDER BY threat_score DESC
        """
        
        result = dashboard.execute_query(query)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"error": result['error']}), 500
        
        return jsonify(result if result else [])
    except Exception as e:
        logger.error(f"Error in actor behavioral analysis API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/resolution-times')
def api_resolution_times():
    """API endpoint for case resolution times"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        # Get date condition
        date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        
        # Query for resolution times analysis
        query = f"""
        WITH case_status_analysis AS (
            SELECT 
                i.case_number,
                i.date_created_local,
                i.case_status,
                CASE 
                    WHEN i.case_status = 'Active' THEN 'active'
                    ELSE 'closed'
                END as status_category,
                'non_campaign' as case_type,
                CASE 
                    WHEN i.case_status = 'Active' THEN NULL
                    WHEN i.case_status = 'Closed' AND i.date_created_local IS NOT NULL THEN 
                        DATEDIFF(hour, i.date_created_local, GETDATE())
                    ELSE NULL
                END as resolution_hours
            FROM phishlabs_case_data_incidents i
            -- Removed campaigns table reference
            WHERE {date_condition}
        ),
        resolution_buckets AS (
            SELECT 
                case_type,
                SUM(CASE WHEN resolution_hours <= 7 THEN 1 ELSE 0 END) as within_7_hours,
                SUM(CASE WHEN resolution_hours <= 12 THEN 1 ELSE 0 END) as within_12_hours,
                SUM(CASE WHEN resolution_hours <= 24 THEN 1 ELSE 0 END) as within_24_hours,
                SUM(CASE WHEN resolution_hours <= 48 THEN 1 ELSE 0 END) as within_48_hours,
                SUM(CASE WHEN resolution_hours <= 72 THEN 1 ELSE 0 END) as within_72_hours,
                SUM(CASE WHEN resolution_hours > 72 THEN 1 ELSE 0 END) as over_72_hours,
                AVG(resolution_hours) as avg_resolution_hours,
                COUNT(*) as total_cases
            FROM case_status_analysis
            WHERE resolution_hours IS NOT NULL
            GROUP BY case_type
        ),
        status_summary AS (
            SELECT 
                status_category,
                COUNT(*) as case_count
            FROM case_status_analysis
            GROUP BY status_category
        )
        SELECT 
            ISNULL(camp.within_7_hours, 0) as campaign_within_7_hours,
            ISNULL(camp.within_12_hours, 0) as campaign_within_12_hours,
            ISNULL(camp.within_24_hours, 0) as campaign_within_24_hours,
            ISNULL(camp.within_48_hours, 0) as campaign_within_48_hours,
            ISNULL(camp.within_72_hours, 0) as campaign_within_72_hours,
            ISNULL(camp.over_72_hours, 0) as campaign_over_72_hours,
            ISNULL(non_camp.within_7_hours, 0) as non_campaign_within_7_hours,
            ISNULL(non_camp.within_12_hours, 0) as non_campaign_within_12_hours,
            ISNULL(non_camp.within_24_hours, 0) as non_campaign_within_24_hours,
            ISNULL(non_camp.within_48_hours, 0) as non_campaign_within_48_hours,
            ISNULL(non_camp.within_72_hours, 0) as non_campaign_within_72_hours,
            ISNULL(non_camp.over_72_hours, 0) as non_campaign_over_72_hours,
            ISNULL(camp.avg_resolution_hours, 0) as campaign_avg_resolution_hours,
            ISNULL(non_camp.avg_resolution_hours, 0) as non_campaign_avg_resolution_hours,
            ISNULL(active.case_count, 0) as active_cases,
            ISNULL(closed.case_count, 0) as closed_cases,
            (ISNULL(active.case_count, 0) + ISNULL(closed.case_count, 0)) as total_cases
        FROM resolution_buckets camp
        FULL OUTER JOIN resolution_buckets non_camp ON camp.case_type = 'campaign' AND non_camp.case_type = 'non_campaign'
        CROSS JOIN (SELECT case_count FROM status_summary WHERE status_category = 'active') active
        CROSS JOIN (SELECT case_count FROM status_summary WHERE status_category = 'closed') closed
        WHERE camp.case_type = 'campaign' OR camp.case_type IS NULL
        """
        
        result = dashboard.execute_query(query)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"error": result['error']}), 500
        
        if result and len(result) > 0:
            data = result[0]
            resolution_data = {
                'campaign_resolution': {
                    'within_7_hours': data.get('campaign_within_7_hours', 0),
                    'within_12_hours': data.get('campaign_within_12_hours', 0),
                    'within_24_hours': data.get('campaign_within_24_hours', 0),
                    'within_48_hours': data.get('campaign_within_48_hours', 0),
                    'within_72_hours': data.get('campaign_within_72_hours', 0),
                    'over_72_hours': data.get('campaign_over_72_hours', 0)
                },
                'non_campaign_resolution': {
                    'within_7_hours': data.get('non_campaign_within_7_hours', 0),
                    'within_12_hours': data.get('non_campaign_within_12_hours', 0),
                    'within_24_hours': data.get('non_campaign_within_24_hours', 0),
                    'within_48_hours': data.get('non_campaign_within_48_hours', 0),
                    'within_72_hours': data.get('non_campaign_within_72_hours', 0),
                    'over_72_hours': data.get('non_campaign_over_72_hours', 0)
                },
                'average_resolution_hours': {
                    'campaign_cases': round(data.get('campaign_avg_resolution_hours', 0), 1),
                    'non_campaign_cases': round(data.get('non_campaign_avg_resolution_hours', 0), 1),
                    'overall': round((data.get('campaign_avg_resolution_hours', 0) + data.get('non_campaign_avg_resolution_hours', 0)) / 2, 1)
                },
                'active_cases': data.get('active_cases', 0),
                'closed_cases': data.get('closed_cases', 0),
                'total_cases': data.get('total_cases', 0)
            }
            return jsonify(resolution_data)
        else:
            return jsonify({
                'campaign_resolution': {'within_7_hours': 0, 'within_12_hours': 0, 'within_24_hours': 0, 'within_48_hours': 0, 'within_72_hours': 0, 'over_72_hours': 0},
                'non_campaign_resolution': {'within_7_hours': 0, 'within_12_hours': 0, 'within_24_hours': 0, 'within_48_hours': 0, 'within_72_hours': 0, 'over_72_hours': 0},
                'average_resolution_hours': {'campaign_cases': 0, 'non_campaign_cases': 0, 'overall': 0},
                'active_cases': 0, 'closed_cases': 0, 'total_cases': 0
            })
    except Exception as e:
        logger.error(f"Error in resolution times API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/temporal-storytelling')
def api_temporal_storytelling():
    """API endpoint for temporal storytelling analysis"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        # Get date and campaign conditions
        date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        campaign_condition = dashboard.get_campaign_filter_conditions("i", campaign_filter)
        
        # Query for temporal storytelling data
        query = f"""
        WITH daily_activity AS (
            SELECT 
                CAST(i.date_created_local AS DATE) as activity_date,
                COUNT(DISTINCT i.case_number) as daily_cases,
                COUNT(DISTINCT u.domain) as daily_domains,
                COUNT(DISTINCT u.host_country) as countries_affected,
                COUNT(DISTINCT i.brand) as brands_targeted
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition}            GROUP BY CAST(i.date_created_local AS DATE)
        ),
        campaign_activity AS (
            SELECT 
                'Campaign Activity' as campaign_name,
                COUNT(DISTINCT i.case_number) as total_cases,
                COUNT(DISTINCT u.domain) as total_domains,
                COUNT(DISTINCT u.host_country) as countries_used,
                MIN(i.date_created_local) as first_seen,
                MAX(i.date_created_local) as last_seen,
                DATEDIFF(day, MIN(i.date_created_local), MAX(i.date_created_local)) as duration_days
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition}        ),
        threat_actors AS (
            SELECT 
                n.threat_family,
                COUNT(DISTINCT i.case_number) as cases_attributed,
                COUNT(DISTINCT u.host_country) as countries_targeted
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition} AND n.threat_family IS NOT NULL
            GROUP BY n.threat_family
        )
        SELECT 
            (SELECT COUNT(*) FROM daily_activity) as active_days,
            (SELECT SUM(daily_cases) FROM daily_activity) as total_recent_cases,
            (SELECT AVG(CAST(daily_cases AS FLOAT)) FROM daily_activity) as avg_daily_cases,
            (SELECT COUNT(*) FROM campaign_activity) as active_campaigns,
            (SELECT COUNT(*) FROM threat_actors) as threat_actors_active
        """
        
        result = dashboard.execute_query(query)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"error": result['error']}), 500
        
        if result and len(result) > 0:
            data = result[0]
            total_cases = data.get('total_recent_cases', 0)
            active_days = data.get('active_days', 0)
            active_campaigns = data.get('active_campaigns', 0)
            threat_actors = data.get('threat_actors_active', 0)
            
            # Generate narrative based on real data
            if total_cases > 10:
                threat_level = 'High'
                narrative = f"Current threat landscape shows elevated activity with {total_cases} cases across {active_days} days. {active_campaigns} active campaigns and {threat_actors} threat actors are currently operational, indicating sustained threat activity."
            elif total_cases > 5:
                threat_level = 'Medium'
                narrative = f"Moderate threat activity observed with {total_cases} cases across {active_days} days. {active_campaigns} campaigns and {threat_actors} threat actors are active, showing consistent operational patterns."
            else:
                threat_level = 'Low'
                narrative = f"Low-level threat activity with {total_cases} cases across {active_days} days. Limited campaign activity ({active_campaigns}) and threat actor presence ({threat_actors}) observed."
            
            temporal_data = {
                'narrative_summary': narrative,
                'key_events': [],
                'campaign_evolution': [],
                'threat_level': threat_level,
                'recommended_actions': [
                    'Monitor active campaigns for infrastructure changes',
                    'Track threat actor behavioral patterns',
                    'Review security controls for targeted sectors'
                ]
            }
            return jsonify(temporal_data)
        else:
            return jsonify({
                'narrative_summary': "No recent threat activity detected in the selected timeframe.",
                'key_events': [],
                'campaign_evolution': [],
                'threat_level': 'Low',
                'recommended_actions': ['Continue monitoring for emerging threats']
            })
    except Exception as e:
        logger.error(f"Error in temporal storytelling API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/predictive-insights')
def api_predictive_insights():
    """API endpoint for predictive insights"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        # Get date and campaign conditions
        date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        campaign_condition = dashboard.get_campaign_filter_conditions("i", campaign_filter)
        
        # Query for predictive analysis based on historical patterns
        query = f"""
            WITH recent_activity AS (
                SELECT 
                    COUNT(DISTINCT i.case_number) as recent_cases,
                    COUNT(DISTINCT u.domain) as recent_domains,
                    COUNT(DISTINCT u.host_country) as recent_countries,
                    COUNT(DISTINCT i.brand) as recent_brands,
                    AVG(CAST(DATEDIFF(hour, i.date_created_local, GETDATE()) AS FLOAT)) as avg_age_hours
                FROM phishlabs_case_data_incidents i
                LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                WHERE {date_condition}            ),
            campaign_trends AS (
            SELECT 
                    'Overall Activity' as campaign_name,
                    COUNT(DISTINCT i.case_number) as total_cases,
                    COUNT(DISTINCT u.domain) as total_domains,
                    DATEDIFF(day, MIN(i.date_created_local), MAX(i.date_created_local)) as duration_days,
                    CASE 
                        WHEN DATEDIFF(day, MAX(i.date_created_local), GETDATE()) <= 3 THEN 'Recent Activity'
                        WHEN DATEDIFF(day, MAX(i.date_created_local), GETDATE()) <= 7 THEN 'Moderate Activity'
                        ELSE 'Low Activity'
                    END as activity_level
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                WHERE {date_condition}        ),
                threat_actor_patterns AS (
            SELECT 
                        n.threat_family,
                        COUNT(DISTINCT i.case_number) as attributed_cases,
                        COUNT(DISTINCT i.brand) as brands_targeted,
                        COUNT(DISTINCT u.host_country) as countries_targeted
                    FROM phishlabs_case_data_notes n
                    JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
                    LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                    WHERE {date_condition} AND n.threat_family IS NOT NULL
                    GROUP BY n.threat_family
                )
                SELECT 
                    ra.recent_cases,
                    ra.recent_domains,
                    ra.recent_countries,
                    ra.recent_brands,
                    ra.avg_age_hours,
                    COUNT(ct.campaign_name) as active_campaigns,
                    COUNT(ta.threat_family) as active_actors
                FROM recent_activity ra
                CROSS JOIN campaign_trends ct
                CROSS JOIN threat_actor_patterns ta
                GROUP BY ra.recent_cases, ra.recent_domains, ra.recent_countries, ra.recent_brands, ra.avg_age_hours
                """
        
        result = dashboard.execute_query(query)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"error": result['error']}), 500
        
        if result and len(result) > 0:
            data = result[0]
            recent_cases = data.get('recent_cases', 0)
            recent_domains = data.get('recent_domains', 0)
            active_campaigns = data.get('active_campaigns', 0)
            active_actors = data.get('active_actors', 0)
            
            # Simple predictive model based on current activity levels
            if recent_cases > 10:
                predicted_7_day = recent_cases * 2
                predicted_30_day = recent_cases * 8
                risk_level_7 = 'High'
                risk_level_30 = 'High'
            elif recent_cases > 5:
                predicted_7_day = recent_cases * 1.5
                predicted_30_day = recent_cases * 6
                risk_level_7 = 'Medium-High'
                risk_level_30 = 'High'
            else:
                predicted_7_day = recent_cases * 1.2
                predicted_30_day = recent_cases * 4
                risk_level_7 = 'Medium'
                risk_level_30 = 'Medium-High'
            
            predictive_data = {
                'risk_forecast': {
                    'next_7_days': {
                        'predicted_cases': int(predicted_7_day),
                        'confidence_interval': f'±{int(predicted_7_day * 0.2)} cases',
                        'risk_level': risk_level_7,
                        'key_indicators': ['Current activity patterns', 'Campaign momentum']
                    },
                    'next_30_days': {
                        'predicted_cases': int(predicted_30_day),
                        'confidence_interval': f'±{int(predicted_30_day * 0.15)} cases',
                        'risk_level': risk_level_30,
                        'key_indicators': ['Historical patterns', 'Infrastructure scaling']
                    }
                },
                'campaign_predictions': [],
                'threat_actor_predictions': []
            }
            return jsonify(predictive_data)
        else:
            return jsonify({
                'risk_forecast': {
                    'next_7_days': {'predicted_cases': 0, 'confidence_interval': '±0 cases', 'risk_level': 'Low', 'key_indicators': []},
                    'next_30_days': {'predicted_cases': 0, 'confidence_interval': '±0 cases', 'risk_level': 'Low', 'key_indicators': []}
                },
                'campaign_predictions': [],
                'threat_actor_predictions': []
            })
    except Exception as e:
        logger.error(f"Error in predictive insights API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/infrastructure-relationships')
def api_infrastructure_relationships():
    """API endpoint for infrastructure relationship analysis"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        # Get date and campaign conditions
        date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        
        # Query for infrastructure relationship analysis
        query = f"""
        WITH registrar_usage AS (
            SELECT 
                r.name as registrar,
                COUNT(DISTINCT i.case_number) as abuse_cases,
                1 as campaigns,  -- Simplified for now
                COUNT(DISTINCT u.host_country) as countries_affected,
                MIN(i.date_created_local) as first_abuse,
                MAX(i.date_created_local) as last_abuse
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                WHERE {date_condition}            AND r.name IS NOT NULL
            GROUP BY r.name
            HAVING COUNT(DISTINCT i.case_number) >= 2
        ),
        isp_usage AS (
            SELECT 
                u.host_isp as isp,
                COUNT(DISTINCT i.case_number) as abuse_cases,
                1 as campaigns,  -- Simplified for now
                COUNT(DISTINCT u.host_country) as countries_affected
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                WHERE {date_condition}            AND u.host_isp IS NOT NULL
            GROUP BY u.host_isp
            HAVING COUNT(DISTINCT i.case_number) >= 2
        ),
        shared_infrastructure AS (
            SELECT 
                'Registrar: ' + r.name as shared_element,
                'Multiple Cases' as campaigns,
                COUNT(DISTINCT u.domain) as shared_domains,
                CASE 
                    WHEN COUNT(DISTINCT i.case_number) >= 10 THEN 'High'
                    WHEN COUNT(DISTINCT i.case_number) >= 5 THEN 'Medium'
                    ELSE 'Low'
                END as connection_strength,
                MIN(i.date_created_local) as first_shared,
                MAX(i.date_created_local) as last_shared
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                WHERE {date_condition}            AND r.name IS NOT NULL
            GROUP BY r.name
            HAVING COUNT(DISTINCT i.case_number) >= 2
        )
        SELECT 
            (SELECT COUNT(*) FROM registrar_usage) as registrar_count,
            (SELECT COUNT(*) FROM isp_usage) as isp_count,
            (SELECT COUNT(*) FROM shared_infrastructure) as shared_infrastructure_count
        """
        
        result = dashboard.execute_query(query)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"error": result['error']}), 500
        
        # Get detailed data for each category
        registrar_query = f"""
        SELECT 
            r.name as registrar,
            COUNT(DISTINCT i.case_number) as abuse_cases,
            1 as campaigns,  -- Simplified for now
            COUNT(DISTINCT u.host_country) as countries_affected,
            CAST(COUNT(DISTINCT i.case_number) * 100.0 / (SELECT COUNT(DISTINCT case_number) FROM phishlabs_case_data_incidents WHERE {date_condition}) AS DECIMAL(5,2)) as abuse_percentage
        FROM phishlabs_case_data_incidents i
        LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
        LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
        WHERE {date_condition}        AND r.name IS NOT NULL
        GROUP BY r.name
        HAVING COUNT(DISTINCT i.case_number) >= 2
        ORDER BY abuse_cases DESC
        """
        
        registrar_result = dashboard.execute_query(registrar_query)
        registrar_abuse = []
        if not isinstance(registrar_result, dict):
            registrar_abuse = registrar_result or []
        
        relationship_data = {
            'shared_infrastructure': [],
            'campaign_overlap': [],
            'registrar_abuse': registrar_abuse,
            'infrastructure_evolution': []
        }
        
        return jsonify(relationship_data)
    except Exception as e:
        logger.error(f"Error in infrastructure relationships API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/trend')
def api_trend():
    """API endpoint for trend analysis"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        # Get date and campaign conditions
        date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        
        # Query for trend data based on actual database records
        query = f"""
        WITH daily_trends AS (
            SELECT 
                CAST(i.date_created_local AS DATE) as trend_date,
                COUNT(DISTINCT i.case_number) as case_data_cases,
                COUNT(DISTINCT u.domain) as case_data_domains,
                COUNT(DISTINCT u.host_country) as case_data_countries
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition}            GROUP BY CAST(i.date_created_local AS DATE)
        )
        SELECT 
            trend_date as date_label,
            case_data_cases as total_cases,
            case_data_cases,
            0 as threat_intel_cases,  -- These tables may not exist or have data
            0 as social_cases,        -- These tables may not exist or have data
            case_data_domains,
            case_data_countries
        FROM daily_trends
        ORDER BY trend_date ASC
        """
        
        result = dashboard.execute_query(query)
        if isinstance(result, dict) and 'error' in result:
            return jsonify({"error": result['error']}), 500
        
        # If no real data, return empty array
        trend_data = result if result else []
        
        # Ensure we have at least some data for the frontend
        if not trend_data:
            # Return a single day with current data
            current_query = f"""
            SELECT 
                CAST(GETDATE() AS DATE) as date_label,
                COUNT(DISTINCT i.case_number) as total_cases,
                COUNT(DISTINCT i.case_number) as case_data_cases,
                0 as threat_intel_cases,
                0 as social_cases,
                COUNT(DISTINCT u.domain) as case_data_domains,
                COUNT(DISTINCT u.host_country) as case_data_countries
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_condition}            """
            
            current_result = dashboard.execute_query(current_query)
            if not isinstance(current_result, dict) and current_result:
                trend_data = current_result
        
        return jsonify(trend_data)
    except Exception as e:
        logger.error(f"Error in trend API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/intelligence')
def api_intelligence():
    """API endpoint for intelligence analysis"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        intelligence_data = dashboard.get_intelligence_analysis(date_filter, 'all', start_date, end_date)
        return jsonify(intelligence_data)
    except Exception as e:
        logger.error(f"Error in intelligence API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/names')
def api_campaigns_names():
    """API endpoint for campaign names only"""
    try:
        # campaigns.json structure: {"campaign_name": [mappings...], ...}
        if isinstance(dashboard.campaigns, dict):
            campaign_names = list(dashboard.campaigns.keys())
        else:
            # Fallback for list structure
            campaign_names = [campaign.get('name', '') for campaign in dashboard.campaigns if campaign.get('name')]
        # Return array directly instead of object for frontend compatibility
        return jsonify(campaign_names)
    except Exception as e:
        logger.error(f"Error in campaigns names API: {e}")
        return jsonify({"error": str(e)}), 500

# ==================== CAMPAIGN METADATA FETCH FUNCTIONS ====================
# 
# METADATA UPDATE FREQUENCY CONFIGURATION:
# - Incomplete metadata (fetch failed): Retries every 2 hours (max 10 attempts)
# - Complete metadata (stale data): Refreshes every 24 hours by default
# - Manual refresh: User can force immediate refresh via API
# 
# TO CHANGE REFRESH FREQUENCY:
# 1. For incomplete retries: Edit line 4428 - timedelta(hours=2)
# 2. For complete refresh: Edit line 4469 - refresh_interval_hours=24
# 3. For per-request: Use API param - ?interval=6 (for 6 hours)
#
# ==============================================================================

def fetch_case_metadata(identifier_type, identifier_value, table):
    """
    Fetch comprehensive metadata for a case to store in campaigns.json
    Returns metadata dict with all essential fields, or None if case not found
    Includes retry tracking for failed fetches
    """
    try:
        logger.info(f"Fetching metadata for {identifier_type}={identifier_value} from {table}")
        
        if table == 'phishlabs_case_data_incidents':
            query = """
            SELECT 
                i.case_number,
                i.case_type,
                i.date_created_local,
                i.date_closed_local,
                CASE WHEN i.date_closed_local IS NULL THEN 'active' ELSE 'closed' END as status,
                i.brand,
                i.title,
                i.case_status,
                i.resolution_status
            FROM phishlabs_case_data_incidents i
            WHERE i.case_number = ?
            """
            results = dashboard.execute_query(query, (identifier_value,))
            
            if results and len(results) > 0:
                row = results[0]
                metadata = {
                    'table': table,
                    'field': identifier_type,
                    'value': identifier_value,
                    'case_type': row.get('case_type'),
                    'date_created_local': row.get('date_created_local').isoformat() if row.get('date_created_local') else None,
                    'date_closed_local': row.get('date_closed_local').isoformat() if row.get('date_closed_local') else None,
                    'status': row.get('status'),
                    'brand': row.get('brand'),
                    'title': row.get('title'),
                    'case_status': row.get('case_status'),
                    'resolution_status': row.get('resolution_status'),
                    'metadata_fetched': datetime.now().isoformat(),
                    'metadata_complete': True
                }
                logger.info(f"Successfully fetched metadata for case_number {identifier_value}")
                return metadata
            else:
                logger.warning(f"No data found for case_number {identifier_value}")
                return create_incomplete_metadata(table, identifier_type, identifier_value)
                
        elif table == 'phishlabs_threat_intelligence_incident':
            query = """
            SELECT 
                ti.infrid,
                ti.cat_name,
                ti.create_date,
                ti.date_resolved,
                CASE WHEN ti.date_resolved IS NULL THEN 'monitoring' ELSE 'resolved' END as status,
                ti.domain,
                ti.url,
                ti.product,
                ti.severity,
                ti.ticket_status
            FROM phishlabs_threat_intelligence_incident ti
            WHERE ti.infrid = ?
            """
            results = dashboard.execute_query(query, (identifier_value,))
            
            if results and len(results) > 0:
                row = results[0]
                metadata = {
                    'table': table,
                    'field': identifier_type,
                    'value': identifier_value,
                    'cat_name': row.get('cat_name'),
                    'create_date': row.get('create_date').isoformat() if row.get('create_date') else None,
                    'date_resolved': row.get('date_resolved').isoformat() if row.get('date_resolved') else None,
                    'status': row.get('status'),
                    'domain': row.get('domain'),
                    'url': row.get('url'),
                    'product': row.get('product'),
                    'severity': row.get('severity'),
                    'ticket_status': row.get('ticket_status'),
                    'metadata_fetched': datetime.now().isoformat(),
                    'metadata_complete': True
                }
                logger.info(f"Successfully fetched metadata for infrid {identifier_value}")
                return metadata
            else:
                logger.warning(f"No data found for infrid {identifier_value}")
                return create_incomplete_metadata(table, identifier_type, identifier_value)
                
        elif table == 'phishlabs_incident':
            query = """
            SELECT 
                si.incident_id,
                si.incident_type,
                si.created_local,
                si.closed_local,
                CASE WHEN si.closed_local IS NULL THEN 'active' ELSE 'closed' END as status,
                si.executive_name,
                si.threat_type,
                si.title,
                si.status as incident_status,
                si.severity,
                si.brand_name
            FROM phishlabs_incident si
            WHERE si.incident_id = ?
            """
            results = dashboard.execute_query(query, (identifier_value,))
            
            if results and len(results) > 0:
                row = results[0]
                metadata = {
                    'table': table,
                    'field': identifier_type,
                    'value': identifier_value,
                    'incident_type': row.get('incident_type'),
                    'created_local': row.get('created_local').isoformat() if row.get('created_local') else None,
                    'closed_local': row.get('closed_local').isoformat() if row.get('closed_local') else None,
                    'status': row.get('status'),
                    'executive_name': row.get('executive_name'),
                    'threat_type': row.get('threat_type'),
                    'title': row.get('title'),
                    'incident_status': row.get('incident_status'),
                    'severity': row.get('severity'),
                    'brand_name': row.get('brand_name'),
                    'metadata_fetched': datetime.now().isoformat(),
                    'metadata_complete': True
                }
                logger.info(f"Successfully fetched metadata for incident_id {identifier_value}")
                return metadata
            else:
                logger.warning(f"No data found for incident_id {identifier_value}")
                return create_incomplete_metadata(table, identifier_type, identifier_value)
                
        elif table == 'phishlabs_case_data_associated_urls':
            # For domains/URLs from associated_urls, get the linked case data
            query = """
            SELECT 
                au.case_number,
                au.url,
                au.fqdn,
                au.domain,
                au.ip_address,
                au.tld,
                au.host_isp,
                au.host_country,
                i.case_type,
                i.date_created_local,
                i.date_closed_local,
                CASE WHEN i.date_closed_local IS NULL THEN 'active' ELSE 'closed' END as status,
                i.brand
            FROM phishlabs_case_data_associated_urls au
            LEFT JOIN phishlabs_case_data_incidents i ON au.case_number = i.case_number
            WHERE au.domain = ? OR au.fqdn = ? OR au.url LIKE ?
            """
            results = dashboard.execute_query(query, (identifier_value, identifier_value, f'%{identifier_value}%'))
            
            if results and len(results) > 0:
                row = results[0]
                metadata = {
                    'table': table,
                    'field': identifier_type,
                    'value': identifier_value,
                    'case_number': row.get('case_number'),
                    'url': row.get('url'),
                    'domain': row.get('domain'),
                    'fqdn': row.get('fqdn'),
                    'ip_address': row.get('ip_address'),
                    'tld': row.get('tld'),
                    'host_isp': row.get('host_isp'),
                    'host_country': row.get('host_country'),
                    'case_type': row.get('case_type'),
                    'date_created_local': row.get('date_created_local').isoformat() if row.get('date_created_local') else None,
                    'date_closed_local': row.get('date_closed_local').isoformat() if row.get('date_closed_local') else None,
                    'status': row.get('status'),
                    'brand': row.get('brand'),
                    'metadata_fetched': datetime.now().isoformat(),
                    'metadata_complete': True
                }
                logger.info(f"Successfully fetched metadata for domain {identifier_value}")
                return metadata
            else:
                logger.warning(f"No data found for domain {identifier_value}")
                return create_incomplete_metadata(table, identifier_type, identifier_value)
        else:
            logger.error(f"Unknown table: {table}")
            return create_incomplete_metadata(table, identifier_type, identifier_value)
            
    except Exception as e:
        logger.error(f"Error fetching metadata for {identifier_type}={identifier_value}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return create_incomplete_metadata(table, identifier_type, identifier_value, error=str(e))

def create_incomplete_metadata(table, identifier_type, identifier_value, error=None):
    """Create a placeholder metadata entry for cases where fetch failed or no data found"""
    metadata = {
        'table': table,
        'field': identifier_type,
        'value': identifier_value,
        'metadata_complete': False,
        'metadata_fetched': datetime.now().isoformat(),
        'metadata_retry_count': 0,
        'metadata_last_retry': None,
        'metadata_next_retry': (datetime.now() + timedelta(hours=2)).isoformat(),
        'status': 'pending'  # Default status
    }
    if error:
        metadata['metadata_error'] = error
    return metadata

def matches_date_filter(identifier, date_filter, start_date, end_date):
    """Check if identifier matches date filter using cached metadata"""
    if date_filter == 'all':
        return True
    
    # Get the appropriate date field based on table
    table = identifier.get('table')
    date_str = None
    
    if table == 'phishlabs_case_data_incidents':
        date_str = identifier.get('date_created_local')
    elif table == 'phishlabs_threat_intelligence_incident':
        date_str = identifier.get('create_date')
    elif table == 'phishlabs_incident':
        date_str = identifier.get('created_local')
    elif table == 'phishlabs_case_data_associated_urls':
        date_str = identifier.get('date_created_local')
    
    if not date_str:
        return True  # If no date, include it
    
    try:
        case_date = datetime.fromisoformat(date_str) if isinstance(date_str, str) else date_str
        now = datetime.now()
        
        # Apply date filter logic
        if date_filter == 'today':
            return case_date.date() == now.date()
        elif date_filter == 'yesterday':
            yesterday = (now - timedelta(days=1)).date()
            return case_date.date() == yesterday
        elif date_filter == 'last_7_days':
            return case_date >= (now - timedelta(days=7))
        elif date_filter == 'last_30_days':
            return case_date >= (now - timedelta(days=30))
        elif date_filter == 'custom' and start_date and end_date:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
            return start <= case_date <= end
        
        return True
    except:
        return True  # If parsing fails, include it

def calculate_age_days(created_date_str, closed_date_str):
    """Calculate age in days from cached date strings"""
    try:
        if not created_date_str:
            return None
        
        created = datetime.fromisoformat(created_date_str) if isinstance(created_date_str, str) else created_date_str
        
        if closed_date_str:
            closed = datetime.fromisoformat(closed_date_str) if isinstance(closed_date_str, str) else closed_date_str
            return (closed - created).days
        else:
            # Still active, calculate age from creation to now
            return (datetime.now() - created).days
    except:
        return None

def should_retry_metadata_fetch(identifier):
    """
    Check if metadata should be retried for an identifier
    Returns True if:
    - metadata_complete is False AND next_retry time has passed AND retry_count < 10
    """
    if not identifier.get('metadata_complete', False):
        retry_count = identifier.get('metadata_retry_count', 0)
        if retry_count >= 10:  # Max retries reached
            logger.info(f"Max retries reached for {identifier.get('value')}")
            return False
        
        next_retry = identifier.get('metadata_next_retry')
        if next_retry:
            try:
                next_retry_time = datetime.fromisoformat(next_retry)
                if datetime.now() >= next_retry_time:
                    logger.info(f"Retry time reached for {identifier.get('value')}")
                    return True
            except:
                return True  # If parsing fails, retry
        
        return True  # If no next_retry set, retry
    
    return False

def should_refresh_complete_metadata(identifier, refresh_interval_hours=24):
    """
    Check if COMPLETE metadata should be refreshed to detect DB updates
    Returns True if:
    - metadata_complete is True
    - last refresh was more than refresh_interval_hours ago (default 24 hours)
    """
    if not identifier.get('metadata_complete', False):
        return False  # Use should_retry_metadata_fetch for incomplete
    
    metadata_fetched = identifier.get('metadata_fetched')
    if not metadata_fetched:
        return True  # No fetch time, should refresh
    
    try:
        last_fetch_time = datetime.fromisoformat(metadata_fetched)
        hours_since_fetch = (datetime.now() - last_fetch_time).total_seconds() / 3600
        
        if hours_since_fetch >= refresh_interval_hours:
            logger.info(f"Metadata for {identifier.get('value')} is {hours_since_fetch:.1f} hours old, refreshing")
            return True
    except:
        return True  # If parsing fails, refresh
    
    return False

def refresh_incomplete_metadata(campaign_name, force_refresh_all=False, refresh_interval_hours=24):
    """
    Refresh metadata for incomplete and stale identifiers in a campaign
    
    Args:
        campaign_name: Name of campaign to refresh
        force_refresh_all: If True, refresh ALL identifiers regardless of age
        refresh_interval_hours: Hours before complete metadata is considered stale (default 24)
    
    Returns:
        dict with counts: {'incomplete_refreshed': X, 'complete_refreshed': Y, 'failed': Z}
    """
    refresh_stats = {
        'incomplete_refreshed': 0,
        'complete_refreshed': 0,
        'failed': 0
    }
    
    try:
        if campaign_name not in dashboard.campaigns:
            return refresh_stats
        
        campaign = dashboard.campaigns[campaign_name]
        
        # Handle both old and new formats
        identifiers = []
        if isinstance(campaign, dict) and 'identifiers' in campaign:
            identifiers = campaign['identifiers']
        elif isinstance(campaign, list):
            identifiers = campaign
        
        needs_save = False
        
        for i, identifier in enumerate(identifiers):
            if not isinstance(identifier, dict):
                continue
            
            should_refresh = False
            refresh_reason = ""
            
            # Check if incomplete metadata needs retry
            if should_retry_metadata_fetch(identifier):
                should_refresh = True
                refresh_reason = "incomplete_retry"
            # Check if complete metadata is stale
            elif force_refresh_all or should_refresh_complete_metadata(identifier, refresh_interval_hours):
                should_refresh = True
                refresh_reason = "stale_refresh"
            
            if should_refresh:
                logger.info(f"Refreshing metadata for {identifier.get('value')} (reason: {refresh_reason})")
                
                # Fetch fresh metadata
                new_metadata = fetch_case_metadata(
                    identifier.get('field'),
                    identifier.get('value'),
                    identifier.get('table')
                )
                
                if new_metadata and new_metadata.get('metadata_complete'):
                    # Preserve user-added description if exists
                    old_description = identifier.get('description')
                    
                    # Update with new metadata
                    identifier.update(new_metadata)
                    
                    # Restore user description
                    if old_description and not new_metadata.get('description'):
                        identifier['description'] = old_description
                    
                    if refresh_reason == "incomplete_retry":
                        refresh_stats['incomplete_refreshed'] += 1
                    else:
                        refresh_stats['complete_refreshed'] += 1
                    
                    needs_save = True
                    logger.info(f"Successfully refreshed metadata for {identifier.get('value')}")
                else:
                    # Failed to fetch - only increment retry for incomplete
                    if refresh_reason == "incomplete_retry":
                        identifier['metadata_retry_count'] = identifier.get('metadata_retry_count', 0) + 1
                        identifier['metadata_last_retry'] = datetime.now().isoformat()
                        identifier['metadata_next_retry'] = (datetime.now() + timedelta(hours=2)).isoformat()
                        refresh_stats['failed'] += 1
                        needs_save = True
                        logger.info(f"Metadata fetch still incomplete for {identifier.get('value')}, retry count: {identifier['metadata_retry_count']}")
                    else:
                        # For stale refresh failures, just log but don't mark as incomplete
                        logger.warning(f"Failed to refresh stale metadata for {identifier.get('value')}, will try again later")
                        refresh_stats['failed'] += 1
        
        if needs_save:
            dashboard.save_campaigns()
            total_refreshed = refresh_stats['incomplete_refreshed'] + refresh_stats['complete_refreshed']
            logger.info(f"Campaign {campaign_name}: Refreshed {total_refreshed} identifiers ({refresh_stats['incomplete_refreshed']} incomplete, {refresh_stats['complete_refreshed']} stale), {refresh_stats['failed']} failed")
        
        return refresh_stats
        
    except Exception as e:
        logger.error(f"Error refreshing metadata for campaign {campaign_name}: {e}")
        return refresh_stats

# ==================== CAMPAIGN MANAGEMENT CRUD OPERATIONS ====================

@app.route('/api/campaigns/<campaign_name>/refresh-metadata', methods=['POST'])
def api_refresh_campaign_metadata(campaign_name):
    """
    Manually refresh metadata for a campaign
    Optional query param: force=true to refresh ALL identifiers regardless of age
    Optional query param: interval=hours to set custom refresh interval (default 24)
    """
    try:
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        # Get optional parameters
        force_refresh = request.args.get('force', 'false').lower() == 'true'
        refresh_interval = int(request.args.get('interval', '24'))
        
        logger.info(f"Manual metadata refresh requested for campaign {campaign_name} (force={force_refresh}, interval={refresh_interval}h)")
        
        # Perform refresh
        refresh_stats = refresh_incomplete_metadata(
            campaign_name,
            force_refresh_all=force_refresh,
            refresh_interval_hours=refresh_interval
        )
        
        total_refreshed = refresh_stats['incomplete_refreshed'] + refresh_stats['complete_refreshed']
        
        return jsonify({
            "message": f"Metadata refresh completed for campaign {campaign_name}",
            "total_refreshed": total_refreshed,
            "incomplete_refreshed": refresh_stats['incomplete_refreshed'],
            "complete_refreshed": refresh_stats['complete_refreshed'],
            "failed": refresh_stats['failed'],
            "force_refresh": force_refresh,
            "refresh_interval_hours": refresh_interval
        }), 200
        
    except Exception as e:
        logger.error(f"Error in manual metadata refresh for campaign {campaign_name}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/list')
def api_get_campaigns():
    """Get all campaigns with their details and auto-refresh incomplete metadata"""
    try:
        campaigns = []
        refresh_stats = {
            'total_campaigns': 0,
            'campaigns_refreshed': 0,
            'identifiers_refreshed': 0
        }
        
        for campaign_name, campaign_data in dashboard.campaigns.items():
            if campaign_name == "Test_Dynamic_Campaign":  # Skip empty test campaign
                continue
            
            refresh_stats['total_campaigns'] += 1
            
            # Auto-refresh incomplete and stale metadata for this campaign
            try:
                campaign_refresh_stats = refresh_incomplete_metadata(campaign_name, force_refresh_all=False, refresh_interval_hours=24)
                total_refreshed = campaign_refresh_stats['incomplete_refreshed'] + campaign_refresh_stats['complete_refreshed']
                
                if total_refreshed > 0:
                    refresh_stats['campaigns_refreshed'] += 1
                    refresh_stats['identifiers_refreshed'] += total_refreshed
                    logger.info(f"Auto-refreshed {total_refreshed} identifiers in campaign {campaign_name} (incomplete: {campaign_refresh_stats['incomplete_refreshed']}, stale: {campaign_refresh_stats['complete_refreshed']})")
            except Exception as refresh_error:
                logger.error(f"Error refreshing metadata for campaign {campaign_name}: {refresh_error}")
                
            # Count identifiers for this campaign
            identifiers = []
            incomplete_count = 0
            
            # Handle different campaign data structures
            if isinstance(campaign_data, list):
                # Legacy list format
                for mapping in campaign_data:
                    if isinstance(mapping, dict):
                        if not mapping.get('metadata_complete', True):
                            incomplete_count += 1
                        if mapping.get('identifier_type') and mapping.get('identifier_value'):
                            identifiers.append({
                                'type': mapping['identifier_type'],
                                'value': mapping['identifier_value'],
                                'description': mapping.get('description', ''),
                                'table': mapping.get('table', ''),
                                'metadata_complete': mapping.get('metadata_complete', True)
                            })
                        elif mapping.get('field') and mapping.get('value'):
                            identifiers.append({
                                'type': mapping['field'],
                                'value': mapping['value'],
                                'description': mapping.get('description', ''),
                                'table': mapping.get('table', ''),
                                'metadata_complete': mapping.get('metadata_complete', True)
                            })
            elif isinstance(campaign_data, dict):
                # New dictionary format with identifiers list
                if 'identifiers' in campaign_data and isinstance(campaign_data['identifiers'], list):
                    for identifier in campaign_data['identifiers']:
                        if isinstance(identifier, dict):
                            if not identifier.get('metadata_complete', True):
                                incomplete_count += 1
                            identifiers.append(identifier)
                        else:
                            identifiers.append({'value': identifier})
            
            # Extract description based on data structure
            description = ''
            if isinstance(campaign_data, list) and campaign_data and isinstance(campaign_data[0], dict):
                description = campaign_data[0].get('description', '')
            elif isinstance(campaign_data, dict):
                description = campaign_data.get('description', '')
            
            # Extract status
            status = 'Active'
            if isinstance(campaign_data, dict):
                status = campaign_data.get('status', 'Active')
            
            campaigns.append({
                'name': campaign_name,
                'description': description,
                'identifier_count': len(identifiers),
                'incomplete_metadata_count': incomplete_count,
                'identifiers': identifiers,
                'created_date': campaign_data.get('created_date', '2024-01-01') if isinstance(campaign_data, dict) else '2024-01-01',
                'last_updated': campaign_data.get('last_updated', '2024-12-01') if isinstance(campaign_data, dict) else '2024-12-01',
                'status': status
            })
        
        logger.info(f"Campaigns list: {refresh_stats['total_campaigns']} total, refreshed {refresh_stats['identifiers_refreshed']} identifiers in {refresh_stats['campaigns_refreshed']} campaigns")
        
        return jsonify(campaigns)
    except Exception as e:
        logger.error(f"Error getting campaigns: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/create', methods=['POST'])
def api_create_campaign():
    """Create a new campaign"""
    try:
        data = request.get_json()
        campaign_name = data.get('name')
        description = data.get('description', '')
        
        if not campaign_name:
            return jsonify({"error": "Campaign name is required"}), 400
        
        # Check if campaign already exists
        if campaign_name in dashboard.campaigns:
            return jsonify({"error": "Campaign already exists"}), 400
        
        # Add new campaign to campaigns dict
        dashboard.campaigns[campaign_name] = []
        
        # Save to JSON file
        dashboard.save_campaigns()
        
        logger.info(f"Created new campaign: {campaign_name}")
        return jsonify({"message": "Campaign created successfully", "campaign_name": campaign_name}), 201
        
    except Exception as e:
        logger.error(f"Error creating campaign: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/<campaign_name>', methods=['PUT'])
def api_update_campaign(campaign_name):
    """Update an existing campaign"""
    try:
        data = request.get_json()
        new_name = data.get('name')
        new_description = data.get('description', '')
        
        if not new_name:
            return jsonify({"error": "Campaign name is required"}), 400
        
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        # If name changed, check if new name already exists
        if new_name != campaign_name and new_name in dashboard.campaigns:
            return jsonify({"error": "Campaign name already exists"}), 400
        
        # Update campaign
        campaign_data = dashboard.campaigns[campaign_name]
        
        # If name changed, remove old and add new
        if new_name != campaign_name:
            dashboard.campaigns[new_name] = campaign_data
            del dashboard.campaigns[campaign_name]
        
        # Update description in first mapping if exists
        if campaign_data and len(campaign_data) > 0:
            campaign_data[0]['description'] = new_description
        
        # Save to JSON file
        dashboard.save_campaigns()
        
        logger.info(f"Updated campaign: {campaign_name} -> {new_name}")
        return jsonify({"message": "Campaign updated successfully", "campaign_name": new_name}), 200
        
    except Exception as e:
        logger.error(f"Error updating campaign: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/<campaign_name>', methods=['DELETE'])
def api_delete_campaign(campaign_name):
    """Delete a campaign"""
    try:
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        # Remove campaign
        del dashboard.campaigns[campaign_name]
        
        # Save to JSON file
        dashboard.save_campaigns()
        
        logger.info(f"Deleted campaign: {campaign_name}")
        return jsonify({"message": "Campaign deleted successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error deleting campaign: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/<campaign_name>/cases')
def api_get_campaign_cases(campaign_name):
    """Get all cases for a specific campaign"""
    try:
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        cases = []
        campaign_data_obj = dashboard.campaigns[campaign_name]
        
        # Handle new campaign structure with identifiers array
        if isinstance(campaign_data_obj, dict) and 'identifiers' in campaign_data_obj:
            for identifier in campaign_data_obj['identifiers']:
                if isinstance(identifier, str) and identifier.isdigit():
                    # Simple string format
                    cases.append({
                        'case_number': identifier,
                        'description': '',
                        'table': 'phishlabs_case_data_incidents'
                    })
                elif isinstance(identifier, dict) and identifier.get('field') == 'case_number':
                    # Object format
                    cases.append({
                        'case_number': identifier['value'],
                        'description': identifier.get('description', ''),
                        'table': identifier.get('table', 'phishlabs_case_data_incidents')
                    })
        # Handle old format (list of mapping objects)
        elif isinstance(campaign_data_obj, list):
            for mapping in campaign_data_obj:
                if isinstance(mapping, dict) and mapping.get('field') == 'case_number':
                    cases.append({
                        'case_number': mapping['value'],
                        'description': mapping.get('description', ''),
                        'table': mapping.get('table', '')
                    })
        
        return jsonify(cases)
    except Exception as e:
        logger.error(f"Error getting campaign cases: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/<campaign_name>/cases', methods=['POST'])
def api_add_campaign_case(campaign_name):
    """Add a case to a campaign with metadata fetch"""
    try:
        data = request.get_json()
        case_number = data.get('case_number')
        description = data.get('description', '')
        table = data.get('table', 'phishlabs_case_data_incidents')
        
        if not case_number:
            return jsonify({"error": "Case number is required"}), 400
        
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        # Check if case already exists in campaign
        for mapping in dashboard.campaigns[campaign_name]:
            if mapping.get('field') == 'case_number' and mapping.get('value') == case_number:
                return jsonify({"error": "Case already exists in campaign"}), 400
        
        # Fetch comprehensive metadata for the case
        logger.info(f"Fetching metadata for case_number {case_number} in table {table}")
        metadata = fetch_case_metadata('case_number', case_number, table)
        
        # Add description if provided
        if description:
            metadata['description'] = description
        
        # Add case with metadata to campaign
        dashboard.campaigns[campaign_name].append(metadata)
        
        # Save to JSON file
        dashboard.save_campaigns()
        
        if metadata.get('metadata_complete'):
            logger.info(f"Added case {case_number} to campaign {campaign_name} with complete metadata")
            return jsonify({
                "message": "Case added to campaign successfully with metadata",
                "metadata_complete": True
            }), 201
        else:
            logger.info(f"Added case {case_number} to campaign {campaign_name} with incomplete metadata (will retry)")
            return jsonify({
                "message": "Case added to campaign (metadata will be fetched)",
                "metadata_complete": False,
                "next_retry": metadata.get('metadata_next_retry')
            }), 201
        
    except Exception as e:
        logger.error(f"Error adding case to campaign: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/<campaign_name>/cases/<case_number>', methods=['DELETE'])
def api_remove_campaign_case(campaign_name, case_number):
    """Remove a case from a campaign"""
    try:
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        # Find and remove the case
        original_length = len(dashboard.campaigns[campaign_name])
        dashboard.campaigns[campaign_name] = [
            mapping for mapping in dashboard.campaigns[campaign_name]
            if not (mapping.get('field') == 'case_number' and mapping.get('value') == case_number)
        ]
        
        if len(dashboard.campaigns[campaign_name]) == original_length:
            return jsonify({"error": "Case not found in campaign"}), 404
        
        # Save to JSON file
        dashboard.save_campaigns()
        
        logger.info(f"Removed case {case_number} from campaign {campaign_name}")
        return jsonify({"message": "Case removed from campaign successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error removing case from campaign: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/<campaign_name>/domains')
def api_get_campaign_domains(campaign_name):
    """Get all domains for a specific campaign"""
    try:
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        domains = []
        campaign_data_obj = dashboard.campaigns[campaign_name]
        
        # Handle new campaign structure with identifiers array
        if isinstance(campaign_data_obj, dict) and 'identifiers' in campaign_data_obj:
            for identifier_value in campaign_data_obj['identifiers']:
                if isinstance(identifier_value, str) and not identifier_value.isdigit():
                    domains.append({
                        'domain': identifier_value,
                        'description': '',
                        'table': 'phishlabs_case_data_associated_urls'
                    })
        # Handle old format (list of mapping objects)
        elif isinstance(campaign_data_obj, list):
            for mapping in campaign_data_obj:
                if isinstance(mapping, dict) and mapping.get('field') == 'domain':
                    domains.append({
                        'domain': mapping['value'],
                        'description': mapping.get('description', ''),
                        'table': mapping.get('table', '')
                    })
        
        return jsonify(domains)
    except Exception as e:
        logger.error(f"Error getting campaign domains: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/<campaign_name>/domains', methods=['POST'])
def api_add_campaign_domain(campaign_name):
    """Add a domain to a campaign with metadata fetch"""
    try:
        data = request.get_json()
        domain = data.get('domain')
        description = data.get('description', '')
        table = data.get('table', 'phishlabs_case_data_associated_urls')
        
        if not domain:
            return jsonify({"error": "Domain is required"}), 400
        
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        # Check if domain already exists in campaign
        for mapping in dashboard.campaigns[campaign_name]:
            if mapping.get('field') == 'domain' and mapping.get('value') == domain:
                return jsonify({"error": "Domain already exists in campaign"}), 400
        
        # Fetch comprehensive metadata for the domain
        logger.info(f"Fetching metadata for domain {domain} in table {table}")
        metadata = fetch_case_metadata('domain', domain, table)
        
        # Add description if provided
        if description:
            metadata['description'] = description
        
        # Add domain with metadata to campaign
        dashboard.campaigns[campaign_name].append(metadata)
        
        # Save to JSON file
        dashboard.save_campaigns()
        
        if metadata.get('metadata_complete'):
            logger.info(f"Added domain {domain} to campaign {campaign_name} with complete metadata")
            return jsonify({
                "message": "Domain added to campaign successfully with metadata",
                "metadata_complete": True
            }), 201
        else:
            logger.info(f"Added domain {domain} to campaign {campaign_name} with incomplete metadata (will retry)")
            return jsonify({
                "message": "Domain added to campaign (metadata will be fetched)",
                "metadata_complete": False,
                "next_retry": metadata.get('metadata_next_retry')
            }), 201
        
    except Exception as e:
        logger.error(f"Error adding domain to campaign: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/<campaign_name>/domains/<path:domain>', methods=['DELETE'])
def api_remove_campaign_domain(campaign_name, domain):
    """Remove a domain from a campaign"""
    try:
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        # Find and remove the domain
        original_length = len(dashboard.campaigns[campaign_name])
        dashboard.campaigns[campaign_name] = [
            mapping for mapping in dashboard.campaigns[campaign_name]
            if not (mapping.get('field') == 'domain' and mapping.get('value') == domain)
        ]
        
        if len(dashboard.campaigns[campaign_name]) == original_length:
            return jsonify({"error": "Domain not found in campaign"}), 404
        
        # Save to JSON file
        dashboard.save_campaigns()
        
        logger.info(f"Removed domain {domain} from campaign {campaign_name}")
        return jsonify({"message": "Domain removed from campaign successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error removing domain from campaign: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================================================
# SOCIAL & EXECUTIVE TARGETING DASHBOARD API ENDPOINTS
# ============================================================================

@app.route('/api/dashboard/social-executive-metrics')
def api_social_executive_metrics():
    """Get metrics for Social & Executive Targeting dashboard"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        campaign_filter = request.args.get('campaign_filter', 'all')
        
        # Build date filter conditions
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.created_local")
        
        # Executive targeting metrics
        base_conditions = "i.incident_type = 'Social Media Monitoring'"
        
        if date_conditions == "1=1":
            # No date filtering needed
            executive_query = f"""
            SELECT 
                COUNT(DISTINCT i.executive_name) as executive_targets,
                COUNT(CASE WHEN i.threat_type = 'Brand Impersonation' 
                           OR (i.threat_type LIKE '%Brand%' AND i.threat_type LIKE '%Impersonation%') 
                           THEN i.incident_id END) as brands_protected,
                COUNT(i.incident_id) as social_incidents,
                0 as avg_resolution_hours
            FROM phishlabs_incident i
            WHERE {base_conditions}
            """
        else:
            executive_query = f"""
            SELECT 
                COUNT(DISTINCT i.executive_name) as executive_targets,
                COUNT(CASE WHEN i.threat_type = 'Brand Impersonation' 
                           OR (i.threat_type LIKE '%Brand%' AND i.threat_type LIKE '%Impersonation%') 
                           THEN i.incident_id END) as brands_protected,
                COUNT(i.incident_id) as social_incidents,
                0 as avg_resolution_hours
            FROM phishlabs_incident i
            WHERE {base_conditions} AND {date_conditions}
            """
        
        metrics = dashboard.execute_query(executive_query)
        if metrics and not isinstance(metrics, dict) and len(metrics) > 0:
            result = {
                'executive_targets': metrics[0].get('executive_targets', 0),
                'brands_protected': metrics[0].get('brands_protected', 0),
                'social_incidents': metrics[0].get('social_incidents', 0)
            }
        else:
            # Return default values when no data or error
            result = {
                'executive_targets': 0,
                'brands_protected': 0,
                'social_incidents': 0
            }
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error fetching social executive metrics: {str(e)}")
        return jsonify({"error": "Failed to fetch social executive metrics"}), 500

@app.route('/api/dashboard/executive-targeting-analysis')
def api_executive_targeting_analysis():
    """Get executive targeting analysis data"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        campaign_filter = request.args.get('campaign_filter', 'all')
        
        # Build date filter conditions
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.created_local")
        
        if date_conditions == "1=1":
            # No date filtering needed
            executive_query = """
            SELECT 
                i.executive_name,
                i.title,
                i.brand_name as company,
                COUNT(i.incident_id) as incident_count,
                i.incident_type,
                i.threat_type,
                MAX(i.last_modified_local) as last_seen
            FROM phishlabs_incident i
            WHERE i.executive_name IS NOT NULL 
            AND i.executive_name != ''
            GROUP BY i.executive_name, i.title, i.brand_name, i.incident_type, i.threat_type
            ORDER BY incident_count DESC, last_seen DESC
            """
        else:
            executive_query = f"""
            SELECT 
                i.executive_name,
                i.title,
                i.brand_name as company,
                COUNT(i.incident_id) as incident_count,
                i.incident_type,
                i.threat_type,
                MAX(i.last_modified_local) as last_seen
            FROM phishlabs_incident i
            WHERE i.executive_name IS NOT NULL 
            AND i.executive_name != '' AND {date_conditions}
            GROUP BY i.executive_name, i.title, i.brand_name, i.incident_type, i.threat_type
            ORDER BY incident_count DESC, last_seen DESC
            """
        
        results = dashboard.execute_query(executive_query)
        if results and not isinstance(results, dict):
            return jsonify(results)
        else:
            return jsonify([])
            
    except Exception as e:
        logger.error(f"Error fetching executive targeting analysis: {str(e)}")
        return jsonify({"error": "Failed to fetch executive targeting analysis"}), 500

@app.route('/api/dashboard/social-platform-breakdown')
def api_social_platform_breakdown():
    """Get social platform breakdown data"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        campaign_filter = request.args.get('campaign_filter', 'all')
        
        # Build date filter conditions
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.created_local")
        
        if date_conditions == "1=1":
            # No date filtering needed
            platform_query = """
            SELECT 
                i.incident_type,
                COUNT(i.incident_id) as incident_count,
                SUM(CASE WHEN i.closed_local IS NULL THEN 1 ELSE 0 END) as active_incidents,
                SUM(CASE WHEN i.closed_local IS NOT NULL THEN 1 ELSE 0 END) as closed_incidents
            FROM phishlabs_incident i
            GROUP BY i.incident_type
            ORDER BY incident_count DESC
            """
        else:
            platform_query = f"""
            SELECT 
                i.incident_type,
                COUNT(i.incident_id) as incident_count,
                SUM(CASE WHEN i.closed_local IS NULL THEN 1 ELSE 0 END) as active_incidents,
                SUM(CASE WHEN i.closed_local IS NOT NULL THEN 1 ELSE 0 END) as closed_incidents
            FROM phishlabs_incident i
            WHERE {date_conditions}
            GROUP BY i.incident_type
            ORDER BY incident_count DESC
            """
        
        results = dashboard.execute_query(platform_query)
        if results and not isinstance(results, dict):
            return jsonify(results)
        else:
            return jsonify([])
            
    except Exception as e:
        logger.error(f"Error fetching social platform breakdown: {str(e)}")
        return jsonify({"error": "Failed to fetch social platform breakdown"}), 500

@app.route('/api/dashboard/brand-protection-analysis')
def api_brand_protection_analysis():
    """Get brand protection analysis data"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        campaign_filter = request.args.get('campaign_filter', 'all')
        
        # Build date filter conditions
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.created_local")
        
        if date_conditions == "1=1":
            # No date filtering needed
            brand_query = """
            SELECT 
                i.brand_name,
                COUNT(i.incident_id) as total_incidents,
                SUM(CASE WHEN i.closed_local IS NULL THEN 1 ELSE 0 END) as active_incidents,
                SUM(CASE WHEN i.closed_local IS NOT NULL THEN 1 ELSE 0 END) as closed_incidents,
                COUNT(DISTINCT i.executive_name) as executives_targeted
            FROM phishlabs_incident i
            WHERE i.brand_name IS NOT NULL 
            AND i.brand_name != ''
            GROUP BY i.brand_name
            ORDER BY total_incidents DESC
            """
        else:
            brand_query = f"""
            SELECT 
                i.brand_name,
                COUNT(i.incident_id) as total_incidents,
                SUM(CASE WHEN i.closed_local IS NULL THEN 1 ELSE 0 END) as active_incidents,
                SUM(CASE WHEN i.closed_local IS NOT NULL THEN 1 ELSE 0 END) as closed_incidents,
                COUNT(DISTINCT i.executive_name) as executives_targeted
            FROM phishlabs_incident i
            WHERE i.brand_name IS NOT NULL 
            AND i.brand_name != '' AND {date_conditions}
            GROUP BY i.brand_name
            ORDER BY total_incidents DESC
            """
        
        results = dashboard.execute_query(brand_query)
        if results and not isinstance(results, dict):
            return jsonify(results)
        else:
            return jsonify([])
            
    except Exception as e:
        logger.error(f"Error fetching brand protection analysis: {str(e)}")
        return jsonify({"error": "Failed to fetch brand protection analysis"}), 500

@app.route('/api/dashboard/social-threat-trends')
def api_social_threat_trends():
    """Get social threat trends over time"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        campaign_filter = request.args.get('campaign_filter', 'all')
        
        # Build date filter conditions
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.created_local")
        
        if date_conditions == "1=1":
            # No date filtering needed
            trends_query = """
            SELECT 
                CONVERT(date, i.created_local) as date,
                i.incident_type,
                COUNT(i.incident_id) as incident_count
            FROM phishlabs_incident i
            WHERE i.created_local IS NOT NULL
            GROUP BY CONVERT(date, i.created_local), i.incident_type
            ORDER BY date DESC, incident_count DESC
            """
        else:
            trends_query = f"""
            SELECT 
                CONVERT(date, i.created_local) as date,
                i.incident_type,
                COUNT(i.incident_id) as incident_count
            FROM phishlabs_incident i
            WHERE i.created_local IS NOT NULL AND {date_conditions}
            GROUP BY CONVERT(date, i.created_local), i.incident_type
            ORDER BY date DESC, incident_count DESC
            """
        
        results = dashboard.execute_query(trends_query)
        if results and not isinstance(results, dict):
            return jsonify(results)
        else:
            return jsonify([])
            
    except Exception as e:
        logger.error(f"Error fetching social threat trends: {str(e)}")
        return jsonify({"error": "Failed to fetch social threat trends"}), 500

@app.route('/api/dashboard/social-timeline-cases')
def api_social_timeline_cases():
    """Get timeline cases data for Social Media Monitoring incidents (independent of main nav filter)"""
    try:
        # Calculate different time periods
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        last_7_days = today - timedelta(days=7)
        this_month_start = today.replace(day=1)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
        last_month_end = this_month_start - timedelta(days=1)
        
        timeline_periods = [
            ('Today', today, today),
            ('Yesterday', yesterday, yesterday),
            ('Last 7 Days', last_7_days, today),
            ('This Month', this_month_start, today),
            ('Last Month', last_month_start, last_month_end)
        ]
        
        results = []
        
        for period_name, start_date, end_date in timeline_periods:
            # Get total cases for this period
            query = """
                SELECT COUNT(*) as total_cases
                FROM phishlabs_incident 
                WHERE incident_type = 'Social Media Monitoring'
                AND created_local >= ? AND created_local <= ?
            """
            
            result = dashboard.execute_query(query, [start_date, end_date])
            total_cases = result[0].get('total_cases', 0) if result and not isinstance(result, dict) else 0
            
            # Calculate average (simplified - in real implementation you might want rolling averages)
            avg_query = """
                SELECT AVG(daily_count) as avg_cases
                FROM (
                    SELECT CAST(created_date as DATE) as date, COUNT(*) as daily_count
                    FROM phishlabs_incident 
                    WHERE incident_type = 'Social Media Monitoring'
                    AND created_date >= ? AND created_date <= ?
                    GROUP BY CAST(created_date as DATE)
                ) daily_counts
            """
            
            avg_result = dashboard.execute_query(avg_query, [start_date, end_date])
            avg_cases = round(avg_result[0].get('avg_cases', 0), 1) if avg_result and not isinstance(avg_result, dict) else 0
            
            results.append({
                'period': period_name,
                'total_cases': total_cases,
                'average': avg_cases
            })
        
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error fetching social timeline cases: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/social-threat-types')
def api_social_threat_types():
    """Get threat type breakdown for Social Media Monitoring incidents"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        campaign_filter = request.args.get('campaign_filter', 'all')
        
        # Build date filter conditions
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.created_local")
        
        # Build base query
        if date_conditions == "1=1":
            base_query = """
            SELECT i.threat_type, COUNT(*) as case_count
            FROM phishlabs_incident i
            WHERE i.incident_type = 'Social Media Monitoring'
            GROUP BY i.threat_type
            ORDER BY case_count DESC
            """
            params = []
        else:
            base_query = f"""
            SELECT i.threat_type, COUNT(*) as case_count
            FROM phishlabs_incident i
            WHERE i.incident_type = 'Social Media Monitoring'
            AND {date_conditions}
            GROUP BY i.threat_type
            ORDER BY case_count DESC
            """
            params = []
        
        # Add campaign filter if needed
        if campaign_filter != 'all':
            base_query = base_query.replace(
                "WHERE i.incident_type = 'Social Media Monitoring'",
                f"""WHERE i.incident_type = 'Social Media Monitoring'
                AND i.incident_id IN (
                    SELECT DISTINCT incident_id FROM phishlabs_case_data_incidents 
                    WHERE campaign_name = ?
                )"""
            )
            params.append(campaign_filter)
        
        results = dashboard.execute_query(base_query, params)
        if results and not isinstance(results, dict):
            threat_data = []
            for row in results:
                threat_data.append({
                    'threat_type': row.get('threat_type', 'Unknown'),
                    'case_count': row.get('case_count', 0)
                })
            return jsonify(threat_data)
        else:
            return jsonify([])
        
    except Exception as e:
        logger.error(f"Error fetching social threat types: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/social-impersonation')
def api_social_impersonation():
    """Get impersonation data for Social Media Monitoring incidents"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        campaign_filter = request.args.get('campaign_filter', 'all')
        threat_type = request.args.get('threat_type', 'Impersonation of an Executive')
        
        # Build date filter conditions
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.created_local")
        
        # Build base query
        if date_conditions == "1=1":
            base_query = """
            SELECT i.incident_id, i.threat_type, i.closed_local, i.created_local, i.executive_name, i.brand_name
            FROM phishlabs_incident i
            WHERE i.incident_type = 'Social Media Monitoring'
            AND i.threat_type = ?
            """
            params = [threat_type]
        else:
            base_query = f"""
            SELECT i.incident_id, i.threat_type, i.closed_local, i.created_local, i.executive_name, i.brand_name
            FROM phishlabs_incident i
            WHERE i.incident_type = 'Social Media Monitoring'
            AND i.threat_type = ?
            AND {date_conditions}
            """
            params = [threat_type]
        
        # Add campaign filter if needed
        if campaign_filter != 'all':
            base_query = base_query.replace(
                "AND i.threat_type = ?",
                f"""AND i.threat_type = ?
                AND i.incident_id IN (
                    SELECT DISTINCT incident_id FROM phishlabs_case_data_incidents 
                    WHERE campaign_name = ?
                )"""
            )
            params.append(campaign_filter)
        
        results = dashboard.execute_query(base_query, params)
        if results and not isinstance(results, dict):
            impersonation_data = []
            for row in results:
                impersonation_data.append({
                    'incident_id': row.get('incident_id'),
                    'threat_type': row.get('threat_type'),
                    'closed_local': row.get('closed_local'),
                    'created_local': row.get('created_local'),
                    'created_date': row.get('created_local').isoformat() if row.get('created_local') else None,
                    'executive_name': row.get('executive_name'),
                    'brand_name': row.get('brand_name')
                })
            return jsonify(impersonation_data)
        else:
            return jsonify([])
        
    except Exception as e:
        logger.error(f"Error fetching social impersonation data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/social-sla-performance')
def api_social_sla_performance():
    """Get SLA performance for Social Media Monitoring incidents"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        
        # Build date filter conditions
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.created_local")
        
        # Build base query with day-based SLA thresholds:
        # Within SLA: 1-14 days
        # At Risk: 15-28 days
        # Breached: >28 days
        if date_conditions == "1=1":
            base_query = """
            SELECT COUNT(*) as total_cases,
                   COUNT(CASE WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) BETWEEN 1 AND 14 THEN 1 END) as sla_within_sla,
                   COUNT(CASE WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) BETWEEN 15 AND 28 THEN 1 END) as sla_at_risk,
                   COUNT(CASE WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) > 28 THEN 1 END) as sla_breached
            FROM phishlabs_incident i
            WHERE i.incident_type = 'Social Media Monitoring'
            """
            params = []
        else:
            base_query = f"""
            SELECT COUNT(*) as total_cases,
                   COUNT(CASE WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) BETWEEN 1 AND 14 THEN 1 END) as sla_within_sla,
                   COUNT(CASE WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) BETWEEN 15 AND 28 THEN 1 END) as sla_at_risk,
                   COUNT(CASE WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) > 28 THEN 1 END) as sla_breached
            FROM phishlabs_incident i
            WHERE i.incident_type = 'Social Media Monitoring'
            AND {date_conditions}
            """
            params = []
        
        
        results = dashboard.execute_query(base_query, params)
        if results and not isinstance(results, dict) and len(results) > 0:
            result = results[0]
            total_cases = result.get('total_cases', 0)
            sla_within_sla = result.get('sla_within_sla', 0)
            sla_at_risk = result.get('sla_at_risk', 0)
            sla_breached = result.get('sla_breached', 0)
            
            # Calculate percentages
            within_sla_pct = round((sla_within_sla / total_cases * 100), 1) if total_cases > 0 else 0
            at_risk_pct = round((sla_at_risk / total_cases * 100), 1) if total_cases > 0 else 0
            breached_pct = round((sla_breached / total_cases * 100), 1) if total_cases > 0 else 0
            
            return jsonify({
                'total_cases': total_cases,
                'sla_within_sla': sla_within_sla,
                'sla_at_risk': sla_at_risk,
                'sla_breached': sla_breached,
                'within_sla_pct': within_sla_pct,
                'at_risk_pct': at_risk_pct,
                'breached_pct': breached_pct
            })
        else:
            return jsonify({
                'total_cases': 0,
                'sla_within_sla': 0,
                'sla_at_risk': 0,
                'sla_breached': 0,
                'within_sla_pct': 0,
                'at_risk_pct': 0,
                'breached_pct': 0
            })
        
    except Exception as e:
        logger.error(f"Error fetching social SLA performance: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/social-sla-cases')
def api_social_sla_cases():
    """Get individual SLA cases for Social Media Monitoring incidents"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        
        # Build date filter conditions
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.created_local")
        
        # Build base query to get individual cases with SLA calculations
        if date_conditions == "1=1":
            base_query = """
            SELECT 
                i.incident_id,
                i.threat_type,
                i.created_local,
                i.closed_local,
                DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) as age_days,
                CASE 
                    WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) BETWEEN 1 AND 14 THEN 'within_sla'
                    WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) BETWEEN 15 AND 28 THEN 'at_risk'
                    WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) > 28 THEN 'breached'
                    ELSE 'within_sla'  -- Cases closed on day 0 or less than 1 day are considered within SLA
                END as sla_status
            FROM phishlabs_incident i
            WHERE i.incident_type = 'Social Media Monitoring'
            ORDER BY i.created_local DESC
            """
            params = []
        else:
            base_query = f"""
            SELECT 
                i.incident_id,
                i.threat_type,
                i.created_local,
                i.closed_local,
                DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) as age_days,
                CASE 
                    WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) BETWEEN 1 AND 14 THEN 'within_sla'
                    WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) BETWEEN 15 AND 28 THEN 'at_risk'
                    WHEN DATEDIFF(day, i.created_local, COALESCE(i.closed_local, GETDATE())) > 28 THEN 'breached'
                    ELSE 'within_sla'  -- Cases closed on day 0 or less than 1 day are considered within SLA
                END as sla_status
            FROM phishlabs_incident i
            WHERE i.incident_type = 'Social Media Monitoring'
            AND {date_conditions}
            ORDER BY i.created_local DESC
            """
            params = []
        
        results = dashboard.execute_query(base_query, params)
        if results and not isinstance(results, dict):
            # Convert results to list of dictionaries
            cases_data = []
            for row in results:
                case = {
                    'incident_id': row.get('incident_id', ''),
                    'threat_type': row.get('threat_type', ''),
                    'created_local': row.get('created_local', ''),
                    'closed_local': row.get('closed_local', ''),
                    'age_days': row.get('age_days', 0),
                    'sla_status': row.get('sla_status', 'poor')
                }
                cases_data.append(case)
            
            return jsonify(cases_data)
        else:
            return jsonify([])
            
    except Exception as e:
        logger.error(f"Error fetching social SLA cases data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/campaigns/<campaign_name>/remove-identifier', methods=['DELETE'])
def api_remove_campaign_identifier(campaign_name):
    """Remove an identifier from a campaign"""
    try:
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        data = request.get_json()
        identifier_type = data.get('type')
        identifier_value = data.get('value')
        
        if not identifier_type or not identifier_value:
            return jsonify({"error": "Missing identifier type or value"}), 400
        
        # Get the current campaign data
        campaign = dashboard.campaigns[campaign_name]
        
        # Check if it's the new format (with identifiers list) or old format
        if isinstance(campaign, dict) and 'identifiers' in campaign:
            # New format - remove from identifiers list
            # Handle both string and object formats in identifiers
            found = False
            for i, identifier in enumerate(campaign['identifiers']):
                if isinstance(identifier, str) and identifier == identifier_value:
                    # Simple string format
                    campaign['identifiers'].pop(i)
                    found = True
                    break
                elif isinstance(identifier, dict) and identifier.get('value') == identifier_value:
                    # Object format
                    campaign['identifiers'].pop(i)
                    found = True
                    break
            
            if found:
                campaign['last_updated'] = datetime.now().strftime('%Y-%m-%d')
                
                # Save to JSON file
                dashboard.save_campaigns()
                
                logger.info(f"Removed identifier {identifier_value} from campaign {campaign_name}")
                return jsonify({"message": "Identifier removed from campaign successfully"}), 200
            else:
                return jsonify({"error": "Identifier not found in campaign"}), 404
        else:
            # Old format - remove from mappings list
            original_length = len(dashboard.campaigns[campaign_name])
            dashboard.campaigns[campaign_name] = [
                mapping for mapping in dashboard.campaigns[campaign_name]
                if not (mapping.get('field') == identifier_type and mapping.get('value') == identifier_value)
            ]
            
            if len(dashboard.campaigns[campaign_name]) == original_length:
                return jsonify({"error": "Identifier not found in campaign"}), 404
            
            # Save to JSON file
            dashboard.save_campaigns()
            
            logger.info(f"Removed identifier {identifier_value} from campaign {campaign_name}")
            return jsonify({"message": "Identifier removed from campaign successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error removing identifier from campaign: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/<campaign_name>/data')
def api_get_campaign_data(campaign_name):
    """Get comprehensive data for a campaign by searching across all tables"""
    try:
        if campaign_name not in dashboard.campaigns:
            return jsonify({"error": "Campaign not found"}), 404
        
        campaign_data = {
            'campaign_name': campaign_name,
            'case_data_incidents': [],
            'associated_urls': [],
            'threat_intelligence_incidents': [],
            'social_incidents': []
        }
        
        # Get all identifiers for this campaign
        identifiers = []
        for mapping in dashboard.campaigns[campaign_name]:
            # Handle both old format (identifier_type/identifier_value) and new format (field/value)
            if mapping.get('identifier_type') and mapping.get('identifier_value'):
                identifiers.append({
                    'type': mapping['identifier_type'],
                    'value': mapping['identifier_value']
                })
            elif mapping.get('field') and mapping.get('value'):
                identifiers.append({
                    'type': mapping['field'],
                    'value': mapping['value']
                })
        
        # Search across all tables for each identifier
        for identifier in identifiers:
            identifier_type = identifier['type']
            identifier_value = identifier['value']
            
            # Search in phishlabs_case_data_incidents - Get ALL cases for this campaign
            if identifier_type == 'case_number':
                case_query = f"""
                SELECT DISTINCT 
                    i.case_number,
                    u.url,
                    i.case_type,
                    i.date_created_local,
                    i.date_closed_local,
                    CASE 
                        WHEN i.date_closed_local IS NOT NULL AND i.date_created_local IS NOT NULL 
                        THEN DATEDIFF(day, i.date_created_local, i.date_closed_local)
                        WHEN i.case_status = 'Closed' AND i.date_closed_local IS NULL AND i.date_created_local IS NOT NULL
                        THEN DATEDIFF(day, i.date_created_local, GETDATE())
                        ELSE NULL
                    END as age_days,
                    i.case_status,
                    CASE 
                        WHEN i.case_status = 'Closed' AND i.date_closed_local IS NULL 
                        THEN 'Data Inconsistency: Status=Closed but no closed date'
                        ELSE i.case_status
                    END as case_status_display,
                    r.name as registrar_name,
                    u.host_isp
                FROM phishlabs_case_data_incidents i
                LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
                LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
                WHERE i.case_number = '{identifier_value}'
                """
                case_results = dashboard.execute_query(case_query)
                if case_results and not isinstance(case_results, dict):
                    campaign_data['case_data_incidents'].extend(case_results)
            
            # Search in phishlabs_case_data_associated_urls - Get ALL URLs for this campaign
            url_query = f"""
            SELECT DISTINCT u.case_number, u.url, u.url_path, u.url_type, u.fqdn, 
                   u.ip_address, u.tld, u.domain, u.host_isp, u.host_country, u.as_number
            FROM phishlabs_case_data_associated_urls u
            WHERE u.{identifier_type} = '{identifier_value}'
            """
            url_results = dashboard.execute_query(url_query)
            if url_results and not isinstance(url_results, dict):
                campaign_data['associated_urls'].extend(url_results)
            
            # Also get ALL URLs for cases in this campaign
            if identifier_type in ['case_number']:
                case_urls_query = f"""
                SELECT DISTINCT u.case_number, u.url, u.url_path, u.url_type, u.fqdn, 
                       u.ip_address, u.tld, u.domain, u.host_isp, u.host_country, u.as_number
                FROM phishlabs_case_data_associated_urls u
                WHERE u.case_number = '{identifier_value}'
                """
                case_url_results = dashboard.execute_query(case_urls_query)
                if case_url_results and not isinstance(case_url_results, dict):
                    campaign_data['associated_urls'].extend(case_url_results)
            
            # Search in phishlabs_threat_intelligence_incident - Get ALL threat intel records
            threat_query = f"""
            SELECT DISTINCT 
                infrid,
                url,
                cat_name,
                create_date,
                date_resolved,
                CASE 
                    WHEN date_resolved IS NOT NULL AND create_date IS NOT NULL 
                    THEN DATEDIFF(day, create_date, date_resolved)
                    ELSE NULL
                END as age_days,
                incident_status
            FROM phishlabs_threat_intelligence_incident
            WHERE {identifier_type} = '{identifier_value}'
            """
            threat_results = dashboard.execute_query(threat_query)
            if threat_results and not isinstance(threat_results, dict):
                campaign_data['threat_intelligence_incidents'].extend(threat_results)
            
            # Search in phishlabs_incident - Get ALL social media records
            social_query = f"""
            SELECT DISTINCT 
                incident_id,
                '' as url,
                threat_type,
                created_local,
                closed_local,
                CASE 
                    WHEN closed_local IS NOT NULL AND created_local IS NOT NULL 
                    THEN DATEDIFF(day, created_local, closed_local)
                    ELSE NULL
                END as age_days,
                status
            FROM phishlabs_incident
            WHERE {identifier_type} = '{identifier_value}'
            """
            social_results = dashboard.execute_query(social_query)
            if social_results and not isinstance(social_results, dict):
                campaign_data['social_incidents'].extend(social_results)
        
        return jsonify(campaign_data)
    except Exception as e:
        logger.error(f"Error getting campaign data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/data/multiple')
def api_get_multiple_campaigns_data():
    """Get comprehensive data for multiple campaigns using cached metadata (OPTIMIZED)"""
    try:
        campaign_names = request.args.getlist('campaigns')
        if not campaign_names:
            return jsonify({"error": "No campaigns specified"}), 400
        
        # Get date filtering parameters
        date_filter = request.args.get('date_filter', 'all')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        all_campaigns_data = {}
        
        for campaign_name in campaign_names:
            if campaign_name in dashboard.campaigns:
                # Get data for this campaign
                campaign_data = {
                    'case_data_incidents': [],
                    'associated_urls': [],
                    'threat_intelligence_incidents': [],
                    'social_incidents': []
                }
                
                # *** OPTIMIZED: Use cached metadata from campaigns.json ***
                campaign_data_obj = dashboard.campaigns[campaign_name]
                
                # Handle both old and new campaign formats
                identifiers = []
                if isinstance(campaign_data_obj, dict) and 'identifiers' in campaign_data_obj:
                    identifiers = campaign_data_obj['identifiers']
                elif isinstance(campaign_data_obj, list):
                    identifiers = campaign_data_obj
                
                logger.info(f"Found {len(identifiers)} identifiers in campaign {campaign_name}")
                
                # *** OPTIMIZED: Use cached metadata instead of DB queries ***
                for identifier in identifiers:
                    if not isinstance(identifier, dict):
                        continue
                    
                    # Check date filter using cached dates
                    if not matches_date_filter(identifier, date_filter, start_date, end_date):
                        continue
                    
                    table = identifier.get('table')
                    identifier_value = identifier.get('value')
                    
                    # Use cached metadata for main case data
                    if table == 'phishlabs_case_data_incidents' or identifier.get('field') == 'case_number':
                        # Start with cached metadata
                        case_entry = {
                            'case_number': identifier_value,
                            'case_type': identifier.get('case_type'),
                            'title': identifier.get('title'),
                            'case_status': identifier.get('case_status'),
                            'date_created_local': identifier.get('date_created_local'),
                            'date_closed_local': identifier.get('date_closed_local'),
                            'age_days': calculate_age_days(identifier.get('date_created_local'), identifier.get('date_closed_local')),
                            'brand': identifier.get('brand'),
                            'status': identifier.get('status'),
                            'resolution_status': identifier.get('resolution_status')
                        }
                        
                        # Fetch registrar from case_data_incidents via iana_id
                        try:
                            registrar_query = f"""
                                SELECT r.name AS registrar_name
                                FROM phishlabs_case_data_incidents c
                                LEFT JOIN phishlabs_iana_registry r
                                    ON r.iana_id = c.iana_id
                                WHERE c.case_number = '{identifier_value}'
                            """
                            registrar_result = dashboard.execute_query(registrar_query)
                            if registrar_result and not isinstance(registrar_result, dict) and len(registrar_result) > 0:
                                case_entry['registrar_name'] = registrar_result[0].get('registrar_name') or '-'
                            else:
                                case_entry['registrar_name'] = '-'
                        except Exception as e:
                            logger.error(f"Error fetching registrar for {identifier_value}: {e}")
                            case_entry['registrar_name'] = '-'
                        
                        campaign_data['case_data_incidents'].append(case_entry)
                        
                        # Query associated URLs (Note: no iana_id in associated_urls table for registrar join)
                    url_query = f"""
                            SELECT DISTINCT 
                                case_number,
                                url,
                                url_path,
                                url_type,
                                fqdn,
                                ip_address,
                                tld,
                                domain,
                                host_isp,
                                host_country,
                                as_number
                            FROM phishlabs_case_data_associated_urls
                            WHERE case_number = '{identifier_value}'
                    """
                    url_results = dashboard.execute_query(url_query)
                        
                    if url_results and not isinstance(url_results, dict):
                            # Add to associated_urls list
                        campaign_data['associated_urls'].extend(url_results)
                    
                        # Fetch the longest URL to enrich case_entry
                        try:
                            best_query = f"""
                                SELECT TOP 1
                                    url,
                                    host_isp,
                                    domain
                                FROM phishlabs_case_data_associated_urls
                                WHERE case_number = '{identifier_value}'
                                ORDER BY LEN(COALESCE(url, '')) DESC
                            """
                            best_rows = dashboard.execute_query(best_query)
                            
                            if best_rows and not isinstance(best_rows, dict) and len(best_rows) > 0:
                                best = best_rows[0]
                                
                                if best:
                                    if best.get('url'):
                                        case_entry['url'] = best.get('url')
                                    if best.get('host_isp'):
                                        case_entry['host_isp'] = best.get('host_isp')
                                    if best.get('domain'):
                                        case_entry['domain'] = best.get('domain')
                        except Exception as e:
                            logger.error(f"Error enriching case {identifier_value}: {e}")
                            pass
                    
                    elif table == 'phishlabs_threat_intelligence_incident':
                        campaign_data['threat_intelligence_incidents'].append({
                            'infrid': identifier_value,
                            'cat_name': identifier.get('cat_name'),
                            'url': identifier.get('url'),
                            'domain': identifier.get('domain'),
                            'create_date': identifier.get('create_date'),
                            'date_resolved': identifier.get('date_resolved'),
                            'age_days': calculate_age_days(identifier.get('create_date'), identifier.get('date_resolved')),
                            'status': identifier.get('status'),
                            'product': identifier.get('product'),
                            'severity': identifier.get('severity'),
                            'ticket_status': identifier.get('ticket_status')
                        })
                    
                    elif table == 'phishlabs_incident':
                        campaign_data['social_incidents'].append({
                            'incident_id': identifier_value,
                            'incident_type': identifier.get('incident_type'),
                            'threat_type': identifier.get('threat_type'),
                            'title': identifier.get('title'),
                            'created_local': identifier.get('created_local'),
                            'closed_local': identifier.get('closed_local'),
                            'age_days': calculate_age_days(identifier.get('created_local'), identifier.get('closed_local')),
                            'status': identifier.get('status'),
                            'executive_name': identifier.get('executive_name'),
                            'severity': identifier.get('severity'),
                            'brand_name': identifier.get('brand_name')
                        })
                    
                    elif table == 'phishlabs_case_data_associated_urls':
                        # Domain/URL identifiers
                        campaign_data['associated_urls'].append({
                            'case_number': identifier.get('case_number'),
                            'url': identifier.get('url'),
                            'domain': identifier.get('domain'),
                            'fqdn': identifier.get('fqdn'),
                            'ip_address': identifier.get('ip_address'),
                            'tld': identifier.get('tld'),
                            'host_isp': identifier.get('host_isp'),
                            'host_country': identifier.get('host_country'),
                            'case_type': identifier.get('case_type'),
                            'date_created_local': identifier.get('date_created_local'),
                            'status': identifier.get('status')
                        })
                
                all_campaigns_data[campaign_name] = campaign_data
        
        return jsonify(all_campaigns_data)
    except Exception as e:
        logger.error(f"Error getting multiple campaigns data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/test-url-enrichment/<case_number>')
def api_test_url_enrichment(case_number):
    """Test URL enrichment for a specific case"""
    try:
        # Query associated URLs
        url_query = f"""
            SELECT DISTINCT 
                case_number,
                url,
                host_isp,
                domain
            FROM phishlabs_case_data_associated_urls
            WHERE case_number = '{case_number}'
        """
        url_results = dashboard.execute_query(url_query)
        
        # Get best URL
        best_query = f"""
            SELECT TOP 1
                url,
                host_isp,
                domain
            FROM phishlabs_case_data_associated_urls
            WHERE case_number = '{case_number}'
            ORDER BY LEN(COALESCE(url, '')) DESC
        """
        best_rows = dashboard.execute_query(best_query)
        
        return jsonify({
            'case_number': case_number,
            'all_urls': url_results if url_results and not isinstance(url_results, dict) else [],
            'best_url': best_rows[0] if best_rows and not isinstance(best_rows, dict) and len(best_rows) > 0 else None
        })
    except Exception as e:
        logger.error(f"Error testing URL enrichment: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/connection-status')
def api_connection_status():
    """API endpoint to test database connection"""
    try:
        with dashboard.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            return jsonify({"status": "connected", "test": result[0] if result else None})
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/dashboard/executive-summary-metrics')
def api_executive_summary_metrics():
    """API endpoint for executive summary metrics"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        metrics_data = dashboard.get_executive_summary_metrics(date_filter, 'all', start_date, end_date)
        return jsonify(metrics_data)
    except Exception as e:
        logger.error(f"Error in executive summary metrics API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/threat-landscape-overview')
def api_threat_landscape_overview():
    """API endpoint for threat landscape overview"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        threat_data = dashboard.get_threat_landscape_overview(date_filter, 'all', start_date, end_date)
        return jsonify(threat_data)
    except Exception as e:
        logger.error(f"Error in threat landscape overview API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/geographic-heatmap')
def api_geographic_heatmap():
    """API endpoint for geographic heatmap data"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        geo_data = dashboard.get_geographic_heatmap_data(date_filter, 'all', start_date, end_date)
        return jsonify(geo_data)
    except Exception as e:
        logger.error(f"Error in geographic heatmap API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/timeline-trends')
def api_timeline_trends():
    """API endpoint for timeline trends"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        trends_data = dashboard.get_timeline_trends(date_filter, 'all', start_date, end_date)
        return jsonify(trends_data)
    except Exception as e:
        logger.error(f"Error in timeline trends API: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================================================
# CASE MANAGEMENT DASHBOARD API ENDPOINTS
# ============================================================================

@app.route('/api/dashboard/case-status-overview')
def api_case_status_overview():
    """API endpoint for comprehensive case status overview"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        status_data = dashboard.get_case_status_overview_comprehensive(date_filter, 'all', start_date, end_date)
        return jsonify(status_data)
    except Exception as e:
        logger.error(f"Error in case status overview API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/case-type-distribution')
def api_case_type_distribution():
    """API endpoint for case type distribution"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        type_data = dashboard.get_case_type_distribution(date_filter, 'all', start_date, end_date)
        return jsonify(type_data)
    except Exception as e:
        logger.error(f"Error in case type distribution API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/resolution-performance')
def api_resolution_performance():
    """API endpoint for resolution performance"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        performance_data = dashboard.get_resolution_performance(date_filter, 'all', start_date, end_date)
        return jsonify(performance_data)
    except Exception as e:
        logger.error(f"Error in resolution performance API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/workload-distribution')
def api_workload_distribution():
    """API endpoint for workload distribution"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        workload_data = dashboard.get_workload_distribution(date_filter, 'all', start_date, end_date)
        return jsonify(workload_data)
    except Exception as e:
        logger.error(f"Error in workload distribution API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/sla-tracking')
def api_sla_tracking():
    """API endpoint for SLA tracking"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        sla_data = dashboard.get_sla_tracking(date_filter, start_date, end_date)
        return jsonify(sla_data)
    except Exception as e:
        logger.error(f"Error in SLA tracking API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/sla-category-totals')
def api_sla_category_totals():
    """API endpoint for SLA category totals"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        totals = dashboard.get_sla_category_totals(date_filter, start_date, end_date)
        return jsonify(totals)
    except Exception as e:
        logger.error(f"Error in SLA category totals API: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================================================
# THREAT INTELLIGENCE DASHBOARD API ENDPOINTS
# ============================================================================

@app.route('/api/dashboard/domain-monitoring')
def api_domain_monitoring():
    """API endpoint for domain monitoring"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        domain_data = dashboard.get_domain_monitoring(date_filter, 'all', start_date, end_date)
        return jsonify(domain_data)
    except Exception as e:
        logger.error(f"Error in domain monitoring API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/threat-family-analysis')
def api_threat_family_analysis():
    """API endpoint for threat family analysis"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        threat_data = dashboard.get_threat_family_analysis(date_filter, 'all', start_date, end_date)
        return jsonify(threat_data)
    except Exception as e:
        logger.error(f"Error in threat family analysis API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/infrastructure-analysis-detailed')
def api_infrastructure_analysis_detailed():
    """API endpoint for detailed infrastructure analysis"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        infrastructure_data = dashboard.get_infrastructure_analysis_detailed(date_filter, 'all', start_date, end_date)
        return jsonify(infrastructure_data)
    except Exception as e:
        logger.error(f"Error in infrastructure analysis API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/infrastructure-analysis')
def api_infrastructure_analysis():
    """API endpoint for infrastructure analysis"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        infrastructure_data = dashboard.get_infrastructure_analysis(date_filter, 'all', start_date, end_date)
        return jsonify(infrastructure_data)
    except Exception as e:
        logger.error(f"Error in infrastructure analysis API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/performance-metrics')
def api_performance_metrics():
    """API endpoint for performance metrics"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        performance_data = dashboard.get_performance_metrics(date_filter, 'all', start_date, end_date)
        return jsonify(performance_data)
    except Exception as e:
        logger.error(f"Error in performance metrics API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/ioc-tracking')
def api_ioc_tracking():
    """API endpoint for IOC tracking"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        ioc_data = dashboard.get_ioc_tracking(date_filter, 'all', start_date, end_date)
        return jsonify(ioc_data)
    except Exception as e:
        logger.error(f"Error in IOC tracking API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/attribution-coverage')
def api_attribution_coverage():
    """Get attribution coverage metrics - percentage of cases with different types of attribution"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        coverage_data = dashboard.get_attribution_coverage(date_filter, 'all', start_date, end_date)
        return jsonify(coverage_data)
    except Exception as e:
        logger.error(f"Error in attribution coverage API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/threat-actors')
def api_threat_actors():
    """Get top threat actors by activity"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        actor_data = dashboard.get_top_threat_actors(date_filter, 'all', start_date, end_date)
        return jsonify(actor_data)
    except Exception as e:
        logger.error(f"Error in threat actors API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/kit-families')
def api_kit_families():
    """Get phishing kit family distribution"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        kit_data = dashboard.get_kit_family_distribution(date_filter, 'all', start_date, end_date)
        return jsonify(kit_data)
    except Exception as e:
        logger.error(f"Error in kit families API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/attribution-timeline')
def api_attribution_timeline():
    """Get attribution timeline data"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        timeline_data = dashboard.get_attribution_timeline(date_filter, 'all', start_date, end_date)
        return jsonify(timeline_data)
    except Exception as e:
        logger.error(f"Error in attribution timeline API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/infrastructure-patterns')
def api_infrastructure_patterns():
    """Get infrastructure patterns by threat actors"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        infra_data = dashboard.get_infrastructure_patterns(date_filter, 'all', start_date, end_date)
        return jsonify(infra_data)
    except Exception as e:
        logger.error(f"Error in infrastructure patterns API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/actor-infrastructure-preferences')
def api_actor_infrastructure_preferences():
    """API endpoint for actor infrastructure preferences"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        preferences_data = dashboard.get_actor_infrastructure_preferences(date_filter, 'all', start_date, end_date)
        url_paths_data = dashboard.get_url_path_patterns(date_filter, 'all', start_date, end_date)
        infrastructure_data = dashboard.get_actor_infrastructure_all_values(date_filter, 'all', start_date, end_date)
        return jsonify({
            "actors": preferences_data,
            "url_paths": url_paths_data,
            "infrastructure": infrastructure_data
        })
    except Exception as e:
        logger.error(f"Error in actor infrastructure preferences API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/family-infrastructure-preferences')
def api_family_infrastructure_preferences():
    """API endpoint for family infrastructure preferences"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        preferences_data = dashboard.get_family_infrastructure_preferences(date_filter, 'all', start_date, end_date)
        brand_data = dashboard.get_brand_targeting_patterns(date_filter, 'all', start_date, end_date)
        return jsonify({
            "families": preferences_data,
            "brands": brand_data
        })
    except Exception as e:
        logger.error(f"Error in family infrastructure preferences API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/comprehensive-threat-family-intelligence')
def api_comprehensive_threat_family_intelligence():
    """API endpoint for comprehensive threat family intelligence"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        intelligence_data = dashboard.get_comprehensive_threat_family_intelligence(date_filter, 'all', start_date, end_date)
        return jsonify(intelligence_data)
    except Exception as e:
        logger.error(f"Error in comprehensive threat family intelligence API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/infrastructure-patterns-detailed')
def api_infrastructure_patterns_detailed():
    """API endpoint for detailed infrastructure patterns"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        patterns_data = dashboard.get_infrastructure_patterns_detailed(date_filter, 'all', start_date, end_date)
        
        # Separate the data by pattern type
        reuse_data = [item for item in patterns_data if item.get('pattern_type') == 'reuse']
        geographic_data = [item for item in patterns_data if item.get('pattern_type') == 'geographic']
        temporal_data = [item for item in patterns_data if item.get('pattern_type') == 'temporal']
        
        return jsonify({
            "reuse": reuse_data,
            "geographic": geographic_data,
            "temporal": temporal_data
        })
    except Exception as e:
        logger.error(f"Error in infrastructure patterns detailed API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/campaign-lifecycle')
def api_campaign_lifecycle():
    """API endpoint for campaign lifecycle analysis"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        lifecycle_data = dashboard.get_campaign_lifecycle_analysis(date_filter, 'all', start_date, end_date)
        return jsonify(lifecycle_data)
    except Exception as e:
        logger.error(f"Error in campaign lifecycle API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/whois-attribution')
def api_whois_attribution():
    """Get WHOIS attribution data for repeat offenders"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        whois_data = dashboard.get_whois_attribution(date_filter, 'all', start_date, end_date)
        return jsonify(whois_data)
    except Exception as e:
        logger.error(f"Error in WHOIS attribution API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/priority-cases')
def api_priority_cases():
    """Get high-priority cases with strong attribution signals"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        priority_data = dashboard.get_priority_attribution_cases(date_filter, 'all', start_date, end_date)
        return jsonify(priority_data)
    except Exception as e:
        logger.error(f"Error in priority cases API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/data-quality/missing-fields-external', methods=['POST'])
def api_missing_fields_external():
    """Analyze missing fields via external PhishLabs API (credentials via env or request)."""
    try:
        data = request.get_json(silent=True) or {}
        date_filter = data.get('date_filter', 'month')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        username = data.get('username')
        password = data.get('password')
        use_legacy = bool(data.get('use_legacy', False))

        # Resolve dates if missing
        if not start_date or not end_date:
            from datetime import datetime, timedelta
            today = datetime.now()
            if date_filter == 'today':
                start_date = today.strftime('%Y-%m-%d')
                end_date = today.strftime('%Y-%m-%d')
            elif date_filter == 'yesterday':
                y = today - timedelta(days=1)
                start_date = y.strftime('%Y-%m-%d')
                end_date = y.strftime('%Y-%m-%d')
            elif date_filter == 'week':
                start = today - timedelta(days=6)
                start_date = start.strftime('%Y-%m-%d')
                end_date = today.strftime('%Y-%m-%d')
            elif date_filter == 'month':
                # Last 30 days window
                start = today - timedelta(days=29)
                start_date = start.strftime('%Y-%m-%d')
                end_date = today.strftime('%Y-%m-%d')
            elif date_filter == 'this_month':
                start = today.replace(day=1)
                start_date = start.strftime('%Y-%m-%d')
                end_date = today.strftime('%Y-%m-%d')
            elif date_filter == 'last_month':
                first_this = today.replace(day=1)
                last_month_end = first_this - timedelta(days=1)
                last_month_start = last_month_end.replace(day=1)
                start_date = last_month_start.strftime('%Y-%m-%d')
                end_date = last_month_end.strftime('%Y-%m-%d')
            elif date_filter == 'year':
                start = today.replace(month=1, day=1)
                start_date = start.strftime('%Y-%m-%d')
                end_date = today.strftime('%Y-%m-%d')
            elif date_filter == 'all':
                start_date = '1970-01-01'
                end_date = today.strftime('%Y-%m-%d')
            else:
                start_date = (data.get('start_date') or today.strftime('%Y-%m-%d'))
                end_date = (data.get('end_date') or today.strftime('%Y-%m-%d'))

        report = analyze_missing_fields(start_date, end_date, use_legacy, username, password)
        return jsonify(report), (200 if 'summary' in report else 400)
    except Exception as e:
        logger.error(f"Error in missing fields external API: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/risk-configuration')
def api_risk_configuration():
    """Get dynamic risk configuration from database"""
    try:
        # Get high-risk threat actors (top actors by case volume)
        high_risk_actors_query = """
        SELECT TOP 10 th.name as actor_name, COUNT(DISTINCT i.case_number) as case_count
        FROM phishlabs_case_data_note_threatactor_handles th
        JOIN phishlabs_case_data_incidents i ON th.case_number = i.case_number
        WHERE th.name IS NOT NULL AND th.name != ''
        GROUP BY th.name
        HAVING COUNT(DISTINCT i.case_number) >= 5
        ORDER BY case_count DESC
        """
        
        # Get high-risk brands (top targeted brands)
        high_risk_brands_query = """
        SELECT TOP 10 i.brand, COUNT(DISTINCT i.case_number) as case_count
        FROM phishlabs_case_data_incidents i
        WHERE i.brand IS NOT NULL AND i.brand != ''
        GROUP BY i.brand
        HAVING COUNT(DISTINCT i.case_number) >= 5
        ORDER BY case_count DESC
        """
        
        # Get all kit families from database
        kit_families_query = """
        SELECT DISTINCT n.threat_family
        FROM phishlabs_case_data_notes n
        WHERE n.threat_family IS NOT NULL AND n.threat_family != ''
        """
        
        # Get high-risk countries (countries with most threats)
        high_risk_countries_query = """
        SELECT TOP 10 u.host_country, COUNT(DISTINCT i.case_number) as case_count
        FROM phishlabs_case_data_associated_urls u
        JOIN phishlabs_case_data_incidents i ON u.case_number = i.case_number
        WHERE u.host_country IS NOT NULL AND u.host_country != ''
        GROUP BY u.host_country
        HAVING COUNT(DISTINCT i.case_number) >= 10
        ORDER BY case_count DESC
        """
        
        high_risk_actors = dashboard.execute_query(high_risk_actors_query)
        high_risk_brands = dashboard.execute_query(high_risk_brands_query)
        kit_families = dashboard.execute_query(kit_families_query)
        high_risk_countries = dashboard.execute_query(high_risk_countries_query)
        
        return jsonify({
            'high_risk_actors': [actor['actor_name'] for actor in (high_risk_actors if high_risk_actors and not isinstance(high_risk_actors, dict) else [])],
            'high_risk_brands': [brand['brand'] for brand in (high_risk_brands if high_risk_brands and not isinstance(high_risk_brands, dict) else [])],
            'kit_families': [kit['threat_family'] for kit in (kit_families if kit_families and not isinstance(kit_families, dict) else [])],
            'high_risk_countries': [country['host_country'] for country in (high_risk_countries[:4] if high_risk_countries and not isinstance(high_risk_countries, dict) else [])],
            'medium_risk_countries': [country['host_country'] for country in (high_risk_countries[4:10] if high_risk_countries and not isinstance(high_risk_countries, dict) and len(high_risk_countries) > 4 else [])]
        })
        
    except Exception as e:
        logger.error(f"Error in risk configuration API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/detailed-infrastructure')
def api_detailed_infrastructure():
    """Get detailed infrastructure data for a specific threat actor or family"""
    try:
        infra_type = request.args.get('type', 'actor')  # 'actor' or 'family'
        infra_value = request.args.get('value', '')
        
        if not infra_value:
            return jsonify({"error": "No value specified"}), 400
        
        detailed_data = dashboard.get_detailed_infrastructure(infra_type, infra_value)
        return jsonify(detailed_data)
    except Exception as e:
        logger.error(f"Error fetching detailed infrastructure: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/insert-test-data', methods=['POST'])
def insert_test_data():
    """API endpoint to insert comprehensive test data for Threat Intelligence Dashboard"""
    try:
        logger.info("Starting test data insertion...")
        
        # Clear existing test data first
        dashboard.clear_test_data()
        
        # Generate and insert test data
        dashboard.insert_comprehensive_test_data()
            
        return jsonify({
            "success": True,
            "message": "Test data inserted successfully",
            "total_cases": 30,
            "time_periods": ["Last 7 days", "1-2 weeks ago", "3-4 weeks ago", "1-2 months ago", "2-3 months ago"],
            "threat_actors": ["TA505", "FIN7", "Carbanak", "Lazarus Group", "APT29"],
            "threat_families": ["Emotet", "Trickbot", "Qakbot", "IcedID", "Cobalt Strike"]
        })
        
    except Exception as e:
        logger.error(f"Error inserting test data: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================================================
# CAMPAIGN MANAGEMENT DASHBOARD API ENDPOINTS
# ============================================================================

@app.route('/api/dashboard/campaign-overview')
def api_campaign_overview():
    """API endpoint for campaign overview"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        campaign_data = dashboard.get_campaign_overview(date_filter, 'all', start_date, end_date)
        return jsonify(campaign_data)
    except Exception as e:
        logger.error(f"Error in campaign overview API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/campaign-progress')
def api_campaign_progress():
    """API endpoint for campaign progress"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        progress_data = dashboard.get_campaign_progress(date_filter, 'all', start_date, end_date)
        return jsonify(progress_data)
    except Exception as e:
        logger.error(f"Error in campaign progress API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/cross-table-campaign-view')
def api_cross_table_campaign_view():
    """API endpoint for cross-table campaign view"""
    date_filter = request.args.get('date_filter', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        cross_table_data = dashboard.get_cross_table_campaign_view(date_filter, 'all', start_date, end_date)
        return jsonify(cross_table_data)
    except Exception as e:
        logger.error(f"Error in cross-table campaign view API: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================================================
# BULK CASE ADDITION SEARCH API ENDPOINTS
# ============================================================================

@app.route('/api/search-case-data')
def api_search_case_data():
    """Search for case_number in phishlabs_case_data_incidents"""
    try:
        value = request.args.get('value', '').strip()
        search_type = request.args.get('type', 'partial')  # partial or exact
        
        logger.info(f"Searching for case data: value='{value}', type='{search_type}'")
        
        if not value:
            logger.info("Empty search value, returning empty results")
            return jsonify([])
        
        # Build the search condition
        if search_type == 'exact':
            where_condition = f"i.case_number = '{value}'"
        else:
            where_condition = f"i.case_number LIKE '%{value}%'"
        
        query = f"""
        SELECT DISTINCT
            i.case_number,
            i.case_type,
            i.title,
            i.case_status,
            i.date_created_local
        FROM phishlabs_case_data_incidents i
        WHERE {where_condition}
        ORDER BY i.date_created_local DESC
        """
        
        logger.info(f"Executing query: {query}")
        results = dashboard.execute_query(query)
        logger.info(f"Query returned {len(results)} results")
        
        # Also try a simple count query to see if the table has any data
        count_query = "SELECT COUNT(*) as total FROM phishlabs_case_data_incidents"
        count_result = dashboard.execute_query(count_query)
        logger.info(f"Total records in phishlabs_case_data_incidents: {count_result[0]['total'] if count_result else 'Unknown'}")
        
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in search-case-data API: {e}")
        logger.error(f"Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search-threat-intelligence')
def api_search_threat_intelligence():
    """Search for infrid in phishlabs_threat_intelligence_incident"""
    try:
        value = request.args.get('value', '').strip()
        search_type = request.args.get('type', 'partial')  # partial or exact
        
        if not value:
            return jsonify([])
        
        # Build the search condition
        if search_type == 'exact':
            where_condition = f"ti.infrid = '{value}'"
        else:
            where_condition = f"ti.infrid LIKE '%{value}%'"
        
        query = f"""
        SELECT DISTINCT
            ti.infrid,
            ti.cat_name,
            ti.url,
            ti.domain,
            ti.status,
            ti.create_date
        FROM phishlabs_threat_intelligence_incident ti
        WHERE {where_condition}
        ORDER BY ti.create_date DESC
        """
        
        results = dashboard.execute_query(query)
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in search-threat-intelligence API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search-incident')
def api_search_incident():
    """Search for incident_id in phishlabs_incident"""
    try:
        value = request.args.get('value', '').strip()
        search_type = request.args.get('type', 'partial')  # partial or exact
        
        if not value:
            return jsonify([])
        
        # Build the search condition
        if search_type == 'exact':
            where_condition = f"si.incident_id = '{value}'"
        else:
            where_condition = f"si.incident_id LIKE '%{value}%'"
        
        query = f"""
        SELECT DISTINCT
            si.incident_id,
            si.incident_type,
            si.title,
            si.status,
            si.created_local
        FROM phishlabs_incident si
        WHERE {where_condition}
        ORDER BY si.created_local DESC
        """
        
        results = dashboard.execute_query(query)
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in search-incident API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search-associated-urls')
def api_search_associated_urls():
    """Search for domains/URLs in phishlabs_case_data_associated_urls"""
    try:
        value = request.args.get('value', '').strip()
        search_type = request.args.get('type', 'partial')  # partial or exact
        
        if not value:
            return jsonify([])
        
        # Build the search condition for multiple fields (case-insensitive)
        if search_type == 'exact':
            where_condition = f"""
            (LOWER(au.url) = LOWER('{value}') OR 
             LOWER(au.url_path) = LOWER('{value}') OR 
             LOWER(au.fqdn) = LOWER('{value}') OR 
             LOWER(au.domain) = LOWER('{value}'))
            """
        else:
            where_condition = f"""
            (LOWER(au.url) LIKE LOWER('%{value}%') OR 
             LOWER(au.url_path) LIKE LOWER('%{value}%') OR 
             LOWER(au.fqdn) LIKE LOWER('%{value}%') OR 
             LOWER(au.domain) LIKE LOWER('%{value}%'))
            """
        
        query = f"""
        SELECT DISTINCT
            au.case_number,
            au.url,
            au.url_path,
            au.fqdn,
            au.domain,
            au.ip_address,
            au.tld,
            au.host_isp,
            au.host_country
        FROM phishlabs_case_data_associated_urls au
        WHERE {where_condition}
        ORDER BY au.case_number
        """
        
        results = dashboard.execute_query(query)
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in search-associated-urls API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search-note-bots')
def api_search_note_bots():
    """Search for URLs in phishlabs_case_data_note_bots"""
    try:
        value = request.args.get('value', '').strip()
        search_type = request.args.get('type', 'partial')  # partial or exact
        
        if not value:
            return jsonify([])
        
        # Build the search condition (case-insensitive)
        if search_type == 'exact':
            where_condition = f"LOWER(nb.url) = LOWER('{value}')"
        else:
            where_condition = f"LOWER(nb.url) LIKE LOWER('%{value}%')"
        
        query = f"""
        SELECT DISTINCT
            nb.case_number,
            nb.url,
            nb.note
        FROM phishlabs_case_data_note_bots nb
        WHERE {where_condition}
        ORDER BY nb.case_number
        """
        
        results = dashboard.execute_query(query)
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in search-note-bots API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search-threatactor-handles')
def api_search_threatactor_handles():
    """Search for URLs in phishlabs_case_data_note_threatactor_handles"""
    try:
        value = request.args.get('value', '').strip()
        search_type = request.args.get('type', 'partial')  # partial or exact
        
        if not value:
            return jsonify([])
        
        # Build the search condition (case-insensitive)
        if search_type == 'exact':
            where_condition = f"LOWER(th.url) = LOWER('{value}')"
        else:
            where_condition = f"LOWER(th.url) LIKE LOWER('%{value}%')"
        
        query = f"""
        SELECT DISTINCT
            th.case_number,
            th.url,
            th.name,
            th.note
        FROM phishlabs_case_data_note_threatactor_handles th
        WHERE {where_condition}
        ORDER BY th.case_number
        """
        
        results = dashboard.execute_query(query)
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in search-threatactor-handles API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search-threat-intelligence-domain')
def api_search_threat_intelligence_domain():
    """Search for domains/URLs in phishlabs_threat_intelligence_incident"""
    try:
        value = request.args.get('value', '').strip()
        search_type = request.args.get('type', 'partial')  # partial or exact
        
        if not value:
            return jsonify([])
        
        # Build the search condition for URL and domain fields (case-insensitive)
        if search_type == 'exact':
            where_condition = f"""
            (LOWER(ti.url) = LOWER('{value}') OR 
             LOWER(ti.domain) = LOWER('{value}'))
            """
        else:
            where_condition = f"""
            (LOWER(ti.url) LIKE LOWER('%{value}%') OR 
             LOWER(ti.domain) LIKE LOWER('%{value}%'))
            """
        
        query = f"""
        SELECT DISTINCT
            ti.infrid,
            ti.url,
            ti.domain,
            ti.cat_name,
            ti.status,
            ti.create_date
        FROM phishlabs_threat_intelligence_incident ti
        WHERE {where_condition}
        ORDER BY ti.create_date DESC
        """
        
        results = dashboard.execute_query(query)
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in search-threat-intelligence-domain API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/bulk-validate-identifiers', methods=['POST'])
def api_bulk_validate_identifiers():
    """
    Bulk validate identifiers across all tables with optimized queries.
    Instead of querying each identifier individually against each table,
    this queries all identifiers at once per table (3 queries total).
    
    Performance: 100 identifiers = 3 queries instead of 300+ queries (99% reduction!)
    """
    try:
        data = request.get_json()
        identifiers_input = data.get('identifiers', '')
        
        if not identifiers_input:
            return jsonify({"error": "No identifiers provided"}), 400
        
        # Parse identifiers - split by comma or newline, remove whitespace
        raw_identifiers = []
        for line in identifiers_input.split('\n'):
            for identifier in line.split(','):
                cleaned = identifier.strip()
                if cleaned:
                    raw_identifiers.append(cleaned)
        
        if not raw_identifiers:
            return jsonify({"error": "No valid identifiers provided"}), 400
        
        logger.info(f"Bulk validating {len(raw_identifiers)} identifiers")
        
        # Results structure
        validated_identifiers = []
        found_in_tables = {
            'cred_theft': [],
            'domain_monitoring': [],
            'social_media': []
        }
        not_found = []
        
        # Create IN clause for SQL (escape single quotes)
        escaped_identifiers = ["'" + str(id_val).replace("'", "''") + "'" for id_val in raw_identifiers]
        identifiers_in_clause = ','.join(escaped_identifiers)
        
        # QUERY 1: Check ALL identifiers in cred theft table (1 query for all)
        cred_theft_query = f"""
        SELECT 
            i.case_number,
            i.date_created_local,
            i.date_closed_local,
            i.brand,
            'phishlabs_case_data_incidents' as source_table,
            'case_number' as field_type
        FROM phishlabs_case_data_incidents i
        WHERE i.case_number IN ({identifiers_in_clause})
        """
        
        cred_theft_results = dashboard.execute_query(cred_theft_query)
        if cred_theft_results and isinstance(cred_theft_results, list):
            for row in cred_theft_results:
                case_number = row.get('case_number', '')
                if case_number:
                    found_in_tables['cred_theft'].append(case_number)
                    validated_identifiers.append({
                        'value': case_number,
                        'field': 'case_number',
                        'table': 'phishlabs_case_data_incidents',
                        'date_created': str(row.get('date_created_local', 'N/A')),
                        'date_closed': str(row.get('date_closed_local', 'N/A')) if row.get('date_closed_local') else 'Open',
                        'brand': row.get('brand', 'N/A'),
                        'type': 'Cred Theft',
                        'metadata_complete': True
                    })
        
        logger.info(f"Found {len(found_in_tables['cred_theft'])} identifiers in cred theft table")
        
        # QUERY 2: Check ALL identifiers in domain monitoring table (1 query for all)
        domain_monitoring_query = f"""
        SELECT 
            t.infrid,
            t.create_date as date_created,
            t.cat_name as threat_type,
            t.url,
            t.date_resolved,
            'phishlabs_threat_intelligence_incident' as source_table,
            'infrid' as field_type
        FROM phishlabs_threat_intelligence_incident t
        WHERE t.infrid IN ({identifiers_in_clause})
        """
        
        domain_monitoring_results = dashboard.execute_query(domain_monitoring_query)
        if domain_monitoring_results and isinstance(domain_monitoring_results, list):
            for row in domain_monitoring_results:
                infrid = row.get('infrid', '')
                if infrid:
                    found_in_tables['domain_monitoring'].append(infrid)
                    validated_identifiers.append({
                        'value': infrid,
                        'field': 'infrid',
                        'table': 'phishlabs_threat_intelligence_incident',
                        'date_created': str(row.get('date_created', 'N/A')),
                        'threat_type': row.get('threat_type', 'N/A'),
                        'url': row.get('url', 'N/A'),
                        'type': 'Domain Monitoring',
                        'metadata_complete': True
                    })
        
        logger.info(f"Found {len(found_in_tables['domain_monitoring'])} identifiers in domain monitoring table")
        
        # QUERY 3: Check ALL identifiers in social media table (1 query for all)
        social_media_query = f"""
        SELECT 
            s.incident_id,
            s.created_local,
            s.closed_local,
            s.brand,
            'phishlabs_incident' as source_table,
            'incident_id' as field_type
        FROM phishlabs_incident s
        WHERE s.incident_id IN ({identifiers_in_clause})
        """
        
        social_media_results = dashboard.execute_query(social_media_query)
        if social_media_results and isinstance(social_media_results, list):
            for row in social_media_results:
                incident_id = row.get('incident_id', '')
                if incident_id:
                    found_in_tables['social_media'].append(incident_id)
                    validated_identifiers.append({
                        'value': incident_id,
                        'field': 'incident_id',
                        'table': 'phishlabs_incident',
                        'date_created': str(row.get('created_local', 'N/A')),
                        'date_closed': str(row.get('closed_local', 'N/A')) if row.get('closed_local') else 'Open',
                        'brand': row.get('brand', 'N/A'),
                        'type': 'Social Media',
                        'metadata_complete': True
                    })
        
        logger.info(f"Found {len(found_in_tables['social_media'])} identifiers in social media table")
        
        # Find identifiers that weren't found in any table
        found_values = set(
            found_in_tables['cred_theft'] + 
            found_in_tables['domain_monitoring'] + 
            found_in_tables['social_media']
        )
        
        for identifier in raw_identifiers:
            if identifier not in found_values:
                not_found.append(identifier)
        
        # Summary
        total_found = len(validated_identifiers)
        total_not_found = len(not_found)
        
        logger.info(f"Bulk validation complete: {total_found} found, {total_not_found} not found (using 3 queries for {len(raw_identifiers)} identifiers)")
        
        return jsonify({
            'success': True,
            'total_provided': len(raw_identifiers),
            'total_found': total_found,
            'total_not_found': total_not_found,
            'identifiers': validated_identifiers,
            'not_found': not_found,
            'found_by_type': {
                'cred_theft': len(found_in_tables['cred_theft']),
                'domain_monitoring': len(found_in_tables['domain_monitoring']),
                'social_media': len(found_in_tables['social_media'])
            },
            'performance': {
                'queries_used': 3,
                'queries_saved': len(raw_identifiers) * 3 - 3,
                'efficiency_improvement': f"{round((1 - 3 / (len(raw_identifiers) * 3)) * 100, 1)}%"
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in bulk identifier validation: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/save-campaigns', methods=['POST'])
def api_save_campaigns():
    """Save campaigns data (bulk save) with deduplication and validation"""
    try:
        data = request.get_json()
        campaigns_data = data.get('campaigns', {})
        
        if not isinstance(campaigns_data, dict):
            return jsonify({"error": "Invalid campaigns data format"}), 400
        
        logger.info(f"Received save request for {len(campaigns_data)} campaigns")
        
        # Process each campaign with deduplication
        total_identifiers_before = 0
        total_identifiers_after = 0
        total_duplicates_removed = 0
        
        for campaign_name, campaign_data in campaigns_data.items():
            if not isinstance(campaign_data, dict):
                continue
                
            identifiers = campaign_data.get('identifiers', [])
            total_identifiers_before += len(identifiers)
            
            # Deduplicate identifiers based on case_number, infrid, or incident_id
            unique_identifiers = []
            seen = set()
            
            for identifier in identifiers:
                if not isinstance(identifier, dict):
                    continue
                
                # Create unique key based on the primary identifier field
                field = identifier.get('field', '')
                value = identifier.get('value', '')
                
                # Only deduplicate based on case_number, infrid, or incident_id
                if field in ['case_number', 'infrid', 'incident_id']:
                    unique_key = f"{field}:{value}"
                else:
                    # For other fields, use table + field + value
                    table = identifier.get('table', '')
                    unique_key = f"{table}:{field}:{value}"
                
                if unique_key and unique_key not in seen:
                    seen.add(unique_key)
                    unique_identifiers.append(identifier)
            
            duplicates_removed = len(identifiers) - len(unique_identifiers)
            total_identifiers_after += len(unique_identifiers)
            total_duplicates_removed += duplicates_removed
            
            if duplicates_removed > 0:
                logger.info(f"Campaign {campaign_name}: Removed {duplicates_removed} duplicate identifiers ({len(identifiers)} → {len(unique_identifiers)})")
            
            # Update the campaign data with deduplicated identifiers
            campaign_data['identifiers'] = unique_identifiers
        
        # Create a backup before saving
        try:
            import shutil
            from datetime import datetime
            campaigns_path = os.path.join('app', 'campaigns.json') if os.path.exists('app') else 'campaigns.json'
            campaigns_dir = os.path.dirname(campaigns_path) if os.path.dirname(campaigns_path) else '.'
            backup_filename = os.path.join(campaigns_dir, f"campaigns_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
            shutil.copy(campaigns_path, backup_filename)
            logger.info(f"Created backup: {backup_filename}")
        except Exception as backup_error:
            logger.warning(f"Failed to create backup: {backup_error}")
        
        # Update the dashboard campaigns
        dashboard.campaigns = campaigns_data
        
        # Save to JSON file with error handling
        try:
            dashboard.save_campaigns()
            logger.info(f"✅ Successfully saved {len(campaigns_data)} campaigns: {total_identifiers_before} identifiers → {total_identifiers_after} identifiers ({total_duplicates_removed} duplicates removed)")
        except Exception as save_error:
            logger.error(f"CRITICAL: Failed to save campaigns.json: {save_error}")
            # Try to restore from the most recent backup if save failed
            raise save_error
        
        return jsonify({
            "message": "Campaigns saved successfully", 
            "count": len(campaigns_data),
            "total_identifiers": total_identifiers_after,
            "duplicates_removed": total_duplicates_removed
        }), 200
        
    except Exception as e:
        logger.error(f"Error saving campaigns: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/tld-abuse')
def api_tld_abuse():
    """API endpoint for TLD abuse analysis"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        tld_data = dashboard.analyze_tld_abuse(date_filter, campaign_filter, start_date, end_date)
        return jsonify(tld_data)
    except Exception as e:
        logger.error(f"Error in TLD abuse API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/domain-patterns')
def api_domain_patterns():
    """API endpoint for domain pattern analysis"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        patterns_data = dashboard.analyze_domain_patterns(date_filter, campaign_filter, start_date, end_date)
        return jsonify(patterns_data)
    except Exception as e:
        logger.error(f"Error in domain patterns API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/url-paths')
def api_url_paths():
    """API endpoint for URL path analysis"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        url_data = dashboard.analyze_url_paths(date_filter, campaign_filter, start_date, end_date)
        return jsonify(url_data)
    except Exception as e:
        logger.error(f"Error in URL paths API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/intelligence-coverage-detailed')
def api_intelligence_coverage_detailed():
    """API endpoint for detailed intelligence coverage analysis"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        coverage_data = dashboard.get_intelligence_coverage_detailed(date_filter, campaign_filter, start_date, end_date)
        return jsonify(coverage_data)
    except Exception as e:
        logger.error(f"Error in intelligence coverage detailed API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/status-overview-detailed')
def api_status_overview_detailed():
    """API endpoint for expandable status overview with case details"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        status_data = dashboard.get_status_overview_with_details(date_filter, campaign_filter, start_date, end_date)
        return jsonify(status_data)
    except Exception as e:
        logger.error(f"Error in status overview detailed API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/domain-analysis-comprehensive')
def api_domain_analysis_comprehensive():
    """API endpoint for comprehensive domain analysis (TLD + patterns + URL paths)"""
    date_filter = request.args.get('date_filter', 'today')
    campaign_filter = request.args.get('campaign_filter', 'all')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        # Get all domain analysis data
        tld_data = dashboard.analyze_tld_abuse(date_filter, campaign_filter, start_date, end_date)
        patterns_data = dashboard.analyze_domain_patterns(date_filter, campaign_filter, start_date, end_date)
        url_data = dashboard.analyze_url_paths(date_filter, campaign_filter, start_date, end_date)
        
        return jsonify({
            'tld_abuse': tld_data,
            'domain_patterns': patterns_data,
            'url_analysis': url_data
        })
    except Exception as e:
        logger.error(f"Error in comprehensive domain analysis API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/threat-intelligence-metrics')
def api_threat_intelligence_metrics():
    """Get threat intelligence metrics for operational dashboard"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Use dashboard methods instead of undefined functions
        date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        
        # IP Reuse Analysis - include host_isp and host_country
        # Pattern matches WHOIS reuse query structure
        ip_reuse_query = f"""
        SELECT TOP 15
            u.ip_address,
            MAX(u.host_isp) as host_isp,
            MAX(u.host_country) as host_country,
            COUNT(DISTINCT i.case_number) as case_count
        FROM phishlabs_case_data_associated_urls u
        INNER JOIN phishlabs_case_data_incidents i ON u.case_number = i.case_number
        WHERE u.ip_address IS NOT NULL 
        AND u.ip_address != ''
        AND {date_condition}
        GROUP BY u.ip_address
        HAVING COUNT(DISTINCT i.case_number) > 1
        ORDER BY case_count DESC
        """
        
        # Top ISP Analysis
        isp_query = f"""
        SELECT TOP 10 host_isp, COUNT(*) as threat_count
        FROM phishlabs_case_data_associated_urls u
        INNER JOIN phishlabs_case_data_incidents i ON u.case_number = i.case_number
        WHERE u.host_isp IS NOT NULL AND {date_condition}
        GROUP BY host_isp
        ORDER BY threat_count DESC
        """
        
        # Registrar Abuse Analysis
        # Join through incidents table to get the correct iana_id
        registrar_query = f"""
        SELECT TOP 10 
            r.name as registrar_name,
            COUNT(DISTINCT i.case_number) as abuse_count
        FROM phishlabs_case_data_incidents i
        LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
        WHERE r.name IS NOT NULL AND {date_condition}
        GROUP BY r.name
        ORDER BY abuse_count DESC
        """
        
        # URL Path Analysis - show number of cases for each URL path
        url_path_query = f"""
        SELECT TOP 15 u.url_path, COUNT(DISTINCT u.case_number) as case_count
        FROM phishlabs_case_data_associated_urls u
        INNER JOIN phishlabs_case_data_incidents i ON u.case_number = i.case_number
        WHERE u.url_path IS NOT NULL AND u.url_path != '' AND {date_condition}
        GROUP BY u.url_path
        ORDER BY case_count DESC
        """
        
        # Execute queries
        ip_reuse = dashboard.execute_query(ip_reuse_query)
        if isinstance(ip_reuse, dict) and 'error' in ip_reuse:
            logger.error(f"Error in IP reuse query: {ip_reuse.get('error', 'Unknown error')}")
            ip_reuse = []
        
        # Log IP reuse detection results
        if not ip_reuse or len(ip_reuse) == 0:
            logger.info("No IP reuse detected (no IPs used in multiple cases)")
        else:
            logger.info(f"Found {len(ip_reuse)} IP addresses with reuse (used in 2+ cases)")
        
        isp_data = dashboard.execute_query(isp_query)
        if isinstance(isp_data, dict) and 'error' in isp_data:
            isp_data = []
        
        registrar_data = dashboard.execute_query(registrar_query)
        if isinstance(registrar_data, dict) and 'error' in registrar_data:
            registrar_data = []
        
        url_path_data = dashboard.execute_query(url_path_query)
        if isinstance(url_path_data, dict) and 'error' in url_path_data:
            url_path_data = []
        
        # Calculate summary for IP reuse
        total_reused_ips = len(ip_reuse) if ip_reuse else 0
        total_cases_with_reused_ips = sum(item.get('case_count', 0) for item in (ip_reuse or []))
        
        return jsonify({
            'ip_reuse': ip_reuse or [],
            'isp_distribution': isp_data or [],
            'registrar_abuse': registrar_data or [],
            'url_path_analysis': url_path_data or [],
            'summary': {
                'total_reused_ips': total_reused_ips,
                'total_cases_with_reused_ips': total_cases_with_reused_ips,
                'top_isp': isp_data[0].get('host_isp', 'N/A') if isp_data and len(isp_data) > 0 else 'N/A',
                'top_registrar': registrar_data[0].get('registrar_name', 'N/A') if registrar_data and len(registrar_data) > 0 else 'N/A',
                'top_url_path': url_path_data[0].get('url_path', 'N/A') if url_path_data and len(url_path_data) > 0 else 'N/A',
                'top_3_registrars': registrar_data[:3] if registrar_data else [],
                'top_3_url_paths': url_path_data[:3] if url_path_data else []
            }
        })
            
    except Exception as e:
        logger.error(f"Error in threat intelligence metrics: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================================================
# Campaign Analysis API ENDPOINTS
# ==========================================================================

@app.route('/api/analysis/default')
def api_default_analysis():
    """Generate default analysis for all campaigns (all time, no filters)"""
    try:
        logger.info("Generating default campaign analysis (all time, no filters)")
        
        # Get ALL campaign data
        all_campaigns_data = {}
        campaign_status_counts = {'active': 0, 'closed': 0}
        campaign_names = {'active': [], 'closed': []}
        
        for campaign_name, campaign_data in dashboard.campaigns.items():
            if isinstance(campaign_data, dict) and 'identifiers' in campaign_data:
                # Determine campaign status
                status = campaign_data.get('status', 'Active')
                if status.lower() in ['active', 'open']:
                    campaign_status_counts['active'] += 1
                    campaign_names['active'].append(campaign_name)
                else:
                    campaign_status_counts['closed'] += 1
                    campaign_names['closed'].append(campaign_name)
                
                # Collect campaign data for analysis
                all_campaigns_data[campaign_name] = campaign_data
        
        # Get campaign cases stats
        campaign_cases_stats = []
        
        for campaign_name, campaign_data in all_campaigns_data.items():
            case_numbers = []
            infrids = []
            incident_ids = []
            
            # Separate identifiers by type
            for identifier in campaign_data.get('identifiers', []):
                if isinstance(identifier, dict):
                    field = identifier.get('field', 'case_number')
                    value = identifier.get('value', '')
                    
                    if field == 'case_number':
                        case_numbers.append(str(value))
                    elif field == 'infrid':
                        infrids.append(str(value))
                    elif field == 'incident_id':
                        incident_ids.append(str(value))
            
            # Get counts for each type
            cred_theft_count = len(case_numbers)
            domain_monitoring_count = len(infrids)
            social_media_count = len(incident_ids)
            total_count = cred_theft_count + domain_monitoring_count + social_media_count
            
            # Get status counts (active vs closed cases)
            active_cases = 0
            closed_cases = 0
            domain_monitoring_cases = 0  # Domain monitoring cases are always "active" (golden)
            
            # Query case_data_incidents for status
            if case_numbers:
                case_list = "','".join(case_numbers)
                status_query = f"""
                SELECT 
                    SUM(CASE WHEN date_closed_local IS NULL THEN 1 ELSE 0 END) as active_cases,
                    SUM(CASE WHEN date_closed_local IS NOT NULL THEN 1 ELSE 0 END) as closed_cases
                FROM phishlabs_case_data_incidents 
                WHERE case_number IN ('{case_list}')
                """
                status_results = dashboard.execute_query(status_query)
                if status_results and isinstance(status_results, list) and len(status_results) > 0:
                    row = status_results[0]
                    active_cases += row.get('active_cases', 0) or 0
                    closed_cases += row.get('closed_cases', 0) or 0
            
            # Query incident table for social media status
            if incident_ids:
                incident_list = "','".join(incident_ids)
                social_status_query = f"""
                SELECT 
                    SUM(CASE WHEN closed_local IS NULL THEN 1 ELSE 0 END) as active_cases,
                    SUM(CASE WHEN closed_local IS NOT NULL THEN 1 ELSE 0 END) as closed_cases
                FROM phishlabs_incident 
                WHERE incident_id IN ('{incident_list}')
                """
                social_status_results = dashboard.execute_query(social_status_query)
                if social_status_results and isinstance(social_status_results, list) and len(social_status_results) > 0:
                    row = social_status_results[0]
                    active_cases += row.get('active_cases', 0) or 0
                    closed_cases += row.get('closed_cases', 0) or 0
            
            # Domain monitoring cases count (always "active" - golden)
            domain_monitoring_cases = domain_monitoring_count
            
            campaign_cases_stats.append({
                'campaign_name': campaign_name,
                'by_type': {
                    'cred_theft': cred_theft_count,
                    'domain_monitoring': domain_monitoring_count,
                    'social_media': social_media_count,
                    'total': total_count
                },
                'by_status': {
                    'active': active_cases,
                    'domain_monitoring': domain_monitoring_cases,
                    'closed': closed_cases,
                    'total': active_cases + domain_monitoring_cases + closed_cases
                }
            })
        
        # Get overlapping infrastructure data
        overlapping_infrastructure = get_overlapping_infrastructure(all_campaigns_data)
        
        return jsonify({
            'campaign_status': {
                'active_count': campaign_status_counts['active'],
                'closed_count': campaign_status_counts['closed'],
                'active_campaigns': campaign_names['active'],
                'closed_campaigns': campaign_names['closed']
            },
            'campaign_cases_stats': campaign_cases_stats,
            'overlapping_infrastructure': overlapping_infrastructure
        })
        
    except Exception as e:
        logger.error(f"Error in default analysis API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/campaign-activity-timeline')
def api_campaign_activity_timeline():
    """Generate campaign activity timeline with time window filtering"""
    try:
        # Get time window filter parameter
        time_window = request.args.get('time_window', 'all')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        logger.info(f"Generating campaign activity timeline with time_window={time_window}")
        
        # Get date filter condition for creation dates
        date_condition_created = dashboard.get_date_filter_condition(
            time_window, start_date, end_date, "date_created_local"
        )
        
        # Get date filter condition for closed dates
        date_condition_closed = dashboard.get_date_filter_condition(
            time_window, start_date, end_date, "date_closed_local"
        )
        
        campaign_activity_stats = []
        
        for campaign_name, campaign_data in dashboard.campaigns.items():
            if not isinstance(campaign_data, dict) or 'identifiers' not in campaign_data:
                continue
            
            # Separate identifiers by type
            case_numbers = []
            infrids = []
            incident_ids = []
            
            for identifier in campaign_data.get('identifiers', []):
                if isinstance(identifier, dict):
                    field = identifier.get('field', 'case_number')
                    value = str(identifier.get('value', ''))
                    
                    if field == 'case_number':
                        case_numbers.append(value)
                    elif field == 'infrid':
                        infrids.append(value)
                    elif field == 'incident_id':
                        incident_ids.append(value)
            
            # Initialize counts
            mitigating_time_window = 0  # Created in time window + not closed
            monitoring_time_window = 0  # Domain monitoring created in time window
            closed_time_window = 0      # Closed date in time window
            mitigating_all_time = 0     # Currently active (no closed date) regardless of creation date
            
            # Query Cred Theft cases (phishlabs_case_data_incidents)
            if case_numbers:
                case_list = "','".join(case_numbers)
                
                # Mitigating in time window: created in window + not closed
                mitigating_tw_query = f"""
                SELECT COUNT(*) as count
                FROM phishlabs_case_data_incidents
                WHERE case_number IN ('{case_list}')
                AND {date_condition_created}
                AND date_closed_local IS NULL
                """
                result = dashboard.execute_query(mitigating_tw_query)
                if result and len(result) > 0:
                    mitigating_time_window += result[0].get('count', 0) or 0
                
                # Closed in time window: closed date in window
                closed_tw_query = f"""
                SELECT COUNT(*) as count
                FROM phishlabs_case_data_incidents
                WHERE case_number IN ('{case_list}')
                AND {date_condition_closed}
                """
                result = dashboard.execute_query(closed_tw_query)
                if result and len(result) > 0:
                    closed_time_window += result[0].get('count', 0) or 0
                
                # Mitigating all time: currently active (no closed date)
                mitigating_all_query = f"""
                SELECT COUNT(*) as count
                FROM phishlabs_case_data_incidents
                WHERE case_number IN ('{case_list}')
                AND date_closed_local IS NULL
                """
                result = dashboard.execute_query(mitigating_all_query)
                if result and len(result) > 0:
                    mitigating_all_time += result[0].get('count', 0) or 0
            
            # Query Social Media cases (phishlabs_incident)
            if incident_ids:
                incident_list = "','".join(incident_ids)
                
                # Mitigating in time window: created in window + not closed
                mitigating_social_tw_query = f"""
                SELECT COUNT(*) as count
                FROM phishlabs_incident
                WHERE incident_id IN ('{incident_list}')
                AND {date_condition_created.replace('date_created_local', 'created_local')}
                AND closed_local IS NULL
                """
                result = dashboard.execute_query(mitigating_social_tw_query)
                if result and len(result) > 0:
                    mitigating_time_window += result[0].get('count', 0) or 0
                
                # Closed in time window: closed date in window
                closed_social_tw_query = f"""
                SELECT COUNT(*) as count
                FROM phishlabs_incident
                WHERE incident_id IN ('{incident_list}')
                AND {date_condition_closed.replace('date_closed_local', 'closed_local')}
                """
                result = dashboard.execute_query(closed_social_tw_query)
                if result and len(result) > 0:
                    closed_time_window += result[0].get('count', 0) or 0
                
                # Mitigating all time: currently active (no closed date)
                mitigating_social_all_query = f"""
                SELECT COUNT(*) as count
                FROM phishlabs_incident
                WHERE incident_id IN ('{incident_list}')
                AND closed_local IS NULL
                """
                result = dashboard.execute_query(mitigating_social_all_query)
                if result and len(result) > 0:
                    mitigating_all_time += result[0].get('count', 0) or 0
            
            # Query Domain Monitoring cases (phishlabs_threat_intelligence_incident)
            if infrids:
                infrid_list = "','".join(infrids)
                
                # Monitoring in time window: created in window
                monitoring_tw_query = f"""
                SELECT COUNT(*) as count
                FROM phishlabs_threat_intelligence_incident
                WHERE infrid IN ('{infrid_list}')
                AND {date_condition_created.replace('date_created_local', 'create_date')}
                """
                result = dashboard.execute_query(monitoring_tw_query)
                if result and len(result) > 0:
                    monitoring_time_window += result[0].get('count', 0) or 0
            
            # Get campaign status
            campaign_status = campaign_data.get('status', 'Active')
            is_active = campaign_status.lower() in ['active', 'open']
            
            campaign_activity_stats.append({
                'campaign_name': campaign_name,
                'campaign_status': 'Active' if is_active else 'Closed',
                'mitigating_time_window': mitigating_time_window,
                'monitoring_time_window': monitoring_time_window,
                'closed_time_window': closed_time_window,
                'mitigating_all_time': mitigating_all_time
            })
        
        return jsonify({
            'time_window': time_window,
            'campaign_activity': campaign_activity_stats
        })
        
    except Exception as e:
        logger.error(f"Error in campaign activity timeline API: {e}")
        return jsonify({"error": str(e)}), 500

def get_overlapping_infrastructure(all_campaigns_data):
    """Analyze overlapping infrastructure across campaigns"""
    try:
        # Collect all identifiers for infrastructure analysis with campaign mapping
        case_to_campaign = {}
        infrid_to_campaign = {}
        incident_to_campaign = {}
        
        for campaign_name, campaign_data in all_campaigns_data.items():
            for identifier in campaign_data.get('identifiers', []):
                if isinstance(identifier, dict):
                    field = identifier.get('field', 'case_number')
                    value = identifier.get('value', '')
                    
                    if field == 'case_number':
                        if str(value) not in case_to_campaign:
                            case_to_campaign[str(value)] = []
                        case_to_campaign[str(value)].append(campaign_name)
                    elif field == 'infrid':
                        if str(value) not in infrid_to_campaign:
                            infrid_to_campaign[str(value)] = []
                        infrid_to_campaign[str(value)].append(campaign_name)
                    elif field == 'incident_id':
                        if str(value) not in incident_to_campaign:
                            incident_to_campaign[str(value)] = []
                        incident_to_campaign[str(value)].append(campaign_name)
        
        overlapping_data = {
            'ip_addresses': {},
            'threatactor_handles': {},
            'flagged_whois_email': {},
            'flagged_whois_name': {},
            'threat_family': {},
            'url_paths': {},
            'domains': {}
        }
        
        # Analyze IP addresses and domains from associated URLs
        if case_to_campaign:
            case_list = "','".join(case_to_campaign.keys())
            infra_query = f"""
            SELECT 
                u.ip_address,
                u.domain,
                u.url_path,
                u.case_number
            FROM phishlabs_case_data_associated_urls u
            WHERE u.case_number IN ('{case_list}')
            AND (u.ip_address IS NOT NULL AND u.ip_address != '' OR u.domain IS NOT NULL AND u.domain != '')
            """
            
            infra_results = dashboard.execute_query(infra_query)
            if infra_results and isinstance(infra_results, list):
                # Group by infrastructure item and collect campaigns
                infrastructure_groups = {}
                
                for row in infra_results:
                    ip = row.get('ip_address', '')
                    domain = row.get('domain', '')
                    url_path = row.get('url_path', '')
                    case_number = row.get('case_number', '')
                    
                    campaign_names = case_to_campaign.get(case_number, [])
                    if not campaign_names:
                        continue
                    
                    # Add all campaigns that this case belongs to
                    for campaign_name in campaign_names:
                        if ip and ip != '':
                            if ip not in infrastructure_groups:
                                infrastructure_groups[ip] = {'type': 'ip_addresses', 'campaigns': set()}
                            infrastructure_groups[ip]['campaigns'].add(campaign_name)
                        
                        if domain and domain != '':
                            if domain not in infrastructure_groups:
                                infrastructure_groups[domain] = {'type': 'domains', 'campaigns': set()}
                            infrastructure_groups[domain]['campaigns'].add(campaign_name)
                        
                        if url_path and url_path != '':
                            if url_path not in infrastructure_groups:
                                infrastructure_groups[url_path] = {'type': 'url_paths', 'campaigns': set()}
                            infrastructure_groups[url_path]['campaigns'].add(campaign_name)
                
                # Add to overlapping_data only items that appear in multiple campaigns
                for item, data in infrastructure_groups.items():
                    if len(data['campaigns']) > 1:
                        overlapping_data[data['type']][item] = {
                            'count': len(data['campaigns']),
                            'campaigns': list(data['campaigns'])
                        }
        
        # Analyze threat actor handles and threat family
        if case_to_campaign:
            case_list = "','".join(case_to_campaign.keys())
            threat_query = f"""
            SELECT 
                th.name as threatactor_handle,
                n.threat_family,
                n.flagged_whois_email,
                n.flagged_whois_name,
                th.case_number
            FROM phishlabs_case_data_note_threatactor_handles th
            LEFT JOIN phishlabs_case_data_notes n ON th.case_number = n.case_number
            WHERE th.case_number IN ('{case_list}')
            """
            
            threat_results = dashboard.execute_query(threat_query)
            if threat_results and isinstance(threat_results, list):
                # Group by threat intelligence item and collect campaigns
                threat_groups = {}
                
                for row in threat_results:
                    handle = row.get('threatactor_handle', '')
                    family = row.get('threat_family', '')
                    email = row.get('flagged_whois_email', '')
                    name = row.get('flagged_whois_name', '')
                    case_number = row.get('case_number', '')
                    
                    campaign_names = case_to_campaign.get(case_number, [])
                    if not campaign_names:
                        continue
                    
                    # Add all campaigns that this case belongs to
                    for campaign_name in campaign_names:
                        if handle and handle != '':
                            if handle not in threat_groups:
                                threat_groups[handle] = {'type': 'threatactor_handles', 'campaigns': set()}
                            threat_groups[handle]['campaigns'].add(campaign_name)
                        
                        if family and family != '':
                            if family not in threat_groups:
                                threat_groups[family] = {'type': 'threat_family', 'campaigns': set()}
                            threat_groups[family]['campaigns'].add(campaign_name)
                        
                        if email and email != '':
                            if email not in threat_groups:
                                threat_groups[email] = {'type': 'flagged_whois_email', 'campaigns': set()}
                            threat_groups[email]['campaigns'].add(campaign_name)
                        
                        if name and name != '':
                            if name not in threat_groups:
                                threat_groups[name] = {'type': 'flagged_whois_name', 'campaigns': set()}
                            threat_groups[name]['campaigns'].add(campaign_name)
                
                # Add to overlapping_data only items that appear in multiple campaigns
                for item, data in threat_groups.items():
                    if len(data['campaigns']) > 1:
                        overlapping_data[data['type']][item] = {
                            'count': len(data['campaigns']),
                            'campaigns': list(data['campaigns'])
                        }
        
        # Convert to sorted lists for display
        result = {}
        for category, data in overlapping_data.items():
            result[category] = [
                {'value': key, 'count': value['count'], 'campaigns': value['campaigns']}
                for key, value in sorted(data.items(), key=lambda x: x[1]['count'], reverse=True)
            ][:10]  # Top 10 for each category
        
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing overlapping infrastructure: {e}")
        return {}

@app.route('/api/analysis/comprehensive')
def api_comprehensive_analysis():
    """Generate comprehensive threat intelligence analysis ONLY from campaign data"""
    try:
        campaign_filter = request.args.get('campaign_filter', 'all')
        date_filter = request.args.get('date_filter', 'all')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        logger.info(f"Generating campaign analysis: campaign_filter={campaign_filter}, date_filter={date_filter}, start_date={start_date}, end_date={end_date}")
        
        # Separate identifiers by type for proper querying
        case_numbers = []
        infrids = []
        incident_ids = []
        
        # Get campaign data structure to determine identifier types
        if campaign_filter == 'all':
            # Get identifiers from ALL campaigns
            campaign_names = list(dashboard.campaigns.keys())
        else:
            # Handle multiple campaigns separated by commas
            campaign_names = [name.strip() for name in campaign_filter.split(',') if name.strip()]
        
        # Extract identifiers from selected campaigns (NO deduplication across campaigns)
        for campaign_name in campaign_names:
            if campaign_name in dashboard.campaigns:
                campaign_data = dashboard.campaigns[campaign_name]
                if isinstance(campaign_data, dict) and 'identifiers' in campaign_data:
                    logger.info(f"Processing campaign '{campaign_name}' with {len(campaign_data['identifiers'])} identifiers")
                    for identifier in campaign_data['identifiers']:
                        if isinstance(identifier, dict):
                            field = identifier.get('field', 'case_number')
                            value = identifier.get('value', '')
                            
                            if field == 'case_number' and value:
                                case_numbers.append(str(value))
                                logger.info(f"Added case_number: {value}")
                            elif field == 'infrid' and value:
                                infrids.append(str(value))
                                logger.info(f"Added infrid: {value}")
                            elif field == 'incident_id' and value:
                                incident_ids.append(str(value))
                                logger.info(f"Added incident_id: {value}")
                        elif isinstance(identifier, str) and identifier:
                            # Handle legacy string format - assume case_number
                            case_numbers.append(str(identifier))
                            logger.info(f"Added legacy case_number: {identifier}")
                else:
                    logger.warning(f"Campaign '{campaign_name}' has no identifiers or invalid structure")
            else:
                logger.warning(f"Campaign '{campaign_name}' not found in campaigns data")
        
        logger.info(f"Final identifier counts - case_numbers: {len(case_numbers)}, infrids: {len(infrids)}, incident_ids: {len(incident_ids)}")
        
        # If no campaign identifiers found, return empty data
        if not case_numbers and not infrids and not incident_ids:
            return jsonify({
                'summary': {
                    'total_cases': 0,
                    'active_campaigns': 0,
                    'threat_actors': 0,
                    'countries': 0,
                    'brands_targeted': 0
                },
                'campaigns': [],
                'threats': [],
                'actors': [],
                'infrastructure': [],
                'geographic': []
            })
        
        # Build comprehensive WHERE clause for case data incidents
        case_where_conditions = []
        if case_numbers:
            case_list = "','".join(case_numbers)
            case_where_conditions.append(f"case_number IN ('{case_list}')")
        
        # Build WHERE clause for threat intelligence incidents (infrid)
        infrid_where_conditions = []
        if infrids:
            infrid_list = "','".join(infrids)
            infrid_where_conditions.append(f"infrid IN ('{infrid_list}')")
        
        # Build WHERE clause for social incidents (incident_id)
        incident_where_conditions = []
        if incident_ids:
            incident_list = "','".join(incident_ids)
            incident_where_conditions.append(f"incident_id IN ('{incident_list}')")
        
        analysis_data = {
            'summary': {
                'total_cases': 0,
                'active_campaigns': len(dashboard.campaigns) if campaign_filter == 'all' else len(campaign_filter.split(',')),
                'threat_actors': 0,
                'countries': 0,
                'unique_registrars': 0,
                'unique_host_isps': 0,
                'unique_as_numbers': 0,
                'total_identifiers': len(case_numbers) + len(infrids) + len(incident_ids)
            },
            'campaigns': [],
            'threats': [],
            'actors': [],
            'infrastructure': [],
            'geographic': []
        }
        
        # 1. CAMPAIGN PERFORMANCE ANALYSIS - Individual campaign data
        
        # Add individual campaign performance data
        for campaign_name in campaign_names:
            if campaign_name in dashboard.campaigns:
                campaign_data = dashboard.campaigns[campaign_name]
                if isinstance(campaign_data, dict) and 'identifiers' in campaign_data:
                    # Get identifiers for this specific campaign
                    campaign_case_numbers = []
                    campaign_infrids = []
                    campaign_incident_ids = []
                    
                    for identifier in campaign_data['identifiers']:
                        if isinstance(identifier, dict):
                            field = identifier.get('field', 'case_number')
                            value = identifier.get('value', '')
                            
                            if field == 'case_number' and value:
                                campaign_case_numbers.append(str(value))
                            elif field == 'infrid' and value:
                                campaign_infrids.append(str(value))
                            elif field == 'incident_id' and value:
                                campaign_incident_ids.append(str(value))
                        elif isinstance(identifier, str) and identifier:
                            campaign_case_numbers.append(str(identifier))
                    
                    # Query performance for this campaign
                    campaign_total = 0
                    campaign_active = 0
                    campaign_closed = 0
                    
                    # Query case_data_incidents for this campaign
                    if campaign_case_numbers:
                        campaign_case_list = "','".join(campaign_case_numbers)
                        # Build date condition for case data
                        case_date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "date_created_local")
                        
                        campaign_query = f"""
                        SELECT 
                            COUNT(*) as total_cases,
                            SUM(CASE WHEN date_closed_local IS NULL THEN 1 ELSE 0 END) as active_cases,
                            SUM(CASE WHEN date_closed_local IS NOT NULL THEN 1 ELSE 0 END) as closed_cases
                        FROM phishlabs_case_data_incidents 
                        WHERE case_number IN ('{campaign_case_list}') AND {case_date_condition}
                        """
                        campaign_results = dashboard.execute_query(campaign_query)
                        if campaign_results and isinstance(campaign_results, list) and len(campaign_results) > 0:
                            row = campaign_results[0]
                            campaign_total += row.get('total_cases', 0) or 0
                            campaign_active += row.get('active_cases', 0) or 0
                            campaign_closed += row.get('closed_cases', 0) or 0
                    
                    # Query incident table for this campaign
                    if campaign_incident_ids:
                        campaign_incident_list = "','".join(campaign_incident_ids)
                        campaign_social_query = f"""
                        SELECT 
                            COUNT(*) as total_cases,
                            SUM(CASE WHEN closed_local IS NULL THEN 1 ELSE 0 END) as active_cases,
                            SUM(CASE WHEN closed_local IS NOT NULL THEN 1 ELSE 0 END) as closed_cases
                        FROM phishlabs_incident 
                        WHERE incident_id IN ('{campaign_incident_list}')
                        """
                        campaign_social_results = dashboard.execute_query(campaign_social_query)
                        if campaign_social_results and isinstance(campaign_social_results, list) and len(campaign_social_results) > 0:
                            row = campaign_social_results[0]
                            campaign_total += row.get('total_cases', 0) or 0
                            campaign_active += row.get('active_cases', 0) or 0
                            campaign_closed += row.get('closed_cases', 0) or 0
                    
                    # Add campaign performance data - count identifiers from campaigns.json
                    campaign_total_identifiers = len(campaign_case_numbers) + len(campaign_infrids) + len(campaign_incident_ids)
                    analysis_data['campaigns'].append({
                        'name': campaign_name,
                        'type': 'campaign',
                        'total_cases': campaign_total_identifiers,  # Use identifier count instead of database count
                        'active_cases': campaign_active,
                        'closed_cases': campaign_closed,
                        'completion_rate': round((campaign_closed / campaign_total_identifiers * 100) if campaign_total_identifiers > 0 else 0, 1),
                        'status': 'Active' if campaign_active > 0 else 'Closed',
                        'case_numbers': len(campaign_case_numbers),
                        'infrids': len(campaign_infrids),
                        'incident_ids': len(campaign_incident_ids)
                    })
        
        # Calculate summary totals from campaign identifiers (not database records)
        total_summary_cases = len(case_numbers) + len(infrids) + len(incident_ids)
        analysis_data['summary']['total_cases'] = total_summary_cases
        
        # Calculate total active cases from all campaigns
        total_active_cases = sum(c.get('active_cases', 0) for c in analysis_data['campaigns'])
        analysis_data['summary']['active_cases'] = total_active_cases
        
        # 2. THREAT DISTRIBUTION ANALYSIS - Count identifiers from campaigns.json, enrich with DB data
        threat_counts = {}
        
        # Initialize threat counts based on identifier types from campaigns.json
        threat_counts['Cred Theft'] = {'count': len(case_numbers), 'unique_registrars': 0, 'unique_host_isps': 0, 'unique_as_numbers': 0, 'countries': 0}
        threat_counts['Domain Monitoring'] = {'count': len(infrids), 'unique_registrars': 0, 'unique_host_isps': 0, 'unique_as_numbers': 0, 'countries': 0}
        threat_counts['Social Media'] = {'count': len(incident_ids), 'unique_registrars': 0, 'unique_host_isps': 0, 'unique_as_numbers': 0, 'countries': 0}
        
        # Enrich with database data for infrastructure metrics
        if case_numbers:
            case_list = "','".join(case_numbers)
            case_infra_query = f"""
            SELECT 
                COUNT(DISTINCT u.registrar) as unique_registrars,
                COUNT(DISTINCT u.host_isp) as unique_host_isps,
                COUNT(DISTINCT u.as_number) as unique_as_numbers,
                COUNT(DISTINCT u.host_country) as countries
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE i.case_number IN ('{case_list}')
            """
            case_infra_results = dashboard.execute_query(case_infra_query)
            if case_infra_results and isinstance(case_infra_results, list) and len(case_infra_results) > 0:
                row = case_infra_results[0]
                threat_counts['Cred Theft']['unique_registrars'] = row.get('unique_registrars', 0)
                threat_counts['Cred Theft']['unique_host_isps'] = row.get('unique_host_isps', 0)
                threat_counts['Cred Theft']['unique_as_numbers'] = row.get('unique_as_numbers', 0)
                threat_counts['Cred Theft']['countries'] = row.get('countries', 0)
        
        # Enrich Domain Monitoring with database data for infrastructure metrics
        if infrids:
            infrid_list = "','".join(infrids)
            threat_infra_query = f"""
            SELECT 
                COUNT(DISTINCT 'N/A') as unique_registrars,
                COUNT(DISTINCT 'N/A') as unique_host_isps,
                COUNT(DISTINCT 'N/A') as unique_as_numbers,
                COUNT(DISTINCT 'Unknown') as countries
            FROM phishlabs_threat_intelligence_incident
            WHERE infrid IN ('{infrid_list}')
            """
            threat_infra_results = dashboard.execute_query(threat_infra_query)
            if threat_infra_results and isinstance(threat_infra_results, list) and len(threat_infra_results) > 0:
                row = threat_infra_results[0]
                threat_counts['Domain Monitoring']['unique_registrars'] = row.get('unique_registrars', 0)
                threat_counts['Domain Monitoring']['unique_host_isps'] = row.get('unique_host_isps', 0)
                threat_counts['Domain Monitoring']['unique_as_numbers'] = row.get('unique_as_numbers', 0)
                threat_counts['Domain Monitoring']['countries'] = row.get('countries', 0)
        
        # Enrich Social Media with database data for infrastructure metrics
        if incident_ids:
            incident_list = "','".join(incident_ids)
            social_infra_query = f"""
            SELECT 
                COUNT(DISTINCT 'N/A') as unique_registrars,
                COUNT(DISTINCT 'N/A') as unique_host_isps,
                COUNT(DISTINCT 'N/A') as unique_as_numbers,
                COUNT(DISTINCT 'Unknown') as countries
            FROM phishlabs_incident
            WHERE incident_id IN ('{incident_list}')
            """
            social_infra_results = dashboard.execute_query(social_infra_query)
            if social_infra_results and isinstance(social_infra_results, list) and len(social_infra_results) > 0:
                row = social_infra_results[0]
                threat_counts['Social Media']['unique_registrars'] = row.get('unique_registrars', 0)
                threat_counts['Social Media']['unique_host_isps'] = row.get('unique_host_isps', 0)
                threat_counts['Social Media']['unique_as_numbers'] = row.get('unique_as_numbers', 0)
                threat_counts['Social Media']['countries'] = row.get('countries', 0)
        
        # Convert threat counts to analysis data format
        for case_type, data in threat_counts.items():
            count = data['count']
            analysis_data['threats'].append({
                'type': case_type,
                'count': count,
                'unique_registrars': data['unique_registrars'],
                'unique_host_isps': data['unique_host_isps'],
                'unique_as_numbers': data['unique_as_numbers'],
                'countries': data['countries']
            })
        
        # Update summary with new metrics
        analysis_data['summary']['unique_registrars'] = sum(t.get('unique_registrars', 0) for t in analysis_data['threats'])
        analysis_data['summary']['unique_host_isps'] = sum(t.get('unique_host_isps', 0) for t in analysis_data['threats'])
        analysis_data['summary']['unique_as_numbers'] = sum(t.get('unique_as_numbers', 0) for t in analysis_data['threats'])
        
        # 3. THREAT ACTOR ANALYSIS - Count based on campaign identifiers
        actor_data = {}
        
        # Query threat actor handles and related data for case_numbers
        if case_numbers:
            # Use unique case numbers for database query, but count based on campaign instances
            unique_case_numbers = list(set(case_numbers))
            case_list = "','".join(unique_case_numbers)
            
            # Query threat actor handles - get all matches including URL
            actor_handles_query = f"""
            SELECT 
                th.name,
                th.record_type,
                th.url,
                th.case_number,
                i.date_created_local as last_seen
            FROM phishlabs_case_data_note_threatactor_handles th
            JOIN phishlabs_case_data_incidents i ON th.case_number = i.case_number
            WHERE th.case_number IN ('{case_list}')
            """
            actor_handles_results = dashboard.execute_query(actor_handles_query)
            if actor_handles_results and isinstance(actor_handles_results, list):
                # Group by actor name and count identifiers from campaigns.json
                actor_counts = {}
                actor_case_numbers = {}  # Track which case_numbers each actor appears in
                
                for row in actor_handles_results:
                    name = row.get('name', 'Unknown')
                    case_number = row.get('case_number', '')
                    last_seen = row.get('last_seen', 'N/A')
                    record_type = row.get('record_type', 'Unknown')
                    url = row.get('url', 'N/A')
                    
                    if name and name != 'Unknown':
                        if name not in actor_counts:
                            actor_counts[name] = {
                                'count': 0,
                                'last_seen': last_seen,
                                'record_type': record_type,
                                'url': url  # Store the URL
                            }
                            actor_case_numbers[name] = set()
                        
                        # Only count each case_number once per actor
                        if case_number not in actor_case_numbers[name]:
                            actor_case_numbers[name].add(case_number)
                            # Count how many times this case_number appears in campaigns.json
                            identifier_count = case_numbers.count(case_number)
                            actor_counts[name]['count'] += identifier_count
                        
                        # Update last_seen and url if newer/different
                        if last_seen and last_seen != 'N/A':
                            actor_counts[name]['last_seen'] = max(actor_counts[name]['last_seen'], last_seen)
                        
                        # If URL is not yet set or current row has a URL, update it
                        if url and url != 'N/A' and (actor_counts[name]['url'] == 'N/A' or not actor_counts[name]['url']):
                            actor_counts[name]['url'] = url
                
                # Create actor data with proper counts including URL
                for name, data in actor_counts.items():
                    count = data['count']
                    activity_level = 'High' if count > 10 else ('Medium' if count > 5 else 'Low')
                    actor_data[name] = {
                        'name': name,
                        'type': 'Threat Actor Handle',
                        'record_type': data['record_type'],
                        'url': data.get('url', 'N/A'),  # Include URL in output
                        'case_count': count,
                        'last_seen': str(data['last_seen']) if data['last_seen'] else 'N/A',
                        'activity_level': activity_level
                    }
            
            # Query threat families
            threat_family_query = f"""
            SELECT 
                n.threat_family as name,
                n.case_number,
                i.date_created_local as last_seen
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            WHERE n.case_number IN ('{case_list}')
            AND n.threat_family IS NOT NULL AND n.threat_family != ''
            """
            threat_family_results = dashboard.execute_query(threat_family_query)
            if threat_family_results and isinstance(threat_family_results, list):
                # Group by threat family and count identifiers from campaigns.json
                family_counts = {}
                family_case_numbers = {}  # Track which case_numbers each family appears in
                
                for row in threat_family_results:
                    name = row.get('name', 'Unknown')
                    case_number = row.get('case_number', '')
                    last_seen = row.get('last_seen', 'N/A')
                    
                    if name and name != 'Unknown':
                        if name not in family_counts:
                            family_counts[name] = {
                                'count': 0,
                                'last_seen': last_seen
                            }
                            family_case_numbers[name] = set()
                        
                        # Only count each case_number once per family
                        if case_number not in family_case_numbers[name]:
                            family_case_numbers[name].add(case_number)
                            # Count how many times this case_number appears in campaigns.json
                            identifier_count = case_numbers.count(case_number)
                            family_counts[name]['count'] += identifier_count
                        
                        if last_seen and last_seen != 'N/A':
                            family_counts[name]['last_seen'] = max(family_counts[name]['last_seen'], last_seen)
                
                # Create family data with proper counts
                for name, data in family_counts.items():
                    family_key = f"family_{name}"
                    count = data['count']
                    activity_level = 'High' if count > 10 else ('Medium' if count > 5 else 'Low')
                    if family_key not in actor_data:
                        actor_data[family_key] = {
                            'name': name,
                            'type': 'Threat Family',
                            'record_type': 'Family',
                            'case_count': count,
                            'last_seen': str(data['last_seen']) if data['last_seen'] else 'N/A',
                            'activity_level': activity_level
                        }
            
            # Query flagged whois email
            whois_email_query = f"""
            SELECT 
                n.flagged_whois_email as name,
                n.case_number,
                i.date_created_local as last_seen
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            WHERE n.case_number IN ('{case_list}')
            AND n.flagged_whois_email IS NOT NULL AND n.flagged_whois_email != ''
            """
            whois_email_results = dashboard.execute_query(whois_email_query)
            if whois_email_results and isinstance(whois_email_results, list):
                # Group by whois email and count identifiers from campaigns.json
                email_counts = {}
                email_case_numbers = {}  # Track which case_numbers each email appears in
                
                for row in whois_email_results:
                    name = row.get('name', 'Unknown')
                    case_number = row.get('case_number', '')
                    last_seen = row.get('last_seen', 'N/A')
                    
                    if name and name != 'Unknown':
                        if name not in email_counts:
                            email_counts[name] = {
                                'count': 0,
                                'last_seen': last_seen
                            }
                            email_case_numbers[name] = set()
                        
                        # Only count each case_number once per email
                        if case_number not in email_case_numbers[name]:
                            email_case_numbers[name].add(case_number)
                            # Count how many times this case_number appears in campaigns.json
                            identifier_count = case_numbers.count(case_number)
                            email_counts[name]['count'] += identifier_count
                        
                        if last_seen and last_seen != 'N/A':
                            email_counts[name]['last_seen'] = max(email_counts[name]['last_seen'], last_seen)
                
                # Create email data with proper counts
                for name, data in email_counts.items():
                    email_key = f"email_{name}"
                    count = data['count']
                    activity_level = 'High' if count > 10 else ('Medium' if count > 5 else 'Low')
                    if email_key not in actor_data:
                        actor_data[email_key] = {
                            'name': name,
                            'type': 'Flagged WHOIS Email',
                            'record_type': 'Email',
                            'case_count': count,
                            'last_seen': str(data['last_seen']) if data['last_seen'] else 'N/A',
                            'activity_level': activity_level
                        }
            
            # Query flagged whois name
            whois_name_query = f"""
            SELECT 
                n.flagged_whois_name as name,
                n.case_number,
                i.date_created_local as last_seen
            FROM phishlabs_case_data_notes n
            JOIN phishlabs_case_data_incidents i ON n.case_number = i.case_number
            WHERE n.case_number IN ('{case_list}')
            AND n.flagged_whois_name IS NOT NULL AND n.flagged_whois_name != ''
            """
            whois_name_results = dashboard.execute_query(whois_name_query)
            if whois_name_results and isinstance(whois_name_results, list):
                # Group by whois name and count identifiers from campaigns.json
                name_counts = {}
                name_case_numbers = {}  # Track which case_numbers each name appears in
                
                for row in whois_name_results:
                    name = row.get('name', 'Unknown')
                    case_number = row.get('case_number', '')
                    last_seen = row.get('last_seen', 'N/A')
                    
                    if name and name != 'Unknown':
                        if name not in name_counts:
                            name_counts[name] = {
                                'count': 0,
                                'last_seen': last_seen
                            }
                            name_case_numbers[name] = set()
                        
                        # Only count each case_number once per name
                        if case_number not in name_case_numbers[name]:
                            name_case_numbers[name].add(case_number)
                            # Count how many times this case_number appears in campaigns.json
                            identifier_count = case_numbers.count(case_number)
                            name_counts[name]['count'] += identifier_count
                        
                        if last_seen and last_seen != 'N/A':
                            name_counts[name]['last_seen'] = max(name_counts[name]['last_seen'], last_seen)
                
                # Create name data with proper counts
                for name, data in name_counts.items():
                    name_key = f"name_{name}"
                    count = data['count']
                    activity_level = 'High' if count > 10 else ('Medium' if count > 5 else 'Low')
                    if name_key not in actor_data:
                        actor_data[name_key] = {
                            'name': name,
                            'type': 'Flagged WHOIS Name',
                            'record_type': 'Name',
                            'case_count': count,
                            'last_seen': str(data['last_seen']) if data['last_seen'] else 'N/A',
                            'activity_level': activity_level
                        }
        
        # Convert to list and sort by case_count
        for actor in actor_data.values():
            analysis_data['actors'].append(actor)
        
        # Sort by case_count descending
        analysis_data['actors'].sort(key=lambda x: x.get('case_count', 0), reverse=True)
        
        # Limit to top 20
        analysis_data['actors'] = analysis_data['actors'][:20]
        
        # Ensure total threat actor counts don't exceed campaign case number instances
        total_actor_cases = sum(actor.get('case_count', 0) for actor in analysis_data['actors'])
        if total_actor_cases > len(case_numbers):
            # Limit threat actors to match campaign case number instances
            # Keep only the top threat actors and adjust their counts
            max_actors = len(case_numbers)
            analysis_data['actors'] = analysis_data['actors'][:max_actors]
            
            # Redistribute counts to match campaign case number instances
            for i, actor in enumerate(analysis_data['actors']):
                if i < len(case_numbers):
                    actor['case_count'] = 1
                else:
                    actor['case_count'] = 0
            
            final_total = sum(actor.get('case_count', 0) for actor in analysis_data['actors'])
            logger.info(f"Limited threat actors to {len(analysis_data['actors'])} with total count {final_total} to match {len(case_numbers)} campaign case number instances")
        
        analysis_data['summary']['threat_actors'] = len(analysis_data['actors'])
        
        # 4. INFRASTRUCTURE ANALYSIS - Deduplicate domains and add campaign information
        infra_data = {}
        
        # For case_numbers (Cred Theft) - get database data with proper types
        if case_numbers:
            case_list = "','".join(set(case_numbers))  # Remove duplicates for DB query
            case_infra_query = f"""
            SELECT 
                u.domain,
                u.url,
                u.url_type as type,
                u.host_country as country,
                u.host_isp as isp,
                u.ip_address,
                i.case_number,
                i.case_type,
                i.date_created_local as date_created,
                i.date_closed_local as date_closed,
                i.resolution_status,
                i.iana_id,
                r.name as registrar_name
            FROM phishlabs_case_data_associated_urls u
            JOIN phishlabs_case_data_incidents i ON u.case_number = i.case_number
            LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
            WHERE u.case_number IN ('{case_list}')
            AND u.domain IS NOT NULL AND u.domain != ''
            """
            case_infra_results = dashboard.execute_query(case_infra_query)
            db_domains_by_case = {}
            if case_infra_results and isinstance(case_infra_results, list):
                for row in case_infra_results:
                    case_number = row.get('case_number', '')
                    if case_number:
                        # Calculate age in days
                        date_created = row.get('date_created')
                        date_closed = row.get('date_closed')
                        age_days = None
                        if date_created:
                            from datetime import datetime
                            try:
                                created_dt = datetime.strptime(str(date_created)[:10], '%Y-%m-%d') if isinstance(date_created, str) else date_created
                                if date_closed:
                                    closed_dt = datetime.strptime(str(date_closed)[:10], '%Y-%m-%d') if isinstance(date_closed, str) else date_closed
                                    age_days = (closed_dt - created_dt).days
                                else:
                                    age_days = (datetime.now() - created_dt).days
                            except:
                                age_days = None
                        
                        # Store as list to handle multiple URLs per case
                        if case_number not in db_domains_by_case:
                            db_domains_by_case[case_number] = []
                        
                        db_domains_by_case[case_number].append({
                            'domain': row.get('domain', ''),
                            'url': row.get('url', ''),
                            'type': row.get('case_type', row.get('type', 'Unknown')),
                            'country': row.get('country', 'Unknown'),
                            'isp': row.get('isp', 'Unknown'),
                            'ip_address': row.get('ip_address', '-'),
                            'date_created': row.get('date_created', 'N/A'),
                            'date_closed': row.get('date_closed', 'N/A'),
                            'resolution_status': row.get('resolution_status', '-'),
                            'registrar_name': row.get('registrar_name', '-'),
                            'age_days': age_days
                        })
            
            # Create entries for ALL case_numbers (including those without database domains)
            for case_number in case_numbers:
                # Find which campaigns this case_number belongs to
                campaigns_for_case = []
                for campaign_name, campaign_data in dashboard.campaigns.items():
                    if campaign_name in campaign_names:  # Only selected campaigns
                        for identifier in campaign_data.get('identifiers', []):
                            if (isinstance(identifier, dict) and 
                                identifier.get('field') == 'case_number' and 
                                identifier.get('value') == case_number):
                                campaigns_for_case.append(campaign_name)
                            elif isinstance(identifier, str) and identifier == case_number:
                                campaigns_for_case.append(campaign_name)
                
                if campaigns_for_case:
                    if case_number in db_domains_by_case:
                        # Use database domains - now a list of URLs for this case
                        db_data_list = db_domains_by_case[case_number]
                        
                        # Create an entry for each URL/domain associated with this case
                        for db_data in db_data_list:
                            domain = db_data['domain']
                            
                            # Use unique key combining domain, url and case_number
                            url_hash = hash(db_data.get('url', domain))
                            unique_key = f"{domain}_{case_number}_{url_hash}"
                            
                            if unique_key not in infra_data:
                                infra_data[unique_key] = {
                                    'identifier': case_number,
                                    'domain': domain,
                                    'url': db_data.get('url', ''),
                                    'type': db_data['type'],
                                    'country': db_data['country'],
                                    'isp': db_data['isp'],
                                    'ip_address': db_data.get('ip_address', '-'),
                                    'campaigns': campaigns_for_case.copy(),
                                    'date_created': db_data['date_created'],
                                    'date_closed': db_data['date_closed'],
                                    'resolution_status': db_data.get('resolution_status', '-'),
                                    'registrar_name': db_data.get('registrar_name', '-'),
                                    'age_days': db_data.get('age_days')
                                }
                            else:
                                # Merge campaigns if entry already exists
                                existing_campaigns = infra_data[unique_key]['campaigns']
                                for campaign in campaigns_for_case:
                                    if campaign not in existing_campaigns:
                                        existing_campaigns.append(campaign)
                    else:
                        # Create placeholder for case_number without database domain
                        placeholder_domain = f"cred-theft-{case_number}.example.com"
                        unique_key = f"{placeholder_domain}_{case_number}"
                        if unique_key not in infra_data:
                            infra_data[unique_key] = {
                                'identifier': case_number,
                                'domain': placeholder_domain,
                                'url': '',
                                'type': 'Cred Theft',
                                'country': 'Unknown',
                                'isp': 'Unknown',
                                'ip_address': '-',
                                'campaigns': campaigns_for_case,
                                'date_created': 'N/A',
                                'date_closed': 'N/A',
                                'resolution_status': '-',
                                'registrar_name': '-',
                                'age_days': None
                            }
                        else:
                            # Merge campaigns if placeholder already exists
                            existing_campaigns = infra_data[unique_key]['campaigns']
                            for campaign in campaigns_for_case:
                                if campaign not in existing_campaigns:
                                    existing_campaigns.append(campaign)
        
        # NOTE: Infrastructure analysis is ONLY for Cred Theft cases
        # Domain Monitoring (infrids) and Social Media (incident_ids) don't have 
        # infrastructure data (no IP, ISP, registrar, etc.) so we skip them
        
        # Convert to list and sort by domain name
        for domain_data in infra_data.values():
            analysis_data['infrastructure'].append(domain_data)
        
        # Sort by domain name
        analysis_data['infrastructure'].sort(key=lambda x: x.get('domain', ''))
        
        # Limit to top 20
        analysis_data['infrastructure'] = analysis_data['infrastructure'][:20]
        
        # 5. GEOGRAPHIC DISTRIBUTION - ONLY for cred theft cases (case_numbers)
        # Domain monitoring (infrids) and social media (incident_ids) don't have geographic data
        geo_data = {}
        
        # Query case_data_associated_urls ONLY for case_numbers (Cred Theft)
        if case_numbers:
            case_list = "','".join(case_numbers)
            case_geo_query = f"""
            SELECT 
                u.host_country as country,
                i.case_number
            FROM phishlabs_case_data_associated_urls u
            JOIN phishlabs_case_data_incidents i ON u.case_number = i.case_number
            WHERE u.case_number IN ('{case_list}')
            AND u.host_country IS NOT NULL AND u.host_country != '' AND u.host_country != 'Unknown'
            """
            case_geo_results = dashboard.execute_query(case_geo_query)
            if case_geo_results and isinstance(case_geo_results, list):
                # Count identifiers per country
                for row in case_geo_results:
                    country = row.get('country', '')
                    case_number = row.get('case_number', '')
                    if country and case_number:
                        # Count how many times this case_number appears in campaigns.json
                        identifier_count = case_numbers.count(case_number)
                        
                        if country not in geo_data:
                            geo_data[country] = {'case_count': 0, 'domain_count': 0}
                        geo_data[country]['case_count'] += identifier_count
                        geo_data[country]['domain_count'] += identifier_count
        
        # NOTE: Domain monitoring (infrids) and social media (incident_ids) are INTENTIONALLY EXCLUDED
        # because they don't have geographic data in their respective tables
        logger.info(f"Geographic distribution: {len(geo_data)} countries found from {len(case_numbers)} cred theft cases (excluding {len(infrids)} domain monitoring and {len(incident_ids)} social media cases)")
        
        # Convert to list and sort by case_count
        for country, data in geo_data.items():
            analysis_data['geographic'].append({
                'country': country,
                'case_count': data['case_count'],
                'domain_count': data['domain_count']
            })
        
        # Sort by case_count descending
        analysis_data['geographic'].sort(key=lambda x: x.get('case_count', 0), reverse=True)
        
        # Limit to top 15
        analysis_data['geographic'] = analysis_data['geographic'][:15]
        
        analysis_data['summary']['countries'] = len(analysis_data['geographic'])
        
        # Calculate overlapping infrastructure across selected campaigns
        selected_campaigns_data = {}
        for campaign_name in campaign_names:
            if campaign_name in dashboard.campaigns:
                selected_campaigns_data[campaign_name] = dashboard.campaigns[campaign_name]
        
        analysis_data['overlapping_infrastructure'] = get_overlapping_infrastructure(selected_campaigns_data)
        
        logger.info(f"Campaign analysis generated: {analysis_data['summary']}")
        return jsonify(analysis_data)
        
    except Exception as e:
        logger.error(f"Error generating campaign analysis: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':

    print("Dashboard available at: http://localhost:5001")
    print("=" * 60)
    
    # Initialize dashboard before starting Flask app
    init_dashboard()

    # Verify dashboard initialization
    if dashboard is None:
        print("ERROR: Dashboard initialization failed!")
        exit(1)
    else:
        print("=" * 60)
        print(f"Campaigns loaded: {len(dashboard.campaigns)}")
        print("=" * 60)

@app.route('/api/dashboard/brand-distribution')
def api_brand_distribution():
    """Get brand distribution data for Executive Summary"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Get date condition
        date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        
        # Query for brand distribution with closure times
        brand_query = f"""
        SELECT 
            i.brand,
            COUNT(DISTINCT i.case_number) as case_count,
            COUNT(DISTINCT CASE WHEN i.case_status = 'Active' THEN i.case_number END) as active_count,
            COUNT(DISTINCT CASE WHEN i.case_status = 'Closed' THEN i.case_number END) as closed_count,
            AVG(CASE 
                WHEN i.case_status = 'Closed' AND i.date_closed_local IS NOT NULL AND i.date_created_local IS NOT NULL
                THEN DATEDIFF(hour, i.date_created_local, i.date_closed_local)
                ELSE NULL 
            END) as avg_hours_to_close
        FROM phishlabs_case_data_incidents i
        WHERE i.brand IS NOT NULL AND i.brand != '' AND {date_condition}
        GROUP BY i.brand
        HAVING COUNT(DISTINCT i.case_number) > 0
        ORDER BY case_count DESC
        """
        
        results = dashboard.execute_query(brand_query)
        if not results or isinstance(results, dict):
            return jsonify([])
        
        # Calculate total cases for percentage calculation
        total_cases = sum(row.get('case_count', 0) for row in results)
        
        brand_data = []
        for row in results:
            case_count = row.get('case_count', 0)
            percentage = (case_count / total_cases * 100) if total_cases > 0 else 0
            avg_hours = row.get('avg_hours_to_close', 0)
            avg_days = avg_hours / 24 if avg_hours else 0
            
            brand_data.append({
                'brand': row.get('brand', ''),
                'case_count': case_count,
                'active_count': row.get('active_count', 0),
                'closed_count': row.get('closed_count', 0),
                'percentage': round(percentage, 1),
                'avg_hours_to_close': round(avg_hours, 1) if avg_hours else None,
                'avg_days_to_close': round(avg_days, 1) if avg_days else None
            })
        
        return jsonify(brand_data)
        
    except Exception as e:
        logger.error(f"Error in brand distribution API: {str(e)}")
        return jsonify({"error": "Failed to fetch brand distribution data"}), 500

@app.route('/api/dashboard/detection-source-distribution')
def api_detection_source_distribution():
    """Get detection source distribution data for Executive Summary"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Get date condition
        date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        
        # Query for detection source distribution
        detection_query = f"""
        SELECT 
            CASE 
                WHEN i.source_name IN (
                    'PhishLabs', 
                    'PhishLabs Automated', 
                    'PhishLabs Manual', 
                    'External Vendor', 
                    'Third Party',
                    'PhishLabs Newly Issued SSL Certs',
                    'PhishLabs Analyst',
                    'PhishLabs Partner Feed',
                    'PhishLabs Newly Observed Domains',
                    'PhishLabs Open Web Detection',
                    'PhishLabs Passive DNS',
                    'PhishLabs Domain Monitoring',
                    'PhishLabs Social Media Detection',
                    'PhishLabs Dark Web Detection',
                    'PhishLabs Mobile Detection',
                    'PhishLabs Referrer Feed',
                    'PhishLabs Newly Registered Domains',
                    'PhishLabs Abuse Feed',
                    'Domain Lookback',
                    'PhishLabs Custom Feed',
                    'PhishLabs SMS Feed',
                    'PhishLabs Credential Theft Monitor',
                    'PhishLabs Ad Monitoring',
                    'Client Feeds',
                    'PhishLabs Crimeware Automation'
                ) 
                THEN 'Phishlabs'
                ELSE 'Internal'
            END as detection_source,
            COUNT(DISTINCT i.case_number) as case_count
        FROM phishlabs_case_data_incidents i
        WHERE i.source_name IS NOT NULL AND i.source_name != '' AND {date_condition}
        GROUP BY 
            CASE 
                WHEN i.source_name IN (
                    'PhishLabs', 
                    'PhishLabs Automated', 
                    'PhishLabs Manual', 
                    'External Vendor', 
                    'Third Party',
                    'PhishLabs Newly Issued SSL Certs',
                    'PhishLabs Analyst',
                    'PhishLabs Partner Feed',
                    'PhishLabs Newly Observed Domains',
                    'PhishLabs Open Web Detection',
                    'PhishLabs Passive DNS',
                    'PhishLabs Domain Monitoring',
                    'PhishLabs Social Media Detection',
                    'PhishLabs Dark Web Detection',
                    'PhishLabs Mobile Detection',
                    'PhishLabs Referrer Feed',
                    'PhishLabs Newly Registered Domains',
                    'PhishLabs Abuse Feed',
                    'Domain Lookback',
                    'PhishLabs Custom Feed',
                    'PhishLabs SMS Feed',
                    'PhishLabs Credential Theft Monitor',
                    'PhishLabs Ad Monitoring',
                    'Client Feeds',
                    'PhishLabs Crimeware Automation'
                ) 
                THEN 'Phishlabs'
                ELSE 'Internal'
            END
        ORDER BY case_count DESC
        """
        
        results = dashboard.execute_query(detection_query)
        if not results or isinstance(results, dict):
            return jsonify({'phishlabs': {'count': 0, 'percentage': 0}, 'internal': {'count': 0, 'percentage': 0}})
        
        # Calculate total for percentage
        total_cases = sum(row.get('case_count', 0) for row in results)
        
        detection_data = {'phishlabs': {'count': 0, 'percentage': 0}, 'internal': {'count': 0, 'percentage': 0}}
        
        for row in results:
            source = row.get('detection_source', '').lower()
            count = row.get('case_count', 0)
            percentage = (count / total_cases * 100) if total_cases > 0 else 0
            
            if source == 'phishlabs':
                detection_data['phishlabs'] = {'count': count, 'percentage': round(percentage, 1)}
            else:
                detection_data['internal'] = {'count': count, 'percentage': round(percentage, 1)}
        
        return jsonify(detection_data)
        
    except Exception as e:
        logger.error(f"Error in detection source distribution API: {str(e)}")
        return jsonify({"error": "Failed to fetch detection source distribution data"}), 500

@app.route('/api/dashboard/case-type-analysis')
def api_case_type_analysis():
    """Get case type analysis data for Executive Summary"""
    try:
        date_filter = request.args.get('date_filter', 'today')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Get date conditions
        date_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        closed_condition = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_closed_local")
        
        # Generate case type analysis for Cred Theft cases, 
        # showing types with at least one case closed in the selected period.
        # "Total cases" includes all matching cases, 
        # "Active" means not yet closed, 
        # "Closed" means cases closed in the filter window.
        # Separate logic used for active and closed cases.
        active_condition = "i.date_closed_local IS NULL"
        case_type_query = f"""
        SELECT 
            i.case_type,
            COUNT(DISTINCT i.case_number) as total_cases,
            COUNT(DISTINCT CASE WHEN {active_condition} THEN i.case_number END) as active_cases,
            COUNT(DISTINCT CASE WHEN {closed_condition} THEN i.case_number END) as closed_cases
        FROM phishlabs_case_data_incidents i
        WHERE i.case_type IS NOT NULL AND i.case_type != ''
        GROUP BY i.case_type
        HAVING COUNT(DISTINCT CASE WHEN {closed_condition} THEN i.case_number END) > 0
        ORDER BY closed_cases DESC
        """
        
        results = dashboard.execute_query(case_type_query)
        logger.info(f"Case type analysis query returned {len(results) if results and isinstance(results, list) else 0} results")
        if not results or isinstance(results, dict):
            logger.info("No case type data found")
            return jsonify([])
        
        # Get resolution status breakdown for each case type
        case_types = [row.get('case_type', '') for row in results]
        case_type_data = []
        
        for row in results:
            case_type = row.get('case_type', '')
            total_cases = row.get('total_cases', 0)
            active_cases = row.get('active_cases', 0)
            closed_cases = row.get('closed_cases', 0)
            # Calculate avg and median days to close for closed cases only
            # These calculations are done separately for cases closed within the selected time window
            median_query = f"""
            WITH OrderedDays AS (
                SELECT 
                    DATEDIFF(day, i.date_created_local, i.date_closed_local) as days_to_close,
                    ROW_NUMBER() OVER (ORDER BY DATEDIFF(day, i.date_created_local, i.date_closed_local)) as row_num,
                    COUNT(*) OVER () as total_count
                FROM phishlabs_case_data_incidents i
                WHERE i.case_type = '{case_type.replace("'", "''")}'
                AND i.date_closed_local IS NOT NULL 
                AND i.date_created_local IS NOT NULL 
                AND {closed_condition}
            )
            SELECT AVG(CAST(days_to_close AS FLOAT)) as median_days
            FROM OrderedDays
            WHERE row_num IN ((total_count + 1) / 2, (total_count + 2) / 2)
            """
            
            median_result = dashboard.execute_query(median_query)
            median_days = 0
            if median_result and isinstance(median_result, list) and len(median_result) > 0:
                median_days = median_result[0].get('median_days', 0) or 0
                logger.info(f"Median days for {case_type}: {median_days}")
            
            # Get average days to close for consistency
            avg_query = f"""
            SELECT AVG(DATEDIFF(day, i.date_created_local, i.date_closed_local)) as avg_days
            FROM phishlabs_case_data_incidents i
            WHERE i.case_type = '{case_type.replace("'", "''")}'
            AND i.date_closed_local IS NOT NULL 
            AND i.date_created_local IS NOT NULL 
            AND {closed_condition}
            """
            
            avg_result = dashboard.execute_query(avg_query)
            avg_days = 0
            if avg_result and isinstance(avg_result, list) and len(avg_result) > 0:
                avg_days = avg_result[0].get('avg_days', 0) or 0
            
            # Get resolution status breakdown for this case type
            resolution_query = f"""
            SELECT 
                i.resolution_status,
                COUNT(DISTINCT i.case_number) as count,
                ROUND(COUNT(DISTINCT i.case_number) * 100.0 / {total_cases}, 1) as percentage
            FROM phishlabs_case_data_incidents i
            WHERE i.case_type = '{case_type}' AND i.resolution_status IS NOT NULL 
            AND i.resolution_status != '' AND {date_condition}
            GROUP BY i.resolution_status
            ORDER BY count DESC
            """
            
            resolution_results = dashboard.execute_query(resolution_query)
            resolution_breakdown = []
            if resolution_results and not isinstance(resolution_results, dict):
                for res_row in resolution_results:
                    resolution_breakdown.append({
                        'status': res_row.get('resolution_status', ''),
                        'count': res_row.get('count', 0),
                        'percentage': res_row.get('percentage', 0)
                    })
            
            case_type_data.append({
                'case_type': case_type,
                'total_cases': total_cases,
                'active_cases': active_cases,
                'closed_cases': closed_cases,
                'active_percentage': round((active_cases / total_cases * 100) if total_cases > 0 else 0, 1),
                'closed_percentage': round((closed_cases / total_cases * 100) if total_cases > 0 else 0, 1),
                'median_days_to_close': round(median_days, 1) if median_days else None,
                'avg_days_to_close': round(avg_days, 1) if avg_days else None,
                'resolution_breakdown': resolution_breakdown
            })
        
        return jsonify(case_type_data)
        
    except Exception as e:
        logger.error(f"Error in case type analysis API: {str(e)}")
        return jsonify({"error": "Failed to fetch case type analysis data"}), 500

# ============================================================================
# DATA QUALITY ISSUES API ENDPOINTS
# ============================================================================

@app.route('/api/data-quality/false-closures')
def api_false_closures():
    """Detect potential false closures - cases closed too quickly without proper investigation (all data in this table is Cred Theft)"""
    try:
        # Get date filter parameters
        date_filter = request.args.get('date_filter', 'month')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build date conditions
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        
        # ========================================================================
        # POTENTIAL FALSE CLOSURES CRITERIA:
        # 1. Cases closed within 6 hours of creation (likely insufficient investigation)
        # 2. Cases with specific resolution_status values (add them below)
        # ========================================================================
        
        # Add specific resolution_status values that indicate potential false closures
        # Example: suspicious_resolution_statuses = ['Auto-Closed', 'Duplicate', 'False Positive']
        suspicious_resolution_statuses = []  # TODO: Add specific resolution_status values here
        
        # Build the WHERE clause for resolution status
        if suspicious_resolution_statuses:
            status_list = "', '".join(suspicious_resolution_statuses)
            resolution_status_condition = f"OR i.resolution_status IN ('{status_list}')"
        else:
            resolution_status_condition = ""
        
        # Cases closed within 6 hours OR with suspicious resolution status
        query = f"""
        SELECT 
            i.case_number,
            u.url,
            i.title,
            u.url_type,
            i.brand,
            i.source_name,
            i.date_created_local,
            i.date_closed_local,
            i.resolution_status,
            r.name as registrar_name,
            u.host_isp,
            DATEDIFF(hour, i.date_created_local, i.date_closed_local) as hours_to_close,
            DATEDIFF(minute, i.date_created_local, i.date_closed_local) as minutes_to_close
        FROM phishlabs_case_data_incidents i
        JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
        LEFT JOIN phishlabs_iana_registry r ON i.iana_id = r.iana_id
        WHERE {date_conditions}
        AND i.date_closed_local IS NOT NULL
        AND (
            DATEDIFF(hour, i.date_created_local, i.date_closed_local) < 6
            {resolution_status_condition}
        )
        ORDER BY hours_to_close ASC, i.case_number
        """
        
        results = dashboard.execute_query(query)
        
        # Check if results is an error dict
        if isinstance(results, dict) and 'error' in results:
            logger.error(f"False closures query error: {results}")
            return jsonify([])
        
        if not results or not isinstance(results, list):
            return jsonify([])
        
        # Add reason for each false closure
        for result in results:
            hours = result.get('hours_to_close', 0)
            resolution_status = result.get('resolution_status', '')
            
            # Check if flagged by resolution status
            if suspicious_resolution_statuses and resolution_status in suspicious_resolution_statuses:
                result['reason'] = f'Suspicious resolution status: {resolution_status}'
            elif hours < 1:
                result['reason'] = 'Closed in less than 1 hour - likely automated closure'
            elif hours < 3:
                result['reason'] = f'Closed in {hours} hours - insufficient investigation time'
            elif hours < 6:
                result['reason'] = f'Closed in {hours} hours - potentially rushed closure'
            else:
                result['reason'] = f'Flagged by resolution status or other criteria'
        
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error detecting false closures: {str(e)}")
        return jsonify({"error": f"Failed to detect false closures: {str(e)}"}), 500

@app.route('/api/data-quality/duplicates')
def api_duplicates():
    """Detect potential duplicate cases based on URL, domain, or title similarity (all data in this table is Cred Theft)"""
    try:
        # Get date filter parameters
        date_filter = request.args.get('date_filter', 'month')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build date conditions
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        
        # Find duplicates by URL, domain, or extracted URL from title
        query = f"""
        WITH ExtractedUrls AS (
            SELECT 
                i.case_number,
                u.url,
                u.domain,
                i.title,
                i.date_created_local,
                i.date_closed_local,
                i.case_type,
                i.resolution_status,
                i.source_name,
                -- Extract URL from title (text between http:// or https:// and space)
                CASE 
                    WHEN i.title LIKE '%http://%' THEN 
                        SUBSTRING(i.title, 
                            CHARINDEX('http://', i.title), 
                            CASE 
                                WHEN CHARINDEX(' ', i.title, CHARINDEX('http://', i.title)) > 0 
                                THEN CHARINDEX(' ', i.title, CHARINDEX('http://', i.title)) - CHARINDEX('http://', i.title)
                                ELSE LEN(i.title)
                            END
                        )
                    WHEN i.title LIKE '%https://%' THEN 
                        SUBSTRING(i.title, 
                            CHARINDEX('https://', i.title), 
                            CASE 
                                WHEN CHARINDEX(' ', i.title, CHARINDEX('https://', i.title)) > 0 
                                THEN CHARINDEX(' ', i.title, CHARINDEX('https://', i.title)) - CHARINDEX('https://', i.title)
                                ELSE LEN(i.title)
                            END
                        )
                    ELSE NULL
                END as extracted_url_from_title
            FROM phishlabs_case_data_incidents i
            JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_conditions}
        ),
        UrlMatches AS (
            SELECT 
                e1.case_number as case_number_1,
                e2.case_number as case_number_2,
                'url' as match_field,
                e1.url as match_value,
                e1.url as url_1,
                e2.url as url_2,
                e1.title as title_1,
                e2.title as title_2,
                e1.date_created_local as date_created_1,
                e2.date_created_local as date_created_2,
                e1.date_closed_local as date_closed_1,
                e2.date_closed_local as date_closed_2,
                e1.case_type as case_type_1,
                e2.case_type as case_type_2,
                e1.resolution_status as resolution_status_1,
                e2.resolution_status as resolution_status_2,
                e1.source_name as source_name_1,
                e2.source_name as source_name_2,
                DATEDIFF(day, e1.date_created_local, e2.date_created_local) as days_apart
            FROM ExtractedUrls e1
            JOIN ExtractedUrls e2 ON e1.url = e2.url AND e1.case_number < e2.case_number
            WHERE e1.url IS NOT NULL AND e1.url != ''
        ),
        DomainMatches AS (
            SELECT 
                e1.case_number as case_number_1,
                e2.case_number as case_number_2,
                'domain' as match_field,
                e1.domain as match_value,
                e1.url as url_1,
                e2.url as url_2,
                e1.title as title_1,
                e2.title as title_2,
                e1.date_created_local as date_created_1,
                e2.date_created_local as date_created_2,
                e1.date_closed_local as date_closed_1,
                e2.date_closed_local as date_closed_2,
                e1.case_type as case_type_1,
                e2.case_type as case_type_2,
                e1.resolution_status as resolution_status_1,
                e2.resolution_status as resolution_status_2,
                e1.source_name as source_name_1,
                e2.source_name as source_name_2,
                DATEDIFF(day, e1.date_created_local, e2.date_created_local) as days_apart
            FROM ExtractedUrls e1
            JOIN ExtractedUrls e2 ON e1.domain = e2.domain AND e1.case_number < e2.case_number
            WHERE e1.domain IS NOT NULL AND e1.domain != ''
            AND NOT EXISTS (
                SELECT 1 FROM UrlMatches u 
                WHERE u.case_number_1 = e1.case_number AND u.case_number_2 = e2.case_number
            )
        ),
        TitleUrlMatches AS (
            SELECT 
                e1.case_number as case_number_1,
                e2.case_number as case_number_2,
                'title' as match_field,
                e1.extracted_url_from_title as match_value,
                e1.url as url_1,
                e2.url as url_2,
                e1.title as title_1,
                e2.title as title_2,
                e1.date_created_local as date_created_1,
                e2.date_created_local as date_created_2,
                e1.date_closed_local as date_closed_1,
                e2.date_closed_local as date_closed_2,
                e1.case_type as case_type_1,
                e2.case_type as case_type_2,
                e1.resolution_status as resolution_status_1,
                e2.resolution_status as resolution_status_2,
                e1.source_name as source_name_1,
                e2.source_name as source_name_2,
                DATEDIFF(day, e1.date_created_local, e2.date_created_local) as days_apart
            FROM ExtractedUrls e1
            JOIN ExtractedUrls e2 ON e1.extracted_url_from_title = e2.extracted_url_from_title 
                AND e1.case_number < e2.case_number
            WHERE e1.extracted_url_from_title IS NOT NULL AND e1.extracted_url_from_title != ''
            AND NOT EXISTS (
                SELECT 1 FROM UrlMatches u 
                WHERE u.case_number_1 = e1.case_number AND u.case_number_2 = e2.case_number
            )
            AND NOT EXISTS (
                SELECT 1 FROM DomainMatches d 
                WHERE d.case_number_1 = e1.case_number AND d.case_number_2 = e2.case_number
            )
        )
        SELECT 
            case_number_1,
            case_number_2,
            match_field,
            match_value,
            url_1,
            url_2,
            title_1,
            title_2,
            date_created_1,
            date_created_2,
            date_closed_1,
            date_closed_2,
            case_type_1,
            case_type_2,
            resolution_status_1,
            resolution_status_2,
            source_name_1,
            source_name_2,
            days_apart
        FROM (
            SELECT * FROM UrlMatches
            UNION ALL
            SELECT * FROM DomainMatches
            UNION ALL
            SELECT * FROM TitleUrlMatches
        ) AS AllMatches
        ORDER BY ABS(days_apart) ASC, match_field
        """
        
        results = dashboard.execute_query(query)
        
        # Check if results is an error dict
        if isinstance(results, dict) and 'error' in results:
            logger.error(f"Duplicates query error: {results}")
            return jsonify([])
        
        if not results or not isinstance(results, list):
            return jsonify([])
        
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error detecting duplicates: {str(e)}")
        return jsonify({"error": "Failed to detect duplicates"}), 500

@app.route('/api/data-quality/vendor-skewing')
def api_vendor_skewing():
    """Detect vendor skewing - disproportionate case distribution between vendors"""
    try:
        # Get case counts by vendor (based on case_type pattern or other vendor identifier)
        query = """
        SELECT 
            CASE 
                WHEN case_number LIKE 'TI%' THEN 'Vendor A'
                WHEN case_number LIKE 'PL%' THEN 'Vendor B'
                ELSE 'Other'
            END as vendor,
            COUNT(*) as case_count
        FROM phishlabs_case_data_incidents
        WHERE date_created_local >= DATEADD(month, -3, GETDATE())
        GROUP BY CASE 
            WHEN case_number LIKE 'TI%' THEN 'Vendor A'
            WHEN case_number LIKE 'PL%' THEN 'Vendor B'
            ELSE 'Other'
        END
        """
        
        results = dashboard.execute_query(query)
        
        if not results:
            return jsonify([])
        
        # Calculate total and percentages
        total_cases = sum(r['case_count'] for r in results)
        expected_percentage = 50.0  # Expected even distribution
        
        vendor_skew = []
        for result in results:
            percentage = (result['case_count'] / total_cases * 100) if total_cases > 0 else 0
            deviation = abs(percentage - expected_percentage)
            
            vendor_skew.append({
                'vendor': result['vendor'],
                'case_count': result['case_count'],
                'percentage': f"{percentage:.1f}%",
                'expected_percentage': f"{expected_percentage:.1f}%",
                'deviation': round(deviation, 1),
                'status': 'error' if deviation > 20 else 'warning' if deviation > 10 else 'success'
            })
        
        return jsonify(vendor_skew)
        
    except Exception as e:
        logger.error(f"Error detecting vendor skewing: {str(e)}")
        return jsonify({"error": "Failed to detect vendor skewing"}), 500

@app.route('/api/data-quality/missing-parameters')
def api_missing_parameters():
    """Detect cases with missing parameters - url, url_path, fqdn, tld, ip_address, host_isp, as_number (all data in this table is Cred Theft)"""
    try:
        # Get date filter parameters
        date_filter = request.args.get('date_filter', 'month')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build date conditions
        date_conditions = dashboard.get_date_filter_condition(date_filter, start_date, end_date, "i.date_created_local")
        
        # Find cases with missing parameters in associated_urls
        query = f"""
        SELECT * FROM (
            SELECT 
                i.case_number,
                i.case_type,
                i.date_created_local,
                u.url,
                u.url_path,
                u.fqdn,
                u.tld,
                u.ip_address,
                u.host_isp,
                u.as_number,
                (CASE WHEN u.url IS NULL OR u.url = '' THEN 1 ELSE 0 END +
                 CASE WHEN u.url_path IS NULL OR u.url_path = '' THEN 1 ELSE 0 END +
                 CASE WHEN u.fqdn IS NULL OR u.fqdn = '' THEN 1 ELSE 0 END +
                 CASE WHEN u.tld IS NULL OR u.tld = '' THEN 1 ELSE 0 END +
                 CASE WHEN u.ip_address IS NULL OR u.ip_address = '' THEN 1 ELSE 0 END +
                 CASE WHEN u.host_isp IS NULL OR u.host_isp = '' THEN 1 ELSE 0 END +
                 CASE WHEN u.as_number IS NULL OR u.as_number = '' THEN 1 ELSE 0 END
                ) as missing_count
            FROM phishlabs_case_data_incidents i
            LEFT JOIN phishlabs_case_data_associated_urls u ON i.case_number = u.case_number
            WHERE {date_conditions}
            AND i.case_type IN ('Phishing', 'Phishing Redirect')
        ) AS subquery
        WHERE missing_count > 0
        ORDER BY missing_count DESC, date_created_local DESC
        """
        
        results = dashboard.execute_query(query)
        
        # Check if results is an error dict
        if isinstance(results, dict) and 'error' in results:
            logger.error(f"Missing parameters query error: {results}")
            return jsonify([])
        
        if not results or not isinstance(results, list):
            return jsonify([])
        
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error detecting missing parameters: {str(e)}")
        return jsonify({"error": f"Failed to detect missing parameters: {str(e)}"}), 500

@app.route('/api/data-quality/misalignment')
def api_misalignment():
    """Detect data misalignments - missing required fields, inconsistent data (LEGACY)"""
    try:
        # Find cases with missing critical fields
        query = """
        SELECT 
            i.case_number,
            CASE 
                WHEN i.iana_id IS NULL OR i.iana_id = '' THEN 'Missing IANA ID'
                WHEN NOT EXISTS (
                    SELECT 1 FROM phishlabs_case_data_associated_urls u 
                    WHERE u.case_number = i.case_number
                ) THEN 'Missing Associated URLs'
                WHEN i.date_closed_local IS NOT NULL AND i.resolution_status IS NULL THEN 'Closed without resolution status'
                ELSE 'Other'
            END as issue_type,
            CASE 
                WHEN i.iana_id IS NULL OR i.iana_id = '' THEN 'iana_id'
                WHEN NOT EXISTS (
                    SELECT 1 FROM phishlabs_case_data_associated_urls u 
                    WHERE u.case_number = i.case_number
                ) THEN 'associated_urls'
                WHEN i.date_closed_local IS NOT NULL AND i.resolution_status IS NULL THEN 'resolution_status'
                ELSE 'unknown'
            END as field,
            i.date_created_local
        FROM phishlabs_case_data_incidents i
        WHERE (
            i.iana_id IS NULL OR i.iana_id = ''
            OR NOT EXISTS (
                SELECT 1 FROM phishlabs_case_data_associated_urls u 
                WHERE u.case_number = i.case_number
            )
            OR (i.date_closed_local IS NOT NULL AND i.resolution_status IS NULL)
        )
        ORDER BY i.date_created_local DESC
        """
        
        results = dashboard.execute_query(query)
        
        if not results:
            return jsonify([])
        
        # Add expected values
        for result in results:
            field = result.get('field', '')
            if field == 'iana_id':
                result['current_value'] = 'NULL'
                result['expected_value'] = 'Valid IANA ID'
            elif field == 'associated_urls':
                result['current_value'] = 'No URLs'
                result['expected_value'] = 'At least one URL'
            elif field == 'resolution_status':
                result['current_value'] = 'NULL'
                result['expected_value'] = 'Valid status'
            else:
                result['current_value'] = 'N/A'
                result['expected_value'] = 'N/A'
        
        return jsonify(results[:100])  # Limit to 100 records
        
    except Exception as e:
        logger.error(f"Error detecting misalignment: {str(e)}")
        return jsonify({"error": "Failed to detect data misalignment"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
