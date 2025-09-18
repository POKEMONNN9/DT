// ===================================================================== //
// DTMonitor API Client - All API Operations & Connection Testing       //
// ===================================================================== //

console.log('=== DTMonitor API Client Loading ===');

// =============================================================================
// API CLIENT
// =============================================================================

DTMonitor.api = {
    baseURL: '/api',
    
    request: async function(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: DTMonitor.config.apiTimeout
        };
        
        const config = { ...defaultOptions, ...options };
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);
            
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please check your connection and try again.');
            }
            
            // Network errors
            if (!navigator.onLine) {
                throw new Error('No internet connection. Please check your network and try again.');
            }
            
            // API-specific error handling
            if (error.message.includes('403')) {
                throw new Error('Authentication failed. Please check your API credentials.');
            } else if (error.message.includes('401')) {
                throw new Error('Invalid credentials. Please verify your API key.');
            } else if (error.message.includes('429')) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            } else if (error.message.includes('500')) {
                throw new Error('Server error. Please try again later or contact support.');
            }
            
            throw error;
        }
    },
    
    get: function(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    post: function(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    put: function(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    delete: function(endpoint, data = {}) {
        return this.request(endpoint, { 
            method: 'DELETE',
            body: data && Object.keys(data).length > 0 ? JSON.stringify(data) : undefined
        });
    },
    
    // Toast notification method for backward compatibility
    showToast: function(message, type = 'info', duration = 5000) {
        console.log(`[TOAST] ${type.toUpperCase()}: ${message}`); // Debug logging
        
        if (DTMonitor.notification && DTMonitor.notification.show) {
            console.log('Using DTMonitor.notification.show');
            DTMonitor.notification.show(message, type, duration);
        } else {
            console.log('DTMonitor.notification not available, falling back to console');
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // Fallback: try to show a simple alert or create basic notification
            try {
                this.showFallbackNotification(message, type);
            } catch (e) {
                console.error('Fallback notification failed:', e);
            }
        }
    },
    
    // Fallback notification method
    showFallbackNotification: function(message, type) {
        // Create a simple notification element if the main system isn't working
        let existingNotification = document.getElementById('fallback-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.id = 'fallback-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    },
    
    // Additional scan functions
    runAllScans: function() { 
        DTMonitor.api.showLoading('Running all scans...');
        DTMonitor.api.post('/scan/all', {})
            .then(response => {
                DTMonitor.api.hideLoading();
                DTMonitor.notification.show('All scans started successfully', 'success');
            })
            .catch(error => {
                DTMonitor.api.hideLoading();
                DTMonitor.notification.show('Failed to start scans: ' + error.message, 'error');
            });
    },
    
    runSelectedScan: function() {
        const selected = document.querySelector('input[name="scanHash"]:checked');
        if (!selected) {
            DTMonitor.notification.show('Please select a hash to scan', 'warning');
            return;
        }
        DTMonitor.scanning.runSingle(selected.value);
    },
    
    viewScanHistory: function() {
        DTMonitor.notification.show('Showing scan history...', 'info');
        if (typeof DTMonitor !== 'undefined' && DTMonitor.scanning) {
            DTMonitor.scanning.viewHistory();
        } else {
            console.log('View scan history requested.');
            window.location.href = '/scan-history';
        }
    },
    
    exportResults: function() {
        if (typeof DTMonitor !== 'undefined' && DTMonitor.scanning) {
            DTMonitor.scanning.exportResults();
        } else {
            console.log('Export results requested.');
            window.location.href = '/api/scanning/export';
        }
    },
    
    // Scheduler functions
    startScheduler: function() {
        DTMonitor.api.post('/scheduler/start', {})
            .then(() => DTMonitor.notification.show('Scheduler started', 'success'))
            .catch(err => DTMonitor.notification.show('Failed to start scheduler', 'error'));
    },
    
    stopScheduler: function() {
        DTMonitor.api.post('/scheduler/stop', {})
            .then(() => DTMonitor.notification.show('Scheduler stopped', 'success'))
            .catch(err => DTMonitor.notification.show('Failed to stop scheduler', 'error'));
    },
    
    refreshSchedulerStatus: function() {
        DTMonitor.api.get('/scheduler/status')
            .then(status => {
                // Update scheduler status display
                DTMonitor.notification.show('Scheduler status refreshed', 'info');
            })
            .catch(err => DTMonitor.notification.show('Failed to get scheduler status', 'error'));
    },
    
    // Export functions
    exportFindingsToCSV: function() {
        window.location.href = '/api/export/findings';
    },
    
    // Settings functions
    saveAllSettings: function() {
        const formData = this.collectAllSettings();
        this.saveSettings(formData);
    },
    
    testDomainToolsConnection: function() {
        const statusIndicator = document.getElementById('api-status');
        if (statusIndicator) {
            statusIndicator.className = 'status-badge warning';
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i> Testing...';
        }
        
        DTMonitor.api.get('/test/domaintools')
            .then(result => {
                DTMonitor.notification.show('DomainTools connection successful', 'success');
                if (statusIndicator) {
                    statusIndicator.className = 'status-badge success';
                    statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
                }
            })
            .catch(error => {
                // Check if it's a 400 error (API reachable but invalid credentials)
                if (error.status === 400) {
                    DTMonitor.notification.show('DomainTools API reachable but credentials invalid', 'warning');
                    if (statusIndicator) {
                        statusIndicator.className = 'status-badge warning';
                        statusIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> API Reachable';
                    }
                } else {
                    DTMonitor.notification.show('DomainTools connection failed: ' + error.message, 'error');
                    if (statusIndicator) {
                        statusIndicator.className = 'status-badge error';
                        statusIndicator.innerHTML = '<i class="fas fa-times-circle"></i> Failed';
                    }
                }
            });
    },
    
    testPhishLabsConnection: function() {
        DTMonitor.api.get('/test/phishlabs')
            .then(result => {
                DTMonitor.notification.show('PhishLabs connection successful', 'success');
            })
            .catch(error => {
                // Check if it's a 400 error (API reachable but invalid credentials)
                if (error.status === 400) {
                    DTMonitor.notification.show('PhishLabs API reachable but credentials invalid', 'warning');
                } else {
                    DTMonitor.notification.show('PhishLabs connection failed: ' + error.message, 'error');
                }
            });
    },
    
    testAllConnections: function() {
        DTMonitor.notification.show('Testing all connections...', 'info');
        this.testDomainToolsConnection();
        this.testPhishLabsConnection();
    },

    collectAllSettings: function() {
        const formData = {};
        const inputs = document.querySelectorAll('#settingsForm input, #settingsForm select, #settingsForm textarea');
        
        inputs.forEach(input => {
            if (input.name) {
                if (input.type === 'checkbox') {
                    formData[input.name] = input.checked;
                } else {
                    formData[input.name] = input.value;
                }
            }
        });
        
        console.log('Collected settings data:', formData);
        return formData;
    },

    saveSettings: async function(formData) {
        try {
            console.log('Saving settings to backend:', formData);
            const response = await DTMonitor.api.post('/settings', formData);
            if (response.success) {
                DTMonitor.notification.show('Settings saved successfully!', 'success');
            } else {
                DTMonitor.notification.show('Failed to save settings: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            DTMonitor.notification.show('Error saving settings: ' + error.message, 'error');
        }
    },

    // Initialize settings tabs
    initSettingsTabs: function() {
        console.log('DTMonitor: Initializing settings tabs...');
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        console.log('DTMonitor: Found tab buttons:', tabButtons.length);
        console.log('DTMonitor: Found tab panes:', tabPanes.length);
        
        tabButtons.forEach((button, index) => {
            console.log(`DTMonitor: Setting up tab ${index}:`, button.getAttribute('data-tab'));
            button.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('DTMonitor: Tab clicked:', this.getAttribute('data-tab'));
                
                // Remove active class from all tabs and panes
                tabButtons.forEach(tab => tab.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Show corresponding tab pane
                const targetTab = this.getAttribute('data-tab');
                const targetPane = document.getElementById(targetTab);
                console.log('DTMonitor: Target tab:', targetTab, 'Target pane:', targetPane);
                if (targetPane) {
                    targetPane.classList.add('active');
                    console.log('DTMonitor: Tab switched to:', targetTab);
                    
                    // Load dynamic content for specific tabs
                    if (targetTab === 'tags-section') {
                        this.loadTags();
                    } else if (targetTab === 'scan-history') {
                        this.loadScanHistory();
                    }
                } else {
                    console.error('DTMonitor: Tab pane not found:', targetTab);
                }
            });
        });
    },

    // Load tags for tag management
    loadTags: function() {
        console.log('Loading tags...');
        const tagsList = document.getElementById('tagsList');
        if (tagsList) {
            // Load tags from backend or local storage
            DTMonitor.api.get('/tags/list')
                .then(response => {
                    if (response.success && response.tags) {
                        this.renderTags(response.tags);
                    } else {
                        console.error('Failed to load tags:', response.message);
                        DTMonitor.notification.show('Failed to load tags', 'error');
                    }
            })
            .catch(error => {
                    console.error('Error loading tags:', error);
                    DTMonitor.notification.show('Error loading tags', 'error');
                });
        }
    },

    // Render tags in the UI
    renderTags: function(tags) {
        const tagsList = document.getElementById('tagsList');
        if (!tagsList) return;

        if (tags.length === 0) {
            tagsList.innerHTML = '<p class="no-data">No tags found</p>';
            return;
        }

        tagsList.innerHTML = tags.map(tag => `
            <div class="tag-item" data-tag-id="${tag.id}">
                <div class="tag-content">
                    <span class="tag-name">${tag.name}</span>
                    <span class="tag-description">${tag.description || 'No description'}</span>
                </div>
                <div class="tag-actions">
                    <button class="btn btn-sm btn-outline" onclick="editTag('${tag.id}', '${tag.name.replace(/'/g, "\\'")}', '${(tag.description || '').replace(/'/g, "\\'")}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTag('${tag.id}', '${tag.name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Load scan history
    loadScanHistory: function() {
        console.log('Loading scan history...');
        const historyList = document.getElementById('scanHistoryList');
        if (historyList) {
            DTMonitor.api.get('/scan/history')
                .then(response => {
                    console.log('Scan history API response:', response);
                    if (response.activities && response.activities.length > 0) {
                        const history = response.activities;
                        historyList.innerHTML = history.map(scan => 
                            `<div class="scan-item">
                                <div class="scan-info">
                                    <strong>${scan.scan_type}</strong> - ${scan.started_at_est || new Date(scan.started_at).toLocaleString('en-US', {timeZone: 'America/New_York'})}
                                </div>
                                <div class="scan-status ${scan.status}">
                                    ${scan.status} (${scan.findings_count || 0} findings)
                                </div>
                            </div>`
                        ).join('');
                    } else {
                        historyList.innerHTML = '<p>No scan history available</p>';
                    }
                })
                .catch(error => {
                    console.error('Error loading scan history:', error);
                    historyList.innerHTML = '<p>Error loading scan history</p>';
                });
        }
    },
    
    // Add new tag
    addTag: function() {
        const tagName = document.getElementById('newTagName').value.trim();
        if (!tagName) {
            DTMonitor.notification.show('Please enter a tag name', 'warning');
            return;
        }

        DTMonitor.api.post('/tags/add', { name: tagName })
            .then(response => {
                if (response.success) {
                    DTMonitor.notification.show('Tag added successfully', 'success');
                    document.getElementById('newTagName').value = '';
                    this.loadTags();
                } else {
                    DTMonitor.notification.show('Failed to add tag: ' + response.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error adding tag:', error);
                DTMonitor.notification.show('Error adding tag: ' + error.message, 'error');
            });
    },

    // Edit tag
    editTag: function(tagId, currentName, currentDescription) {
        const newName = prompt('Enter new tag name:', currentName);
        if (newName === null) return; // User cancelled
        
        const newDescription = prompt('Enter new description:', currentDescription || '');
        if (newDescription === null) return; // User cancelled

        if (!newName.trim()) {
            DTMonitor.notification.show('Tag name cannot be empty', 'warning');
            return;
        }

        DTMonitor.api.put('/tags/update', { 
            id: tagId, 
            name: newName.trim(), 
            description: newDescription.trim() 
        })
        .then(response => {
            if (response.success) {
                    DTMonitor.notification.show('Tag updated successfully', 'success');
                this.loadTags();
            } else {
                DTMonitor.notification.show('Failed to update tag: ' + response.message, 'error');
            }
                })
                .catch(error => {
            console.error('Error updating tag:', error);
            DTMonitor.notification.show('Error updating tag', 'error');
        });
    },

    // Delete tag
    deleteTag: function(tagId, tagName) {
        if (!confirm(`Are you sure you want to delete the tag "${tagName}"?`)) {
            return;
        }

        DTMonitor.api.delete('/tags/delete', { id: tagId })
        .then(response => {
            if (response.success) {
                DTMonitor.notification.show('Tag deleted successfully', 'success');
                this.loadTags();
            } else {
                DTMonitor.notification.show('Failed to delete tag: ' + response.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting tag:', error);
            DTMonitor.notification.show('Error deleting tag', 'error');
        });
    },

    // Export scan history
    exportScanHistory: function() {
        DTMonitor.notification.show('Exporting scan history...', 'info');
        
        fetch('/api/scan/history/export')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scan_history_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            DTMonitor.notification.show('Scan history exported successfully', 'success');
        })
        .catch(error => {
            console.error('Error exporting scan history:', error);
            DTMonitor.notification.show('Failed to export scan history', 'error');
        });
    },

    // Clear scan history
    clearScanHistory: function() {
        if (confirm('Are you sure you want to clear all scan history? This action cannot be undone.')) {
            DTMonitor.api.delete('/scan/history')
                .then(response => {
                    if (response.success) {
                        DTMonitor.notification.show('Scan history cleared', 'success');
                        this.loadScanHistory();
                    } else {
                        DTMonitor.notification.show('Failed to clear scan history: ' + response.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error clearing scan history:', error);
                    DTMonitor.notification.show('Error clearing scan history: ' + error.message, 'error');
                });
        }
    },
    
    testDomainToolsTagging: function() {
        DTMonitor.api.get('/test/domaintools-tagging')
            .then(result => {
                DTMonitor.notification.show('DomainTools tagging test successful', 'success');
            })
            .catch(error => {
                DTMonitor.notification.show('DomainTools tagging test failed: ' + error.message, 'error');
            });
    },
    
    filterFindings: function() {
        const statusFilter = document.getElementById('statusFilter').value;
        const riskFilter = document.getElementById('riskFilter').value;
        const sourceFilter = document.getElementById('sourceFilter').value;
        
        // Apply filters to findings display
        const findings = document.querySelectorAll('.finding-item');
        findings.forEach(finding => {
            let show = true;
            
            if (statusFilter !== 'all') {
                const status = finding.dataset.status;
                if (status !== statusFilter) show = false;
            }
            
            if (riskFilter !== 'all') {
                const risk = parseInt(finding.dataset.risk || '0');
                switch (riskFilter) {
                    case 'high':
                        if (risk < 80) show = false;
                        break;
                    case 'medium':
                        if (risk < 50 || risk >= 80) show = false;
                        break;
                    case 'low':
                        if (risk >= 50) show = false;
                        break;
                }
            }
            
            if (sourceFilter !== 'all') {
                const source = finding.dataset.source;
                if (source !== sourceFilter) show = false;
            }
            
            finding.style.display = show ? 'block' : 'none';
        });
    }
};

console.log('=== DTMonitor API Client Loaded ===');
