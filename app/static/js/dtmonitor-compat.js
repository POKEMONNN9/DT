// ===================================================================== //
// DTMonitor Compatibility - Global Function Wrappers & HTML Handlers  //
// ===================================================================== //

console.log('=== DTMonitor Compatibility Loading ===');

// =============================================================================
// GLOBAL FUNCTION WRAPPERS FOR BACKWARD COMPATIBILITY
// =============================================================================

// Theme functions
function toggleTheme() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.theme) {
        DTMonitor.theme.toggle(); 
    } else {
        console.warn('DTMonitor.theme not available');
    }
}

// Notification functions
function showNotification(message, type) { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.notification) {
        DTMonitor.notification.show(message, type); 
    } else {
        console.warn('DTMonitor.notification not available');
    }
}

// Scheduler functions
function startScheduler() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.scheduler) {
        DTMonitor.scheduler.start(); 
    } else {
        console.warn('DTMonitor.scheduler not available');
    }
}

function stopScheduler() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.scheduler) {
        DTMonitor.scheduler.stop(); 
    } else {
        console.warn('DTMonitor.scheduler not available');
    }
}

function refreshSchedulerStatus() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.scheduler) {
        DTMonitor.scheduler.refresh(); 
    } else {
        console.warn('DTMonitor.scheduler not available');
    }
}

// Scanning functions
function runAllScans() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.scanning) {
        DTMonitor.scanning.runAll(); 
    } else {
        console.warn('DTMonitor.scanning not available');
    }
}

function runSelectedScan() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.scanning) {
        DTMonitor.scanning.runSelected(); 
    } else {
        console.warn('DTMonitor.scanning not available');
    }
}

function runSingleScan(hashId) { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.scanning) {
        DTMonitor.scanning.runSingle(hashId); 
    } else {
        console.warn('DTMonitor.scanning not available');
    }
}

// Hash management functions
function showAddHashModal() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.showAddModal(); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function editHash(hashId) { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.edit(hashId); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function toggleHash(hashId) { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.toggle(hashId); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function saveHash(event) { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.save(event); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function deleteHash(hashId) { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.delete(hashId); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}


// Findings functions
function updateFindingStatus(findingId, status) { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.updateStatus(findingId, status); 
    } else {
        console.warn('DTMonitor.findings not available');
    }
}

function submitToPhishLabsDirect(findingId) { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.submitToPhishLabs(findingId); 
    } else {
        console.warn('DTMonitor.findings not available');
    }
}

function exportFindingsToCSV() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.exportToCSV(); 
    } else {
        console.warn('DTMonitor.findings not available');
    }
}

function filterFindings() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.applyFilters(); 
    } else {
        console.warn('DTMonitor.findings not available');
    }
}

// Settings functions
function saveAllSettings() {
    console.log('=== GLOBAL saveAllSettings CALLED ===');
    console.log('DTMonitor available:', typeof DTMonitor !== 'undefined');
    console.log('DTMonitor.settings available:', typeof DTMonitor !== 'undefined' && DTMonitor.settings);

    if (typeof DTMonitor !== 'undefined' && DTMonitor.settings && DTMonitor.settings.saveAllSettings) {
        console.log('Using DTMonitor.settings.saveAllSettings...');
        DTMonitor.settings.saveAllSettings(); 
    } else {
        console.warn('DTMonitor not ready, using fallback method...');
        // Fallback: direct form submission
        const form = document.getElementById('settingsForm');
        if (form) {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            // Also collect all inputs manually to ensure we get everything
            const allInputs = form.querySelectorAll('input, select, textarea');
            allInputs.forEach(input => {
                if (input.name) {
                    if (input.type === 'checkbox') {
                        data[input.name] = input.checked;
                    } else {
                        data[input.name] = input.value;
                    }
                }
            });
            
            console.log('Fallback: collected form data:', data);
            console.log('Fallback: number of fields collected:', Object.keys(data).length);
            console.log('Fallback: form inputs found:', allInputs.length);
            
            // Direct fetch to backend
            console.log('Fallback: sending data to /api/settings:', data);
            fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                console.log('Fallback: response status:', response.status);
                return response.json();
            })
            .then(result => {
                console.log('Fallback: response received:', result);
                if (result.success) {
                    alert('Settings saved successfully!');
                } else {
                    alert('Failed to save settings: ' + result.message);
                }
            })
            .catch(error => {
                console.error('Fallback save error:', error);
                alert('Error saving settings: ' + error.message);
            });
        } else {
            console.error('Settings form not found');
            alert('Settings form not found');
        }
    }
}

