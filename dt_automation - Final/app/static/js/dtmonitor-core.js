// ===================================================================== //
// DTMonitor Core Framework - Essential Utilities & Base Functionality  //
// ===================================================================== //

console.log('=== DTMonitor Core Framework Loading ===');

// =============================================================================
// GLOBAL CONFIGURATION & UTILITIES
// =============================================================================

const DTMonitor = {
    config: {
        apiTimeout: 30000,
        notificationDuration: 5000,
        animationDuration: 250,
        debounceDelay: 300
    },
    
    cache: new Map(),
    
    // Error handling with detailed logging
    handleError: function(error, userMessage = 'An unexpected error occurred') {
        console.error('DTMonitor Error:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
        
        // Show user-friendly message
        DTMonitor.notification.show(userMessage, 'error');
        
        // Optional: Send error to backend for logging
        this.logError(error, userMessage);
    },
    
    logError: function(error, userMessage) {
        try {
            fetch('/api/utils/log_error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: error.message,
                    stack: error.stack,
                    userMessage: userMessage,
                    timestamp: new Date().toISOString(),
                    page: window.location.pathname
                })
            }).catch(() => {}); // Silent fail for error logging
        } catch (e) {
            // Silent fail - don't show errors for error logging
        }
    },
    
    // Debounce utility
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Loading state management
    setLoading: function(element, isLoading = true) {
        if (!element) return;
        
        if (isLoading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    },
    
    // Animation utilities
    fadeIn: function(element, duration = 250) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            const animation = element.animate([
                { opacity: 0, transform: 'translateY(10px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            });
            
            animation.onfinish = () => {
                element.style.opacity = '';
                element.style.transform = '';
                resolve();
            };
        });
    },
    
    fadeOut: function(element, duration = 250) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            const animation = element.animate([
                { opacity: 1, transform: 'translateY(0)' },
                { opacity: 0, transform: 'translateY(-10px)' }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            });
            
            animation.onfinish = () => {
                element.style.display = 'none';
                element.style.opacity = '';
                element.style.transform = '';
                resolve();
            };
        });
    }
};

// =============================================================================
// THEME MANAGEMENT
// =============================================================================

DTMonitor.theme = {
    current: 'light',
    
    init: function() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.apply(savedTheme);
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('theme')) {
                    this.apply(e.matches ? 'dark' : 'light');
                }
            });
        }
    },
    
    toggle: function() {
        const newTheme = this.current === 'dark' ? 'light' : 'dark';
        this.apply(newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Smooth transition effect
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    },
    
    apply: function(theme) {
        this.current = theme;
        const body = document.body;
        const themeIcon = document.getElementById('themeIcon');
        
        if (theme === 'dark') {
            body.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.className = 'fas fa-sun';
        } else {
            body.removeAttribute('data-theme');
            if (themeIcon) themeIcon.className = 'fas fa-moon';
        }
    }
};

// =============================================================================
// NOTIFICATION SYSTEM
// =============================================================================

DTMonitor.notification = {
    container: null,
    queue: [],
    
    init: function() {
        console.log('Initializing notification system...');
        this.container = document.getElementById('notification');
        if (!this.container) {
            console.log('Notification container not found, creating one...');
            this.createContainer();
        } else {
            console.log('Notification container found:', this.container);
        }
    },
    
    createContainer: function() {
        console.log('Creating notification container...');
        this.container = document.createElement('div');
        this.container.id = 'notification';
        this.container.className = 'notification';
        document.body.appendChild(this.container);
        console.log('Notification container created and added to body');
    },
    
    show: function(message, type = 'info', duration = DTMonitor.config.notificationDuration) {
        console.log(`[NOTIFICATION] Showing ${type}: ${message}`);
        
        if (!this.container) {
            console.log('Container not available, initializing...');
            this.init();
        }
        
        // Clear any existing timeout
        if (this.container.timeoutId) {
            clearTimeout(this.container.timeoutId);
        }
        
        // Update content and show
        this.container.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        this.container.className = `notification ${type} show`;
        
        // Add click to dismiss
        this.container.onclick = () => this.hide();
        
        // Auto-hide
        this.container.timeoutId = setTimeout(() => {
            this.hide();
        }, duration);
        
        // Add smooth entrance animation
        this.container.style.transform = 'translateX(100%)';
        requestAnimationFrame(() => {
            this.container.style.transform = 'translateX(0)';
        });
        
        console.log('Notification displayed successfully');
    },
    
    hide: function() {
        if (!this.container) return;
        
        this.container.style.transform = 'translateX(100%)';
        setTimeout(() => {
            this.container.classList.remove('show');
            this.container.innerHTML = '';
            this.container.className = 'notification';
            this.container.onclick = null;
        }, 300);
    },
    
    getIcon: function(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
};

console.log('=== DTMonitor Core Framework Loaded ===');
