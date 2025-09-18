// ===================================================================== //
// DTMonitor Scanning & Scheduler - All Scanning Operations            //
// ===================================================================== //

console.log('=== DTMonitor Scanning & Scheduler Loading ===');

// =============================================================================
// SCHEDULER MANAGEMENT
// =============================================================================

DTMonitor.scheduler = {
    start: async function() {
        const button = document.querySelector('[onclick*="startScheduler"]');
        DTMonitor.setLoading(button, true);
        
        try {
            DTMonitor.notification.show('Starting scheduler...', 'info');
            
            const result = await DTMonitor.api.post('/scheduler/start');
            
            if (result.success) {
                DTMonitor.notification.show('Scheduler started successfully', 'success');
                setTimeout(() => location.reload(), 2000);
            } else {
                throw new Error(result.message || 'Failed to start scheduler');
            }
        } catch (error) {
            DTMonitor.handleError(error, 'Failed to start scheduler. Please try again.');
        } finally {
            DTMonitor.setLoading(button, false);
        }
    },
    
    stop: async function() {
        const button = document.querySelector('[onclick*="stopScheduler"]');
        DTMonitor.setLoading(button, true);
        
        try {
            DTMonitor.notification.show('Stopping scheduler...', 'info');
            
            const result = await DTMonitor.api.post('/scheduler/stop');
            
            if (result.success) {
                DTMonitor.notification.show('Scheduler stopped successfully', 'success');
                setTimeout(() => location.reload(), 2000);
            } else {
                throw new Error(result.message || 'Failed to stop scheduler');
            }
        } catch (error) {
            DTMonitor.handleError(error, 'Failed to stop scheduler. Please try again.');
        } finally {
            DTMonitor.setLoading(button, false);
        }
    },
    
    refresh: function() {
        DTMonitor.notification.show('Refreshing scheduler status...', 'info');
        setTimeout(() => location.reload(), 500);
    }
};

// =============================================================================
// SCANNING MANAGEMENT
// =============================================================================

DTMonitor.scanning = {
    init: function() {
        console.log('Scanning management initialized');
    },
    
    runAll: async function() {
        const button = document.querySelector('[onclick*="runAllScans"]');
        DTMonitor.setLoading(button, true);
        
        try {
            DTMonitor.notification.show('Starting scan of all active hashes...', 'info');
            
            const result = await DTMonitor.api.post('/scan/full');
            
            if (result.success) {
                DTMonitor.notification.show(result.message || 'All scans completed successfully', 'success');
                setTimeout(() => location.reload(), 2000);
            } else {
                throw new Error(result.message || 'Scan failed');
            }
        } catch (error) {
            DTMonitor.handleError(error, 'Failed to run scans. Please check your configuration and try again.');
        } finally {
            DTMonitor.setLoading(button, false);
        }
    },
    
    runSelected: async function() {
        const hashSelect = document.getElementById('hashSelect');
        const button = document.querySelector('[onclick*="runSelectedScan"]');
        
        if (!hashSelect || !hashSelect.value) {
            DTMonitor.notification.show('Please select a hash to scan', 'warning');
            return;
        }
        
        DTMonitor.setLoading(button, true);
        
        try {
            const hashId = hashSelect.value;
            const hashName = hashSelect.options[hashSelect.selectedIndex].text;
            
            DTMonitor.notification.show(`Starting scan for ${hashName}...`, 'info');
            
            const result = await DTMonitor.api.post('/scan/single', { hash_id: hashId });
            
            if (result.success) {
                DTMonitor.notification.show(result.message || `Scan for ${hashName} completed successfully`, 'success');
                setTimeout(() => location.reload(), 2000);
            } else {
                throw new Error(result.message || 'Scan failed');
            }
        } catch (error) {
            DTMonitor.handleError(error, 'Failed to run scan. Please try again.');
        } finally {
            DTMonitor.setLoading(button, false);
        }
    },
    
    runSingle: async function(hashId) {
        if (!hashId) {
            DTMonitor.notification.show('Invalid hash ID', 'warning');
            return;
        }
        
        // Find the button by data attributes instead of onclick
        const button = document.querySelector(`[data-action="run-scan"][data-hash-id="${hashId}"]`);
        if (button) {
            DTMonitor.setLoading(button, true);
        }
        
        try {
            DTMonitor.notification.show('Starting scan...', 'info');
            
            const result = await DTMonitor.api.post('/scan/single', { hash_id: hashId });
            
            if (result.success) {
                DTMonitor.notification.show(result.message || 'Scan completed successfully', 'success');
                setTimeout(() => location.reload(), 2000);
            } else {
                throw new Error(result.message || 'Scan failed');
            }
        } catch (error) {
            DTMonitor.handleError(error, 'Scan operation failed. Please try again later.');
        } finally {
            if (button) {
                DTMonitor.setLoading(button, false);
            }
        }
    },
    
    viewHistory: function() {
        console.log('Viewing scan history...');
        DTMonitor.notification.show('Viewing scan history...', 'info');
        
        // Navigate to scan history page or show modal
        window.location.href = '/scan-history';
    },
    
    exportResults: function() {
        console.log('Exporting scan results...');
        DTMonitor.notification.show('Exporting scan results...', 'info');
        
        // Export scan results
        window.location.href = '/api/scanning/export';
    }
};

console.log('=== DTMonitor Scanning & Scheduler Loaded ===');
