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
        this.filters = {
            falseClosures: {},
            duplicates: {},
            missingParams: {}
        };
        this.sortConfig = {
            falseClosures: { column: null, direction: 'asc' },
            duplicates: { column: null, direction: 'asc' },
            missingParams: { column: null, direction: 'asc' }
        };
    }

    // ============================== INITIALIZATION ==============================
    initialize() {
        console.log('🔍 Initializing Data Quality Dashboard...');
        this.dateFilter = document.getElementById('dateFilter').value || 'month';
        this.loadAllData();
        this.setupEventListeners();
    }
    
    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filterable-header') && !e.target.closest('.column-filter-dropdown')) {
                document.querySelectorAll('.column-filter-dropdown').forEach(dropdown => {
                    dropdown.style.display = 'none';
                    // Clean up scroll listener
                    if (dropdown._repositionHandler) {
                        window.removeEventListener('scroll', dropdown._repositionHandler, true);
                        dropdown._repositionHandler = null;
                        dropdown._headerElement = null;
                    }
                });
            }
        });
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
        
        // Apply filters and sorting
        let filteredData = this.applyFilters('falseClosures');
        filteredData = this.applySorting('falseClosures', filteredData);
        
        const html = `
            <div class="quality-table-wrapper">
                <table class="quality-table">
                    <thead>
                        <tr>
                            ${this.generateFilterableHeader('falseClosures', 'case_number', 'Case Number')}
                            ${this.generateFilterableHeader('falseClosures', 'url', 'URL')}
                            ${this.generateFilterableHeader('falseClosures', 'title', 'Title')}
                            ${this.generateFilterableHeader('falseClosures', 'url_type', 'URL Type')}
                            ${this.generateFilterableHeader('falseClosures', 'brand', 'Brand')}
                            ${this.generateFilterableHeader('falseClosures', 'source_name', 'Source')}
                            ${this.generateFilterableHeader('falseClosures', 'date_created_local', 'Date Created')}
                            ${this.generateFilterableHeader('falseClosures', 'date_closed_local', 'Date Closed')}
                            ${this.generateFilterableHeader('falseClosures', 'minutes_to_close', 'Hours Open')}
                            ${this.generateFilterableHeader('falseClosures', 'resolution_status', 'Resolution Status')}
                            ${this.generateFilterableHeader('falseClosures', 'registrar_name', 'Registrar')}
                            ${this.generateFilterableHeader('falseClosures', 'host_isp', 'Host ISP')}
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredData.map(row => `
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
        
        // Apply filters and sorting
        let filteredData = this.applyFilters('duplicates');
        filteredData = this.applySorting('duplicates', filteredData);
        
        const html = `
            <div class="quality-table-wrapper">
                <table class="quality-table duplicates-table">
                    <thead>
                        <tr>
                            ${this.generateFilterableHeader('duplicates', 'case_number_1', 'Case Number')}
                            ${this.generateFilterableHeader('duplicates', 'match_field', 'Match Type')}
                            ${this.generateFilterableHeader('duplicates', 'match_value', 'Match Value')}
                            ${this.generateFilterableHeader('duplicates', 'url_1', 'URL')}
                            ${this.generateFilterableHeader('duplicates', 'title_1', 'Title')}
                            ${this.generateFilterableHeader('duplicates', 'case_type_1', 'Case Type')}
                            ${this.generateFilterableHeader('duplicates', 'source_name_1', 'Source')}
                            ${this.generateFilterableHeader('duplicates', 'date_created_1', 'Date Created')}
                            ${this.generateFilterableHeader('duplicates', 'date_closed_1', 'Date Closed')}
                            ${this.generateFilterableHeader('duplicates', 'resolution_status_1', 'Resolution Status')}
                            ${this.generateFilterableHeader('duplicates', 'days_apart', 'Days Apart')}
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredData.map((row, index) => `
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
            container.innerHTML = this.renderNoData('No Phishing or Phishing Redirect cases with missing parameters found');
            return;
        }
        
        if (data.length === 0) {
            container.innerHTML = this.renderNoData('No Phishing or Phishing Redirect cases with missing parameters found');
            return;
        }
        
        // Apply sorting only (no filtering for Missing Parameters)
        let filteredData = [...(this.data.missingParams || [])];
        filteredData = this.applySorting('missingParams', filteredData);
        
        const html = `
            <div class="quality-table-wrapper">
                <table class="quality-table">
                    <thead>
                        <tr>
                            ${this.generateSortableHeader('missingParams', 'case_number', 'Case Number')}
                            ${this.generateSortableHeader('missingParams', 'case_type', 'Case Type')}
                            ${this.generateSortableHeader('missingParams', 'date_created_local', 'Date Created')}
                            ${this.generateSortableHeader('missingParams', 'missing_count', 'Missing Fields')}
                            ${this.generateSortableHeader('missingParams', 'url', 'URL')}
                            ${this.generateSortableHeader('missingParams', 'url_path', 'URL Path')}
                            ${this.generateSortableHeader('missingParams', 'fqdn', 'FQDN')}
                            ${this.generateSortableHeader('missingParams', 'tld', 'TLD')}
                            ${this.generateSortableHeader('missingParams', 'ip_address', 'IP Address')}
                            ${this.generateSortableHeader('missingParams', 'host_isp', 'Host ISP')}
                            ${this.generateSortableHeader('missingParams', 'as_number', 'AS Number')}
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredData.map(row => `
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

    // ============================== FILTERING AND SORTING ==============================
    
    /**
     * Toggle column filter dropdown
     */
    toggleColumnFilter(event, filterId) {
        event.stopPropagation();
        
        const dropdown = document.getElementById(filterId);
        if (!dropdown) return;
        
        // Close all other dropdowns
        document.querySelectorAll('.column-filter-dropdown').forEach(d => {
            if (d.id !== filterId) {
                d.style.display = 'none';
                // Clean up scroll listener
                if (d._repositionHandler) {
                    window.removeEventListener('scroll', d._repositionHandler, true);
                    d._repositionHandler = null;
                    d._headerElement = null;
                }
            }
        });
        
        // Check if visible
        const isVisible = dropdown.style.display === 'block';
        
        if (isVisible) {
            dropdown.style.display = 'none';
            // Clean up scroll listener
            if (dropdown._repositionHandler) {
                window.removeEventListener('scroll', dropdown._repositionHandler, true);
                dropdown._repositionHandler = null;
                dropdown._headerElement = null;
            }
        } else {
            // Populate filter options dynamically
            this.populateFilterOptions(filterId);
            
            // Move dropdown to body to avoid overflow clipping
            if (dropdown.parentElement !== document.body) {
                document.body.appendChild(dropdown);
            }
            
            // Position dropdown using fixed positioning
            const header = event.target.closest('.filterable-header');
            if (header) {
                const headerRect = header.getBoundingClientRect();
                
                dropdown.style.position = 'fixed';
                dropdown.style.top = `${headerRect.bottom + 4}px`;
                dropdown.style.left = `${headerRect.left}px`;
                dropdown.style.display = 'block';
                
                // Store reference to reposition on scroll
                dropdown._headerElement = header;
                dropdown._repositionHandler = () => {
                    if (dropdown.style.display === 'block' && dropdown._headerElement) {
                        const rect = dropdown._headerElement.getBoundingClientRect();
                        dropdown.style.top = `${rect.bottom + 4}px`;
                        dropdown.style.left = `${rect.left}px`;
                    }
                };
                
                // Add scroll listener
                window.addEventListener('scroll', dropdown._repositionHandler, true);
            }
        }
    }
    
    /**
     * Populate filter options for a dropdown
     */
    populateFilterOptions(filterId) {
        const dropdown = document.getElementById(filterId);
        if (!dropdown) return;
        
        const tableId = dropdown.dataset.table;
        const columnName = dropdown.dataset.column;
        const optionsContainer = dropdown.querySelector('.filter-options');
        
        if (!optionsContainer) return;
        
        // Get current filter options
        const options = this.getFilterOptions(tableId, columnName);
        
        // Get currently selected values for this column
        const currentSelectedValues = this.filters[tableId] && this.filters[tableId][columnName] ? this.filters[tableId][columnName] : [];
        
        // Clear existing options
        optionsContainer.innerHTML = '';
        
        // Add new options
        if (options.length === 0) {
            optionsContainer.innerHTML = '<div style="padding: 8px; color: #6b7280; font-style: italic;">No unique values found</div>';
        } else {
            optionsContainer.innerHTML = options.map(opt => {
                const isChecked = currentSelectedValues.includes(opt) ? 'checked' : '';
                return `<label class="filter-option"><input type="checkbox" value="${this.escapeHtmlAttr(opt)}" ${isChecked}><span>${opt}</span></label>`;
            }).join('');
        }
    }
    
    /**
     * Apply column filter
     */
    applyColumnFilter(dataType, column) {
        const dropdown = document.querySelector('.column-filter-dropdown');
        if (!dropdown) return;
        
        // Read all checked checkboxes
        const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:checked');
        const selectedValues = Array.from(checkboxes).map(cb => {
            const value = cb.value;
            if (value === 'null' || value === '') return null;
            return value;
        });
        
        console.log(`🔍 Applying filter for ${dataType}.${column}:`, selectedValues);
        
        // Update the filters object
        if (!this.filters[dataType]) {
            this.filters[dataType] = {};
        }
        this.filters[dataType][column] = selectedValues;
        
        // Update filter icon appearance
        this.updateFilterIcon(dataType, column);
        
        // Close dropdown
        dropdown.remove();
        
        // Re-render the current tab with new filters
        this.renderCurrentTab();
        
        console.log(`✅ Applied filter for ${column}:`, selectedValues);
    }
    
    /**
     * Clear column filter
     */
    clearColumnFilter(dataType, column) {
        console.log(`🧹 Clearing filter for ${dataType}.${column}`);
        
        // Clear the filter
        if (this.filters[dataType]) {
            this.filters[dataType][column] = [];
        }
        
        // Update filter icon
        this.updateFilterIcon(dataType, column);
        
        // Close dropdown
        const dropdown = document.querySelector('.column-filter-dropdown');
        if (dropdown) {
            dropdown.remove();
        }
        
        // Re-render
        this.renderCurrentTab();
        
        console.log(`✅ Cleared filter for ${column}`);
    }

    /**
     * Update filter icon appearance based on active filters
     */
    updateFilterIcon(dataType, column) {
        const hasActiveFilter = this.filters[dataType]?.[column]?.length > 0;
        
        // Find all filter icons for this column
        document.querySelectorAll('.filter-icon').forEach(icon => {
            const header = icon.closest('.filterable-header');
            if (header && header.innerHTML.includes(`toggleFilter(event, '${dataType}', '${column}')`)) {
                if (hasActiveFilter) {
                    icon.classList.add('active');
                } else {
                    icon.classList.remove('active');
                }
            }
        });
    }

    /**
     * Toggle filter dropdown visibility
     */
    toggleFilter(event, dataType, column) {
        event.stopPropagation();
        
        const headerElement = event.target.closest('.filterable-header');
        const existingDropdown = document.querySelector('.column-filter-dropdown');
        
        if (existingDropdown) {
            const existingColumn = existingDropdown.dataset.column;
            const existingType = existingDropdown.dataset.dataType;
            
            if (existingColumn === column && existingType === dataType) {
                existingDropdown.remove();
                return;
            }
            existingDropdown.remove();
        }
        
        const dropdown = this.createFilterDropdown(dataType, column, headerElement);
        document.body.appendChild(dropdown);
        this.positionDropdown(dropdown, headerElement);
        
        const searchInput = dropdown.querySelector('.filter-search');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }

    /**
     * Create filter dropdown element
     */
    createFilterDropdown(dataType, column, headerElement) {
        const dropdown = document.createElement('div');
        dropdown.className = 'column-filter-dropdown';
        dropdown.dataset.column = column;
        dropdown.dataset.dataType = dataType;
        dropdown.style.display = 'block'; // Make visible
        
        const values = this.getUniqueColumnValues(dataType, column);
        
        if (!this.filters[dataType]) {
            this.filters[dataType] = {};
        }
        if (!this.filters[dataType][column]) {
            this.filters[dataType][column] = [];
        }
        const selectedValues = [...this.filters[dataType][column]];
        
        dropdown.innerHTML = `
            <div class="filter-header">
                <input type="text" 
                    class="filter-search" 
                    placeholder="Search values..."
                    onkeyup="dataQuality.filterDropdownValues(event, '${dataType}', '${column}')">
            </div>
            <div class="filter-options" id="filterOptions-${dataType}-${column}">
                ${this.generateFilterOptions(values, selectedValues, dataType, column)}
            </div>
            <div class="filter-actions">
                <button class="btn-filter-clear" onclick="dataQuality.clearColumnFilter('${dataType}', '${column}')">
                    Clear
                </button>
                <button class="btn-filter-apply" onclick="dataQuality.applyColumnFilter('${dataType}', '${column}')">
                    Apply
                </button>
            </div>
        `;
        
        return dropdown;
    }

    /**
     * Generate filter options HTML
     */
    generateFilterOptions(values, selectedValues, dataType, column) {
        if (values.length === 0) {
            return '<div class="filter-option-item">No values available</div>';
        }
        
        return values.map(value => {
            const displayValue = value === null || value === '' ? '(Empty)' : this.escapeHtml(String(value));
            const isChecked = selectedValues.includes(value) ? 'checked' : '';
            const escapedValue = this.escapeHtmlAttr(value);
            
            return `
                <label class="filter-option-item">
                    <input type="checkbox" 
                        value="${escapedValue}" 
                        ${isChecked}
                        onchange="dataQuality.updateTempFilterSelection('${dataType}', '${column}', this)">
                    <span>${displayValue}</span>
                </label>
            `;
        }).join('');
    }

    /**
     * Get unique values for a column
     */
    getUniqueColumnValues(dataType, column) {
        const dataKey = this.getDataKey(dataType);
        const data = this.data[dataKey] || [];
        
        const uniqueValues = [...new Set(data.map(row => row[column]))];
        
        return uniqueValues.sort((a, b) => {
            if (a === null || a === '') return 1;
            if (b === null || b === '') return -1;
            return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
        });
    }

    /**
     * Update temporary filter selection
     */
    updateTempFilterSelection(dataType, column, checkbox) {
        console.log(`📝 Checkbox toggled for ${column}: ${checkbox.value} = ${checkbox.checked}`);
    }

    /**
     * Position dropdown relative to header
     */
    positionDropdown(dropdown, headerElement) {
        const rect = headerElement.getBoundingClientRect();
        const dropdownHeight = 400;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        dropdown.style.position = 'fixed';
        dropdown.style.zIndex = '9999';
        dropdown.style.left = rect.left + 'px';
        
        if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
            dropdown.style.top = (rect.bottom + 5) + 'px';
            dropdown.style.bottom = 'auto';
        } else {
            dropdown.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
            dropdown.style.top = 'auto';
        }
        
        const repositionHandler = () => {
            const newRect = headerElement.getBoundingClientRect();
            dropdown.style.left = newRect.left + 'px';
            
            if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
                dropdown.style.top = (newRect.bottom + 5) + 'px';
                dropdown.style.bottom = 'auto';
            } else {
                dropdown.style.bottom = (window.innerHeight - newRect.top + 5) + 'px';
                dropdown.style.top = 'auto';
            }
        };
        
        dropdown._repositionHandler = repositionHandler;
        dropdown._headerElement = headerElement;
        window.addEventListener('scroll', repositionHandler, true);
    }

    /**
     * Filter dropdown values based on search input
     */
    filterDropdownValues(event, dataType, column) {
        const searchTerm = event.target.value.toLowerCase();
        const optionsContainer = document.getElementById(`filterOptions-${dataType}-${column}`);
        
        if (!optionsContainer) return;
        
        const options = optionsContainer.querySelectorAll('.filter-option-item');
        
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
    }

    /**
    * Position dropdown relative to header
    */
    positionDropdown(dropdown, headerElement) {
        const rect = headerElement.getBoundingClientRect();
        const dropdownHeight = 400; // max height
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Position horizontally
        dropdown.style.left = rect.left + 'px';
        
        // Position vertically (prefer below, but show above if not enough space)
        if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
            dropdown.style.top = (rect.bottom + 5) + 'px';
        } else {
            dropdown.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
        }
        
        // Add repositioning on scroll
        const repositionHandler = () => {
            const newRect = headerElement.getBoundingClientRect();
            dropdown.style.left = newRect.left + 'px';
            
            if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
                dropdown.style.top = (newRect.bottom + 5) + 'px';
            } else {
                dropdown.style.bottom = (window.innerHeight - newRect.top + 5) + 'px';
            }
        };
        
        dropdown._repositionHandler = repositionHandler;
        dropdown._headerElement = headerElement;
        window.addEventListener('scroll', repositionHandler, true);
    }

    /**
     * Get data key for data type
     */
    getDataKey(dataType) {
        const keyMap = {
            'falseClosures': 'falseClosures',
            'duplicates': 'duplicates',
            'missingParams': 'missingParams'
        };
        return keyMap[dataType] || dataType;
    }

    /**
     * Get sort icon based on current sort state
     */
    getSortIcon(dataType, column) {
        const sortConfig = this.sortConfig[dataType];
        if (!sortConfig || sortConfig.column !== column) {
            return ''; // No sort icon (will show fa-sort)
        }
        return sortConfig.direction === 'asc' ? '-up' : '-down';
    }

    /**
     * Toggle sort direction for a column
     */
    toggleSort(dataType, column) {
        const sortConfig = this.sortConfig[dataType];
        
        if (sortConfig.column === column) {
            // Toggle direction
            sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New column
            sortConfig.column = column;
            sortConfig.direction = 'asc';
        }
        
        // Re-render the current tab with new sort
        this.renderCurrentTab();
    }
    
    /**
     * Sort table by column
     */
    sortTable(tableId, columnName) {
        const currentSort = this.sortConfig[tableId];
        
        // Determine sort direction
        if (currentSort.column === columnName) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = columnName;
            currentSort.direction = 'asc';
        }
        
        // Re-render table
        this.renderTable(tableId);
        
        console.log(`Sorted ${tableId} by ${columnName} (${currentSort.direction})`);
    }
    
    /**
     * Get filter options for a column
     */
    getFilterOptions(tableId, columnName) {
        const data = this.data[tableId] || [];
        
        let values = [];
        
        if (tableId === 'duplicates') {
            // For duplicates table, we need to handle both _1 and _2 fields
            if (columnName.endsWith('_1')) {
                const baseColumn = columnName.replace('_1', '');
                values = data.flatMap(item => [
                    this.getNestedValue(item, `${baseColumn}_1`),
                    this.getNestedValue(item, `${baseColumn}_2`)
                ]).filter(v => v && String(v).trim() !== '').map(v => String(v));
            } else {
                values = data.map(item => {
                    const value = this.getNestedValue(item, columnName);
                    return value ? String(value) : '';
                }).filter(v => v !== '');
            }
        } else {
            values = data.map(item => {
                const value = this.getNestedValue(item, columnName);
                return value ? String(value) : '';
            }).filter(v => v !== '');
        }
        
        const uniqueValues = [...new Set(values)].sort();
        return uniqueValues;
    }
    
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    /**
     * Apply filters to data
     */
    applyFilters(dataType) {
        const dataKey = this.getDataKey(dataType);
        let data = [...this.data[dataKey]];
        
        const filters = this.filters[dataType];
        console.log(`🔍 applyFilters called for ${dataType}:`, filters);
        
        if (!filters || Object.keys(filters).length === 0) {
            console.log(`⚠️ No filters found for ${dataType}`);
            return data;
        }
        
        // Apply each active filter
        for (const [column, values] of Object.entries(filters)) {
            if (values && values.length > 0) {
                console.log(`🎯 Filtering ${column} with values:`, values);
                const beforeCount = data.length;
                data = data.filter(row => {
                    const cellValue = row[column];
                    return values.includes(cellValue);
                });
                console.log(`   Filtered from ${beforeCount} to ${data.length} rows`);
            }
        }
        
        return data;
    }
    
    /**
     * Apply sorting to data
     */
    applySorting(tableId, data) {
        const sortConfig = this.sortConfig[tableId];
        if (!sortConfig.column) return data;
        
        return data.sort((a, b) => {
            let aValue, bValue;
            
            if (tableId === 'duplicates' && sortConfig.column.endsWith('_1')) {
                // For duplicates table, use _1 field for sorting
                aValue = this.getNestedValue(a, sortConfig.column);
                bValue = this.getNestedValue(b, sortConfig.column);
            } else {
                aValue = this.getNestedValue(a, sortConfig.column);
                bValue = this.getNestedValue(b, sortConfig.column);
            }
            
            // Handle null/undefined values
            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
            if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
            
            // Convert to comparable values
            const aComp = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
            const bComp = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;
            
            if (aComp < bComp) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aComp > bComp) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    /**
     * Render table with filters and sorting
     */
    renderTable(tableId) {
        switch (tableId) {
            case 'falseClosures':
                this.renderFalseClosures();
                break;
            case 'duplicates':
                this.renderDuplicates();
                break;
            case 'missingParams':
                this.renderMissingParams();
                break;
        }
    }
    
    /**
     * Generate filterable header HTML
     */
    generateFilterableHeader(dataType, column, displayName, isSortable = true) {
        const hasActiveFilter = this.filters[dataType]?.[column]?.length > 0;
        const filterIconClass = hasActiveFilter ? 'active' : '';
        const sortIcon = this.getSortIcon(dataType, column);
        
        return `
            <th class="filterable-header">
                <div class="header-content">
                    <span class="header-text">${displayName}</span>
                    <div class="header-actions">
                        ${isSortable ? `<i class="fas fa-sort${sortIcon} sort-icon" onclick="dataQuality.toggleSort('${dataType}', '${column}')"></i>` : ''}
                        <i class="fas fa-filter filter-icon ${filterIconClass}" 
                           onclick="dataQuality.toggleFilter(event, '${dataType}', '${column}')"></i>
                    </div>
                </div>
            </th>
        `;
    }
    
    /**
     * Generate simple sortable header HTML (no filtering)
     */
    generateSortableHeader(tableId, columnName, headerText) {
        return `
            <th>
                <div class="header-wrapper">
                    <span class="header-text" onclick="window.dataQuality.sortTable('${tableId}', '${columnName}')" style="cursor: pointer;">
                        ${headerText}
                        <i class="fas fa-sort sort-icon"></i>
                    </span>
                </div>
            </th>
        `;
    }
    
    /**
     * Escape HTML attributes
     */
    escapeHtmlAttr(str) {
        return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
