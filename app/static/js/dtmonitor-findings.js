// =============================================================================
// ENHANCED FINDINGS MANAGEMENT - EXACT COPY FROM ENHANCED.JS
// =============================================================================

DTMonitor.findings = {
    currentData: [],
    filters: {},
    dynamicFilters: [],
    currentSort: { field: 'first_seen', direction: 'desc' },
    currentPage: 1,
    itemsPerPage: 25,
    selectedFindings: new Set(),
    dropdownData: {},
    
    init: function() {
        console.log('Enhanced findings management initializing...');
        console.log('Available elements:', {
            statusFilter: !!document.getElementById('statusFilter'),
            riskFilter: !!document.getElementById('riskFilter'),
            toggleAdvancedFilters: !!document.getElementById('toggleAdvancedFilters'),
            clearFilters: !!document.getElementById('clearFilters'),
            selectAllCheckbox: !!document.getElementById('selectAllCheckbox'),
            findingsTable: !!document.getElementById('findingsTable')
        });
        
        this.loadFindings();
        this.loadDropdownData();
        this.setupEventListeners();
        this.initializeControlPanel();
        this.updateBulkActions();
        this.updateSummaryStats();
        this.updatePagination();
    },
    
    // Initialize modern control panel
    initializeControlPanel: function() {
        console.log('Initializing modern control panel...');
        
        // Toggle panel collapse/expand
        const toggleBtn = document.getElementById('toggleFilters');
        const filterContent = document.getElementById('filterContent');
        
        if (toggleBtn && filterContent) {
            toggleBtn.addEventListener('click', () => {
                filterContent.classList.toggle('collapsed');
                toggleBtn.classList.toggle('collapsed');
                
                // Update icon rotation
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.style.transform = filterContent.classList.contains('collapsed') ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            });
        }
        
        
        console.log('Control panel initialized successfully');
    },
    
    loadFindings: async function() {
        console.log('Loading findings data...');
        
        try {
            // Load findings from the page data
            const findingsRows = document.querySelectorAll('#findingsTable tr[data-finding-id]');
            this.currentData = Array.from(findingsRows).map(row => ({
                id: row.dataset.findingId,
                status: row.dataset.status,
                risk: row.dataset.risk,
                hash: row.dataset.hash,
                domain: row.dataset.domain,
                firstSeen: row.dataset.firstSeen,
                registrar: row.dataset.registrar,
                country: row.dataset.country,
                asrmTriggered: row.dataset['asrm-triggered'] === 'true'
            }));
            
            console.log('Loaded findings data:', this.currentData);
            this.updateSummaryStats();
            
        } catch (error) {
            console.error('Error loading findings:', error);
            DTMonitor.notification.show('Error loading findings', 'error');
        }
    },

    // Load dropdown data from JSON files
    loadDropdownData: async function() {
        console.log('Loading dropdown data...');
        
        try {
            // Load search hashes
            const hashesResponse = await fetch('/data/search_hashes.json');
            if (hashesResponse.ok) {
                const hashes = await hashesResponse.json();
                this.dropdownData = {
                    ...this.dropdownData,
                    hash_name: hashes.map(hash => ({
                        value: hash.name,
                        label: hash.name,
                        description: hash.description
                    }))
                };
                console.log('Loaded search hashes:', this.dropdownData.hash_name);
            }
            
            // Load tags
            const tagsResponse = await fetch('/data/tags.json');
            if (tagsResponse.ok) {
                const tags = await tagsResponse.json();
                this.dropdownData = {
                    ...this.dropdownData,
                    tags: tags.map(tag => ({
                        value: tag.name,
                        label: tag.name,
                        description: tag.description
                    }))
                };
                console.log('Loaded tags:', this.dropdownData.tags);
            }
            
            // Load findings to get hash names from actual findings
            const findingsResponse = await fetch('/data/findings.json');
            if (findingsResponse.ok) {
                const findingsData = await findingsResponse.json();
                const findings = findingsData.findings || [];
                
                // Extract unique hash names from findings
                const hashNamesFromFindings = [...new Set(findings.map(f => f.hash_name).filter(Boolean))];
                
                // Combine search hashes with findings hash names for ASRM Rule applied
                const allHashNames = new Set();
                
                // Add search hashes
                if (this.dropdownData.hash_name) {
                    this.dropdownData.hash_name.forEach(hash => allHashNames.add(hash.value));
                }
                
                // Add findings hash names
                hashNamesFromFindings.forEach(hashName => allHashNames.add(hashName));
                
                // Create combined list for ASRM Rule applied
                this.dropdownData = {
                    ...this.dropdownData,
                    asrm_rule_applied: Array.from(allHashNames).map(hashName => ({
                        value: hashName,
                        label: hashName,
                        description: 'Hash name from findings or search hashes'
                    }))
                };
                
                console.log('Loaded ASRM rule applied options:', this.dropdownData.asrm_rule_applied);
                console.log('Hash names from findings:', hashNamesFromFindings);
            }
            
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    },
    
    // Setup event listeners for enhanced functionality
    setupEventListeners: function() {
        console.log('Setting up event listeners...');
        
        // Dynamic filter setup
        this.setupDynamicFilters();
        
        // Items per page change listener
        const itemsPerPageElement = document.getElementById('itemsPerPage');
        if (itemsPerPageElement) {
            itemsPerPageElement.addEventListener('change', () => this.changeItemsPerPage());
        }
        
        // Bulk selection listeners
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => this.toggleSelectAll());
        }
        
        // Individual checkbox listeners
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('finding-checkbox')) {
                const findingId = e.target.dataset.findingId;
                if (e.target.checked) {
                    this.selectedFindings.add(findingId);
                } else {
                    this.selectedFindings.delete(findingId);
                }
                this.updateBulkActions();
                this.updateSelectAllCheckbox();
            }
        });
        
        // Clear filters
        const clearButton = document.getElementById('clearFilters');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearFilters());
        }
        
        // Export button
        const exportButton = document.getElementById('exportBtn');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.showExportOptions());
        }
        
        // Bulk action buttons
        const bulkApprove = document.getElementById('bulkApprove');
        if (bulkApprove) {
            bulkApprove.addEventListener('click', () => this.bulkApprove());
        }
        
        const bulkReject = document.getElementById('bulkReject');
        if (bulkReject) {
            bulkReject.addEventListener('click', () => this.bulkReject());
        }
        
        const bulkSelectAll = document.getElementById('bulkSelectAll');
        if (bulkSelectAll) {
            bulkSelectAll.addEventListener('click', () => this.selectAll());
        }
        
        // Pagination buttons
        const firstPage = document.getElementById('firstPage');
        if (firstPage) {
            firstPage.addEventListener('click', () => this.goToPage(1));
        }
        
        const prevPage = document.getElementById('prevPage');
        if (prevPage) {
            prevPage.addEventListener('click', () => this.previousPage());
        }
        
        const nextPage = document.getElementById('nextPage');
        if (nextPage) {
            nextPage.addEventListener('click', () => this.nextPage());
        }
        
        const lastPage = document.getElementById('lastPage');
        if (lastPage) {
            lastPage.addEventListener('click', () => this.goToPage(999));
        }
        
        // Export modal buttons
        const closeExportModal = document.getElementById('closeExportModal');
        if (closeExportModal) {
            closeExportModal.addEventListener('click', () => this.closeExportModal());
        }
        
        const executeExport = document.getElementById('executeExport');
        if (executeExport) {
            executeExport.addEventListener('click', () => this.executeExport());
        }
        
        // Sortable table headers
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sortable')) {
                const th = e.target.closest('.sortable');
                const field = th.dataset.sort;
                if (field) {
                    this.sortBy(field);
                }
            }
        });
        
        console.log('Event listeners set up successfully');
    },
    
    // Apply filters
    applyFilters: function() {
        console.log('Applying dynamic filters...');
        console.log('Active dynamic filters:', this.dynamicFilters);
        
        // Filter findings
        this.filterFindings();
    },
    
    // Filter findings based on dynamic filters only
    filterFindings: function() {
        console.log('Filtering findings with dynamic filters...');
        const rows = document.querySelectorAll('tbody tr[data-finding-id]');
        let visibleCount = 0;
        
        console.log(`Total rows to filter: ${rows.length}`);
        console.log(`Active dynamic filters: ${this.dynamicFilters.length}`);
        
        rows.forEach(row => {
            const rowId = row.dataset.findingId;
            let show = true;
            
            // Apply all dynamic filters
            for (const filter of this.dynamicFilters) {
                if (!this.evaluateDynamicFilter(row, filter)) {
                    show = false;
                    console.log(`Row ${rowId} hidden by dynamic filter: ${filter.param} ${filter.operator} ${filter.value}`);
                    break;
                }
            }
            
            // Show/hide row
            row.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        console.log(`Filtering complete. Visible rows: ${visibleCount}`);
    },
    
    // Clear all filters
    clearFilters: function() {
        console.log('Clearing all dynamic filters...');
        
        // Clear dynamic filters
        this.dynamicFilters = [];
        this.updateActiveDynamicFilters();
        
        // Reset form
        this.resetDynamicFilterForm();
        
        // Show all rows
        const rows = document.querySelectorAll('tbody tr[data-finding-id]');
        rows.forEach(row => {
            row.style.display = '';
        });
        
        // Update summary stats
        this.updateSummaryStats();
        
        console.log('All filters cleared');
    },
    
    
    // Update summary statistics
    updateSummaryStats: function() {
        const totalElement = document.getElementById('totalFindings');
        const filteredElement = document.getElementById('filteredFindings');
        
        if (totalElement) {
            const totalRows = document.querySelectorAll('tbody tr[data-finding-id]').length;
            totalElement.textContent = totalRows;
        }
        
        if (filteredElement) {
            const visibleRows = document.querySelectorAll('tbody tr[data-finding-id]:not([style*="display: none"])').length;
            filteredElement.textContent = visibleRows;
        }
    },
    
    // Update pagination
    updatePagination: function() {
        // This is a simplified version - implement full pagination if needed
        console.log('Pagination updated');
    },
    
    // Update bulk actions visibility
    updateBulkActions: function() {
        const bulkActions = document.getElementById('bulkActions');
        if (bulkActions) {
            if (this.selectedFindings.size > 0) {
                bulkActions.style.display = 'block';
                // Add show class for animation after a small delay
                setTimeout(() => {
                    bulkActions.classList.add('show');
                }, 10);
            } else {
                bulkActions.classList.remove('show');
                // Hide after animation completes
                setTimeout(() => {
                    bulkActions.style.display = 'none';
                }, 400);
            }
            
            // Update selected count with new counter element
            const selectedCount = document.getElementById('bulkSelectedCount');
            if (selectedCount) {
                selectedCount.textContent = this.selectedFindings.size;
            }
        }
    },
    
    // Update select all checkbox
    updateSelectAllCheckbox: function() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            const visibleRows = document.querySelectorAll('tbody tr[data-finding-id]:not([style*="display: none"])');
            const checkedRows = document.querySelectorAll('tbody tr[data-finding-id]:not([style*="display: none"]) .finding-checkbox:checked');
            
            selectAllCheckbox.checked = visibleRows.length > 0 && checkedRows.length === visibleRows.length;
            selectAllCheckbox.indeterminate = checkedRows.length > 0 && checkedRows.length < visibleRows.length;
        }
    },
    
    // Toggle select all
    toggleSelectAll: function() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const visibleRows = document.querySelectorAll('tbody tr[data-finding-id]:not([style*="display: none"])');
        
        visibleRows.forEach(row => {
            const checkbox = row.querySelector('.finding-checkbox');
            if (checkbox) {
                checkbox.checked = selectAllCheckbox.checked;
                const findingId = checkbox.dataset.findingId;
                
                if (selectAllCheckbox.checked) {
                    this.selectedFindings.add(findingId);
                } else {
                    this.selectedFindings.delete(findingId);
                }
            }
        });
        
        this.updateBulkActions();
    },
    
    // Select all findings
    selectAll: function() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = true;
            this.toggleSelectAll();
        }
    },
    
    // Clear selection
    clearSelection: function() {
        this.selectedFindings.clear();
        this.updateBulkActions();
        this.updateSelectAllCheckbox();
        
        // Uncheck all row checkboxes
        const rowCheckboxes = document.querySelectorAll('tbody input[type="checkbox"]');
        rowCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        console.log('Selection cleared');
    },
    
    // Bulk approve
    bulkApprove: function() {
        if (this.selectedFindings.size === 0) {
            DTMonitor.notification.show('No findings selected for approval', 'warning');
            return;
        }
        
        console.log('Bulk approving findings:', Array.from(this.selectedFindings));
        
        // Get selected findings data from DOM
        const selectedIds = Array.from(this.selectedFindings);
        const selectedFindings = [];
        const alreadyApproved = [];
        
        selectedIds.forEach(id => {
            const row = document.querySelector(`tr[data-finding-id="${id}"]`);
            if (row) {
                const status = row.dataset.status;
                
                // Check if already approved or rejected
                if (status === 'approved') {
                    alreadyApproved.push(`${row.dataset.domain} (already approved)`);
                } else if (status === 'rejected') {
                    alreadyApproved.push(`${row.dataset.domain} (already rejected)`);
                } else {
                    selectedFindings.push({
                        id: row.dataset.findingId,
                        domain_name: row.dataset.domain,
                        risk_score: parseInt(row.dataset.risk) || 0,
                        status: row.dataset.status,
                        hash_id: row.dataset.hash,
                        hash_name: row.dataset['hash-name'],
                        first_seen: row.dataset['first-seen'],
                        registrar: row.dataset.registrar,
                        ip_country: row.dataset.country,
                        asrm_triggered: row.dataset['asrm-triggered'] === 'true',
                        pl_submission: row.dataset['pl-submission'] === 'true'
                    });
                }
            }
        });
        
        // Show warning for already approved or rejected findings
        if (alreadyApproved.length > 0) {
            DTMonitor.notification.show(
                `Cannot approve findings: ${alreadyApproved.join(', ')}`, 
                'warning'
            );
        }
        
        // Only proceed if there are findings to approve
        if (selectedFindings.length > 0) {
            console.log(`Opening PhishLabs modal for ${selectedFindings.length} findings`);
            // Open PhishLabs submission modal
            this.openPhishLabsModal(selectedFindings);
        }
    },
    
    // Bulk reject
    bulkReject: function() {
        if (this.selectedFindings.size === 0) {
            DTMonitor.notification.show('No findings selected for rejection', 'warning');
            return;
        }
        
        console.log('Bulk rejecting findings:', Array.from(this.selectedFindings));
        
        // Get selected findings data from DOM
        const selectedIds = Array.from(this.selectedFindings);
        const selectedFindings = [];
        const alreadyRejected = [];
        
        selectedIds.forEach(id => {
            const row = document.querySelector(`tr[data-finding-id="${id}"]`);
            if (row) {
                const status = row.dataset.status;
                
                // Check if already rejected or approved
                if (status === 'rejected') {
                    alreadyRejected.push(`${row.dataset.domain} (already rejected)`);
                } else if (status === 'approved') {
                    alreadyRejected.push(`${row.dataset.domain} (already approved)`);
                } else {
                    selectedFindings.push({
                        id: row.dataset.findingId,
                        domain_name: row.dataset.domain,
                        risk_score: parseInt(row.dataset.risk) || 0,
                        status: row.dataset.status,
                        hash_id: row.dataset.hash,
                        hash_name: row.dataset['hash-name'],
                        first_seen: row.dataset['first-seen'],
                        registrar: row.dataset.registrar,
                        ip_country: row.dataset.country,
                        asrm_triggered: row.dataset['asrm-triggered'] === 'true',
                        pl_submission: row.dataset['pl-submission'] === 'true'
                    });
                }
            }
        });
        
        // Show warning for already rejected or approved findings
        if (alreadyRejected.length > 0) {
            DTMonitor.notification.show(
                `Cannot reject findings: ${alreadyRejected.join(', ')}`, 
                'warning'
            );
        }
        
        // Only proceed if there are findings to reject
        if (selectedFindings.length > 0) {
            console.log(`Bulk rejecting ${selectedFindings.length} findings`);
            
            // Confirm bulk rejection
            const confirmMessage = `Are you sure you want to reject ${selectedFindings.length} findings?\n\nThis action cannot be undone.`;
            if (confirm(confirmMessage)) {
                // Process each finding for rejection
                this.processBulkRejection(selectedFindings);
            }
        }
    },
    
    // Process bulk rejection
    processBulkRejection: function(selectedFindings) {
        console.log(`Processing bulk rejection for ${selectedFindings.length} findings`);
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Process each finding sequentially to avoid overwhelming the server
        const processNext = async (index) => {
            if (index >= selectedFindings.length) {
                // All done, show summary
                this.showBulkRejectionSummary(successCount, errorCount, errors);
                return;
            }
            
            const finding = selectedFindings[index];
            try {
                console.log(`Rejecting finding ${index + 1}/${selectedFindings.length}: ${finding.id}`);
                
                // Update status to rejected with additional data
                const result = await this.updateStatus(finding.id, 'rejected', {
                    asrm_triggered: false,
                    pl_submission: false,
                    rejected: true,
                    rejection_reason: 'Bulk rejected by user',
                    rejected_by: 'user',
                    rejected_timestamp: new Date().toISOString()
                });
                
                if (result) {
                    successCount++;
                    console.log(`Successfully rejected finding: ${finding.id}`);
                } else {
                    errorCount++;
                    errors.push(`${finding.domain_name}: Failed to update status`);
                }
                
                // Small delay to avoid overwhelming the server
                setTimeout(() => processNext(index + 1), 100);
                
            } catch (error) {
                console.error(`Error rejecting finding ${finding.id}:`, error);
                errorCount++;
                errors.push(`${finding.domain_name}: ${error.message}`);
                
                // Continue with next finding
                setTimeout(() => processNext(index + 1), 100);
            }
        };
        
        // Start processing
        processNext(0);
    },
    
    // Show bulk rejection summary
    showBulkRejectionSummary: function(successCount, errorCount, errors) {
        console.log(`Bulk rejection complete: ${successCount} success, ${errorCount} errors`);
        
        let message = `Bulk rejection completed!\n\n`;
        message += `✅ Successfully rejected: ${successCount} findings\n`;
        
        if (errorCount > 0) {
            message += `❌ Failed to reject: ${errorCount} findings\n\n`;
            message += `Errors:\n${errors.slice(0, 5).join('\n')}`;
            if (errors.length > 5) {
                message += `\n... and ${errors.length - 5} more errors`;
            }
            
            DTMonitor.notification.show(message, 'warning');
        } else {
            DTMonitor.notification.show(`Successfully rejected ${successCount} findings!`, 'success');
        }
        
        // Clear selection after bulk action
        this.selectedFindings.clear();
        this.updateBulkActions();
        this.updateSelectAllCheckbox();
    },
    
    // Show export options
    showExportOptions: function() {
        console.log('Showing export options');
        const modal = document.getElementById('exportOptionsModal');
        if (modal) {
            // Check if findings are selected
            const selectedFindings = this.getSelectedFindings();
            this.updateExportScope(selectedFindings.length > 0);
            
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
        }
    },
    
    // Update export scope based on selected findings
    updateExportScope: function(hasSelectedFindings) {
        const scopeOptions = document.getElementById('scopeOptions');
        if (!scopeOptions) return;
        
        if (hasSelectedFindings) {
            // If findings are selected, only show selected option
            const selectedCount = this.getSelectedFindings().length;
            scopeOptions.innerHTML = `
                <label class="scope-option">
                    <input type="radio" name="exportScope" value="selected" checked>
                    <span>Selected findings only</span>
                    <small>${selectedCount} finding${selectedCount !== 1 ? 's' : ''} selected</small>
                </label>
            `;
        } else {
            // If no findings selected, show filtered and all options
            scopeOptions.innerHTML = `
                <label class="scope-option">
                    <input type="radio" name="exportScope" value="filtered" checked>
                    <span>Current filtered results</span>
                    <small>Export findings matching current filters</small>
                </label>
                <label class="scope-option">
                    <input type="radio" name="exportScope" value="all">
                    <span>All findings</span>
                    <small>Export all findings regardless of filters</small>
                </label>
            `;
        }
    },
    
    // Close export modal
    closeExportModal: function() {
        console.log('Closing export modal');
        const modal = document.getElementById('exportOptionsModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    },
    
    // Execute export
    executeExport: function() {
        console.log('Executing export');
        
        // Collect form data
        const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'csv';
        const scope = document.querySelector('input[name="exportScope"]:checked')?.value || 'filtered';
        const selectedFields = Array.from(document.querySelectorAll('input[name="exportFields"]:checked'))
            .map(input => input.value);
        
        console.log('Export options:', { format, scope, selectedFields });
        
        // Validate selection
        if (scope === 'selected' && this.getSelectedFindings().length === 0) {
            DTMonitor.notification.show('Please select findings to export', 'warning');
            return;
        }
        
        if (selectedFields.length === 0) {
            DTMonitor.notification.show('Please select at least one field to export', 'warning');
            return;
        }
        
        // Show loading state
        const exportBtn = document.querySelector('[onclick="DTMonitor.findings.executeExport()"]');
        if (exportBtn) {
            const originalText = exportBtn.innerHTML;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            exportBtn.disabled = true;
        }
        
        // Prepare export data
        const exportData = {
            format: format,
            scope: scope,
            fields: selectedFields,
            filters: scope === 'filtered' ? this.dynamicFilters : [],
            selectedIds: scope === 'selected' ? this.getSelectedFindings().map(f => f.id) : []
        };
        
        // Call export API
        this.performExport(exportData, exportBtn);
    },
    
    // Perform the actual export
    performExport: function(exportData, exportBtn) {
        // Use the unified export endpoint for both CSV and JSON
        const endpoint = '/api/findings/export';
        const method = 'POST';
        
        const requestOptions = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(exportData)
        };
        
        fetch(endpoint, requestOptions)
        .then(response => {
            if (response.ok) {
                return response.blob();
            } else {
                throw new Error(`Export failed: ${response.statusText}`);
            }
        })
        .then(blob => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `findings_export_${new Date().toISOString().split('T')[0]}.${exportData.format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // Close modal and show success
            this.closeExportModal();
            DTMonitor.notification.show('Findings exported successfully', 'success');
        })
        .catch(error => {
            console.error('Error exporting findings:', error);
            DTMonitor.notification.show(`Failed to export findings: ${error.message}`, 'error');
        })
        .finally(() => {
            // Revert button state
            if (exportBtn) {
                exportBtn.innerHTML = '<i class="fas fa-download"></i> Export Findings';
                exportBtn.disabled = false;
            }
        });
    },
    
    // Get selected findings
    getSelectedFindings: function() {
        const selectedRows = document.querySelectorAll('tbody tr[data-finding-id] input[type="checkbox"]:checked');
        return Array.from(selectedRows).map(checkbox => {
            const row = checkbox.closest('tr');
            return {
                id: row.dataset.findingId,
                domain: row.dataset.domain,
                status: row.dataset.status
            };
        });
    },
    
    // Select all fields
    selectAllFields: function() {
        const checkboxes = document.querySelectorAll('input[name="exportFields"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
    },
    
    // Deselect all fields
    deselectAllFields: function() {
        const checkboxes = document.querySelectorAll('input[name="exportFields"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    },
    
    // Change items per page
    changeItemsPerPage: function() {
        const itemsPerPageElement = document.getElementById('itemsPerPage');
        if (itemsPerPageElement) {
            this.itemsPerPage = parseInt(itemsPerPageElement.value);
            this.currentPage = 1;
            this.updatePagination();
        }
    },
    
    // Go to page
    goToPage: function(page) {
        this.currentPage = page;
        this.updatePagination();
    },
    
    // Previous page
    previousPage: function() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
        }
    },
    
    // Next page
    nextPage: function() {
        this.currentPage++;
        this.updatePagination();
    },
    
    // Sort by field
    sortBy: function(field) {
        console.log('Sorting by:', field);
        // Implement sorting logic
    },


    // Setup dynamic filters
    setupDynamicFilters: function() {
        const paramSelect = document.getElementById('dynamicParam');
        const operatorSelect = document.getElementById('dynamicOperator');
        const addButton = document.getElementById('addDynamicFilter');

        if (!paramSelect || !operatorSelect || !addButton) return;

        // Parameter change handler
        paramSelect.addEventListener('change', () => {
            this.updateDynamicOperators();
            this.updateDynamicValueInput();
        });

        // Operator change handler
        operatorSelect.addEventListener('change', () => {
            this.updateDynamicValueInput();
        });

        // Add filter button
        addButton.addEventListener('click', () => {
            this.addDynamicFilter();
        });
    },

    // Update operators based on selected parameter
    updateDynamicOperators: function() {
        const paramSelect = document.getElementById('dynamicParam');
        const operatorSelect = document.getElementById('dynamicOperator');
        
        if (!paramSelect || !operatorSelect) return;

        const selectedParam = paramSelect.value;
        operatorSelect.innerHTML = '<option value="">Select Operator</option>';

        if (!selectedParam) return;

        // Define operators for different parameter types
        const operators = {
            // ENUM/CATEGORICAL FIELDS - Dropdown with specific values
            'status': ['equals', 'not_equals'],
            'risk_level': ['equals', 'not_equals'],
            'asrm_triggered': ['equals', 'not_equals'],
            'is_active': ['equals', 'not_equals'],
            
            // NUMERIC FIELDS - Number input with comparison operators
            'risk_score': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'ip_asn': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'response_code': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'registrar_count': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'ip_address_count': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'ip_country_count': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'ip_isp_count': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'ip_asn_count': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            
            // THREAT SCORE FIELDS - Number input with comparison operators
            'threat_profile.phishing.score': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'threat_profile.malware.score': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'threat_profile.spam.score': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            
            // DATE FIELDS - Date input with comparison operators
            'discovered_at': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'first_seen': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'create_date': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            'expiration_date': ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'],
            
            // TEXT FIELDS - Text input with string operators + regex
            'domain_name': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'hash_name': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'registrar': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'ip_country': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'website_title': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'whois_url': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'ip_address': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'ip_isp': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            
            // ARRAY FIELDS - Text input with array-specific operators
            'tags': ['contains', 'not_contains', 'equals', 'not_equals'],
            'name_servers_data': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'mail_servers_data': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            
            // BOOLEAN FIELDS - Dropdown with true/false
            'pl_submission': ['equals', 'not_equals'],
            
            // TEXT FIELDS WITH DROPDOWN VALUES - Dropdown with specific values
            'asrm_rule_applied': ['equals', 'not_equals'],
            'phishlabs_case_number': ['equals'],
            
            // NESTED OBJECT FIELDS - Text input with string operators
            'admin_country': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'registrant_country': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'admin_org': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'registrant_org': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex'],
            'server_type': ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex']
        };

        const paramOperators = operators[selectedParam] || [];
        paramOperators.forEach(op => {
            const option = document.createElement('option');
            option.value = op;
            option.textContent = this.getOperatorLabel(op);
            operatorSelect.appendChild(option);
        });
    },

    // Get human-readable operator label
    getOperatorLabel: function(operator) {
        const labels = {
            'equals': 'Equals (=)',
            'not_equals': 'Not Equals (!=)',
            'greater_than': 'Greater Than (>)',
            'less_than': 'Less Than (<)',
            'greater_equal': 'Greater or Equal (>=)',
            'less_equal': 'Less or Equal (<=)',
            'contains': 'Contains',
            'not_contains': 'Does Not Contain',
            'starts_with': 'Starts With',
            'ends_with': 'Ends With',
            'regex': 'Regex Match'
        };
        return labels[operator] || operator;
    },

    // Update value input based on parameter type
    updateDynamicValueInput: function() {
        const paramSelect = document.getElementById('dynamicParam');
        const valueInput = document.getElementById('dynamicValueInput');
        const valueSelect = document.getElementById('dynamicValueSelect');
        const valueSelectWrapper = document.getElementById('dynamicValueSelectWrapper');
        
        if (!paramSelect || !valueInput || !valueSelect) return;

        const selectedParam = paramSelect.value;
        
        // Hide both inputs
        valueInput.style.display = 'none';
        if (valueSelectWrapper) {
            valueSelectWrapper.style.display = 'none';
        } else {
            valueSelect.style.display = 'none';
        }

        if (!selectedParam) return;

        // ENUM/CATEGORICAL FIELDS - Use dropdown
        if (['status', 'risk_level', 'asrm_triggered', 'is_active', 'pl_submission'].includes(selectedParam)) {
            let options = '<option value="">Select value...</option>';
            
            if (selectedParam === 'status') {
                options += '<option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>';
            } else if (selectedParam === 'risk_level') {
                options += '<option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>';
            } else if (['asrm_triggered', 'is_active', 'pl_submission'].includes(selectedParam)) {
                options += '<option value="true">True</option><option value="false">False</option>';
            }
            
            valueSelect.innerHTML = options;
            if (valueSelectWrapper) {
                valueSelectWrapper.style.display = 'block';
            } else {
                valueSelect.style.display = 'block';
            }
        }
        // DROPDOWN FIELDS WITH JSON DATA - Use dropdown with loaded data
        else if (['hash_name', 'tags', 'asrm_rule_applied'].includes(selectedParam)) {
            let options = '<option value="">Select value...</option>';
            
            if (this.dropdownData && this.dropdownData[selectedParam]) {
                this.dropdownData[selectedParam].forEach(item => {
                    options += `<option value="${item.value}" title="${item.description || ''}">${item.label}</option>`;
                });
            }
            
            valueSelect.innerHTML = options;
            if (valueSelectWrapper) {
                valueSelectWrapper.style.display = 'block';
            } else {
                valueSelect.style.display = 'block';
            }
        } else {
            // NUMERIC, TEXT, DATE, ARRAY FIELDS - Use text input
            valueInput.type = this.getInputType(selectedParam);
            valueInput.placeholder = this.getInputPlaceholder(selectedParam);
            valueInput.style.display = 'block';
        }
    },

    // Get input type based on parameter
    getInputType: function(param) {
        const numericFields = ['risk_score', 'ip_asn', 'response_code', 'registrar_count', 'ip_address_count', 'ip_country_count', 'ip_isp_count', 'ip_asn_count', 'threat_profile.phishing.score', 'threat_profile.malware.score', 'threat_profile.spam.score'];
        const dateFields = ['discovered_at', 'first_seen', 'create_date', 'expiration_date'];
        
        if (numericFields.includes(param)) {
            return 'number';
        } else if (dateFields.includes(param)) {
            return 'date';
        } else {
            return 'text';
        }
    },

    // Get input placeholder based on parameter
    getInputPlaceholder: function(param) {
        const placeholders = {
            // TEXT FIELDS
            'domain_name': 'Enter domain name (e.g., example.com)',
            'hash_name': 'Enter hash name',
            'registrar': 'Enter registrar name',
            'ip_country': 'Enter country code (e.g., US)',
            'website_title': 'Enter website title',
            'whois_url': 'Enter WHOIS URL',
            'ip_address': 'Enter IP address',
            'ip_isp': 'Enter ISP name',
            'admin_country': 'Enter country code (e.g., US)',
            'registrant_country': 'Enter country code (e.g., US)',
            'admin_org': 'Enter organization name',
            'registrant_org': 'Enter organization name',
            'server_type': 'Enter server type (e.g., nginx)',
            
            // NUMERIC FIELDS
            'risk_score': 'Enter risk score (0-100)',
            'ip_asn': 'Enter IP ASN number',
            'response_code': 'Enter response code (e.g., 200)',
            'registrar_count': 'Enter registrar count',
            'ip_address_count': 'Enter IP address count',
            'ip_country_count': 'Enter IP country count',
            'ip_isp_count': 'Enter IP ISP count',
            'ip_asn_count': 'Enter IP ASN count',
            
            // THREAT SCORE FIELDS
            'threat_profile.phishing.score': 'Enter phishing score (0-100)',
            'threat_profile.malware.score': 'Enter malware score (0-100)',
            'threat_profile.spam.score': 'Enter spam score (0-100)',
            
            // DATE FIELDS
            'discovered_at': 'Enter date (YYYY-MM-DD)',
            'first_seen': 'Enter date (YYYY-MM-DD)',
            'create_date': 'Enter date (YYYY-MM-DD)',
            'expiration_date': 'Enter date (YYYY-MM-DD)',
            
            // ARRAY FIELDS
            'tags': 'Enter tag name',
            
            // TEXT FIELDS (previously array)
            'name_servers_data': 'Enter name server (e.g., ns1.example.com)',
            'mail_servers_data': 'Enter mail server (e.g., mail.example.com)',
            
            // TEXT FIELDS WITH DROPDOWN VALUES
            'asrm_rule_applied': 'Enter ASRM rule name',
            'phishlabs_case_number': 'Enter PhishLabs case number'
        };
        return placeholders[param] || 'Enter value';
    },

    // Add dynamic filter
    addDynamicFilter: function() {
        const paramSelect = document.getElementById('dynamicParam');
        const operatorSelect = document.getElementById('dynamicOperator');
        const valueInput = document.getElementById('dynamicValueInput');
        const valueSelect = document.getElementById('dynamicValueSelect');
        const valueSelectWrapper = document.getElementById('dynamicValueSelectWrapper');
        
        if (!paramSelect || !operatorSelect) return;

        const param = paramSelect.value;
        const operator = operatorSelect.value;
        let value = '';

        // Check which value input is visible and get its value
        const isValueInputVisible = valueInput && valueInput.style.display !== 'none';
        const isValueSelectVisible = valueSelect && valueSelect.style.display !== 'none';
        const isValueSelectWrapperVisible = valueSelectWrapper && valueSelectWrapper.style.display !== 'none';
        
        if (isValueInputVisible) {
            value = valueInput.value.trim();
        } else if (isValueSelectVisible || isValueSelectWrapperVisible) {
            value = valueSelect.value;
        }

        if (!param || !operator || !value) {
            alert('Please fill in all fields');
            return;
        }

        // Add to dynamic filters
        const filter = { param, operator, value };
        this.dynamicFilters.push(filter);
        
        // Update UI
        this.updateActiveDynamicFilters();
        this.applyFilters();
        
        // Clear form and reset value inputs
        this.resetDynamicFilterForm();
    },

    // Reset dynamic filter form
    resetDynamicFilterForm: function() {
        const paramSelect = document.getElementById('dynamicParam');
        const operatorSelect = document.getElementById('dynamicOperator');
        const valueInput = document.getElementById('dynamicValueInput');
        const valueSelect = document.getElementById('dynamicValueSelect');
        const valueSelectWrapper = document.getElementById('dynamicValueSelectWrapper');
        
        // Clear parameter selection
        if (paramSelect) {
            paramSelect.value = '';
        }
        
        // Reset operator dropdown
        if (operatorSelect) {
            operatorSelect.innerHTML = '<option value="">Select Operator</option>';
        }
        
        // Clear and hide value inputs
        if (valueInput) {
            valueInput.value = '';
            valueInput.style.display = 'none';
        }
        
        if (valueSelect) {
            valueSelect.innerHTML = '<option value="">Select value...</option>';
        }
        
        if (valueSelectWrapper) {
            valueSelectWrapper.style.display = 'none';
        } else if (valueSelect) {
            valueSelect.style.display = 'none';
        }
    },

    // Update active dynamic filters display
    updateActiveDynamicFilters: function() {
        const container = document.getElementById('activeDynamicFilters');
        const section = document.querySelector('.active-filters-section');
        const filterCount = document.getElementById('filterCount');
        
        if (!container) return;

        container.innerHTML = '';
        
        // Show/hide the active filters section based on whether there are filters
        if (this.dynamicFilters.length === 0) {
            if (section) {
                section.classList.remove('has-filters');
            }
            if (filterCount) {
                filterCount.textContent = '0 filters applied';
            }
            return;
        }
        
        // Show the section and update count
        if (section) {
            section.classList.add('has-filters');
        }
        if (filterCount) {
            filterCount.textContent = `${this.dynamicFilters.length} filter${this.dynamicFilters.length === 1 ? '' : 's'} applied`;
        }
        
        this.dynamicFilters.forEach((filter, index) => {
            const filterDiv = document.createElement('div');
            filterDiv.className = 'active-filter';
            filterDiv.innerHTML = `
                <span class="filter-label">${this.getParameterLabel(filter.param)} ${this.getOperatorLabel(filter.operator)} ${filter.value}</span>
                <button type="button" class="remove-filter" data-index="${index}">×</button>
            `;
            container.appendChild(filterDiv);
        });

        // Add remove event listeners
        container.querySelectorAll('.remove-filter').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeDynamicFilter(index);
            });
        });
    },

    // Get parameter label
    getParameterLabel: function(param) {
        const labels = {
            'risk_score': 'Risk Score',
            'overall_risk_score': 'Overall Risk Score',
            'popularity_rank': 'Popularity Rank',
            'alexa_rank': 'Alexa Rank',
            'ip_asn': 'IP ASN',
            'response_code': 'Response Code',
            'is_phishing': 'Is Phishing',
            'is_malware': 'Is Malware',
            'is_active': 'Is Active',
            'admin_country': 'Admin Country',
            'registrant_country': 'Registrant Country',
            'admin_org': 'Admin Organization',
            'registrant_org': 'Registrant Organization',
            'server_type': 'Server Type',
            'website_title': 'Website Title'
        };
        return labels[param] || param;
    },

    // Remove dynamic filter
    removeDynamicFilter: function(index) {
        this.dynamicFilters.splice(index, 1);
        this.updateActiveDynamicFilters();
        this.applyFilters();
    },

    // Evaluate dynamic filter
    evaluateDynamicFilter: function(row, filter) {
        const { param, operator, value } = filter;
        
        // Define parameter types
        const numericParams = ['risk_score', 'ip_asn', 'response_code', 'threat_profile.phishing.score', 'threat_profile.malware.score', 'threat_profile.spam.score'];
        const booleanParams = ['is_active', 'asrm_triggered', 'pl_submission'];
        const dateParams = ['discovered_at', 'first_seen', 'create_date', 'expiration_date'];
        const arrayParams = ['tags'];
        const complexArrayParams = ['name_servers_data', 'mail_servers_data'];
        
        // Map parameter names to actual data attributes
        const paramMapping = {
            'status': 'status',
            'hash_name': 'hash-name', // maps to data-hash-name
            'asrm_triggered': 'asrm-triggered', // maps to data-asrm-triggered
            'tags': 'tags', // maps to data-tags
            'domain_name': 'domain', // maps to data-domain
            'registrar': 'registrar', // maps to data-registrar
            'ip_country': 'country', // maps to data-country
            'discovered_at': 'discovered-at', // maps to data-discovered-at
            'first_seen': 'first-seen', // maps to data-first-seen
            'risk_score': 'risk', // maps to data-risk
            'ip_asn': 'ip-asn',
            'ip_address': 'ip-address',
            'ip_isp': 'ip-isp',
            'response_code': 'response-code',
            'is_active': 'is-active',
            'admin_contact.country': 'admin-country',
            'registrant_contact.country': 'registrant-country',
            'admin_contact.org': 'admin-org',
            'registrant_contact.org': 'registrant-org',
            'server_type': 'server-type',
            'website_title': 'website-title',
            'name_servers_data': 'name-servers-data',
            'mail_servers_data': 'mail-servers-data',
            'threat_profile.phishing.score': 'phishing-score',
            'threat_profile.malware.score': 'malware-score',
            'threat_profile.spam.score': 'spam-score',
            'asrm_rule_applied': 'asrm-rule-applied',
            'pl_submission': 'pl-submission',
            'phishlabs_case_number': 'phishlabs-case-number'
        };
        
        // Get the value from the row data
        let rowValue = null;
        const dataAttr = paramMapping[param] || param.replace(/_/g, '-');
        
        // Handle nested fields (e.g., admin_contact.country)
        if (param.includes('.')) {
            // For nested fields, we need to get the JSON data and navigate to the nested property
            const findingId = row.getAttribute('data-finding-id');
            if (findingId && window.currentData && window.currentData.findings) {
                const finding = window.currentData.findings.find(f => f.id == findingId);
                if (finding) {
                    const keys = param.split('.');
                    let nestedValue = finding;
                    for (const key of keys) {
                        if (nestedValue && typeof nestedValue === 'object') {
                            nestedValue = nestedValue[key];
                        } else {
                            nestedValue = null;
                            break;
                        }
                    }
                    rowValue = nestedValue;
                }
            }
        } else {
            // For complex array parameters, get data from JavaScript variable
            if (complexArrayParams.includes(param)) {
                const findingId = row.getAttribute('data-finding-id');
                if (findingId && window.findingsData) {
                    const finding = window.findingsData.find(f => f.id == findingId);
                    if (finding && finding[param]) {
                        rowValue = finding[param];
                    }
                }
            } else {
                // Try multiple sources for data
                let found = false;
                
                // Try dataset first
                if (row.dataset[dataAttr]) {
                    rowValue = row.dataset[dataAttr];
                    found = true;
                } else {
                    // Try data attributes
                    const attrValue = row.getAttribute(`data-${dataAttr}`);
                    if (attrValue !== null) {
                        rowValue = attrValue;
                        found = true;
                    } else {
                        // Try JavaScript variable as fallback
                        const findingId = row.getAttribute('data-finding-id');
                        if (findingId && window.findingsData) {
                            const finding = window.findingsData.find(f => f.id == findingId);
                            if (finding && finding[param] !== undefined) {
                                rowValue = finding[param];
                                found = true;
                            }
                        }
                    }
                }
                
                // If still no data found, try alternative attribute names
                if (!found) {
                    const altNames = [param, param.replace(/_/g, '-'), param.replace(/_/g, '')];
                    for (const altName of altNames) {
                        const altValue = row.getAttribute(`data-${altName}`);
                        if (altValue !== null) {
                            rowValue = altValue;
                            found = true;
                            break;
                        }
                    }
                }
            }
        }
        
        if (rowValue === null || rowValue === undefined) {
            // Handle null/undefined values based on what we're looking for
            if (value === 'null' || value === '' || value === 'undefined') {
                return true;
            }
            return false;
        }
        
        // Convert value based on parameter type
        
        let convertedRowValue = rowValue;
        let convertedFilterValue = value;
        
        if (numericParams.includes(param)) {
            convertedRowValue = parseFloat(rowValue);
            convertedFilterValue = parseFloat(value);
            
            if (isNaN(convertedRowValue) || isNaN(convertedFilterValue)) {
                return false;
            }
        } else if (booleanParams.includes(param)) {
            // Handle boolean conversion more robustly
            // HTML data attributes store booleans as strings
            convertedRowValue = String(rowValue).toLowerCase() === 'true' || rowValue === true || rowValue === 1;
            convertedFilterValue = String(value).toLowerCase() === 'true' || value === true || value === 1;
        } else if (dateParams.includes(param)) {
            // Handle date comparison
            const rowDate = new Date(rowValue);
            const filterDate = new Date(value);
            
            if (isNaN(rowDate.getTime()) || isNaN(filterDate.getTime())) {
                return false;
            }
            
            // Compare dates (ignore time)
            const rowDateOnly = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
            const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
            
            convertedRowValue = rowDateOnly.getTime();
            convertedFilterValue = filterDateOnly.getTime();
        } else if (arrayParams.includes(param)) {
            // Handle simple array parameters (like tags)
            if (Array.isArray(rowValue)) {
                convertedRowValue = rowValue;
            } else if (typeof rowValue === 'string') {
                try {
                    convertedRowValue = JSON.parse(rowValue);
                } catch (e) {
                    convertedRowValue = [rowValue];
                }
            } else {
                convertedRowValue = [];
            }
            convertedFilterValue = value;
        } else if (complexArrayParams.includes(param)) {
            // Handle complex array parameters (like name_servers_data, mail_servers_data)
            // Data is already parsed from JavaScript variable
            if (Array.isArray(rowValue)) {
                convertedRowValue = rowValue;
            } else {
                convertedRowValue = [];
            }
            convertedFilterValue = value;
            
        } else {
            // Handle string parameters
            convertedRowValue = String(rowValue).toLowerCase();
            convertedFilterValue = String(value).toLowerCase();
        }
        
        // Apply operator
        switch (operator) {
            case 'equals':
                if (arrayParams.includes(param)) {
                    return convertedRowValue.includes(convertedFilterValue);
                } else if (complexArrayParams.includes(param)) {
                    return convertedRowValue.some(server => {
                        // Check if any server object has a property that exactly matches (case-insensitive)
                        return Object.values(server).some(prop => 
                            String(prop).toLowerCase() === convertedFilterValue.toLowerCase()
                        );
                    });
                }
                return convertedRowValue === convertedFilterValue;
            case 'not_equals':
                if (arrayParams.includes(param)) {
                    return !convertedRowValue.includes(convertedFilterValue);
                } else if (complexArrayParams.includes(param)) {
                    return !convertedRowValue.some(server => {
                        // Check if any server object has a property that exactly matches (case-insensitive)
                        return Object.values(server).some(prop => 
                            String(prop).toLowerCase() === convertedFilterValue.toLowerCase()
                        );
                    });
                }
                return convertedRowValue !== convertedFilterValue;
            case 'greater_than':
                return convertedRowValue > convertedFilterValue;
            case 'less_than':
                return convertedRowValue < convertedFilterValue;
            case 'greater_equal':
                return convertedRowValue >= convertedFilterValue;
            case 'less_equal':
                return convertedRowValue <= convertedFilterValue;
            case 'contains':
                if (arrayParams.includes(param)) {
                    return convertedRowValue.some(item => 
                        String(item).toLowerCase().includes(String(convertedFilterValue).toLowerCase())
                    );
                } else if (complexArrayParams.includes(param)) {
                    return convertedRowValue.some(server => {
                        // Search in all properties of the server object
                        return Object.values(server).some(prop => 
                            String(prop).toLowerCase().includes(convertedFilterValue)
                        );
                    });
                }
                return String(convertedRowValue).toLowerCase().includes(String(convertedFilterValue).toLowerCase());
            case 'not_contains':
                if (arrayParams.includes(param)) {
                    return !convertedRowValue.some(item => 
                        String(item).toLowerCase().includes(String(convertedFilterValue).toLowerCase())
                    );
                } else if (complexArrayParams.includes(param)) {
                    return !convertedRowValue.some(server => {
                        // Search in all properties of the server object
                        return Object.values(server).some(prop => 
                            String(prop).toLowerCase().includes(convertedFilterValue)
                        );
                    });
                }
                return !String(convertedRowValue).toLowerCase().includes(String(convertedFilterValue).toLowerCase());
            case 'starts_with':
                if (complexArrayParams.includes(param)) {
                    return convertedRowValue.some(server => {
                        return Object.values(server).some(prop => 
                            String(prop).toLowerCase().startsWith(convertedFilterValue)
                        );
                    });
                }
                return String(convertedRowValue).toLowerCase().startsWith(String(convertedFilterValue).toLowerCase());
            case 'ends_with':
                if (complexArrayParams.includes(param)) {
                    return convertedRowValue.some(server => {
                        return Object.values(server).some(prop => 
                            String(prop).toLowerCase().endsWith(convertedFilterValue)
                        );
                    });
                }
                return String(convertedRowValue).toLowerCase().endsWith(String(convertedFilterValue).toLowerCase());
            case 'regex':
                try {
                    const regex = new RegExp(convertedFilterValue, 'i');
                    if (complexArrayParams.includes(param)) {
                        return convertedRowValue.some(server => {
                            return Object.values(server).some(prop => 
                                regex.test(String(prop))
                            );
                        });
                    }
                    return regex.test(String(convertedRowValue));
                } catch (e) {
                    console.error('Invalid regex pattern:', convertedFilterValue);
                    return false;
                }
            default:
                return false;
        }
    },

    // Approve finding (opens PhishLabs modal)
    approveFinding: function(findingId) {
        console.log(`Approving finding: ${findingId}`);
        
        try {
            // Get finding data from DOM
            const row = document.querySelector(`tr[data-finding-id="${findingId}"]`);
            if (!row) {
                DTMonitor.notification.show('Finding not found', 'error');
                return;
            }
            
            const status = row.dataset.status;
            if (status === 'approved') {
                DTMonitor.notification.show('Cannot approve already approved finding', 'warning');
                return;
            }
            if (status === 'rejected') {
                DTMonitor.notification.show('Cannot approve already rejected finding', 'warning');
                return;
            }
            
            const finding = {
                id: row.dataset.findingId,
                domain_name: row.dataset.domain,
                risk_score: parseInt(row.dataset.risk) || 0,
                status: row.dataset.status,
                hash_id: row.dataset.hash,
                hash_name: row.dataset['hash-name'],
                first_seen: row.dataset['first-seen'],
                registrar: row.dataset.registrar,
                ip_country: row.dataset.country,
                asrm_triggered: row.dataset['asrm-triggered'] === 'true',
                pl_submission: row.dataset['pl-submission'] === 'true'
            };
            
            // Show PhishLabs submission modal
            this.openPhishLabsModal([finding], 'approve');
            
        } catch (error) {
            console.error('Error approving finding:', error);
            DTMonitor.notification.show('Error approving finding', 'error');
        }
    },

    // Reject finding
    rejectFinding: function(findingId) {
        console.log(`Rejecting finding: ${findingId}`);
        
        try {
            // Get finding data from DOM
            const row = document.querySelector(`tr[data-finding-id="${findingId}"]`);
            if (!row) {
                DTMonitor.notification.show('Finding not found', 'error');
                return;
            }
            
            const status = row.dataset.status;
            if (status === 'rejected') {
                DTMonitor.notification.show('Cannot reject already rejected finding', 'warning');
                return;
            }
            if (status === 'approved') {
                DTMonitor.notification.show('Cannot reject already approved finding', 'warning');
                return;
            }
            
            // Update status to rejected with additional data
            this.updateStatus(findingId, 'rejected', {
                asrm_triggered: false,
                pl_submission: false,
                rejected: true,
                rejection_reason: 'Manually rejected by user',
                rejected_by: 'user',
                rejection_timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error rejecting finding:', error);
            DTMonitor.notification.show('Error rejecting finding', 'error');
        }
    },

    // Update finding status with additional data
    updateStatus: function(findingId, status, additionalData = {}) {
        console.log(`Updating finding ${findingId} to status: ${status}`);
        console.log('updateStatus called with additionalData:', additionalData);
        
        // Show loading state
        const row = document.querySelector(`tr[data-finding-id="${findingId}"]`);
        if (row) {
            const statusCell = row.querySelector('.status-cell');
            if (statusCell) {
                statusCell.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            }
        }

        // Prepare update data
        const updateData = {
            id: findingId,
            status: status,
            ...additionalData
        };

        // Send update request
        fetch('/api/findings/update-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                // Update the row data attribute
                if (row) {
                    row.setAttribute('data-status', status);
                    
                    // Update additional data attributes
                    if (additionalData.asrm_triggered !== undefined) {
                        row.setAttribute('data-asrm-triggered', additionalData.asrm_triggered.toString());
                    }
                    if (additionalData.pl_submission !== undefined) {
                        row.setAttribute('data-pl-submission', additionalData.pl_submission.toString());
                    }
                    if (additionalData.rejected !== undefined) {
                        row.setAttribute('data-rejected', additionalData.rejected.toString());
                    }
                    if (additionalData.phishlabs_case_number) {
                        row.setAttribute('data-phishlabs-case-number', additionalData.phishlabs_case_number);
                    }
                    
                    // Update status cell with proper badge
                    const statusCell = row.querySelector('.status-cell');
                    if (statusCell) {
                        const statusClass = status === 'approved' ? 'status-approved' : 
                                          status === 'rejected' ? 'status-rejected' : 'status-pending';
                        statusCell.innerHTML = `<span class="status-badge ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
                    }
                    
                    // Update action buttons based on status
                    console.log('Updating action buttons for status:', status);
                    this.updateActionButtons(row, status, findingId);
                    console.log('Action buttons updated successfully');
                }
                
                // Show success notification
                if (typeof DTMonitor !== 'undefined' && DTMonitor.notification) {
                    DTMonitor.notification.show(`Finding ${status} successfully`, 'success');
                } else {
                    alert(`Finding ${status} successfully`);
                }
                
                // Refresh filters to update counts
                this.applyFilters();
            } else {
                throw new Error(result.message || 'Failed to update status');
            }
        })
        .catch(error => {
            console.error('Error updating finding status:', error);
            
            // Revert status cell
            if (row) {
                const statusCell = row.querySelector('.status-cell');
                if (statusCell) {
                    const currentStatus = row.getAttribute('data-status') || 'pending';
                    const statusClass = currentStatus === 'approved' ? 'approved' : 
                                      currentStatus === 'rejected' ? 'rejected' : 'pending';
                    statusCell.innerHTML = `<span class="status-badge ${statusClass}">${currentStatus}</span>`;
                }
            }
            
            // Show error notification
            if (typeof DTMonitor !== 'undefined' && DTMonitor.notification) {
                DTMonitor.notification.show(`Failed to update finding: ${error.message}`, 'error');
            } else {
                alert(`Failed to update finding: ${error.message}`);
            }
        });
    },

    // Update action buttons based on finding status
    updateActionButtons: function(findingRow, status, findingId) {
        console.log('Updating action buttons for status:', status);
        console.log('Finding row:', findingRow);
        console.log('Finding ID:', findingId);
        
        const actionsCell = findingRow.querySelector('.actions-cell') || findingRow.querySelector('.action-cell');
        console.log('Actions cell found:', actionsCell);
        if (!actionsCell) {
            console.error('No actions cell found for finding row');
            return;
        }
        
        let actionButtons = '';
        
        switch (status) {
            case 'approved':
                actionButtons = `
                    <div class="action-buttons">
                        <button onclick="showMetadata('${findingId}')" 
                                class="btn btn-info" title="View Metadata">
                            <i class="fas fa-info"></i>
                        </button>
                    </div>
                `;
                break;
                
            case 'rejected':
                actionButtons = `
                    <div class="action-buttons">
                        <button onclick="showMetadata('${findingId}')" 
                                class="btn btn-info" title="View Metadata">
                            <i class="fas fa-info"></i>
                        </button>
                    </div>
                `;
                break;
                
            case 'pending':
            default:
                actionButtons = `
                    <div class="action-buttons">
                        <button onclick="approveFinding('${findingId}')" 
                                class="btn btn-success" title="Approve & Submit to PhishLabs">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="rejectFinding('${findingId}')" 
                                class="btn btn-danger" title="Reject Finding">
                            <i class="fas fa-times"></i>
                        </button>
                        <button onclick="showMetadata('${findingId}')" 
                                class="btn btn-info" title="View Metadata">
                            <i class="fas fa-info"></i>
                        </button>
                    </div>
                `;
                break;
        }
        
        actionsCell.innerHTML = actionButtons;
    },

    // Show finding metadata/details
    showMetadata: function(findingId) {
        console.log(`Showing metadata for finding: ${findingId}`);
        
        // Find the finding data from window.findingsData
        const finding = window.findingsData ? window.findingsData.find(f => f.id === findingId) : null;
        if (!finding) {
            console.error('Finding not found:', findingId);
            DTMonitor.notification.show('Finding not found', 'error');
            return;
        }

        // Get the existing modal
        const modal = document.getElementById('findingDetailsModal');
        const content = document.getElementById('findingDetailsContent');
        
        if (!modal || !content) {
            console.error('Finding details modal not found in DOM');
            return;
        }

        // Update modal title
        const headerText = modal.querySelector('.header-text h2');
        if (headerText) {
            headerText.textContent = `Finding Details - ${finding.domain_name}`;
        }

        // Create modern organized content
        const contentHtml = this.generateFindingDetailsContent(finding);

        // Update content
        content.innerHTML = contentHtml;

        // Show modal
        modal.style.display = 'block';
    },

    // Generate finding details content
    generateFindingDetailsContent: function(finding) {
        return `
            <div class="finding-details-table">
                <!-- Header Row with Key Info -->
                <div class="header-row">
                    <div class="domain-cell">${finding.domain_name || 'N/A'}</div>
                    <div class="status-cell">
                        <span class="status-badge status-${finding.status || 'pending'}">${finding.status || 'pending'}</span>
                    </div>
                    <div class="risk-cell">
                        <span class="risk-score risk-${this.getRiskLevel(finding.risk_score)}">${finding.risk_score || 'N/A'}</span>
                    </div>
                </div>

                <!-- Data Table -->
                <table class="details-table">
                    <tbody>
                        ${this.renderTableRow('Hash', finding.hash_name)}
                        ${this.renderTableRow('First Seen', this.formatDateCompact(finding.first_seen))}
                        ${this.renderTableRow('IP Address', finding.ip_address)}
                        ${this.renderTableRow('Country', finding.ip_country?.toUpperCase())}
                        ${this.renderTableRow('Registrar', finding.registrar)}
                        ${this.renderTableRow('Created', this.formatDateCompact(finding.create_date))}
                        ${this.renderTableRow('Expires', this.formatDateCompact(finding.expiration_date))}
                        ${this.renderTableRow('ISP', finding.ip_isp)}
                        ${this.renderTableRow('ASN', finding.ip_asn)}
                        ${this.renderTableRow('Website Title', finding.website_title)}
                        ${this.renderContactRows(finding)}
                        ${this.renderThreatRows(finding.threat_profile)}
                        ${this.renderServerRows(finding)}
                        ${this.renderSSLRows(finding.ssl_certificates)}
                        ${this.renderASRMRows(finding)}
                        ${this.renderPhishLabsRows(finding)}
                    </tbody>
                </table>

                ${this.renderInlineTags(finding.tags)}
            </div>
        `;
    },

    // Helper functions for finding details
    getRiskLevel: function(score) {
        if (!score) return 'unknown';
        if (score >= 80) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    },

    formatDate: function(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (e) {
            return dateStr;
        }
    },

    formatDateCompact: function(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString();
        } catch (e) {
            return dateStr;
        }
    },

    formatLocation: function(contact) {
        if (!contact) return 'N/A';
        const parts = [];
        if (contact.city) parts.push(contact.city);
        if (contact.state) parts.push(contact.state);
        if (contact.country) parts.push(contact.country.toUpperCase());
        return parts.length > 0 ? parts.join(', ') : 'N/A';
    },

    // Table-based render functions
    renderTableRow: function(label, value) {
        if (!value || value === 'N/A') return '';
        return `
            <tr>
                <td class="label-cell">${label}</td>
                <td class="value-cell">${value}</td>
            </tr>
        `;
    },

    renderContactRows: function(finding) {
        let rows = '';
        const adminContact = finding.admin_contact;
        const regContact = finding.registrant_contact;
        
        if (adminContact) {
            if (adminContact.name) rows += this.renderTableRow('Admin Name', adminContact.name);
            if (adminContact.org) rows += this.renderTableRow('Admin Org', adminContact.org);
            if (adminContact.email && adminContact.email.length > 0) rows += this.renderTableRow('Admin Email', adminContact.email[0]);
        }
        if (regContact) {
            if (regContact.name && regContact.name !== adminContact?.name) rows += this.renderTableRow('Reg Name', regContact.name);
            if (regContact.org && regContact.org !== adminContact?.org) rows += this.renderTableRow('Reg Org', regContact.org);
        }
        
        return rows;
    },

    renderThreatRows: function(threatProfile) {
        if (!threatProfile) return '';
        
        let rows = '';
        if (threatProfile.phishing?.score) rows += this.renderTableRow('Phishing Score', threatProfile.phishing.score);
        if (threatProfile.malware?.score) rows += this.renderTableRow('Malware Score', threatProfile.malware.score);
        if (threatProfile.spam?.score) rows += this.renderTableRow('Spam Score', threatProfile.spam.score);
        
        return rows;
    },

    renderServerRows: function(finding) {
        let rows = '';
        
        if (finding.name_servers_data && finding.name_servers_data.length > 0) {
            rows += this.renderTableRow('Name Servers', finding.name_servers_data.map(ns => ns.host).join(', '));
        }
        
        if (finding.mail_servers_data && finding.mail_servers_data.length > 0) {
            rows += this.renderTableRow('Mail Servers', finding.mail_servers_data.map(ms => ms.host).join(', '));
        }
        
        return rows;
    },

    renderSSLRows: function(certificates) {
        if (!certificates || certificates.length === 0) return '';
        
        let rows = '';
        certificates.forEach((cert, index) => {
            if (cert.subject) rows += this.renderTableRow(`SSL Cert ${index + 1}`, cert.subject);
            if (cert.issuer) rows += this.renderTableRow(`SSL Issuer ${index + 1}`, cert.issuer);
        });
        
        return rows;
    },

    renderASRMRows: function(finding) {
        if (!finding.asrm_triggered && !finding.asrm_rule_applied) return '';
        
        let rows = '';
        rows += this.renderTableRow('ASRM Triggered', finding.asrm_triggered ? 'Yes' : 'No');
        if (finding.asrm_rule_applied) rows += this.renderTableRow('ASRM Rule', finding.asrm_rule_applied);
        
        return rows;
    },

    renderPhishLabsRows: function(finding) {
        if (!finding.phishlabs_case_number && !finding.pl_submission) return '';
        
        let rows = '';
        rows += this.renderTableRow('PhishLabs Submitted', finding.pl_submission ? 'Yes' : 'No');
        if (finding.phishlabs_case_number) rows += this.renderTableRow('PhishLabs Case #', finding.phishlabs_case_number);
        
        return rows;
    },

    renderInlineTags: function(tags) {
        if (!tags || tags.length === 0) return '';
        
        return `
            <div class="inline-tags">
                <strong>Tags:</strong> ${tags.map(tag => `<span class="inline-tag">${tag}</span>`).join(' ')}
            </div>
        `;
    },

    // Close finding details modal
    closeFindingDetailsModal: function() {
        const modal = document.getElementById('findingDetailsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Open PhishLabs submission modal
    openPhishLabsModal: async function(findings, action = 'approve') {
        console.log('Opening PhishLabs modal for findings:', findings);
        
        if (!findings || findings.length === 0) {
            DTMonitor.notification.show('No findings selected', 'error');
            return;
        }
        
        // Validate findings status before opening modal
        const validFindings = [];
        const invalidFindings = [];
        
        findings.forEach(finding => {
            const status = finding.status;
            if (status === 'approved') {
                invalidFindings.push(`${finding.domain_name} (already approved)`);
            } else if (status === 'rejected') {
                invalidFindings.push(`${finding.domain_name} (already rejected)`);
            } else {
                validFindings.push(finding);
            }
        });
        
        // Show warnings for invalid findings
        if (invalidFindings.length > 0) {
            DTMonitor.notification.show(
                `Cannot submit findings: ${invalidFindings.join(', ')}`, 
                'warning'
            );
        }
        
        // Only proceed if there are valid findings
        if (validFindings.length === 0) {
            DTMonitor.notification.show('No valid findings to submit', 'error');
            return;
        }
        
        // Show modal
        const modal = document.getElementById('phishlabsModal');
        if (!modal) {
            DTMonitor.notification.show('PhishLabs modal not found', 'error');
            console.error('PhishLabs modal element not found');
            return;
        }
        
        // Load PhishLabs data before showing modal
        try {
            await Promise.all([
                this.loadPhishLabsBrandsForModal(),
                this.loadPhishLabsThreatTypesForModal()
            ]);
            
            // Set up case type toggle
            const caseTypeSelect = document.getElementById('phishlabsCaseType');
            if (caseTypeSelect) {
                caseTypeSelect.onchange = () => this.togglePhishLabsFields();
                // Initialize field visibility
                this.togglePhishLabsFields();
            }
            
            modal.style.display = 'block';
        } catch (error) {
            console.error('Failed to load PhishLabs modal data:', error);
            modal.style.display = 'block'; // Show modal anyway
        }
        
        // Update modal title based on action
        const title = modal.querySelector('.header-text h2');
        if (title) {
            title.textContent = action === 'reject' ? 'Reject Findings' : 'Submit to PhishLabs';
        }
        
        // Handle single vs multiple findings
        if (validFindings.length === 1) {
            this.populateSingleFindingModal(validFindings[0]);
        } else {
            this.populateMultipleFindingsModal(validFindings);
        }
    },
    
    // Populate modal for single finding
    populateSingleFindingModal: function(finding) {
        console.log('Populating single finding modal for:', finding);
        
        // Hide multiple findings section
        const multipleSection = document.getElementById('multipleFindingsSection');
        if (multipleSection) {
            multipleSection.style.display = 'none';
        }
        
        // Show single finding section
        const singleSection = document.getElementById('singleFindingSection');
        if (singleSection) {
            singleSection.style.display = 'block';
        }
        
        // Populate single finding fields
        const findingIdField = document.getElementById('phishlabsFindingId');
        const domainField = document.getElementById('phishlabsDomain');
        const urlPathField = document.getElementById('phishlabsUrlPath');
        
        if (findingIdField) findingIdField.value = finding.id || '';
        if (domainField) domainField.value = finding.domain_name || '';
        if (urlPathField) urlPathField.value = '';
    },
    
    // Populate modal for multiple findings
    populateMultipleFindingsModal: function(findings) {
        console.log('Populating multiple findings modal for:', findings);
        
        // Store bulk findings data for form submission
        window.bulkFindingsData = findings;
        
        // Hide single finding section
        const singleSection = document.getElementById('singleFindingSection');
        if (singleSection) {
            singleSection.style.display = 'none';
        }
        
        // Show multiple findings section
        const multipleSection = document.getElementById('multipleFindingsSection');
        if (multipleSection) {
            multipleSection.style.display = 'block';
        }
        
        // Clear existing multiple findings
        const container = document.getElementById('multipleFindingsContainer');
        if (!container) {
            console.error('Multiple findings container not found');
            return;
        }
        
        container.innerHTML = '';
        
        // Add each finding as a row
        findings.forEach((finding, index) => {
            const row = document.createElement('div');
            row.className = 'finding-row';
            row.innerHTML = `
                <div class="form-group compact">
                    <label>Domain/URL ${index + 1}</label>
                    <div class="domain-url-input">
                        <input type="text" name="domain_${index}" value="${finding.domain_name || ''}" readonly>
                        <input type="text" name="urlPath_${index}" placeholder="/path" class="url-path-input">
                    </div>
                    <input type="hidden" name="findingId_${index}" value="${finding.id || ''}">
                </div>
            `;
            container.appendChild(row);
        });
    },
    
    // Toggle PhishLabs fields based on case type
    togglePhishLabsFields: function() {
        const caseType = document.getElementById('phishlabsCaseType')?.value;
        const threatCaseFields = document.getElementById('threatCaseFields');
        const domainCaseFields = document.getElementById('domainCaseFields');
        
        if (caseType === 'threat') {
            if (threatCaseFields) threatCaseFields.style.display = 'block';
            if (domainCaseFields) domainCaseFields.style.display = 'none';
        } else if (caseType === 'domain') {
            if (threatCaseFields) threatCaseFields.style.display = 'none';
            if (domainCaseFields) domainCaseFields.style.display = 'block';
        } else {
            if (threatCaseFields) threatCaseFields.style.display = 'none';
            if (domainCaseFields) domainCaseFields.style.display = 'none';
        }
    },
    
    // Load PhishLabs brands for modal
    loadPhishLabsBrandsForModal: async function() {
        try {
            const response = await fetch('/api/phishlabs/brands');
            const brands = await response.json();
            const select = document.getElementById('phishlabsBrand');
            if (select && Array.isArray(brands)) {
                select.innerHTML = '<option value="">Select Brand</option>';
                brands.forEach(brand => {
                    const option = document.createElement('option');
                    option.value = brand.id || brand.brandId;
                    option.textContent = brand.name || brand.brandName;
                    select.appendChild(option);
                });
                console.log(`Loaded ${brands.length} brands for PhishLabs modal`);
            }
        } catch (error) {
            console.error('Failed to load PhishLabs brands:', error);
        }
    },
    
    // Load PhishLabs threat types for modal
    loadPhishLabsThreatTypesForModal: async function() {
        try {
            const response = await fetch('/api/phishlabs/threat-types');
            const threatTypes = await response.json();
            const select = document.getElementById('phishlabsThreatType');
            if (select && Array.isArray(threatTypes)) {
                select.innerHTML = '<option value="">Select Threat Type</option>';
                threatTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id || type.threatTypeId;
                    option.textContent = type.name || type.threatTypeName;
                    select.appendChild(option);
                });
                console.log(`Loaded ${threatTypes.length} threat types for PhishLabs modal`);
            }
        } catch (error) {
            console.error('Failed to load PhishLabs threat types:', error);
        }
    },
    
    // Submit bulk PhishLabs form
    submitBulkPhishLabsForm: async function(formData) {
        const findings = window.bulkFindingsData;
        if (!findings || findings.length === 0) {
            DTMonitor.notification.show('No findings data found for bulk submission', 'error');
            return;
        }
        
        // Get form values
        const submissionData = {
            brand: formData.get('brand') || document.getElementById('phishlabsBrand')?.value,
            caseType: formData.get('caseType') || document.getElementById('phishlabsCaseType')?.value,
            threatType: formData.get('threatType') || document.getElementById('phishlabsThreatType')?.value,
            threatCategory: formData.get('threatCategory') || document.getElementById('phishlabsThreatCategory')?.value,
            description: formData.get('description') || document.getElementById('phishlabsDescription')?.value,
            malwareType: formData.get('malwareType') || document.getElementById('phishlabsMalwareType')?.value,
            findings: findings // Include all findings
        };
        
        // Validate required fields
        if (!submissionData.brand || !submissionData.caseType) {
            DTMonitor.notification.show('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            console.log('Submitting bulk PhishLabs submission:', submissionData);
            
            // Submit to PhishLabs
            const response = await fetch('/api/findings/submit-phishlabs-bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                console.log('Bulk PhishLabs submission successful:', result);
                
                // Show success notification with case numbers
                const caseNumbers = result.case_numbers || [];
                let message = `Successfully submitted ${findings.length} findings to PhishLabs!`;
                if (caseNumbers.length > 0) {
                    message += `\nCase numbers: ${caseNumbers.join(', ')}`;
                }
                
                DTMonitor.notification.show(message, 'success');
                
                // Close modal
                this.closePhishLabsModal();
                
                // Clear bulk findings data
                window.bulkFindingsData = null;
                
                // Update UI for each finding
                findings.forEach((finding, index) => {
                    const caseNumber = caseNumbers[index] || 'Unknown';
                    this.updateStatus(finding.id, 'approved', {
                        asrm_triggered: false,
                        pl_submission: true,
                        phishlabs_case_number: caseNumber,
                        phishlabs_submission_timestamp: new Date().toISOString(),
                        phishlabs_submission_method: 'bulk_manual'
                    });
                });
                
                // Clear selection after bulk action
                this.selectedFindings.clear();
                this.updateBulkActions();
                this.updateSelectAllCheckbox();
                
            } else {
                throw new Error(result.message || 'Failed to submit to PhishLabs');
            }
            
        } catch (error) {
            console.error('Error submitting bulk to PhishLabs:', error);
            DTMonitor.notification.show(`Error submitting to PhishLabs: ${error.message}`, 'error');
        }
    },
    
    // Close PhishLabs modal
    closePhishLabsModal: function() {
        const modal = document.getElementById('phishlabsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Handle PhishLabs form submission
    submitPhishLabsForm: async function(event) {
        event.preventDefault();
        
        const form = document.getElementById('phishlabsForm');
        const formData = new FormData(form);
        
        // Check if this is a bulk submission
        const isBulkSubmission = window.bulkFindingsData && window.bulkFindingsData.length > 0;
        
        if (isBulkSubmission) {
            console.log('Processing bulk PhishLabs submission for', window.bulkFindingsData.length, 'findings');
            await this.submitBulkPhishLabsForm(formData);
            return;
        }
        
        // Single finding submission
        const findingId = formData.get('findingId') || document.getElementById('phishlabsFindingId')?.value;
        
        if (!findingId) {
            DTMonitor.notification.show('Finding ID not found', 'error');
            return;
        }
        
        // Get form values
        const submissionData = {
            finding_id: findingId,
            domain: formData.get('domain') || document.getElementById('phishlabsDomain')?.value,
            urlPath: formData.get('urlPath') || document.getElementById('phishlabsUrlPath')?.value,
            brand: formData.get('brand') || document.getElementById('phishlabsBrand')?.value,
            caseType: formData.get('caseType') || document.getElementById('phishlabsCaseType')?.value,
            threatType: formData.get('threatType') || document.getElementById('phishlabsThreatType')?.value,
            threatCategory: formData.get('threatCategory') || document.getElementById('phishlabsThreatCategory')?.value,
            description: formData.get('description') || document.getElementById('phishlabsDescription')?.value,
            malwareType: formData.get('malwareType') || document.getElementById('phishlabsMalwareType')?.value
        };
        
        // Validate required fields
        if (!submissionData.domain || !submissionData.brand || !submissionData.caseType) {
            DTMonitor.notification.show('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            // Submit to PhishLabs
            const response = await fetch('/api/findings/submit-phishlabs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Close modal
                this.closePhishLabsModal();
                
                // Update finding status to approved
                this.updateStatus(findingId, 'approved', {
                    asrm_triggered: false,
                    pl_submission: true,
                    rejected: false,
                    approved_by: 'user',
                    approval_timestamp: new Date().toISOString(),
                    phishlabs_case_number: result.case_number || 'N/A',
                    phishlabs_submission_method: 'manual'
                });
                
                // Show success notification
                DTMonitor.notification.show(`Finding submitted to PhishLabs successfully${result.case_number ? ` (Case: ${result.case_number})` : ''}`, 'success');
            } else {
                DTMonitor.notification.show(`Failed to submit to PhishLabs: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error submitting to PhishLabs:', error);
            DTMonitor.notification.show('Error submitting to PhishLabs', 'error');
        }
    },

    // Toggle tag selection field
    toggleTagSelection: function() {
        const checkbox = document.getElementById('phishlabsAddTag');
        const tagField = document.getElementById('tagSelectionField');
        
        if (checkbox && tagField) {
            if (checkbox.checked) {
                tagField.style.display = 'block';
                this.loadAvailableTags();
            } else {
                tagField.style.display = 'none';
                this.resetTagSelection();
            }
        }
    },
    
    // Load available tags from backend
    loadAvailableTags: async function() {
        try {
            const response = await fetch('/api/tags/list');
            const data = await response.json();
            if (data.success && data.tags) {
                this.populateTagSelect(data.tags);
            } else {
                console.warn('No tags available or failed to load tags');
            }
        } catch (error) {
            console.error('Error loading tags:', error);
            DTMonitor.notification.show('Failed to load available tags', 'error');
        }
    },
    
    // Populate tag select dropdown
    populateTagSelect: function(tags) {
        const tagSelect = document.getElementById('phishlabsTagSelect');
        if (!tagSelect) return;
        
        // Clear existing options except the first two
        while (tagSelect.children.length > 2) {
            tagSelect.removeChild(tagSelect.lastChild);
        }
        
        // Add tag options
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.id;
            option.textContent = tag.name;
            tagSelect.appendChild(option);
        });
    },
    
    // Handle tag selection change
    handleTagSelection: function() {
        const tagSelect = document.getElementById('phishlabsTagSelect');
        const newTagField = document.getElementById('newTagField');
        
        if (tagSelect && newTagField) {
            if (tagSelect.value === '__new__') {
                newTagField.style.display = 'flex';
            } else {
                newTagField.style.display = 'none';
            }
        }
    },
    
    // Create new tag
    createNewTag: async function() {
        const newTagInput = document.getElementById('phishlabsNewTag');
        const tagName = newTagInput?.value?.trim();
        
        if (!tagName) {
            DTMonitor.notification.show('Please enter a tag name', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/tags/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: tagName })
            });
            
            const data = await response.json();
            if (data.success) {
                DTMonitor.notification.show(`Tag "${tagName}" created successfully`, 'success');
                
                // Reload tags and select the new one
                await this.loadAvailableTags();
                
                // Select the newly created tag
                const tagSelect = document.getElementById('phishlabsTagSelect');
                if (tagSelect) {
                    tagSelect.value = data.tag.id;
                }
                
                // Hide new tag field
                const newTagField = document.getElementById('newTagField');
                if (newTagField) {
                    newTagField.style.display = 'none';
                }
                
                // Clear input
                if (newTagInput) {
                    newTagInput.value = '';
                }
            } else {
                DTMonitor.notification.show(`Failed to create tag: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error creating tag:', error);
            DTMonitor.notification.show('Failed to create tag: ' + error.message, 'error');
        }
    },
    
    // Reset tag selection
    resetTagSelection: function() {
        const tagSelect = document.getElementById('phishlabsTagSelect');
        const newTagField = document.getElementById('newTagField');
        const newTagInput = document.getElementById('phishlabsNewTag');
        const checkbox = document.getElementById('phishlabsAddTag');
        
        if (tagSelect) tagSelect.value = '';
        if (newTagField) newTagField.style.display = 'none';
        if (newTagInput) newTagInput.value = '';
        if (checkbox) checkbox.checked = false;
    },

    // Submit finding to PhishLabs
    submitToPhishLabs: function(findingId, findingData = null) {
        console.log(`Submitting finding ${findingId} to PhishLabs`);
        
        // Show loading state
        const row = document.querySelector(`tr[data-finding-id="${findingId}"]`);
        if (row) {
            const actionCell = row.querySelector('.action-cell');
            if (actionCell) {
                actionCell.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            }
        }

        // Send submission request
        fetch('/api/findings/submit-phishlabs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                finding_id: findingId
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                // Update the row data attribute
                if (row) {
                    row.setAttribute('data-pl-submission', 'true');
                    if (result.case_number) {
                        row.setAttribute('data-phishlabs-case-number', result.case_number);
                    }
                    
                    // Update action buttons
                    const actionCell = row.querySelector('.action-cell');
                    if (actionCell) {
                        actionCell.innerHTML = `
                            <button class="btn btn-sm btn-success" disabled>
                                <i class="fas fa-check"></i> Submitted
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="showMetadata('${findingId}')">
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                        `;
                    }
                }
                
                // Update finding status to approved if this was called from approveFinding
                if (findingData) {
                    this.updateStatus(findingId, 'approved', {
                        asrm_triggered: false,
                        pl_submission: true,
                        rejected: false,
                        approved_by: 'user',
                        approval_timestamp: new Date().toISOString(),
                        phishlabs_case_number: result.case_number || 'N/A',
                        phishlabs_submission_method: 'manual'
                    });
                }
                
                // Show success notification
                if (typeof DTMonitor !== 'undefined' && DTMonitor.notification) {
                    DTMonitor.notification.show(`Finding submitted to PhishLabs successfully${result.case_number ? ` (Case: ${result.case_number})` : ''}`, 'success');
                } else {
                    alert(`Finding submitted to PhishLabs successfully${result.case_number ? ` (Case: ${result.case_number})` : ''}`);
                }
            } else {
                throw new Error(result.message || 'Failed to submit to PhishLabs');
            }
        })
        .catch(error => {
            console.error('Error submitting to PhishLabs:', error);
            
            // Revert action cell
            if (row) {
                const actionCell = row.querySelector('.action-cell');
                if (actionCell) {
                    const currentStatus = row.getAttribute('data-status') || 'pending';
                    if (currentStatus === 'approved') {
                        actionCell.innerHTML = `
                            <button class="btn btn-sm btn-primary" onclick="submitToPhishLabsDirect('${findingId}')">
                                <i class="fas fa-paper-plane"></i> Submit to PhishLabs
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="showMetadata('${findingId}')">
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                        `;
                    }
                }
            }
            
            // Show error notification
            if (typeof DTMonitor !== 'undefined' && DTMonitor.notification) {
                DTMonitor.notification.show(`Failed to submit to PhishLabs: ${error.message}`, 'error');
            } else {
                alert(`Failed to submit to PhishLabs: ${error.message}`);
            }
        });
    },

    // Export findings to CSV
    exportToCSV: function() {
        console.log('Exporting findings to CSV');
        
        // Show loading state
        const exportBtn = document.querySelector('[onclick*="exportFindingsToCSV"]');
        if (exportBtn) {
            const originalText = exportBtn.innerHTML;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            exportBtn.disabled = true;
        }

        // Send export request
        fetch('/api/findings/export-csv', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (response.ok) {
                return response.blob();
            } else {
                throw new Error('Export failed');
            }
        })
        .then(blob => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `findings_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // Show success notification
            if (typeof DTMonitor !== 'undefined' && DTMonitor.notification) {
                DTMonitor.notification.show('Findings exported successfully', 'success');
            } else {
                alert('Findings exported successfully');
            }
        })
        .catch(error => {
            console.error('Error exporting findings:', error);
            
            // Show error notification
            if (typeof DTMonitor !== 'undefined' && DTMonitor.notification) {
                DTMonitor.notification.show(`Failed to export findings: ${error.message}`, 'error');
            } else {
                alert(`Failed to export findings: ${error.message}`);
            }
        })
        .finally(() => {
            // Revert button state
            if (exportBtn) {
                exportBtn.innerHTML = '<i class="fas fa-download"></i> Export CSV';
                exportBtn.disabled = false;
            }
        });
    }
};

// Initialize form event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add PhishLabs form submit handler
    const phishlabsForm = document.getElementById('phishlabsForm');
    if (phishlabsForm) {
        phishlabsForm.addEventListener('submit', function(event) {
            if (typeof DTMonitor !== 'undefined' && DTMonitor.findings && DTMonitor.findings.submitPhishLabsForm) {
                DTMonitor.findings.submitPhishLabsForm(event);
            }
        });
    }
});

// Global function wrappers for HTML onclick handlers
function approveFinding(findingId) {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.approveFinding(findingId);
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

function rejectFinding(findingId) {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.rejectFinding(findingId);
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

function showMetadata(findingId) {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.showMetadata(findingId);
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

// Tag-related global function wrappers
function toggleTagSelection() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.toggleTagSelection();
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

function handleTagSelection() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.handleTagSelection();
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

function createNewTag() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.createNewTag();
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

// Export-related global function wrappers
function showExportOptions() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.showExportOptions();
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

function closeExportModal() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.closeExportModal();
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

function executeExport() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.executeExport();
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

function selectAllFields() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.selectAllFields();
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

function deselectAllFields() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.deselectAllFields();
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}

function closeFindingDetailsModal() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.closeFindingDetailsModal();
    } else {
        console.error('Findings management requires DTMonitor to be loaded');
    }
}
