// ============================================================================
// DATA QUALITY DASHBOARD CLASS
// ============================================================================

class DataQualityDashboard {
    constructor() {
        this.currentTab = 'false-closures';
        this.dateFilter = 'month';
        this.startDate = null;
        this.endDate = null;
        this.data = {
            falseClosures: [],
            duplicates: [],
            missingParams: []
        };
    }

    // ============================== INITIALIZATION ==============================
    initialize() {
        console.log('🔍 Initializing Data Quality Dashboard...');
        this.dateFilter = document.getElementById('dateFilter').value || 'month';
        this.loadAllData();
    }

    // ============================== LOAD ALL DATA ==============================
    async loadAllData() {
        console.log('📊 Loading all data quality checks...');
        this.showLoading(true);
        
        try {
            const dateParams = this.getDateParams();
            
            // Load all three datasets
            const [falseClosures, duplicates, missingParams] = await Promise.all([
                this.fetchData(`/api/data-quality/false-closures?${dateParams}`),
                this.fetchData(`/api/data-quality/duplicates?${dateParams}`),
                this.fetchData(`/api/data-quality/missing-parameters?${dateParams}`)
            ]);
            
            this.data.falseClosures = falseClosures || [];
            this.data.duplicates = duplicates || [];
            this.data.missingParams = missingParams || [];
            
            // Update badges
            document.getElementById('falseClosuresBadge').textContent = this.data.falseClosures.length;
            document.getElementById('duplicatesBadge').textContent = this.data.duplicates.length;
            document.getElementById('missingParamsBadge').textContent = this.data.missingParams.length;
            
            // Render current tab
            this.renderCurrentTab();
            
            console.log('✅ All data loaded successfully');
            this.showNotification('Data quality checks completed', 'success');
        } catch (error) {
            console.error('❌ Error loading data:', error);
            this.showNotification('Failed to load data quality checks', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ============================== DATE HANDLING ==============================
    getDateParams() {
        const params = new URLSearchParams();
        params.append('date_filter', this.dateFilter);
        
        if (this.dateFilter === 'custom' && this.startDate && this.endDate) {
            params.append('start_date', this.startDate);
            params.append('end_date', this.endDate);
        }
        
        return params.toString();
    }

    handleDateChange() {
        this.dateFilter = document.getElementById('dateFilter').value;
        const customRange = document.getElementById('customDateRange');
        
        if (this.dateFilter === 'custom') {
            customRange.style.display = 'flex';
        } else {
            customRange.style.display = 'none';
            this.loadAllData();
        }
    }

    applyCustomDate() {
        this.startDate = document.getElementById('startDate').value;
        this.endDate = document.getElementById('endDate').value;
        
        if (!this.startDate || !this.endDate) {
            this.showNotification('Please select both start and end dates', 'warning');
            return;
        }
        
        this.loadAllData();
    }

    // ============================== TAB SWITCHING ==============================
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.quality-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.quality-tab-content').forEach(content => content.classList.remove('active'));
        
        // Activate current tab
        const tabMap = {
            'false-closures': 0,
            'duplicates': 1,
            'missing-params': 2
        };
        
        const tabs = document.querySelectorAll('.quality-tab');
        const contents = document.querySelectorAll('.quality-tab-content');
        
        if (tabs[tabMap[tabName]]) tabs[tabMap[tabName]].classList.add('active');
        if (contents[tabMap[tabName]]) contents[tabMap[tabName]].classList.add('active');
        
        this.renderCurrentTab();
    }

    // ============================== RENDER CURRENT TAB ==============================
    renderCurrentTab() {
        switch(this.currentTab) {
            case 'false-closures':
                this.renderFalseClosures();
                break;
            case 'duplicates':
                this.renderDuplicates();
                break;
            case 'missing-params':
                this.renderMissingParams();
                break;
        }
    }

    // ============================== RENDER FALSE CLOSURES ==============================
    renderFalseClosures() {
        const container = document.getElementById('falseClosuresContent');
        const data = this.data.falseClosures;
        
        // Check if data is valid array
        if (!data || !Array.isArray(data)) {
            console.error('Invalid false closures data:', data);
            container.innerHTML = this.renderNoData('No false closures found in selected time window');
            return;
        }
        
        if (data.length === 0) {
            container.innerHTML = this.renderNoData('No false closures found in selected time window');
            return;
        }
        
        const html = `
            <div class="quality-table-wrapper">
                <table class="quality-table">
                    <thead>
                        <tr>
                            <th>Case Number</th>
                            <th>URL</th>
                            <th>Title</th>
                            <th>URL Type</th>
                            <th>Brand</th>
                            <th>Source</th>
                            <th>Date Created</th>
                            <th>Date Closed</th>
                            <th>Hours Open</th>
                            <th>Resolution Status</th>
                            <th>Registrar</th>
                            <th>Host ISP</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td><code>${this.escapeHtml(row.case_number || 'N/A')}</code></td>
                                <td class="url-cell" title="${this.escapeHtml(row.url || 'N/A')}">
                                    ${row.url ? `<a href="${this.escapeHtml(row.url)}" target="_blank">${this.truncate(row.url, 40)}</a>` : 'N/A'}
                                </td>
                                <td class="title-cell" title="${this.escapeHtml(row.title || 'N/A')}">
                                    ${this.truncate(row.title || 'N/A', 40)}
                                </td>
                                <td>${this.escapeHtml(row.url_type || 'N/A')}</td>
                                <td>${this.escapeHtml(row.brand || 'N/A')}</td>
                                <td>${this.escapeHtml(row.source_name || 'N/A')}</td>
                                <td>${this.formatDate(row.date_created_local)}</td>
                                <td>${this.formatDate(row.date_closed_local)}</td>
                                <td>
                                    <span class="hours-badge ${this.getHoursBadgeClass(row.hours_to_close)}">
                                        ${this.formatTimeOpen(row.hours_to_close, row.minutes_to_close)}
                                    </span>
                                </td>
                                <td>${this.escapeHtml(row.resolution_status || 'N/A')}</td>
                                <td>${this.escapeHtml(row.registrar_name || 'N/A')}</td>
                                <td>${this.escapeHtml(row.host_isp || 'N/A')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }

    // ============================== RENDER DUPLICATES ==============================
    renderDuplicates() {
        const container = document.getElementById('duplicatesContent');
        const data = this.data.duplicates;
        
        // Check if data is valid array
        if (!data || !Array.isArray(data)) {
            console.error('Invalid duplicates data:', data);
            container.innerHTML = this.renderNoData('No duplicate cases found in selected time window');
            return;
        }
        
        if (data.length === 0) {
            container.innerHTML = this.renderNoData('No duplicate cases found in selected time window');
            return;
        }
        
        const html = `
            <div class="quality-table-wrapper">
                <table class="quality-table duplicates-table">
                    <thead>
                        <tr>
                            <th>Case Number</th>
                            <th>Match Type</th>
                            <th>Match Value</th>
                            <th>URL</th>
                            <th>Title</th>
                            <th>Case Type</th>
                            <th>Source</th>
                            <th>Date Created</th>
                            <th>Date Closed</th>
                            <th>Resolution Status</th>
                            <th>Days Apart</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((row, index) => `
                            <!-- First case of the duplicate pair -->
                            <tr class="duplicate-row duplicate-row-1">
                                <td><code>${this.escapeHtml(row.case_number_1 || 'N/A')}</code></td>
                                <td rowspan="2" class="match-type-cell">
                                    <span class="match-badge ${this.getMatchBadgeClass(row.match_field)}">
                                        ${this.escapeHtml(row.match_field || 'N/A')}
                                    </span>
                                </td>
                                <td rowspan="2" class="match-value-cell" title="${this.escapeHtml(row.match_value || 'N/A')}">
                                    ${this.truncate(row.match_value || 'N/A', 40)}
                                </td>
                                <td class="url-cell" title="${this.escapeHtml(row.url_1 || 'N/A')}">
                                    ${row.url_1 ? `<a href="${this.escapeHtml(row.url_1)}" target="_blank">${this.truncate(row.url_1, 35)}</a>` : 'N/A'}
                                </td>
                                <td class="title-cell" title="${this.escapeHtml(row.title_1 || 'N/A')}">
                                    ${this.truncate(row.title_1 || 'N/A', 30)}
                                </td>
                                <td>${this.escapeHtml(row.case_type_1 || 'N/A')}</td>
                                <td>${this.escapeHtml(row.source_name_1 || 'N/A')}</td>
                                <td>${this.formatDate(row.date_created_1)}</td>
                                <td>${this.formatDate(row.date_closed_1)}</td>
                                <td>${this.escapeHtml(row.resolution_status_1 || 'N/A')}</td>
                                <td rowspan="2" class="days-apart-cell">
                                    <span class="days-badge">
                                        ${Math.abs(row.days_apart || 0)} days
                                    </span>
                                </td>
                            </tr>
                            <!-- Second case of the duplicate pair -->
                            <tr class="duplicate-row duplicate-row-2">
                                <td><code>${this.escapeHtml(row.case_number_2 || 'N/A')}</code></td>
                                <td class="url-cell" title="${this.escapeHtml(row.url_2 || 'N/A')}">
                                    ${row.url_2 ? `<a href="${this.escapeHtml(row.url_2)}" target="_blank">${this.truncate(row.url_2, 35)}</a>` : 'N/A'}
                                </td>
                                <td class="title-cell" title="${this.escapeHtml(row.title_2 || 'N/A')}">
                                    ${this.truncate(row.title_2 || 'N/A', 30)}
                                </td>
                                <td>${this.escapeHtml(row.case_type_2 || 'N/A')}</td>
                                <td>${this.escapeHtml(row.source_name_2 || 'N/A')}</td>
                                <td>${this.formatDate(row.date_created_2)}</td>
                                <td>${this.formatDate(row.date_closed_2)}</td>
                                <td>${this.escapeHtml(row.resolution_status_2 || 'N/A')}</td>
                            </tr>
                            <!-- Spacer row between duplicate pairs -->
                            ${index < data.length - 1 ? '<tr class="duplicate-spacer"><td colspan="11"></td></tr>' : ''}
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }

    // ============================== RENDER MISSING PARAMETERS ==============================
    renderMissingParams() {
        const container = document.getElementById('missingParamsContent');
        const data = this.data.missingParams;
        
        // Check if data is valid array
        if (!data || !Array.isArray(data)) {
            console.error('Invalid missing params data:', data);
            container.innerHTML = this.renderNoData('No cases with missing parameters found');
            return;
        }
        
        if (data.length === 0) {
            container.innerHTML = this.renderNoData('No cases with missing parameters found');
            return;
        }
        
        const html = `
            <div class="quality-table-wrapper">
                <table class="quality-table">
                    <thead>
                        <tr>
                            <th>Case Number</th>
                            <th>Case Type</th>
                            <th>Date Created</th>
                            <th>Missing Fields</th>
                            <th>URL</th>
                            <th>URL Path</th>
                            <th>FQDN</th>
                            <th>TLD</th>
                            <th>IP Address</th>
                            <th>Host ISP</th>
                            <th>AS Number</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td><code>${this.escapeHtml(row.case_number || 'N/A')}</code></td>
                                <td>${this.escapeHtml(row.case_type || 'N/A')}</td>
                                <td>${this.formatDate(row.date_created_local)}</td>
                                <td>
                                    <span class="missing-count-badge">
                                        ${row.missing_count || 0} fields
                                    </span>
                                </td>
                                <td>${this.renderFieldStatus(row.url)}</td>
                                <td>${this.renderFieldStatus(row.url_path)}</td>
                                <td>${this.renderFieldStatus(row.fqdn)}</td>
                                <td>${this.renderFieldStatus(row.tld)}</td>
                                <td>${this.renderFieldStatus(row.ip_address)}</td>
                                <td>${this.renderFieldStatus(row.host_isp)}</td>
                                <td>${this.renderFieldStatus(row.as_number)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }

    // ============================== UTILITY METHODS ==============================
    
    renderFieldStatus(value) {
        if (!value || value === '' || value === 'NULL' || value === null) {
            return '<span class="missing-field"><i class="fas fa-times"></i> Missing</span>';
        }
        return '<span class="present-field"><i class="fas fa-check"></i></span>';
    }

    async fetchData(endpoint) {
        try {
            console.log(`Fetching: ${endpoint}`);
            const response = await fetch(endpoint);
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                return []; // Return empty array on error
            }
            const data = await response.json();
            
            // Ensure we always return an array
            if (!Array.isArray(data)) {
                console.error(`Invalid data format from ${endpoint}:`, data);
                return [];
            }
            
            return data;
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            return []; // Return empty array on error
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        container.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    renderNoData(message) {
        return `
            <div class="no-data">
                <i class="fas fa-check-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncate(text, maxLength) {
        if (!text || text.length <= maxLength) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, maxLength)) + '...';
    }

    truncateUrl(url, maxLength) {
        if (!url || url.length <= maxLength) return this.escapeHtml(url);
        // Try to keep the domain visible
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const path = urlObj.pathname + urlObj.search;
            
            if (domain.length + path.length <= maxLength) {
                return this.escapeHtml(url);
            }
            
            // Truncate path if needed
            const availableLength = maxLength - domain.length - 10; // 10 for protocol and ...
            if (availableLength > 0) {
                return this.escapeHtml(urlObj.protocol + '//' + domain + path.substring(0, availableLength) + '...');
            }
        } catch (e) {
            // If URL parsing fails, just truncate normally
        }
        return this.escapeHtml(url.substring(0, maxLength)) + '...';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    formatTimeOpen(hours, minutes) {
        if (hours === null || hours === undefined) return 'N/A';
        if (hours < 1) {
            return `${minutes || 0}m`;
        }
        return `${hours}h`;
    }

    getHoursBadgeClass(hours) {
        if (!hours) return 'hours-critical';
        if (hours < 1) return 'hours-critical';
        if (hours < 6) return 'hours-warning';
        return 'hours-moderate';
    }

    getMatchBadgeClass(matchField) {
        const classes = {
            'url': 'match-url',
            'domain': 'match-domain',
            'title': 'match-title'
        };
        return classes[matchField] || 'match-other';
    }

    // ============================== EXPORT TO CSV ==============================
    exportTable(type) {
        let data, filename, headers, rows;
        
        switch(type) {
            case 'false-closures':
                data = this.data.falseClosures;
                filename = `false_closures_${new Date().toISOString().split('T')[0]}.csv`;
                headers = ['Case Number', 'URL', 'Title', 'URL Type', 'Brand', 'Source', 'Date Created', 'Date Closed', 'Hours Open', 'Resolution Status', 'Registrar', 'Host ISP'];
                rows = data.map(row => [
                    row.case_number, row.url, row.title, row.url_type, row.brand, row.source_name,
                    row.date_created_local, row.date_closed_local, row.hours_to_close, row.resolution_status,
                    row.registrar_name, row.host_isp
                ]);
                break;
                
            case 'duplicates':
                data = this.data.duplicates;
                filename = `duplicate_cases_${new Date().toISOString().split('T')[0]}.csv`;
                headers = ['Case Number 1', 'Case Number 2', 'Match Type', 'Match Value', 'URL 1', 'URL 2', 'Title 1', 'Title 2', 'Date Created 1', 'Date Created 2', 'Days Apart'];
                rows = data.map(row => [
                    row.case_number_1, row.case_number_2, row.match_field, row.match_value, row.url_1, row.url_2,
                    row.title_1, row.title_2, row.date_created_1, row.date_created_2, row.days_apart
                ]);
                break;
                
            case 'missing-params':
                data = this.data.missingParams;
                filename = `missing_parameters_${new Date().toISOString().split('T')[0]}.csv`;
                headers = ['Case Number', 'Case Type', 'Date Created', 'Missing Count', 'URL', 'URL Path', 'FQDN', 'TLD', 'IP Address', 'Host ISP', 'AS Number'];
                rows = data.map(row => [
                    row.case_number, row.case_type, row.date_created_local, row.missing_count, row.url, row.url_path,
                    row.fqdn, row.tld, row.ip_address, row.host_isp, row.as_number
                ]);
                break;
                
            default:
                this.showNotification('Invalid export type', 'error');
                return;
        }
        
        if (!data || data.length === 0) {
            this.showNotification('No data to export', 'warning');
            return;
        }
        
        const csv = this.arrayToCsv([headers, ...rows]);
        this.downloadCsv(csv, filename);
        this.showNotification(`Exported ${data.length} records`, 'success');
    }

    arrayToCsv(data) {
        return data.map(row => 
            row.map(cell => {
                const cellStr = String(cell || '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return '"' + cellStr.replace(/"/g, '""') + '"';
                }
                return cellStr;
            }).join(',')
        ).join('\n');
    }

    downloadCsv(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ============================================================================
// INITIALIZE GLOBAL INSTANCE
// ============================================================================
const dataQuality = new DataQualityDashboard();
window.dataQuality = dataQuality;
