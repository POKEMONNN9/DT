// ===================================================================== //
// DTMonitor Hash & ASRM - Hash Management & ASRM Rules                //
// ===================================================================== //

console.log('=== DTMonitor Hash & ASRM Loading ===');

// =============================================================================
// HASH MANAGEMENT
// =============================================================================

DTMonitor.hash = {
    modal: null,
    form: null,
    
    init: function() {
        console.log('=== INITIALIZING HASH MANAGEMENT ===');
        this.refreshReferences();
        console.log('Hash management initialized - Modal:', !!this.modal, 'Form:', !!this.form);
        this.loadHashes();
    },
    
    refreshReferences: function() {
        console.log('=== REFRESHING DOM REFERENCES ===');
        
        // Get fresh references to DOM elements with retry
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            this.modal = document.getElementById('hashModal');
            this.form = document.getElementById('hashForm');
            
            if (this.modal && this.form) {
                console.log('✅ DOM references found successfully');
                break;
            }
            
            attempts++;
            console.warn(`DOM references not found (attempt ${attempts}/${maxAttempts})`);
            
            if (attempts < maxAttempts) {
                // Brief wait before retry
                const wait = 100 * attempts;
                console.log(`Waiting ${wait}ms before retry...`);
                // Synchronous wait for DOM
                const start = Date.now();
                while (Date.now() - start < wait) {
                    // Wait
                }
            }
        }
        
        console.log('Final reference state - Modal:', !!this.modal, 'Form:', !!this.form);
        
        // Enhanced form event listener management
        if (this.form) {
            // Remove any existing listeners to prevent duplicates
            if (this.boundSaveHandler) {
                this.form.removeEventListener('submit', this.boundSaveHandler);
                console.log('Removed existing form listener');
            }
            
            // Create and bind new handler
            this.boundSaveHandler = (event) => {
                console.log('Form submit event triggered');
                event.preventDefault();
                event.stopPropagation();
                return this.save(event);
            };
            
            // Add event listener
            this.form.addEventListener('submit', this.boundSaveHandler);
            console.log('✅ Form event listener attached');
            
            // Also handle enter key in form fields
            const formInputs = this.form.querySelectorAll('input, textarea');
            formInputs.forEach(input => {
                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        if (input.tagName.toLowerCase() !== 'textarea') {
                            event.preventDefault();
                            this.form.requestSubmit();
                        }
                    }
                });
            });
            
            console.log(`✅ Enter key handlers added to ${formInputs.length} form fields`);
            
        } else {
            console.error('❌ Hash form not found in DOM');
        }
        
        return { modal: !!this.modal, form: !!this.form };
    },
    
    showAddModal: function() {
        console.log('showAddModal called');
        this.refreshReferences();
        console.log('Modal element:', this.modal);
        this.populateModal({}, 'Add Search Hash');
        this.showModal();
    },
    
    edit: async function(hashId) {
        console.log('=== EDIT HASH FUNCTION CALLED ===');
        console.log('Hash ID:', hashId);
        
        if (!hashId) {
            console.error('No hash ID provided to edit function');
            DTMonitor.notification.show('No hash ID provided', 'error');
            return;
        }
        
        try {
            console.log('Fetching hash data for ID:', hashId);
            const response = await DTMonitor.api.get(`/hash/${hashId}`);
            console.log('Hash data response:', response);
            
            if (response.success && response.hash) {
                console.log('Hash data found:', response.hash);
                this.refreshReferences();
                this.populateModal(response.hash, 'Edit Search Hash');
                this.showModal();
            } else {
                console.error('Failed to fetch hash data:', response.message);
                DTMonitor.notification.show('Failed to load hash data: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error fetching hash data:', error);
            DTMonitor.notification.show('Error loading hash data: ' + error.message, 'error');
        }
    },
    
    toggle: async function(hashId) {
        console.log('=== TOGGLE HASH FUNCTION CALLED ===');
        console.log('Hash ID:', hashId);
        
        if (!hashId) {
            console.error('No hash ID provided to toggle function');
            DTMonitor.notification.show('No hash ID provided', 'error');
            return;
        }
        
        // Prevent multiple rapid clicks
        if (this._toggling) {
            console.log('Toggle already in progress, ignoring request');
            return;
        }
        
        this._toggling = true;
        
        try {
            console.log('Toggling hash status for ID:', hashId);
            const response = await DTMonitor.api.put(`/hash/toggle/${hashId}`);
            console.log('Toggle response:', response);
            
            if (response.success) {
                console.log('Hash toggled successfully');
                DTMonitor.notification.show('Hash status updated successfully', 'success');
                this.loadHashes(); // Refresh the hash list
            } else {
                console.error('Failed to toggle hash:', response.message);
                DTMonitor.notification.show('Failed to update hash status: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error toggling hash:', error);
            DTMonitor.notification.show('Error updating hash status: ' + error.message, 'error');
        } finally {
            this._toggling = false;
        }
    },
    
    save: async function(event) {
        console.log('=== SAVE HASH FUNCTION CALLED ===');
        
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        this.refreshReferences();
        
        if (!this.form) {
            console.error('Form not found');
            DTMonitor.notification.show('Form not found', 'error');
            return;
        }
        
        const formData = new FormData(this.form);
        const hashData = {
            id: formData.get('hashId') || null,
            name: (formData.get('hashName') || '').trim(),
            value: (formData.get('hashValue') || '').trim(),
            description: (formData.get('hashDescription') || '').trim(),
            active: formData.has('hashActive') && formData.get('hashActive') === 'on'
        };
        
        console.log('Hash data to save:', hashData);
        
        if (!hashData.name) {
            DTMonitor.notification.show('Hash name is required', 'error');
            return;
        }
        
        if (!hashData.value) {
            DTMonitor.notification.show('Hash value is required', 'error');
            return;
        }
        
        try {
            let response;
            if (hashData.id) {
                console.log('Updating existing hash:', hashData.id);
                response = await DTMonitor.api.put(`/hash/update/${hashData.id}`, hashData);
            } else {
                console.log('Creating new hash');
                response = await DTMonitor.api.post('/hash/add', hashData);
            }
            
            console.log('Save response:', response);
            
            if (response.success) {
                console.log('Hash saved successfully');
                DTMonitor.notification.show('Hash saved successfully', 'success');
                this.closeModal();
                this.loadHashes(); // Refresh the hash list
            } else {
                console.error('Failed to save hash:', response.message);
                DTMonitor.notification.show('Failed to save hash: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error saving hash:', error);
            DTMonitor.notification.show('Error saving hash: ' + error.message, 'error');
        }
    },
    
    delete: async function(hashId) {
        console.log('=== DELETE HASH FUNCTION CALLED ===');
        console.log('Hash ID:', hashId);
        
        if (!hashId) {
            console.error('No hash ID provided to delete function');
            DTMonitor.notification.show('No hash ID provided', 'error');
            return;
        }
        
        // Prevent multiple rapid delete operations
        if (this._deleting) {
            console.log('Delete already in progress, ignoring request');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this hash? This action cannot be undone.')) {
            console.log('Delete cancelled by user');
            return;
        }
        
        this._deleting = true;
        
        try {
            console.log('Deleting hash with ID:', hashId);
            const response = await DTMonitor.api.delete(`/hash/delete/${hashId}`);
            console.log('Delete response:', response);
            
            if (response.success) {
                console.log('Hash deleted successfully');
                DTMonitor.notification.show('Hash deleted successfully', 'success');
                this.loadHashes(); // Refresh the hash list
            } else {
                console.error('Failed to delete hash:', response.message);
                DTMonitor.notification.show('Failed to delete hash: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error deleting hash:', error);
            DTMonitor.notification.show('Error deleting hash: ' + error.message, 'error');
        } finally {
            // Reset the flag after a delay to prevent rapid clicks
            setTimeout(() => {
                this._deleting = false;
            }, 1000);
        }
    },
    
    closeModal: function() {
        console.log('=== CLOSE MODAL FUNCTION CALLED ===');
        this.refreshReferences();
        
        if (this.modal) {
            console.log('Closing modal');
            this.modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            
            // Clear form
            if (this.form) {
                this.form.reset();
                console.log('Form cleared');
            }
        } else {
            console.warn('Modal not found for closing');
        }
    },
    
    showModal: function() {
        console.log('=== SHOW MODAL FUNCTION CALLED ===');
        this.refreshReferences();
        
        if (this.modal) {
            console.log('Showing modal');
            this.modal.style.display = 'block';
            document.body.classList.add('modal-open');
            
            // Focus on first input
            const firstInput = this.modal.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.focus();
                console.log('Focused on first input');
            }
        } else {
            console.error('Modal not found for showing');
        }
    },
    
    populateModal: function(hashData, title) {
        console.log('=== POPULATE MODAL FUNCTION CALLED ===');
        console.log('Hash data:', hashData);
        console.log('Title:', title);
        
        this.refreshReferences();
        
        if (!this.modal) {
            console.error('Modal not found for populating');
            return;
        }
        
        // Update modal title
        const titleElement = this.modal.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
            console.log('Modal title updated to:', title);
        }
        
        // Populate form fields
        if (this.form) {
            const hashIdField = this.form.querySelector('input[name="hashId"]');
            const nameField = this.form.querySelector('input[name="hashName"]');
            const valueField = this.form.querySelector('textarea[name="hashValue"]');
            const descriptionField = this.form.querySelector('textarea[name="hashDescription"]');
            const activeField = this.form.querySelector('input[name="hashActive"]');
            
            if (hashIdField) {
                hashIdField.value = hashData.id || '';
                console.log('Hash ID field populated:', hashIdField.value);
            }
            
            if (nameField) {
                nameField.value = hashData.name || '';
                console.log('Hash name field populated:', nameField.value);
            }
            
            if (valueField) {
                valueField.value = hashData.value || '';
                console.log('Hash value field populated:', valueField.value);
            }
            
            if (descriptionField) {
                descriptionField.value = hashData.description || '';
                console.log('Description field populated:', descriptionField.value);
            }
            
            if (activeField) {
                activeField.checked = hashData.active !== false;
                console.log('Active field populated:', activeField.checked);
            }
        } else {
            console.error('Form not found for populating');
        }
    },
    
    loadHashes: async function() {
        console.log('=== LOAD HASHES FUNCTION CALLED ===');
        
        try {
            console.log('Fetching hashes from API...');
            const response = await DTMonitor.api.get('/hash/list');
            console.log('Hashes response:', response);
            
            if (response.success && response.hashes) {
                console.log('Hashes loaded successfully:', response.hashes.length);
                this.displayHashes(response.hashes);
            } else {
                console.error('Failed to load hashes:', response.message);
                this.displayNoHashes();
            }
        } catch (error) {
            console.error('Error loading hashes:', error);
            this.displayNoHashes();
        }
    },
    
    displayHashes: function(hashes) {
        console.log('=== DISPLAY HASHES FUNCTION CALLED ===');
        console.log('Hashes to display:', hashes.length);
        
        const container = document.getElementById('hashGrid');
        if (!container) {
            console.error('Hashes container not found');
            return;
        }
        
        if (hashes.length === 0) {
            this.displayNoHashes();
            return;
        }
        
        const hashesHtml = hashes.map(hash => this.createHashCard(hash)).join('');
        container.innerHTML = hashesHtml;
        
        // Set up event delegation for all hash card interactions
        this.setupHashCardEventDelegation();
        
        console.log('Hashes displayed successfully');
    },
    
    createHashCard: function(hash) {
        return `
            <div class="hash-card ${hash.active ? 'active' : 'inactive'}" data-hash-id="${hash.id}">
                <div class="hash-card-header">
                    <div class="hash-status ${hash.active ? 'active' : 'inactive'}">
                        <i class="fas ${hash.active ? 'fa-check-circle' : 'fa-pause-circle'}"></i>
                    </div>
                    <h3 class="hash-name">${this.escapeHtml(hash.name)}</h3>
                </div>
                
                <div class="hash-card-content">
                    <div class="hash-value">
                        <label>Search Pattern:</label>
                        <code>${this.escapeHtml(hash.value)}</code>
                    </div>
                    
                    ${hash.description ? `
                        <div class="hash-description">
                            <label>Description:</label>
                            <p>${this.escapeHtml(hash.description)}</p>
                        </div>
                    ` : ''}
                    
                    <div class="hash-stats">
                        <span class="stat">
                            <i class="fas fa-clock"></i>
                            Last Scan: ${hash.lastScan || 'Never'}
                        </span>
                        <span class="stat">
                            <i class="fas fa-exclamation-triangle"></i>
                            Findings: ${hash.findingsCount || 0}
                        </span>
                    </div>
                </div>
                
                <div class="hash-card-actions">
                    <button class="btn btn-toggle toggle-btn ${hash.active ? 'active' : 'inactive'}" 
                            data-action="toggle" 
                            data-hash-id="${hash.id}"
                            title="${hash.active ? 'Deactivate' : 'Activate'} Hash">
                        <i class="fas ${hash.active ? 'fa-pause' : 'fa-play'}"></i>
                        ${hash.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-secondary btn-small edit-btn" 
                            data-action="edit" 
                            data-hash-id="${hash.id}"
                            title="Edit Hash">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="btn btn-info btn-small run-scan-btn" 
                            data-action="run-scan" 
                            data-hash-id="${hash.id}"
                            title="Run Single Scan">
                        <i class="fas fa-play"></i>
                        Run Scan
                    </button>
                    <button class="btn btn-danger btn-small delete-btn" 
                            data-action="delete" 
                            data-hash-id="${hash.id}"
                            title="Delete Hash">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    },
    
    setupHashCardEventDelegation: function() {
        console.log('Setting up hash card event delegation...');
        
        // Remove existing event listener if it exists
        if (this._hashCardEventHandler) {
            document.removeEventListener('click', this._hashCardEventHandler);
        }
        
        // Create new event handler
        this._hashCardEventHandler = (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;
            
            const action = button.dataset.action;
            const hashId = button.dataset.hashId;
            
            if (!hashId) return;
            
            console.log(`Hash card action: ${action} for hash ID: ${hashId}`);
            
            switch (action) {
                case 'toggle':
                    this.toggle(hashId);
                    break;
                case 'edit':
                    this.edit(hashId);
                    break;
                case 'run-scan':
                    if (typeof DTMonitor !== 'undefined' && DTMonitor.scanning) {
                        DTMonitor.scanning.runSingle(hashId);
                    }
                    break;
                case 'delete':
                    this.delete(hashId);
                    break;
                default:
                    console.warn('Unknown hash card action:', action);
            }
        };
        
        // Add new event listener
        document.addEventListener('click', this._hashCardEventHandler);
        
        console.log('Hash card event delegation set up');
    },
    
    displayNoHashes: function() {
        console.log('=== DISPLAY NO HASHES FUNCTION CALLED ===');
        
        const container = document.getElementById('hashGrid');
        if (!container) {
            console.error('Hashes container not found');
            return;
        }
        
        container.innerHTML = `
            <div class="no-hashes">
                <div class="no-hashes-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>No Hashes Found</h3>
                <p>Add your first search hash to get started with monitoring.</p>
                <button class="btn btn-primary" onclick="showAddHashModal()">
                    <i class="fas fa-plus"></i> Add Hash
                </button>
            </div>
        `;
        
        console.log('No hashes message displayed');
    },
    
    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    formatDate: function(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // ASRM Rules Management
    
    // ASRM Rules Management - Complete Implementation
    loadRules: async function() {
        try {
            console.log('Loading ASRM rules...');
            
            const response = await DTMonitor.api.get('/asrm/list');
            
            if (response.success) {
                const rules = response.rules || [];
                console.log(`Loaded ${rules.length} ASRM rules:`, rules);
                
                const container = document.getElementById('rulesList');
                if (container) {
                    console.log('Found rules container:', container);
                    container.innerHTML = '';
                    
                    if (rules.length === 0) {
                        container.innerHTML = `
                            <div class="no-rules-card">
                                <div class="no-rules-content">
                                    <h4>No Auto-Submission Rules Found</h4>
                                    <p>No auto-submission rules have been configured yet. Rules allow you to automatically submit findings to PhishLabs based on conditions like risk score, keywords, or other criteria.</p>
                                    <p>Use the "Add New Rule" button above to create your first rule.</p>
                                </div>
                            </div>
                        `;
                        return;
                    }
                    
                    // Use innerHTML approach like displayRules for consistency
                    const allRuleCardsHtml = rules.map(rule => this.createRuleCard(rule)).join('');
                    console.log('🔍 All rule cards HTML:', allRuleCardsHtml);
                    
                    container.innerHTML = allRuleCardsHtml;
                    
                    // Set up event delegation for rule card interactions
                    this.setupRuleCardEventDelegation();
                    
                    console.log('ASRM rules displayed successfully');
                } else {
                    console.error('Rules container not found');
                }
            } else {
                console.error('Failed to load ASRM rules:', response.message);
                DTMonitor.notification.show('Failed to load ASRM rules', 'error');
            }
        } catch (error) {
            console.error('Error loading ASRM rules:', error);
            DTMonitor.notification.show('Error loading ASRM rules', 'error');
        }
    },
    
    showAddRuleModal: function() {
        console.log('showAddRuleModal called');
        const modal = document.getElementById('addRuleModal');
        if (modal) {
            // Prepare all data BEFORE showing the modal
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                // Clear edit state
                delete form.dataset.editingRuleId;
            }
            
            // Clear conditions
            this.clearConditions();
            
            // Load all required data
            Promise.all([
                this.loadHashesForRule(),
                this.loadPhishLabsBrands(),
                this.loadPhishLabsCaseTypes(),
                this.loadThreatCategories()
            ]).then(() => {
                // Explicitly clear case type to ensure no default selection
                const caseTypeSelect = document.getElementById('ruleCaseType');
                if (caseTypeSelect) {
                    caseTypeSelect.value = '';
                    // Trigger change event to hide both threat type and category groups
                    this.handleCaseTypeChange();
                }
                
                // Reset modal title and button text
                const headerTitle = modal.querySelector('.header-text h2');
                if (headerTitle) {
                    headerTitle.textContent = 'Add New Auto-Submission Rule';
                }
                
                const submitBtn = modal.querySelector('button[type="submit"]');
                if (submitBtn) {
                    const btnText = submitBtn.querySelector('span');
                    if (btnText) btnText.textContent = 'Create Rule';
                }
                
                // NOW show the modal after all data is prepared
                modal.style.display = 'block';
                console.log('Add rule modal opened smoothly');
            }).catch(error => {
                console.error('Failed to load modal data:', error);
                // Show modal anyway but with error
                modal.style.display = 'block';
                DTMonitor.notification.show('Some data failed to load, but modal is available', 'warning');
            });
        } else {
            console.error('Add rule modal not found');
        }
    },
    
    loadHashesForRule: async function() {
        try {
            const response = await fetch('/search_hashes.json');
            const hashes = await response.json();
            const select = document.getElementById('ruleHash');
            if (select && Array.isArray(hashes)) {
                select.innerHTML = '<option value="">Select Hash</option>';
                hashes.forEach(hash => {
                    const option = document.createElement('option');
                    option.value = hash.id;
                    option.textContent = hash.name;
                    select.appendChild(option);
                });
                console.log('Loaded hashes for rule:', hashes.length);
            }
        } catch (error) {
            console.error('Error loading hashes for rule:', error);
        }
    },
    
    loadPhishLabsBrands: async function() {
        try {
            const response = await fetch('/api/phishlabs/brands');
            const brands = await response.json();
            const select = document.getElementById('ruleBrand');
            if (select && Array.isArray(brands)) {
                select.innerHTML = '<option value="">Select Brand</option>';
                brands.forEach(brand => {
                    const option = document.createElement('option');
                    option.value = brand.id || brand.brandId;
                    option.textContent = brand.name || brand.brandName;
                    select.appendChild(option);
                });
                console.log('Loaded PhishLabs brands:', brands.length);
            }
        } catch (error) {
            console.error('Error loading PhishLabs brands:', error);
        }
    },
    
    loadPhishLabsCaseTypes: async function() {
        // Use static case types for consistent behavior
        // PhishLabs API case types may not match our expected "threat"/"domain" values
        const select = document.getElementById('ruleCaseType');
        if (select) {
            select.innerHTML = `
                <option value="">Select Case Type</option>
                <option value="threat">Threat Case</option>
                <option value="domain">Domain Case</option>
            `;
            console.log('Loaded static case types for rule creation');
        }
    },
    
    loadThreatCategories: function() {
        // Load static threat categories from constants
        const threatCategories = {
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
        };
        
        const select = document.getElementById('ruleThreatCategory');
        if (select) {
            select.innerHTML = '<option value="">Select Threat Category</option>';
            Object.entries(threatCategories).forEach(([value, label]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                select.appendChild(option);
            });
            console.log('Loaded static threat categories');
        }
    },
    
    loadThreatTypes: async function() {
        try {
            const response = await fetch('/api/phishlabs/threat-types');
            const threatTypes = await response.json();
            const select = document.getElementById('ruleThreatType');
            if (select && Array.isArray(threatTypes)) {
                select.innerHTML = '<option value="">Select Threat Type</option>';
                threatTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id || type.threatTypeId;
                    option.textContent = type.name || type.threatTypeName;
                    select.appendChild(option);
                });
                console.log('Loaded threat types:', threatTypes.length);
            }
        } catch (error) {
            console.error('Error loading threat types:', error);
        }
    },
    
    handleCaseTypeChange: function() {
        const caseTypeSelect = document.getElementById('ruleCaseType');
        const threatTypeGroup = document.getElementById('threatTypeGroup');
        const threatCategoryGroup = document.getElementById('threatCategoryGroup');
        
        if (!caseTypeSelect) return;
        
        const selectedValue = caseTypeSelect.value;
        
        // Hide both groups initially
        if (threatTypeGroup) threatTypeGroup.style.display = 'none';
        if (threatCategoryGroup) threatCategoryGroup.style.display = 'none';
        
        // Show appropriate group based on case type
        if (selectedValue === 'threat') {
            if (threatTypeGroup) threatTypeGroup.style.display = 'block';
            this.loadThreatTypes();
        } else if (selectedValue === 'domain') {
            if (threatCategoryGroup) threatCategoryGroup.style.display = 'block';
        }
        
        console.log('Case type changed to:', selectedValue);
    },
    
    clearConditions: function() {
        const container = document.getElementById('conditionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-conditions-message">
                    <i class="fas fa-info-circle"></i>
                    <span>No conditions added yet. Click "Add Condition" to define when this rule should trigger.</span>
                </div>
            `;
        }
    },
    
    createRuleCard: function(rule) {
        // Convert ASRM conditions array to human-readable strings
        const conditions = Array.isArray(rule.conditions) ? 
            rule.conditions.map(c => {
                if (typeof c === 'object' && c.field && c.operator && c.value) {
                    return `${c.field} ${c.operator} ${c.value}`;
                }
                return typeof c === 'string' ? c : JSON.stringify(c);
            }) : [];
        
        const createdDate = rule.created_at ? new Date(rule.created_at).toLocaleDateString() : 'Unknown';
        const isEnabled = rule.enabled !== undefined ? rule.enabled : rule.active;
        
        // Create description from rule data if not provided
        const description = rule.description || 
            `Auto-submit to PhishLabs as ${rule.threat_type || 'Unknown'} threat for ${rule.brand || 'Unknown'} brand`;
        
        const ruleCardHtml = `
            <div class="rule-card ${isEnabled ? 'active' : 'inactive'}" data-rule-id="${rule.id}">
                <div class="rule-content">
                    <div class="rule-header">
                        <div class="rule-info">
                            <h5>${this.escapeHtml(rule.name)}</h5>
                            <p class="rule-description">${this.escapeHtml(description)}</p>
                            <div class="rule-details">
                                <span class="detail-badge">${this.escapeHtml(rule.brand || 'No Brand')}</span>
                                <span class="detail-badge">${this.escapeHtml(rule.threat_type || 'Unknown Type')}</span>
                                <span class="detail-badge">${this.escapeHtml(rule.case_type || 'Unknown Case')}</span>
                                ${rule.tag ? `<span class="detail-badge tag-badge"><i class="fas fa-tag"></i> ${this.escapeHtml(rule.tag)}</span>` : ''}
                            </div>
                        </div>
                        <div class="rule-status ${isEnabled ? 'active' : 'inactive'}">
                            <i class="fas ${isEnabled ? 'fa-check-circle' : 'fa-pause-circle'}"></i>
                            ${isEnabled ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                    
                    <div class="rule-conditions">
                        <h6>Conditions:</h6>
                        <div class="condition-list">
                            ${conditions.map(condition => `<span class="condition-tag">${this.escapeHtml(condition)}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="rule-meta">
                        <small class="text-muted">Created: ${createdDate}</small>
                        ${rule.hash_name ? `<small class="text-muted"> | Hash: ${this.escapeHtml(rule.hash_name)}</small>` : ''}
                    </div>
                </div>
                
                <div class="rule-actions">
                    <button class="rule-btn edit edit-rule-btn" 
                            data-action="edit" 
                            data-rule-id="${rule.id}"
                            title="Edit Rule">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="rule-btn toggle toggle-rule-btn" 
                            data-action="toggle" 
                            data-rule-id="${rule.id}"
                            title="${isEnabled ? 'Disable' : 'Enable'} Rule">
                        <i class="fas ${isEnabled ? 'fa-pause' : 'fa-play'}"></i> ${isEnabled ? 'Disable' : 'Enable'}
                    </button>
                    <button class="rule-btn delete delete-rule-btn" 
                            data-action="delete" 
                            data-rule-id="${rule.id}"
                            title="Delete Rule">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        
        console.log(`🔍 Generated rule card HTML for ${rule.id}:`, ruleCardHtml);
        return ruleCardHtml;
    },
    
    setupRuleCardEventDelegation: function() {
        console.log('Setting up rule card event delegation...');
        
        // Remove existing event listener if it exists
        if (this._ruleCardEventHandler) {
            document.removeEventListener('click', this._ruleCardEventHandler);
        }
        
        // Create new event handler
        this._ruleCardEventHandler = (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;
            
            const action = button.dataset.action;
            const ruleId = button.dataset.ruleId;
            
            if (!ruleId) return;
            
            console.log(`Rule card action: ${action} for rule ID: ${ruleId}`);
            
            switch (action) {
                case 'edit':
                    this.editRule(ruleId);
                    break;
                case 'toggle':
                    this.toggleRule(ruleId);
                    break;
                case 'delete':
                    this.deleteRule(ruleId);
                    break;
                default:
                    console.warn('Unknown rule card action:', action);
            }
        };
        
        // Add new event listener
        document.addEventListener('click', this._ruleCardEventHandler);
        
        console.log('Rule card event delegation set up');
    },
    
    closeRuleModal: function() {
        console.log('Closing rule modal');
        const modal = document.getElementById('ruleEditModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    closeAddRuleModal: function() {
        console.log('Closing add rule modal');
        const modal = document.getElementById('addRuleModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    showRulesModal: function() {
        console.log('showRulesModal called');
        // Close any other open modals first
        this.closeAllModals();
        const modal = document.getElementById('rulesModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadRules();
            console.log('Rules modal opened');
        } else {
            console.error('Rules modal not found');
        }
    },
    
    closeRulesModal: function() {
        const modal = document.getElementById('rulesModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    closeAllModals: function() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    },
    
    editRule: async function(ruleId) {
        try {
            console.log('Editing rule:', ruleId);
            
            // Fetch the rule data first
            const response = await DTMonitor.api.get(`/asrm/get/${ruleId}`);
            if (!response || response.error || !response.success) {
                DTMonitor.notification.show('Failed to load rule data for editing', 'error');
                return;
            }
            
            const rule = response.rule;
            
            // Get the modal reference
            const modal = document.getElementById('addRuleModal');
            if (!modal) {
                DTMonitor.notification.show('Edit modal not found', 'error');
                return;
            }
            
            // Prepare all data BEFORE showing the modal to prevent glitching
            const form = modal.querySelector('form');
            if (form) {
                // Load dropdown options first
                await this.loadHashesForRule();
                await this.loadPhishLabsBrands();
                await this.loadPhishLabsCaseTypes();
                await this.loadThreatCategories();
                
                // Clear and populate conditions BEFORE showing modal
                this.clearConditions();
                if (rule.conditions && Array.isArray(rule.conditions)) {
                    for (let i = 0; i < rule.conditions.length; i++) {
                        const condition = rule.conditions[i];
                        
                        // Add a new condition
                        this.addCondition();
                        
                        // Wait for the condition to be added to DOM
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // Get all condition items and find the one we just added
                        const conditionItems = document.querySelectorAll('.condition-item');
                        const currentCondition = conditionItems[conditionItems.length - 1];
                        
                        if (currentCondition) {
                            const conditionId = currentCondition.dataset.conditionId;
                            
                            // Load field options first and wait for completion
                            await this.loadFieldOptions(conditionId);
                            
                            // Wait a bit more for the field options to be fully loaded
                            await new Promise(resolve => setTimeout(resolve, 200));
                            
                            // Populate field select
                            const fieldSelect = document.querySelector(`select[name="condition_field_${conditionId}"]`);
                            if (fieldSelect) {
                                fieldSelect.value = condition.field || '';
                                
                                // Trigger change event to load operators
                                fieldSelect.dispatchEvent(new Event('change'));
                                
                                // Wait for operator options to load after field change
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                                                        
                            // Populate operator select
                            const operatorSelect = document.querySelector(`select[name="condition_operator_${conditionId}"]`);
                            if (operatorSelect) {
                                operatorSelect.value = condition.operator || '';
                            }
                            
                            // Populate value input
                            const valueInput = document.querySelector(`input[name="condition_value_${conditionId}"]`);
                            if (valueInput) {
                                valueInput.value = condition.value || '';
                            }
                            
                            // Set logical operator for non-first conditions
                            if (i > 0 && condition.logic) {
                                const logicSelect = document.querySelector(`select[name="logical_operator_${conditionId}"]`);
                                if (logicSelect) {
                                    logicSelect.value = condition.logic;
                                }
                            }
                        }
                    }
                }
                
                // Populate form fields
                this.populateRuleForm(rule);
                
                // Set editing state
                form.dataset.editingRuleId = ruleId;
                
                // Update modal title and button text
                const headerTitle = modal.querySelector('.header-text h2');
                if (headerTitle) {
                    headerTitle.textContent = 'Edit Auto-Submission Rule';
                }
                
                const submitBtn = modal.querySelector('button[type="submit"]');
                if (submitBtn) {
                    const btnText = submitBtn.querySelector('span');
                    if (btnText) btnText.textContent = 'Update Rule';
                }
                
                // NOW show the modal after all data is prepared
                modal.style.display = 'block';
                console.log('Edit rule modal opened smoothly');
            }
            
        } catch (error) {
            console.error('Error editing rule:', error);
            DTMonitor.notification.show('Error loading rule for editing', 'error');
        }
    },
    
    toggleRule: async function(ruleId) {
        try {
            console.log('Toggling rule:', ruleId);
            
            // Get the rule card element
            const ruleCard = document.querySelector(`[data-rule-id="${ruleId}"]`);
            if (!ruleCard) {
                console.error('Rule card not found');
                return;
            }
            
            // Get current status from the card
            const isCurrentlyEnabled = ruleCard.classList.contains('active');
            const newStatus = !isCurrentlyEnabled;
            
            console.log(`Current status: ${isCurrentlyEnabled}, New status: ${newStatus}`);
            
            // Show loading state
            const toggleBtn = ruleCard.querySelector('.toggle-rule-btn');
            if (toggleBtn) {
                toggleBtn.disabled = true;
                // Store original content to restore later
                toggleBtn.dataset.originalContent = toggleBtn.innerHTML;
                toggleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            }
            
            // Make API call
            const response = await DTMonitor.api.put(`/asrm/toggle/${ruleId}`);
            
            if (response.success) {
                console.log('Toggle successful, updating UI...');
                
                // Update the UI immediately
                this.updateRuleCardStatus(ruleId, response.rule);
                
                DTMonitor.notification.show(`Rule ${response.rule.enabled ? 'enabled' : 'disabled'} successfully`, 'success');
            } else {
                throw new Error(response.message || 'Failed to toggle rule');
            }
        } catch (error) {
            console.error('Error toggling rule:', error);
            DTMonitor.notification.show('Error toggling rule: ' + error.message, 'error');
        } finally {
            // Remove loading state
            const ruleCard = document.querySelector(`[data-rule-id="${ruleId}"]`);
            if (ruleCard) {
                const toggleBtn = ruleCard.querySelector('.toggle-rule-btn');
                if (toggleBtn) {
                    toggleBtn.disabled = false;
                    // Restore original content if we have it
                    if (toggleBtn.dataset.originalContent) {
                        toggleBtn.innerHTML = toggleBtn.dataset.originalContent;
                    }
                }
            }
        }
    },
    
    updateRuleCardStatus: function(ruleId, updatedRule) {
        const ruleCard = document.querySelector(`[data-rule-id="${ruleId}"]`);
        if (!ruleCard) {
            console.warn('Rule card not found, reloading rules');
            this.loadRules();
            return;
        }
        
        console.log('Updating rule card status:', updatedRule);

        // Update the card's main CSS class
        if (updatedRule.enabled) {
            ruleCard.classList.remove('inactive');
            ruleCard.classList.add('active');
        } else {
            ruleCard.classList.remove('active');
            ruleCard.classList.add('inactive');
        }

        // Update the toggle button
        const toggleBtn = ruleCard.querySelector('.toggle-rule-btn');
        if (toggleBtn) {
            toggleBtn.disabled = false;
            this.updateToggleButtonText(toggleBtn, updatedRule.enabled);
        }

        // Update the status indicator
        const statusIndicator = ruleCard.querySelector('.rule-status');
        if (statusIndicator) {
            if (updatedRule.enabled) {
                statusIndicator.textContent = 'Active';
                statusIndicator.className = 'rule-status active';
                const icon = statusIndicator.querySelector('i');
                if (icon) icon.className = 'fas fa-check-circle';
            } else {
                statusIndicator.textContent = 'Inactive';
                statusIndicator.className = 'rule-status inactive';
                const icon = statusIndicator.querySelector('i');
                if (icon) icon.className = 'fas fa-pause-circle';
            }
        }
    },
    
    updateToggleButtonText: function(toggleBtn, isEnabled) {
        if (!toggleBtn) return;
        
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = `fas ${isEnabled ? 'fa-pause' : 'fa-play'}`;
        }
        
        // Update button text (remove icon text and update main text)
        const textContent = toggleBtn.textContent.trim();
        const iconText = textContent.includes('Edit') ? 'Edit' : textContent.includes('Delete') ? 'Delete' : textContent;
        
        if (textContent.includes('Disable') || textContent.includes('Enable')) {
            toggleBtn.innerHTML = `<i class="fas ${isEnabled ? 'fa-pause' : 'fa-play'}"></i> ${isEnabled ? 'Disable' : 'Enable'}`;
        }
    },
    
    deleteRule: async function(ruleId) {
        try {
            console.log('Deleting rule:', ruleId);
            
            // Prevent multiple rapid delete operations
            if (this._deletingRule) {
                console.log('Rule delete already in progress, ignoring request');
                return;
            }
            
            if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
                return;
            }
            
            this._deletingRule = true;
            
            const response = await DTMonitor.api.delete(`/asrm/delete/${ruleId}`);
            if (response && response.success) {
                DTMonitor.notification.show('Rule deleted successfully', 'success');
                this.removeRuleCard(ruleId);
            } else {
                throw new Error(response?.message || 'Failed to delete rule');
            }
        } catch (error) {
            console.error('Error deleting rule:', error);
            DTMonitor.notification.show('Error deleting rule: ' + error.message, 'error');
        } finally {
            // Reset the flag after a delay to prevent rapid clicks
            setTimeout(() => {
                this._deletingRule = false;
            }, 1000);
        }
    },
    
    removeRuleCard: function(ruleId) {
        const ruleCard = document.querySelector(`[data-rule-id="${ruleId}"]`);
        if (ruleCard) {
            ruleCard.remove();
        }
    },
    
    populateRuleForm: function(rule) {
        // Populate form fields with rule data
        const form = document.getElementById('addRuleForm');
        if (!form) return;
        
        // Set rule ID
        const ruleIdField = form.querySelector('input[name="ruleId"]');
        if (ruleIdField) {
            ruleIdField.value = rule.id;
        }
        
        // Set rule name
        const nameField = form.querySelector('input[name="ruleName"]');
        if (nameField) {
            nameField.value = rule.name || '';
        }
        
        // Set description
        const descField = form.querySelector('textarea[name="ruleDescription"]');
        if (descField) {
            descField.value = rule.description || '';
        }
        
        // Set case type
        const caseTypeField = form.querySelector('select[name="ruleCaseType"]');
        if (caseTypeField) {
            caseTypeField.value = rule.case_type || '';
        }
        
        // Set brand
        const brandField = form.querySelector('input[name="ruleBrand"]');
        if (brandField) {
            brandField.value = rule.brand || '';
        }
        
        // Set threat type
        const threatTypeField = form.querySelector('select[name="ruleThreatType"]');
        if (threatTypeField) {
            threatTypeField.value = rule.threat_type || '';
        }
        
        // Set threat category
        const threatCategoryField = form.querySelector('select[name="ruleThreatCategory"]');
        if (threatCategoryField) {
            threatCategoryField.value = rule.threat_category || '';
        }
        
        // Set hash
        const hashField = form.querySelector('select[name="ruleHash"]');
        if (hashField) {
            hashField.value = rule.hash_id || '';
        }
        
        // Populate conditions
        this.populateRuleConditions(rule.conditions || []);
    },
    
    populateRuleConditions: function(conditions) {
        const conditionsContainer = document.getElementById('ruleConditions');
        if (!conditionsContainer) return;
        
        // Clear existing conditions
        conditionsContainer.innerHTML = '';
        
        conditions.forEach((condition, index) => {
            this.addConditionToForm(condition, index);
        });
    },
    
    addConditionToForm: function(condition, index) {
        const conditionsContainer = document.getElementById('ruleConditions');
        if (!conditionsContainer) return;
        
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'condition-row';
        conditionDiv.innerHTML = `
            <div class="condition-field">
                <select name="condition_field_${index}" required>
                    <option value="">Select Field</option>
                </select>
            </div>
            <div class="condition-operator">
                <select name="condition_operator_${index}" required>
                    <option value="">Select Operator</option>
                </select>
            </div>
            <div class="condition-value">
                <input type="text" name="condition_value_${index}" value="${condition.value || ''}" required>
            </div>
            <div class="condition-actions">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeCondition(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        conditionsContainer.appendChild(conditionDiv);
        
        // Load field options
        this.loadFieldOptions(index);
    },
    
    loadFieldOptions: async function(conditionId) {
        try {
            const response = await fetch('/api/asrm/field-options');
            const data = await response.json();
            
            if (data.success && (data.fields || (data.data && data.data.fields))) {
                const fields = data.fields || data.data.fields;
                const select = document.getElementById(`field_select_${conditionId}`);
                if (select) {
                    select.innerHTML = '<option value="">Select Field</option>';
                    
                    fields.forEach(field => {
                        const option = document.createElement('option');
                        option.value = field.key;
                        option.textContent = field.display_name;
                        option.dataset.type = field.type;
                        option.dataset.operatorType = field.operator_type || field.type;
                        option.dataset.defaultOperator = field.default_operator;
                        select.appendChild(option);
                    });
                    
                    // Add event listener to update operators when field changes
                    select.addEventListener('change', (e) => {
                        const selectedOption = e.target.selectedOptions[0];
                        if (selectedOption && selectedOption.dataset.operatorType) {
                            this.loadOperatorOptions(conditionId, selectedOption.dataset.operatorType, selectedOption.dataset.defaultOperator);
                        }
                    });
                    
                    console.log(`Loaded ${fields.length} field options for condition ${conditionId}`);
                }
            } else {
                console.error('Failed to load field options:', data.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Error loading field options:', error);
        }
    },
    
    loadOperatorOptions: async function(conditionId, operatorType, defaultOperator) {
        try {
            console.log(`Loading operators for type: ${operatorType}`);
            const response = await fetch(`/api/asrm/operators/${operatorType}`);
            
            if (!response.ok) {
                console.warn(`Operators API not available for type ${operatorType}, using fallback`);
                this.loadBasicOperatorOptions(conditionId, operatorType);
                return;
            }
            
            const data = await response.json();
            console.log(`Operators data for ${operatorType}:`, data);
            
            if (data.success && data.operators) {
                const select = document.querySelector(`select[name="condition_operator_${conditionId}"]`);
                if (select) {
                    select.innerHTML = '<option value="">Select Operator</option>';
                    
                    data.operators.forEach(operator => {
                        const option = document.createElement('option');
                        option.value = operator.value;
                        option.textContent = operator.label;
                        option.title = operator.description;
                        select.appendChild(option);
                    });
                    
                    // Set default operator if provided
                    if (defaultOperator) {
                        select.value = defaultOperator;
                    }
                    
                    console.log(`Loaded ${data.operators.length} operators for type ${operatorType} in condition ${conditionId}`);
                }
            } else {
                console.error('Failed to load operator options:', data.message);
                this.loadBasicOperatorOptions(conditionId, operatorType);
            }
        } catch (error) {
            console.error('Error loading operator options:', error);
            this.loadBasicOperatorOptions(conditionId, operatorType);
        }
    },
    
    loadBasicFieldOptions: function(conditionId) {
        // Fallback with basic field options
        const select = document.getElementById(`field_select_${conditionId}`);
        if (select) {
            select.innerHTML = `
                <option value="">Select Field</option>
                <option value="risk_score" data-type="number" data-operator-type="number" data-default-operator="gte">Risk Score</option>
                <option value="domain" data-type="string" data-operator-type="string" data-default-operator="contains">Domain</option>
                <option value="registrar" data-type="string" data-operator-type="string" data-default-operator="contains">Registrar</option>
                <option value="country" data-type="string" data-operator-type="string" data-default-operator="contains">Country</option>
            `;
            
            // Add event listener for fallback options too
            select.addEventListener('change', (e) => {
                const selectedOption = e.target.selectedOptions[0];
                if (selectedOption && selectedOption.dataset.operatorType) {
                    this.loadOperatorOptions(conditionId, selectedOption.dataset.operatorType, selectedOption.dataset.defaultOperator);
                }
            });
        }
    },
    
    loadBasicOperatorOptions: function(conditionId, operatorType) {
        // Fallback with basic operator options
        const select = document.querySelector(`select[name="condition_operator_${conditionId}"]`);
        if (select) {
            let operators = [];
            
            if (operatorType === 'string' || operatorType === 'text') {
                operators = [
                    { value: 'contains', label: 'Contains' },
                    { value: 'not_contains', label: 'Not Contains' },
                    { value: 'equals', label: 'Equals' },
                    { value: 'not_equals', label: 'Not Equals' },
                    { value: 'regex', label: 'Matches Regex' }
                ];
            } else if (operatorType === 'number') {
                operators = [
                    { value: '>=', label: 'Greater Than or Equal' },
                    { value: '>', label: 'Greater Than' },
                    { value: '==', label: 'Equals' },
                    { value: '<=', label: 'Less Than or Equal' },
                    { value: '<', label: 'Less Than' },
                    { value: '!=', label: 'Not Equals' }
                ];
            } else {
                operators = [
                    { value: 'contains', label: 'Contains' },
                    { value: 'not_contains', label: 'Not Contains' },
                    { value: 'equals', label: 'Equals' }
                ];
            }
            
            select.innerHTML = '<option value="">Select Operator</option>';
            operators.forEach(op => {
                const option = document.createElement('option');
                option.value = op.value;
                option.textContent = op.label;
                select.appendChild(option);
            });
            
            console.log(`Loaded ${operators.length} basic operators for type ${operatorType}`);
        }
    },
    
    
    addCondition: function() {
        const container = document.getElementById('conditionsContainer');
        if (!container) return;
        
        // Remove no-conditions message if it exists
        const noConditionsMsg = container.querySelector('.no-conditions-message');
        if (noConditionsMsg) {
            noConditionsMsg.remove();
        }
        
        // Check if this is the first condition
        const existingConditions = container.querySelectorAll('.condition-item');
        const isFirstCondition = existingConditions.length === 0;
        
        const conditionId = 'condition_' + Date.now();
        
        // Build condition HTML with logical operator for non-first conditions
        let conditionHtml = '';
        
        if (!isFirstCondition) {
            conditionHtml += `
                <div class="logical-operator" data-condition-id="${conditionId}">
                    <select name="logical_operator_${conditionId}" required>
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                    </select>
                    <span class="operator-label">Logical Operator</span>
                </div>
            `;
        }
        
        conditionHtml += `
            <div class="condition-item" data-condition-id="${conditionId}">
                <div class="condition-field">
                    <label>Field</label>
                    <select name="condition_field_${conditionId}" required id="field_select_${conditionId}">
                        <option value="">Loading fields...</option>
                    </select>
                </div>
                <div class="condition-operator">
                    <label>Operator</label>
                    <select name="condition_operator_${conditionId}" required>
                        <option value="">Select Operator</option>
                    </select>
                </div>
                <div class="condition-value">
                    <label>Value</label>
                    <input type="text" name="condition_value_${conditionId}" placeholder="Enter value(s)" required>
                </div>
                <button type="button" class="condition-remove" onclick="removeCondition('${conditionId}')" title="Remove Condition">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', conditionHtml);
        
        // Load field options for the new condition
        this.loadFieldOptions(conditionId);
        
        console.log('Added condition:', conditionId, 'Is first:', isFirstCondition);
    },
    
    removeCondition: function(conditionId) {
        // Remove both the logical operator and condition
        const logicalOperator = document.querySelector(`.logical-operator[data-condition-id="${conditionId}"]`);
        const condition = document.querySelector(`.condition-item[data-condition-id="${conditionId}"]`);
        
        if (logicalOperator) {
            logicalOperator.remove();
        }
        if (condition) {
            condition.remove();
        }
        
        // Check if no conditions remain
        const container = document.getElementById('conditionsContainer');
        const remainingConditions = container.querySelectorAll('.condition-item');
        if (remainingConditions.length === 0) {
            this.clearConditions();
        }
    },
    
    saveRule: async function(event) {
        event.preventDefault();
        
        try {
            // Collect form data
            const formData = new FormData(event.target);
            const conditions = this.collectConditions();
            
            if (conditions.length === 0) {
                DTMonitor.notification.show('Please add at least one condition for the rule', 'error');
                return;
            }
            
            // Handle tagging configuration
            const enableTagging = document.getElementById('ruleEnableTagging')?.checked || false;
            const selectedTag = enableTagging ? document.getElementById('ruleTagSelect')?.value || '' : '';
            
            const ruleData = {
                name: formData.get('ruleName'),
                hash_id: formData.get('ruleHash'),
                case_type: formData.get('ruleCaseType'),
                brand: formData.get('ruleBrand'),
                threat_type: formData.get('ruleThreatType') || '',
                threat_category: formData.get('ruleThreatCategory') || '',
                tag: selectedTag,  // Add tag field
                conditions: conditions,
                enabled: true
            };
            
            // Check if we're editing an existing rule
            const editingRuleId = event.target.dataset.editingRuleId;
            
            let response;
            let successMessage;
            
            if (editingRuleId) {
                // Update existing rule
                response = await DTMonitor.api.put(`/asrm/update/${editingRuleId}`, ruleData);
                successMessage = 'Rule updated successfully';
            } else {
                // Create new rule
                response = await DTMonitor.api.post('/asrm/add', ruleData);
                successMessage = 'Rule created successfully';
            }
            
            if (response.success) {
                DTMonitor.notification.show(successMessage, 'success');
                this.closeAddRuleModal();
                
                // Add immediate UI feedback instead of full reload
                if (editingRuleId) {
                    // For updates, reload the rules to show changes
                    this.loadRules();
                } else {
                    // For new rules, add the new rule card immediately
                    this.addNewRuleCard(response.rule || response);
                }
            } else {
                throw new Error(response.message || 'Failed to save rule');
            }
        } catch (error) {
            console.error('Error saving rule:', error);
            DTMonitor.notification.show('Failed to save rule: ' + error.message, 'error');
        }
    },
    
    collectConditions: function() {
        const conditions = [];
        const conditionItems = document.querySelectorAll('.condition-item');
        
        conditionItems.forEach((item, index) => {
            const conditionId = item.dataset.conditionId;
            const field = item.querySelector(`select[name="condition_field_${conditionId}"]`)?.value;
            const operator = item.querySelector(`select[name="condition_operator_${conditionId}"]`)?.value;
            const value = item.querySelector(`input[name="condition_value_${conditionId}"]`)?.value;
            
            if (field && operator && value) {
                const condition = {
                    field: field,
                    operator: operator,
                    value: value
                };
                
                // Add logical operator for all conditions except the first
                if (index > 0) {
                    const logicalOperatorElement = document.querySelector(`.logical-operator[data-condition-id="${conditionId}"] select`);
                    if (logicalOperatorElement) {
                        condition.logic = logicalOperatorElement.value || 'AND';
                    } else {
                        condition.logic = 'AND'; // Default fallback
                    }
                }
                
                conditions.push(condition);
            }
        });
        
        return conditions;
    },
    
    addNewRuleCard: function(rule) {
        const container = document.getElementById('rulesList');
        if (container) {
            // Remove no-rules message if it exists
            const noRulesMsg = container.querySelector('.no-rules-card');
            if (noRulesMsg) {
                noRulesMsg.remove();
            }
            
            // Add the new rule card
            const ruleCardHtml = this.createRuleCard(rule);
            container.insertAdjacentHTML('beforeend', ruleCardHtml);
        }
    },
    
    handleCaseTypeChange: function() {
        const caseTypeSelect = document.getElementById('ruleCaseType');
        const threatTypeGroup = document.getElementById('threatTypeGroup');
        const threatCategoryGroup = document.getElementById('threatCategoryGroup');
        
        if (!caseTypeSelect) return;
        
        const selectedValue = caseTypeSelect.value;
        
        // Hide both groups initially
        if (threatTypeGroup) threatTypeGroup.style.display = 'none';
        if (threatCategoryGroup) threatCategoryGroup.style.display = 'none';
        
        // Show appropriate group based on case type
        if (selectedValue === 'threat') {
            if (threatTypeGroup) threatTypeGroup.style.display = 'block';
            this.loadThreatTypes();
        } else if (selectedValue === 'domain') {
            if (threatCategoryGroup) threatCategoryGroup.style.display = 'block';
        }
        
        console.log('Case type changed to:', selectedValue);
    },
    
    showRegexGuideModal: function() {
        console.log('Showing regex guide modal');
        const modal = document.getElementById('regexGuideModal');
        if (modal) {
            modal.style.display = 'block';
        }
    },
    
    closeRegexGuideModal: function() {
        console.log('Closing regex guide modal');
        const modal = document.getElementById('regexGuideModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    
    initializeRuleCardDimensions: function(ruleCard, ruleId) {
        // Wait for the card to be fully rendered
        setTimeout(() => {
            if (ruleCard && ruleCard.offsetHeight > 0) {
                console.log(`Rule card ${ruleId} dimensions initialized:`, {
                    width: ruleCard.offsetWidth,
                    height: ruleCard.offsetHeight
                });
            }
        }, 100);
    },
    
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
                console.log('Loaded PhishLabs brands for modal:', brands.length);
            }
        } catch (error) {
            console.error('Error loading PhishLabs brands for modal:', error);
        }
    },
    
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
                console.log('Loaded PhishLabs threat types for modal:', threatTypes.length);
            }
        } catch (error) {
            console.error('Error loading PhishLabs threat types for modal:', error);
        }
    },
    
    // Additional missing hash functions
    showAddHashModal: function() {
        console.log('showAddHashModal called');
        this.showModal();
    },
    
    forceLoadHashes: function() {
        console.log('forceLoadHashes called');
        this.loadHashes();
    },
    
    executeFullScan: function() {
        const button = event.target.closest('.btn-modern');
        if (button) {
            button.classList.add('loading');
            button.disabled = true;
        }
        
        DTMonitor.notification.show('Starting full scan of all active hashes...', 'info');
        
        fetch('/api/scan/full', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                DTMonitor.notification.show('Full scan completed successfully!', 'success');
                // Refresh hashes after scan
                setTimeout(() => {
                    this.loadHashes();
                }, 1000);
            } else {
                throw new Error(data.message || 'Scan failed');
            }
        })
        .catch(error => {
            console.error('Full scan error:', error);
            DTMonitor.notification.show('Full scan failed: ' + error.message, 'error');
        })
        .finally(() => {
            if (button) {
                button.classList.remove('loading');
                button.disabled = false;
            }
        });
    },
    
    
    updateCardStatus: function(card, newStatus, hashId) {
        // Update card class - preserve base class and only toggle active/inactive
        card.classList.remove('active', 'inactive');
        card.classList.add(newStatus ? 'active' : 'inactive');
        
        // Update status icon with animation
        const statusIcon = card.querySelector('.status-icon i');
        if (statusIcon) {
            statusIcon.className = newStatus ? 'fas fa-check-circle' : 'fas fa-times-circle';
        }
        
        // Update status text
        const statusText = card.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = newStatus ? 'Active' : 'Inactive';
        }
        
        // Update toggle button
        const toggleBtn = card.querySelector('.toggle-btn');
        if (toggleBtn) {
            this.updateHashToggleButton(toggleBtn, newStatus);
        }
        
        console.log(`Hash ${hashId} status updated to: ${newStatus ? 'active' : 'inactive'}`);
    },
    
    updateHashToggleButton: function(toggleBtn, isActive) {
        if (isActive) {
            toggleBtn.title = 'Deactivate Hash';
            const icon = toggleBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-pause';
            const textNode = toggleBtn.childNodes[1];
            if (textNode) textNode.textContent = ' Deactivate';
        } else {
            toggleBtn.title = 'Activate Hash';
            const icon = toggleBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-play';
            const textNode = toggleBtn.childNodes[1];
            if (textNode) textNode.textContent = ' Activate';
        }
    },
    
    // ASRM Rule Tagging Functions
    toggleRuleTagging: function() {
        const checkbox = document.getElementById('ruleEnableTagging');
        const tagField = document.getElementById('ruleTaggingField');
        
        if (checkbox && tagField) {
            if (checkbox.checked) {
                tagField.style.display = 'block';
                this.loadAvailableTagsForRule();
            } else {
                tagField.style.display = 'none';
                this.resetRuleTagSelection();
            }
        }
    },

    loadAvailableTagsForRule: function() {
        console.log('Loading available tags for ASRM rule...');
        
        fetch('/api/tags/list')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.tags) {
                    this.populateRuleTagSelect(data.tags);
                } else {
                    console.error('Failed to load tags:', data.message);
                }
            })
            .catch(error => {
                console.error('Error loading tags:', error);
            });
    },

    populateRuleTagSelect: function(tags) {
        const tagSelect = document.getElementById('ruleTagSelect');
        if (!tagSelect) return;
        
        // Clear existing options except the first two
        while (tagSelect.children.length > 2) {
            tagSelect.removeChild(tagSelect.lastChild);
        }
        
        // Add tags as options
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.name;
            option.textContent = tag.name;
            tagSelect.appendChild(option);
        });
    },

    handleRuleTagSelection: function() {
        const tagSelect = document.getElementById('ruleTagSelect');
        const newTagField = document.getElementById('ruleNewTagField');
        
        if (tagSelect && newTagField) {
            if (tagSelect.value === '__new__') {
                newTagField.style.display = 'block';
            } else {
                newTagField.style.display = 'none';
            }
        }
    },

    createRuleTag: async function() {
        const newTagInput = document.getElementById('ruleNewTag');
        const tagName = newTagInput?.value?.trim();
        
        if (!tagName) {
            DTMonitor.notification.show('Please enter a tag name', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/tags/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: tagName,
                    description: `Auto-created for ASRM rule tagging`
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                DTMonitor.notification.show(`Tag "${tagName}" created successfully`, 'success');
                
                // Reload tags and select the newly created tag
                this.loadAvailableTagsForRule();
                
                setTimeout(() => {
                    const tagSelect = document.getElementById('ruleTagSelect');
                    if (tagSelect) {
                        tagSelect.value = tagName;
                    }
                }, 500);
                
                // Hide new tag field
                document.getElementById('ruleNewTagField').style.display = 'none';
                newTagInput.value = '';
            } else {
                DTMonitor.notification.show(data.message || 'Failed to create tag', 'error');
            }
        } catch (error) {
            console.error('Error creating tag:', error);
            DTMonitor.notification.show('Error creating tag', 'error');
        }
    },

    resetRuleTagSelection: function() {
        const tagSelect = document.getElementById('ruleTagSelect');
        const newTagField = document.getElementById('ruleNewTagField');
        const newTagInput = document.getElementById('ruleNewTag');
        const checkbox = document.getElementById('ruleEnableTagging');
        
        if (tagSelect) tagSelect.value = '';
        if (newTagField) newTagField.style.display = 'none';
        if (newTagInput) newTagInput.value = '';
        if (checkbox) checkbox.checked = false;
    },
    
    // Debug functions
    enableRuleCardDebugging: function() {
        const ruleCards = document.querySelectorAll('[data-rule-id]');
        ruleCards.forEach(card => {
            // Add debug class
            card.classList.add('debug-sizing');
            
            // Add debug info
            const debugInfo = document.createElement('div');
            debugInfo.className = 'debug-info';
            debugInfo.innerHTML = `
                <div>Width: ${card.offsetWidth}px</div>
                <div>Height: ${card.offsetHeight}px</div>
                <div>Rule ID: ${card.dataset.ruleId}</div>
            `;
            card.appendChild(debugInfo);
        });
        
        console.log('Rule card debugging enabled');
    },
    
    disableRuleCardDebugging: function() {
        const ruleCards = document.querySelectorAll('[data-rule-id]');
        ruleCards.forEach(card => {
            // Remove debug class
            card.classList.remove('debug-sizing');
            
            // Remove debug info
            const debugInfo = card.querySelector('.debug-info');
            if (debugInfo) {
                debugInfo.remove();
            }
        });
        
        console.log('Rule card debugging disabled');
    }
};

console.log('=== DTMonitor Hash & ASRM Loaded ===');
