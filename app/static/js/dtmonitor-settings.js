// ===================================================================== //
// DTMonitor Settings - Settings Management & Tag Operations            //
// ===================================================================== //

console.log('=== DTMonitor Settings Loading ===');

// =============================================================================
// SETTINGS MANAGEMENT
// =============================================================================

DTMonitor.settings = {
    init: function() {
        console.log('Settings management initialized');
        console.log('Setting up event delegation...');
        this.setupEventDelegation();
        console.log('Showing api-config section...');
        this.showSection('api-config');
        console.log('Initializing theme...');
        this.initializeTheme();
        console.log('Loading current settings...');
        this.loadCurrentSettings();
        console.log('Setting up form change monitoring...');
        this.setupFormChangeMonitoring();
        console.log('Loading available tags...');
        this.loadAvailableTags();
        console.log('Settings initialization complete');
    },

    setupEventDelegation: function() {
        // Navigation event delegation for tab buttons
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.closest('.tab-button')) {
                const tabButton = target.closest('.tab-button');
                const tabId = tabButton.dataset.tab;
                if (tabId) {
                    e.preventDefault();
                    this.showSection(tabId);
                }
            }
        });

        // Add Tag button event delegation
        document.addEventListener('click', (e) => {
            if (e.target.id === 'addTagBtn') {
                e.preventDefault();
                this.addNewTag();
            }
        });

        // Tag edit form submission event delegation
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'tagEditForm') {
                e.preventDefault();
                this.saveTagChanges();
            }
        });
    },
    
    showSection: function(sectionId) {
        console.log('Switching to section:', sectionId);
        
        // Hide all tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Show selected tab pane
        const selectedPane = document.getElementById(sectionId);
        if (selectedPane) {
            selectedPane.classList.add('active');
            console.log('Tab pane activated:', sectionId);
        } else {
            console.error('Tab pane not found:', sectionId);
        }
        
        // Add active class to tab button
        const activeTabButton = document.querySelector(`[data-tab="${sectionId}"]`);
        if (activeTabButton) {
            activeTabButton.classList.add('active');
            console.log('Tab button activated:', sectionId);
        } else {
            console.error('Tab button not found for:', sectionId);
        }
    },

    initializeTheme: function() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);
    },

    applyTheme: function(theme) {
        document.body.className = theme;
        localStorage.setItem('theme', theme);
        
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    },

    toggleTheme: function() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    },

    loadCurrentSettings: async function() {
        try {
            const response = await DTMonitor.api.get('/settings');
            if (response.success) {
                this.populateFormWithSettings(response.settings);
                this.updateOriginalValues();
            } else {
                console.error('Failed to load settings:', response.message);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    },

    populateFormWithSettings: function(settings) {
        Object.keys(settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settings[key] === 'true' || settings[key] === true;
                } else {
                    element.value = settings[key] || '';
                }
            }
        });
    },

    updateOriginalValues: function() {
        this.originalValues = new Map();
        const formElements = document.querySelectorAll('input, select, textarea');
        formElements.forEach(element => {
            if (element.id) {
                this.originalValues.set(element.id, element.value);
            }
        });
    },

    setupFormChangeMonitoring: function() {
        const formElements = document.querySelectorAll('input, select, textarea');
        formElements.forEach(element => {
            element.addEventListener('change', () => {
            this.checkForChanges();
            });
            element.addEventListener('input', () => {
                this.checkForChanges();
            });
        });
    },
    
    checkForChanges: function() {
        const saveButton = document.querySelector('.global-actions .btn-large');
        if (!saveButton) return;

        let hasChanges = false;
        const formElements = document.querySelectorAll('input, select, textarea');
        
        formElements.forEach(element => {
            if (element.id && this.originalValues.has(element.id)) {
                const originalValue = this.originalValues.get(element.id);
                const currentValue = element.type === 'checkbox' ? element.checked.toString() : element.value;
                
                if (originalValue !== currentValue) {
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            saveButton.style.display = 'inline-block';
            } else {
            saveButton.style.display = 'none';
        }
    },

    collectFormData: function() {
        const formData = {};
        const formElements = document.querySelectorAll('#settingsForm input, #settingsForm select, #settingsForm textarea');
        
        formElements.forEach(element => {
            if (element.name) {
                if (element.type === 'checkbox') {
                    formData[element.name] = element.checked.toString();
                } else {
                    formData[element.name] = element.value;
                }
            }
        });
        
        console.log('DTMonitor collectFormData: collected', Object.keys(formData).length, 'fields');
        console.log('DTMonitor collectFormData: fields:', Object.keys(formData));
        return formData;
    },

    saveAllSettings: async function() {
        try {
            const formData = this.collectFormData();
            console.log('Saving settings:', formData);
            
            const response = await this.saveSettingsToBackend(formData);
            if (response.success) {
                DTMonitor.api.showToast('Settings saved successfully!', 'success');
                this.updateOriginalValues();
                this.checkForChanges();
                
                // Refresh scheduler status if we're on the dashboard
                if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                    this.refreshSchedulerStatus();
                }
            } else {
                DTMonitor.api.showToast('Failed to save settings: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            DTMonitor.api.showToast('Error saving settings: ' + error.message, 'error');
        }
    },

    saveSettingsToBackend: async function(formData) {
        try {
            console.log('DTMonitor saveSettingsToBackend: sending data:', formData);
            console.log('DTMonitor saveSettingsToBackend: data keys:', Object.keys(formData));
            const response = await DTMonitor.api.post('/settings', formData);
            console.log('DTMonitor saveSettingsToBackend: response received:', response);
            return response;
        } catch (error) {
            console.error('Error saving settings to backend:', error);
            throw error;
        }
    },

    refreshSchedulerStatus: function() {
        // Refresh the page to show updated scheduler status
        console.log('Refreshing scheduler status...');
        setTimeout(() => {
            window.location.reload();
        }, 1000); // Small delay to show the success message
    },

    // Function to load available tags from local storage
    loadAvailableTags: async function() {
        try {
            console.log('Loading available tags from API...');
            console.log('Making API request to /api/tags/list...');
            // Load tags from the local tag management system
            const response = await DTMonitor.api.get('/tags/list');
            console.log('API response received:', response);
            if (response.success && response.tags) {
                console.log('Tags found:', response.tags);
                this.displayAvailableTags(response.tags);
            } else {
                console.log('No tags available or response not successful');
                this.displayAvailableTags([]);
            }
        } catch (error) {
            console.error('Error loading available tags:', error);
            this.displayAvailableTags([]);
        }
    },

    // Function to display available tags in the UI
    displayAvailableTags: function(tags) {
        console.log('Displaying available tags:', tags);
        const displayElement = document.getElementById('tagsList');
        console.log('Display element found:', displayElement);
        if (!displayElement) {
            console.error('tagsList element not found!');
            return;
        }
        
        if (tags && tags.length > 0) {
            // We need to get the full tag objects to display edit/delete buttons
            this.loadFullTagsForDisplay();
        } else {
            console.log('No tags to display, showing no-tags message');
            displayElement.innerHTML = '<p class="no-tags-message">No tags available. Add some tags above to get started.</p>';
        }
    },

    // Function to load full tag objects for display with edit/delete functionality
    loadFullTagsForDisplay: async function() {
        try {
            const response = await DTMonitor.api.get('/tags/list');
            if (response.success && response.tags) {
                this.displayTagsWithActions(response.tags);
            } else {
                this.displayTagsWithActions([]);
            }
        } catch (error) {
            console.error('Error loading full tags:', error);
            this.displayTagsWithActions([]);
        }
    },

    // Function to display tags with edit and delete actions
    displayTagsWithActions: function(tags) {
        const displayElement = document.getElementById('tagsList');
        if (!displayElement) {
            console.error('tagsList element not found!');
            return;
        }
        
        if (tags && tags.length > 0) {
            const tagsHtml = tags.map(tag => {
                const tagName = tag.name || tag.value || 'Unknown Tag';
                const tagId = tag.id || '';
                const tagDescription = tag.description || '';
                
                return `
                    <div class="tag-item" data-tag-id="${tagId}">
                        <span class="available-tag">${tagName}</span>
                        <div class="tag-actions">
                            <button type="button" class="btn btn-sm btn-outline-primary" onclick="DTMonitor.settings.editTag('${tagId}', '${tagName.replace(/'/g, "\\'")}', '${tagDescription.replace(/'/g, "\\'")}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="DTMonitor.settings.deleteTag('${tagId}', '${tagName.replace(/'/g, "\\'")}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            displayElement.innerHTML = tagsHtml;
            console.log('Tags with actions HTML rendered');
                } else {
            displayElement.innerHTML = '<p class="no-tags-message">No tags available. Add some tags above to get started.</p>';
        }
    },

    // Function to add a new tag
    addNewTag: async function() {
        const tagInput = document.getElementById('newTagName');
        const tagName = tagInput.value.trim();
        
        if (!tagName) {
            DTMonitor.api.showToast('Please enter a tag name', 'error');
            return;
        }

        try {
            const response = await DTMonitor.api.post('/tags/add', {
                name: tagName,
                description: `Custom tag: ${tagName}`
            });

            if (response.success) {
                DTMonitor.api.showToast(`Tag "${tagName}" added successfully`, 'success');
                tagInput.value = '';
                // Reload tags to show the new one
                this.loadAvailableTags();
            } else {
                DTMonitor.api.showToast(`Failed to add tag: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('Error adding tag:', error);
            DTMonitor.api.showToast('Error adding tag', 'error');
        }
    },

    // Function to edit a tag
    editTag: function(tagId, tagName, tagDescription) {
        console.log('Editing tag:', { tagId, tagName, tagDescription });
        
        // Populate the edit modal
        document.getElementById('editTagId').value = tagId;
        document.getElementById('editTagName').value = tagName;
        document.getElementById('editTagDescription').value = tagDescription || '';
        
        // Show the modal
        document.getElementById('tagEditModal').style.display = 'block';
        
        // Focus on the name input
        document.getElementById('editTagName').focus();
    },

    // Function to close the tag edit modal
    closeTagEditModal: function() {
        document.getElementById('tagEditModal').style.display = 'none';
        
        // Clear the form
        document.getElementById('tagEditForm').reset();
        document.getElementById('editTagId').value = '';
    },

    // Function to save tag changes
    saveTagChanges: async function() {
        const tagId = document.getElementById('editTagId').value;
        const tagName = document.getElementById('editTagName').value.trim();
        const tagDescription = document.getElementById('editTagDescription').value.trim();
        
        if (!tagName) {
            DTMonitor.api.showToast('Please enter a tag name', 'error');
            return;
        }
        
        try {
            const response = await DTMonitor.api.put(`/tags/update/${tagId}`, {
                name: tagName,
                description: tagDescription
            });

            if (response.success) {
                DTMonitor.api.showToast(`Tag "${tagName}" updated successfully`, 'success');
                this.closeTagEditModal();
                // Reload tags to show the updated one
                this.loadAvailableTags();
            } else {
                DTMonitor.api.showToast(`Failed to update tag: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('Error updating tag:', error);
            DTMonitor.api.showToast('Error updating tag', 'error');
        }
    },

    // Function to delete a tag
    deleteTag: async function(tagId, tagName) {
        if (!confirm(`Are you sure you want to delete the tag "${tagName}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            const response = await DTMonitor.api.delete(`/tags/delete/${tagId}`);

            if (response.success) {
                DTMonitor.api.showToast(`Tag "${tagName}" deleted successfully`, 'success');
                // Reload tags to show the updated list
                this.loadAvailableTags();
            } else {
                DTMonitor.api.showToast(`Failed to delete tag: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('Error deleting tag:', error);
            DTMonitor.api.showToast('Error deleting tag', 'error');
        }
    },

    testDomainToolsConnection: function() {
        const statusIndicator = document.getElementById('api-status');
        if (statusIndicator) {
            statusIndicator.className = 'status-badge warning';
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i> Testing...';
        }
        
        console.log('Testing DomainTools connection...');
        
        // Use direct fetch to avoid any DTMonitor.api issues
        fetch('/api/test/domaintools', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            })
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
        console.log('Testing PhishLabs connection...');
        
        // Use direct fetch to avoid any DTMonitor.api issues
        fetch('/api/test/phishlabs', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            })
            .then(result => {
                console.log('PhishLabs test result:', result);
                
                if (result.success) {
                    DTMonitor.notification.show('PhishLabs connection successful', 'success');
                } else {
                    // Handle credential errors as warnings, not errors
                    if (result.message && result.message.includes('Unauthorized')) {
                        DTMonitor.notification.show('PhishLabs credentials invalid: ' + result.message, 'warning');
                    } else {
                        DTMonitor.notification.show('PhishLabs connection failed: ' + result.message, 'error');
                    }
                }
            })
            .catch(error => {
                console.error('PhishLabs connection test error:', error);
                DTMonitor.notification.show('PhishLabs connection failed: ' + error.message, 'error');
            });
    },

    testAllConnections: function() {
        DTMonitor.notification.show('Testing all connections...', 'info');
        this.testDomainToolsConnection();
        this.testPhishLabsConnection();
    }
};

console.log('=== DTMonitor Settings Loaded ===');