function testDomainToolsConnection() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.settings && DTMonitor.settings.testDomainToolsConnection) {
        DTMonitor.settings.testDomainToolsConnection(); 
    } else {
        console.warn('DTMonitor not available, using fallback test function');
        testDomainToolsConnectionFallback();
    }
}

function testPhishLabsConnection() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.settings && DTMonitor.settings.testPhishLabsConnection) {
        DTMonitor.settings.testPhishLabsConnection(); 
    } else {
        console.warn('DTMonitor not available, using fallback test function');
        testPhishLabsConnectionFallback();
    }
}

function testAllConnections() {
    console.log('testAllConnections called');
    console.log('DTMonitor exists:', typeof DTMonitor !== 'undefined');
    if (typeof DTMonitor !== 'undefined') {
        console.log('DTMonitor.settings exists:', typeof DTMonitor.settings !== 'undefined');
        if (DTMonitor.settings) {
            console.log('DTMonitor.settings.testAllConnections exists:', typeof DTMonitor.settings.testAllConnections === 'function');
        }
    }
    
    if (typeof DTMonitor !== 'undefined' && DTMonitor.settings && DTMonitor.settings.testAllConnections) {
        console.log('Calling DTMonitor.settings.testAllConnections()');
        DTMonitor.settings.testAllConnections();
    } else {
        console.error('Settings management requires DTMonitor to be loaded');
        console.error('DTMonitor.settings.testAllConnections not found');
    }
}

// Fallback test connection functions
function testDomainToolsConnectionFallback() {
    const statusIndicator = document.getElementById('api-status');
    if (statusIndicator) {
        statusIndicator.className = 'status-badge warning';
        statusIndicator.innerHTML = '<i class="fas fa-circle"></i> Testing...';
    }
    
    fetch('/api/test/domaintools', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            return response.json().then(data => {
                // 400 status means API is reachable but credentials are invalid
                return { success: false, message: data.message || 'Connection failed', reachable: true };
            });
        }
    })
    .then(data => {
        if (statusIndicator) {
            if (data.success) {
                statusIndicator.className = 'status-badge success';
                statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
            } else if (data.reachable) {
                statusIndicator.className = 'status-badge warning';
                statusIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> API Reachable';
            } else {
                statusIndicator.className = 'status-badge error';
                statusIndicator.innerHTML = '<i class="fas fa-times-circle"></i> Failed';
            }
        }
        if (data.success) {
            alert('DomainTools connection successful!');
        } else if (data.reachable) {
            alert('DomainTools API is reachable but credentials are invalid: ' + (data.message || 'Check your credentials'));
        } else {
            alert('DomainTools connection failed: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error testing DomainTools connection:', error);
        if (statusIndicator) {
            statusIndicator.className = 'status-badge error';
            statusIndicator.innerHTML = '<i class="fas fa-times-circle"></i> Failed';
        }
        alert('Error testing DomainTools connection: ' + error.message);
    });
}

function testPhishLabsConnectionFallback() {
    fetch('/api/test/phishlabs', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            return response.json().then(data => {
                // 400 status means API is reachable but credentials are invalid
                return { success: false, message: data.message || 'Connection failed', reachable: true };
            });
        }
    })
    .then(data => {
        if (data.success) {
            alert('PhishLabs connection successful!');
        } else if (data.reachable) {
            alert('PhishLabs API is reachable but credentials are invalid: ' + (data.message || 'Check your credentials'));
        } else {
            alert('PhishLabs connection failed: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error testing PhishLabs connection:', error);
        alert('Error testing PhishLabs connection: ' + error.message);
    });
}

// Additional findings functions
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

