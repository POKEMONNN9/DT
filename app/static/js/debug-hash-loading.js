// Debug script to test hash loading
console.log('=== DEBUG HASH LOADING ===');

// Check if DTMonitor is loaded
console.log('DTMonitor loaded:', typeof DTMonitor !== 'undefined');
console.log('DTMonitor.hash loaded:', typeof DTMonitor !== 'undefined' && typeof DTMonitor.hash !== 'undefined');

// Check if API is available
console.log('DTMonitor.api loaded:', typeof DTMonitor !== 'undefined' && typeof DTMonitor.api !== 'undefined');

// Check if notification is available
console.log('DTMonitor.notification loaded:', typeof DTMonitor !== 'undefined' && typeof DTMonitor.notification !== 'undefined');

// Test API call directly
if (typeof DTMonitor !== 'undefined' && DTMonitor.api) {
    console.log('Testing API call...');
    DTMonitor.api.get('/hash/list')
        .then(response => {
            console.log('API Response:', response);
        })
        .catch(error => {
            console.error('API Error:', error);
        });
} else {
    console.error('DTMonitor or API not available');
}

// Check DOM elements
console.log('Hash container exists:', !!document.getElementById('hashesContainer'));
console.log('Hash modal exists:', !!document.getElementById('hashModal'));
console.log('Hash form exists:', !!document.getElementById('hashForm'));

// Try to initialize hash management manually
if (typeof DTMonitor !== 'undefined' && DTMonitor.hash) {
    console.log('Manually initializing hash management...');
    DTMonitor.hash.init();
} else {
    console.error('Cannot initialize - DTMonitor.hash not available');
}