// Tag management functions
function addTag() {
    console.log('addTag called, checking DTMonitor...');
    if (typeof DTMonitor !== 'undefined' && DTMonitor.settings && DTMonitor.settings.addNewTag) {
        console.log('Calling DTMonitor.settings.addNewTag...');
        DTMonitor.settings.addNewTag();
    } else {
        console.warn('DTMonitor not ready, using fallback method...');
        // Fallback: direct tag addition
        const tagName = document.getElementById('newTagName').value.trim();
        if (!tagName) {
            alert('Please enter a tag name');
            return;
        }
        
        fetch('/api/tags/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: tagName })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Tag added successfully');
                document.getElementById('newTagName').value = '';
                // Reload tags
                loadTagsFallback();
            } else {
                alert('Failed to add tag: ' + result.message);
            }
        })
        .catch(error => {
            console.error('Fallback addTag error:', error);
            alert('Error adding tag: ' + error.message);
        });
    }
}

function editTag(tagId, currentName, currentDescription) {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.settings && DTMonitor.settings.editTag) {
        DTMonitor.settings.editTag(tagId, currentName, currentDescription);
    } else {
        // Fallback implementation
        const newName = prompt('Enter new tag name:', currentName);
        if (newName === null) return;
        
        const newDescription = prompt('Enter new description:', currentDescription || '');
        if (newDescription === null) return;

        if (!newName.trim()) {
            alert('Tag name cannot be empty');
            return;
        }

        fetch('/api/tags/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: tagId, 
                name: newName.trim(), 
                description: newDescription.trim() 
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Tag updated successfully');
                loadTagsFallback();
            } else {
                alert('Failed to update tag: ' + result.message);
            }
        })
        .catch(error => {
            console.error('Error updating tag:', error);
            alert('Error updating tag');
        });
    }
}

function deleteTag(tagId, tagName) {
    if (!confirm(`Are you sure you want to delete the tag "${tagName}"?`)) {
        return;
    }

    if (typeof DTMonitor !== 'undefined' && DTMonitor.settings && DTMonitor.settings.deleteTag) {
        DTMonitor.settings.deleteTag(tagId, tagName);
    } else {
        // Fallback implementation
        fetch('/api/tags/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tagId })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Tag deleted successfully');
                loadTagsFallback();
            } else {
                alert('Failed to delete tag: ' + result.message);
            }
        })
        .catch(error => {
            console.error('Error deleting tag:', error);
            alert('Error deleting tag');
        });
    }
}

function loadTagsFallback() {
    fetch('/api/tags/list')
        .then(response => response.json())
        .then(result => {
            const tagsList = document.getElementById('tagsList');
            if (tagsList && result.success) {
                const tags = result.tags || [];
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
            }
        })
        .catch(error => {
            console.error('Error loading tags:', error);
        });
}

// Scan history functions
function exportScanHistory() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.api && DTMonitor.api.exportScanHistory) {
        DTMonitor.api.exportScanHistory(); 
    } else {
        console.warn('DTMonitor.api.exportScanHistory not available');
    }
}

function clearScanHistory() {
    console.log('clearScanHistory called');
    if (typeof DTMonitor !== 'undefined' && DTMonitor.api && DTMonitor.api.clearScanHistory) {
        DTMonitor.api.clearScanHistory();
    } else {
        console.warn('DTMonitor not ready, using fallback method...');
        if (confirm('Are you sure you want to clear all scan history? This action cannot be undone.')) {
            fetch('/api/scan/history', {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('Scan history cleared successfully');
                    loadScanHistoryFallback();
                } else {
                    alert('Failed to clear scan history: ' + result.message);
                }
            })
            .catch(error => {
                console.error('Error clearing scan history:', error);
                alert('Error clearing scan history: ' + error.message);
            });
        }
    }
}

function loadScanHistoryFallback() {
    fetch('/api/scan/history')
        .then(response => response.json())
        .then(data => {
            const historyList = document.getElementById('scanHistoryList');
            if (historyList) {
                console.log('Scan history API response:', data);
                const activities = data.activities || [];
                if (activities.length > 0) {
                    historyList.innerHTML = activities.map(scan => 
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
            }
        })
        .catch(error => {
            console.error('Error loading scan history:', error);
            const historyList = document.getElementById('scanHistoryList');
            if (historyList) {
                historyList.innerHTML = '<p>Error loading scan history</p>';
            }
        });
}

// Utility functions
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentNode.querySelector('.password-toggle');
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Settings tab functions
function switchSettingsTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Remove active class from all tabs and panes
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(tab => tab.classList.remove('active'));
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    // Add active class to target tab and pane
    const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
    const targetPane = document.getElementById(tabName);
    
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('Tab button activated:', tabName);
    }
    
    if (targetPane) {
        targetPane.classList.add('active');
        console.log('Tab pane activated:', tabName);
    }
}

function initSettingsTabs() {
    console.log('Initializing settings tabs...');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    console.log('Found tab buttons:', tabButtons.length);
    console.log('Found tab panes:', tabPanes.length);
    
    tabButtons.forEach((button, index) => {
        console.log(`Setting up tab ${index}:`, button.getAttribute('data-tab'));
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Tab clicked:', this.getAttribute('data-tab'));
            
            // Remove active class from all tabs and panes
            tabButtons.forEach(tab => tab.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding tab pane
            const targetTab = this.getAttribute('data-tab');
            const targetPane = document.getElementById(targetTab);
            console.log('Target tab:', targetTab, 'Target pane:', targetPane);
            if (targetPane) {
                targetPane.classList.add('active');
                console.log('Tab switched to:', targetTab);
            } else {
                console.error('Tab pane not found:', targetTab);
            }
        });
    });
}

// ASRM Rules functions
function showRulesModal() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.showRulesModal(); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function closeRulesModal() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.closeRulesModal(); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

// ASRM Rule Tagging Functions
function toggleRuleTagging() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.toggleRuleTagging();
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function handleRuleTagSelection() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.handleRuleTagSelection();
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function createRuleTag() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.createRuleTag();
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function showAddRuleModal() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.showAddRuleModal(); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function closeRuleModal() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.closeAddRuleModal(); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function addCondition() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.addCondition(); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function saveRule(event) { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.saveRule(event); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

// Additional ASRM functions
function loadRules() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.loadRules();
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function editRule(ruleId) {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.editRule(ruleId);
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function toggleRule(ruleId) {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.toggleRule(ruleId);
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function deleteRule(ruleId) {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.deleteRule(ruleId);
    } else {
        console.warn('DTMonitor.hash not available');
    }
}


// Additional missing functions

function removeCondition(conditionId) {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.removeCondition(conditionId);
    } else {
        console.warn('DTMonitor.hash not available');
    }
}


// Additional missing global functions
function showAddHashModal() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.showAddHashModal();
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function forceLoadHashes() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.forceLoadHashes();
    } else {
        console.log('Refresh hashes requested.');
        location.reload();
    }
}

function executeFullScan() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.executeFullScan();
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function closeHashModal() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.closeModal();
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

// System Status Functions
function showSystemStatus() {
    console.log('System status requested');
    const toast = document.getElementById('systemStatusToast');
    if (toast) {
        toast.style.display = 'block';
        toast.classList.remove('hiding', 'auto-hide');
        refreshSystemStatus();
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (toast.style.display !== 'none') {
                hideSystemStatusToast();
            }
        }, 5000);
    } else {
        console.error('System status toast not found');
        // Fallback notification
        if (typeof DTMonitor !== 'undefined' && DTMonitor.notification) {
            DTMonitor.notification.show('System status requested', 'info');
        }
    }
}

function hideSystemStatusToast() {
    const toast = document.getElementById('systemStatusToast');
    if (toast) {
        toast.style.display = 'none';
    }
}

function refreshSystemStatus() {
    console.log('Refreshing system status...');
    
    // Update status indicators to show loading
    const apiStatus = document.getElementById('apiStatus');
    const schedulerStatus = document.getElementById('schedulerStatus');
    const phishlabsStatus = document.getElementById('phishlabsStatus');
    
    if (apiStatus) apiStatus.textContent = 'Checking...';
    if (schedulerStatus) schedulerStatus.textContent = 'Checking...';
    if (phishlabsStatus) phishlabsStatus.textContent = 'Checking...';
    
    // Fetch system status from backend
    fetch('/api/status')
    .then(response => response.json())
    .then(data => {
        console.log('System status data received:', data);
        
        // Update API status
        if (apiStatus) {
            apiStatus.textContent = data.api_status || 'Unknown';
            const apiItem = apiStatus.closest('.status-item');
            if (apiItem) {
                apiItem.classList.remove('connected', 'disconnected', 'warning');
                if (data.api_status === 'Connected') {
                    apiItem.classList.add('connected');
                } else if (data.api_status === 'Error') {
                    apiItem.classList.add('disconnected');
                } else {
                    apiItem.classList.add('warning');
                }
            }
        }
        
        // Update scheduler status
        if (schedulerStatus) {
            schedulerStatus.textContent = data.scheduler_status || 'Unknown';
            const schedulerItem = schedulerStatus.closest('.status-item');
            if (schedulerItem) {
                schedulerItem.classList.remove('connected', 'disconnected', 'warning');
                if (data.scheduler_status === 'Running') {
                    schedulerItem.classList.add('connected');
                } else if (data.scheduler_status === 'Stopped') {
                    schedulerItem.classList.add('warning');
                } else {
                    schedulerItem.classList.add('disconnected');
                }
            }
        }
        
        // Update PhishLabs status
        if (phishlabsStatus) {
            phishlabsStatus.textContent = data.phishlabs_status || 'Unknown';
            const phishlabsItem = phishlabsStatus.closest('.status-item');
            if (phishlabsItem) {
                phishlabsItem.classList.remove('connected', 'disconnected', 'warning');
                if (data.phishlabs_status === 'Connected') {
                    phishlabsItem.classList.add('connected');
                } else if (data.phishlabs_status === 'Error') {
                    phishlabsItem.classList.add('disconnected');
                } else {
                    phishlabsItem.classList.add('warning');
                }
            }
        }
    })
    .catch(error => {
        console.error('Error fetching system status:', error);
        if (apiStatus) {
            apiStatus.textContent = 'Error';
            const apiItem = apiStatus.closest('.status-item');
            if (apiItem) apiItem.classList.add('disconnected');
        }
        if (schedulerStatus) {
            schedulerStatus.textContent = 'Error';
            const schedulerItem = schedulerStatus.closest('.status-item');
            if (schedulerItem) schedulerItem.classList.add('disconnected');
        }
        if (phishlabsStatus) {
            phishlabsStatus.textContent = 'Error';
            const phishlabsItem = phishlabsStatus.closest('.status-item');
            if (phishlabsItem) phishlabsItem.classList.add('disconnected');
        }
    });
}

// Scan History Functions
function refreshScanHistory() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.settings) {
        DTMonitor.settings.loadScanHistory();
    } else {
        console.log('Refresh scan history requested');
    }
}

function displayScanHistory(activities) {
    console.log('Displaying scan history:', activities);
    // Implementation would go here
}

function filterScanHistory() {
    console.log('Filtering scan history');
    // Implementation would go here
}

// Regex Guide Modal Functions
function showRegexGuideModal() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.showRegexGuideModal(); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function closeRegexGuideModal() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.closeRegexGuideModal();
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function handleCaseTypeChange() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.handleCaseTypeChange();
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

function closeAddRuleModal() { 
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.closeAddRuleModal(); 
    } else {
        console.warn('DTMonitor.hash not available');
    }
}

// Test function for findings filters
function testFindingsFilters() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.testFilters();
    } else {
        console.warn('DTMonitor.findings not available');
    }
}

// Debug function to test ASRM filter specifically
function debugASRMFilter() {
    console.log('=== DEBUGGING ASRM FILTER ===');
    
    // Check if filter element exists
    const asrmFilter = document.getElementById('asrmFilter');
    console.log('ASRM Filter element:', asrmFilter);
    console.log('ASRM Filter value:', asrmFilter?.value);
    
    // Check all rows and their data
    const rows = document.querySelectorAll('tbody tr[data-finding-id]');
    console.log(`Found ${rows.length} rows`);
    
    rows.forEach(row => {
        const rowId = row.dataset.findingId;
        const asrmTriggered = row.dataset['asrm-triggered'];
        const status = row.dataset.status;
        const domain = row.dataset.domain;
        
        console.log(`Row ${rowId} (${domain}):`, {
            asrmTriggered: asrmTriggered,
            status: status,
            asrmTriggeredBool: asrmTriggered === 'true',
            isVisible: row.style.display !== 'none'
        });
    });
    
    // Test the filter logic
    console.log('Testing filter logic...');
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.applyFilters();
    }
}

// Additional utility functions
function testHashLoading() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.notification && DTMonitor.hash) {
        DTMonitor.notification.show('Testing hash loading functionality...', 'info');
        DTMonitor.hash.loadHashes();
    } else {
        console.warn('DTMonitor not available for hash testing');
    }
}

function forceLoadHashes() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
        DTMonitor.hash.loadHashes();
    } else {
        console.log('Refresh hashes requested.');
        location.reload();
    }
}

// Debug function to check form data collection
function debugFormData() {
    console.log('=== DEBUGGING FORM DATA COLLECTION ===');
    
    const form = document.getElementById('settingsForm');
    if (!form) {
        console.error('Settings form not found!');
        return;
    }
    
    // Method 1: FormData
    const formData = new FormData(form);
    const data1 = Object.fromEntries(formData);
    console.log('Method 1 - FormData:', data1);
    console.log('Method 1 - Field count:', Object.keys(data1).length);
    
    // Method 2: Manual collection
    const data2 = {};
    const allInputs = form.querySelectorAll('input, select, textarea');
    allInputs.forEach(input => {
        if (input.name) {
            if (input.type === 'checkbox') {
                data2[input.name] = input.checked;
            } else {
                data2[input.name] = input.value;
            }
        }
    });
    console.log('Method 2 - Manual collection:', data2);
    console.log('Method 2 - Field count:', Object.keys(data2).length);
    
    // Method 3: DTMonitor way
    if (typeof DTMonitor !== 'undefined' && DTMonitor.settings && DTMonitor.settings.collectFormData) {
        const data3 = DTMonitor.settings.collectFormData();
        console.log('Method 3 - DTMonitor way:', data3);
        console.log('Method 3 - Field count:', Object.keys(data3).length);
    }
    
    alert('Check console for debug output');
}

// Additional missing functions from original enhanced.js
function testDomainToolsTagging() {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.settings) {
        DTMonitor.settings.testDomainToolsTagging();
    } else {
        console.error('DomainTools tagging test requires DTMonitor to be loaded');
    }
}

function showFindingDetails(findingId) {
    if (typeof DTMonitor !== 'undefined' && DTMonitor.findings) {
        DTMonitor.findings.showDetails(findingId);
    } else {
        console.error('Finding details require DTMonitor to be loaded');
    }
}

function closeFindingDetailsModal() {
    const modal = document.getElementById('findingDetailsModal');
    if (modal) {
        modal.remove(); // Remove the modal from DOM completely
    }
}

function enableRuleCardDebugging() {
    if (window.DTMonitor && DTMonitor.hash) {
        DTMonitor.hash.enableRuleCardDebugging();
    } else {
        console.error('DTMonitor.hash not available');
    }
}

function disableRuleCardDebugging() {
    if (window.DTMonitor && DTMonitor.hash) {
        DTMonitor.hash.disableRuleCardDebugging();
    } else {
        console.error('DTMonitor.hash not available');
    }
}

function refreshStatus() {
    DTMonitor.notification.show('Refreshing system status...', 'info');
    
    // Refresh the page to get updated data
    window.location.reload();
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize DTMonitor when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded Event Fired ===');
    console.log('=== DTMonitor Framework Initializing ===');
    
    try {
        // Initialize theme
        if (DTMonitor.theme) {
            DTMonitor.theme.init();
            console.log('✓ Theme system initialized');
        }
        
        // Initialize notifications
        if (DTMonitor.notification) {
            DTMonitor.notification.init();
            console.log('✓ Notification system initialized');
        }
        
        // Initialize hash management if on hash page
        if (document.getElementById('hashGrid') && DTMonitor.hash) {
            DTMonitor.hash.init();
            console.log('✓ Hash management initialized');
        }
        
        // Initialize findings management if on findings page
        if (document.getElementById('findingsTable') && DTMonitor.findings) {
            DTMonitor.findings.init();
            console.log('✓ Findings management initialized');
        }
        
        // Initialize settings management if on settings page
        if (document.querySelector('.settings-layout') && DTMonitor.settings) {
            DTMonitor.settings.init();
            console.log('✓ Settings management initialized');
        }
        
        // Initialize scanning management
        if (DTMonitor.scanning) {
            DTMonitor.scanning.init();
            console.log('✓ Scanning management initialized');
        }
        
        console.log('✓ DTMonitor initialization complete');
    } catch (error) {
        console.error('Error during DTMonitor initialization:', error);
    }
});

console.log('=== DTMonitor Compatibility Loaded ===');
