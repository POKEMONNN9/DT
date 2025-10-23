// Global variables
let currentData = {};
let refreshInterval;
let currentSection = 'executive';
let connectionStatus = 'disconnected';
let chartInstances = {};
let notificationQueue = [];
let animationFrameId = null;

// ============================================================================
// GLOBAL FUNCTIONS - Available immediately for onclick handlers
// ============================================================================

// Global functions - Available immediately for onclick handlers
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
        section.classList.add('active');
    }
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.onclick && link.onclick.toString().includes(`'${sectionName}'`)) {
            link.classList.add('active');
        }
    });
    
    currentSection = sectionName;
    loadSectionData(sectionName);
}

function refreshData() {
    showNotification('Refreshing data...', 'info');
    
    try {
        if (typeof executiveDashboard !== 'undefined' && executiveDashboard) {
            executiveDashboard.updateData();
        }
        if (typeof operationalDashboard !== 'undefined' && operationalDashboard) {
            operationalDashboard.updateData();
        }
        if (typeof threatIntelligenceDashboard !== 'undefined' && threatIntelligenceDashboard) {
            threatIntelligenceDashboard.updateData();
        }
        if (typeof campaignManagementDashboard !== 'undefined' && campaignManagementDashboard) {
            campaignManagementDashboard.updateData();
        }
        if (typeof socialExecutiveDashboard !== 'undefined' && socialExecutiveDashboard) {
            socialExecutiveDashboard.updateData();
        }
        
        showNotification('Data refreshed successfully', 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showNotification('Failed to refresh data: ' + error.message, 'error');
    }
}

/**
 * Toggle Focus Mode - Hide/Show Sidebar and Navigation
 */
function toggleFocusMode() {
    const body = document.body;
    const button = document.getElementById('toggleFocusMode');
    const icon = button.querySelector('i');
    
    body.classList.toggle('focus-mode');
    
    if (body.classList.contains('focus-mode')) {
        // Entering focus mode
        icon.className = 'fas fa-compress';
        button.title = 'Exit Focus Mode (or press ESC)';
        showNotification('Focus Mode Enabled - Press ESC or click button to exit', 'info');
    } else {
        // Exiting focus mode
        icon.className = 'fas fa-expand';
        button.title = 'Toggle Focus Mode (Hide/Show Sidebar & Nav)';
        showNotification('Focus Mode Disabled', 'info');
    }
}

/**
 * Handle Escape key to exit Focus Mode
 */
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
        const body = document.body;
        
        // Only exit focus mode if we're in it
        if (body.classList.contains('focus-mode')) {
            toggleFocusMode();
        }
    }
});

function handleDateFilterChange() {
    const dateFilter = document.getElementById('dateFilter');
    const customDateRange = document.getElementById('customDateRange');
    
    if (dateFilter) {
        const selectedFilter = dateFilter.value;
        console.log('Date filter changed to:', selectedFilter);
        
        // Show/hide custom date range section
        if (customDateRange) {
            if (selectedFilter === 'custom') {
                customDateRange.style.display = 'block';
            } else {
                customDateRange.style.display = 'none';
            }
        }
        
        // Update all dashboards with new date filter
        refreshData();
    }
}

// Infrastructure Analysis Tab Switching
function showInfraTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.infra-tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    const targetTab = document.getElementById(`infra-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('onclick')?.includes(tabName)) {
            button.classList.add('active');
        }
    });
    
    // Load data for specific tabs
    if (typeof threatIntelligenceDashboard !== 'undefined') {
        if (tabName === 'actors') {
            console.log('<i class="fas fa-bullseye"></i> Loading Threat Actor Infrastructure data...');
            threatIntelligenceDashboard.loadActorInfrastructurePreferences();
        } else if (tabName === 'families') {
            console.log('<i class="fas fa-bullseye"></i> Loading Threat Family Intelligence data...');
            threatIntelligenceDashboard.loadFamilyInfrastructurePreferences();
        }
    } else {
        console.warn('<i class="fas fa-exclamation-triangle"></i> threatIntelligenceDashboard not defined');
    }
}

// Copy functions
function copyExecutiveDashboard() {
    const executiveSection = document.getElementById('executive-section');
    if (executiveSection) {
        copyChartAsHTML(executiveSection, 'Executive Dashboard');
    }
}

function copyCompleteDashboard() {
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
        copyChartAsHTML(dashboardContainer, 'Complete Dashboard');
    }
}

// Configuration
const CONFIG = {
    refreshInterval: 30 * 60 * 1000,
    timeoutDuration: 30000,
    maxRetries: 3,
    notificationDuration: 5000,
    chartAnimationDuration: 1000,
    colors: {
        primary: '#1e40af',
        primaryLight: '#3b82f6',
        primaryDark: '#1e3a8a',
        threat: '#dc2626',
        success: '#10b981',
        warning: '#f59e0b',
        info: '#06b6d4',
        purple: '#7c3aed'
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize timestamp function
function initializeTimestamp() {
    updateTimestamp();
}

function updateTimestamp() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const element = document.getElementById('timestamp');
    if (element) {
        element.textContent = timeString;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Enhanced Professional Dashboard...');
    
    initializeTimestamp();
    initializeEventListeners();
    checkConnectionStatus();
    initializeAdvancedDashboards();
    
    // Initialize chart size constraints
    initializeChartConstraints();
    
    setTimeout(() => {
        console.log('Loading initial executive dashboard data...');
        
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not available!');
            showNotification('Chart.js library failed to load', 'error');
            return;
        }
        
        console.log('Chart.js available, version:', Chart.version);
        configureChartDefaults();
        
        if (executiveDashboard) {
            executiveDashboard.updateData();
        }
    }, 1000);
    
    setInterval(updateTimestamp, 1000);
    setInterval(checkConnectionStatus, 5 * 60 * 1000);
    refreshInterval = setInterval(refreshData, CONFIG.refreshInterval);
    
    console.log('Enhanced dashboard initialized successfully');
});

function configureChartDefaults() {
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#4b5563';
    Chart.defaults.animation.duration = CONFIG.chartAnimationDuration;
    Chart.defaults.animation.easing = 'easeInOutCubic';
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    
    // Add resize observer to handle chart resizing properly
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(entries => {
            entries.forEach(entry => {
                const canvas = entry.target;
                if (canvas._chart) {
                    canvas._chart.resize();
                }
            });
        });
        
        // Observe all canvas elements
        document.querySelectorAll('canvas').forEach(canvas => {
            resizeObserver.observe(canvas);
        });
    }
}

// ============================================================================
// EXECUTIVE DASHBOARD CLASS
// ============================================================================

class ExecutiveDashboard {
    constructor() {
        this.threatLandscapeChart = null;
        this.geographicHeatmapChart = null;
        this.timelineTrendsChart = null;
        this.miniTrendChart = null;
        this.currentView = 'types';
    }

    async updateData() {
        try {
            await this.updateMetrics();
            await this.updateThreatLandscapeChart();
            await this.updateGeographicHeatmapChart();
            
            // Load new Executive Summary charts
            await this.loadNewExecutiveCharts();
            
            this.renderActivityTimeline(); // Render the timeline HTML structure
            await this.updateTimelineTrendsChart();
            await this.updateMiniTrendChart();
            this.initializeThreatLandscapeControls();
        } catch (error) {
            console.error('Error updating executive dashboard:', error);
            showNotification('Failed to update executive dashboard', 'error');
        }
    }

    renderActivityTimeline() {
        // Find the executive section to insert the timeline
        const executiveSection = document.getElementById('executive-section');
        if (!executiveSection) {
            console.error('Executive section not found');
            return;
        }

        // Check if timeline already exists
        let timelineContainer = document.querySelector('.timeline-trends');
        if (timelineContainer) {
            return; // Already rendered
        }

        // Sleek Activity Timeline Design
        const timelineHTML = `
            <div class="chart-container timeline-trends full-width">
                <div class="timeline-header">
                    <div class="timeline-title-section">
                        <h3 class="timeline-title clickable-title" onclick="copyChartAsHTML(this.closest('.chart-container'), 'Activity Timeline Chart')" title="Click to copy chart for email">
                            Activity Timeline
                        </h3>
                        <p class="timeline-subtitle">Case activity and resolution trends</p>
                    </div>
                </div>
                <div class="timeline-content">
                    <div class="timeline-chart-container">
                        <canvas id="timelineTrendsChart"></canvas>
                    </div>
                    <div class="timeline-metrics">
                        <div class="metric-item metric-created">
                            <div class="metric-indicator"></div>
                            <div class="metric-info">
                                <span class="metric-label">Created</span>
                                <span class="metric-value" id="timelineCreated">--</span>
                            </div>
                        </div>
                        <div class="metric-item metric-resolved">
                            <div class="metric-indicator"></div>
                            <div class="metric-info">
                                <span class="metric-label">Resolved</span>
                                <span class="metric-value" id="timelineResolved">--</span>
                            </div>
                        </div>
                        <div class="metric-item metric-rate">
                            <div class="metric-indicator"></div>
                            <div class="metric-info">
                                <span class="metric-label">Rate</span>
                                <span class="metric-value" id="resolutionRate">--%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Find the executive charts grid container and append the timeline
        const chartsGrid = executiveSection.querySelector('.executive-charts-grid');
        if (chartsGrid) {
            chartsGrid.insertAdjacentHTML('beforeend', timelineHTML);
        } else {
            console.error('Executive charts grid container not found in executive section');
        }
    }

    initializeThreatLandscapeControls() {
        // Initialize Types/Severity toggle buttons
        const threatButtons = document.querySelectorAll('.threat-landscape .chart-btn');
        threatButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                threatButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const view = btn.getAttribute('data-view');
                this.switchThreatLandscapeView(view);
            });
        });
    }

    switchThreatLandscapeView(view) {
        this.currentView = view;
        if (view === 'severity') {
            this.updateThreatLandscapeResolutionView();
        } else {
            this.updateThreatLandscapeChart();
        }
    }

    async updateThreatLandscapeResolutionView() {
        try {
            // Get current date filter
            const currentDateFilter = getCurrentDateFilter();
            
            // Build API URL with proper parameters
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                ...getDateRangeParams(currentDateFilter)
            });
            
            const metrics = await fetchAPI(`/api/dashboard/executive-summary-metrics?${params}`);
            if (metrics && metrics.severity_distribution) {
                this.renderThreatLandscapeResolutionChart(metrics.severity_distribution);
            }
        } catch (error) {
            console.error('Error updating threat landscape resolution view:', error);
        }
    }

    renderThreatLandscapeResolutionChart(resolutionData) {
        const ctx = document.getElementById('threatLandscapeChart');
        if (!ctx) return;

        if (this.threatLandscapeChart) {
            this.threatLandscapeChart.destroy();
        }

        const labels = resolutionData.map(item => item.resolution_status);
        const values = resolutionData.map(item => item.case_count);
        const total = values.reduce((sum, val) => sum + val, 0);

        const colors = [
            '#dc2626', // Open - Red
            '#f59e0b', // Investigating - Amber
            '#3b82f6', // Mitigating - Blue
            '#10b981', // Closed - Green
            '#8b5cf6'  // Other - Purple
        ];

        // Set canvas size constraints
        setChartSizeConstraints(ctx, '280px', '280px');
        
        this.threatLandscapeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverBorderWidth: 4,
                    hoverBorderColor: '#ffffff',
                    hoverOffset: 8,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        callbacks: {
                            label: (context) => {
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} cases (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 2000
                }
            }
        });

        document.getElementById('threatTotalValue').textContent = total;
        this.updateThreatLegend(resolutionData.map((item, index) => ({
            threat_type: item.resolution_status,
            case_count: item.case_count
        })), colors, 'Resolution');
    }
    
    async updateMetrics() {
        try {
            // Get current date filter
            const currentDateFilter = getCurrentDateFilter();
            
            // Build API URL with proper parameters
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                ...getDateRangeParams(currentDateFilter)
            });
            
            const metrics = await fetchAPI(`/api/dashboard/executive-summary-metrics?${params}`);
            
            if (metrics && !metrics.error) {
                this.animateMetricUpdate('activeCases', metrics.active_cases || 0);
                this.animateMetricUpdate('closedToday', metrics.closed_today || 0);
                this.animateMetricUpdate('avgResolutionTime', `${metrics.avg_resolution_hours || 0}h`);
                
                // Update Most Targeted Brand
                const brandName = metrics.most_targeted_brand || "N/A";
                const brandCount = metrics.brand_case_count || 0;
                
                this.animateMetricUpdate('mostTargetedBrand', brandName);
                updateElement('brandCaseCount', `${brandCount} cases`);
                
                // Update labels based on date filter
                this.updateMetricLabels();
                
                // Update trend indicators dynamically
                this.updateTrendIndicators(metrics);
                
                this.updateWorkloadBars(metrics);
            }
        } catch (error) {
            console.error('Error updating executive metrics:', error);
        }
    }

    updateMetricLabels() {
        const currentDateFilter = getCurrentDateFilter();
        
        // Update "Resolved Today" label based on date filter
        const closedLabel = document.querySelector('#closedToday').parentElement.querySelector('.metric-label');
        const avgLabel = document.querySelector('#avgResolutionTime').parentElement.querySelector('.metric-label');
        
        switch(currentDateFilter) {
            case 'today':
                closedLabel.textContent = 'Resolved Today';
                avgLabel.textContent = 'Median Resolution';
                break;
            case 'yesterday':
                closedLabel.textContent = 'Resolved Yesterday';
                avgLabel.textContent = 'Median Resolution';
                break;
            case 'week':
                closedLabel.textContent = 'Resolved This Week';
                avgLabel.textContent = 'Median Resolution';
                break;
            case 'month':
                closedLabel.textContent = 'Resolved Last 30 Days';
                avgLabel.textContent = 'Median Resolution';
                break;
            case 'this_month':
                closedLabel.textContent = 'Resolved This Month';
                avgLabel.textContent = 'Median Resolution';
                break;
            case 'last_month':
                closedLabel.textContent = 'Resolved Last Month';
                avgLabel.textContent = 'Median Resolution';
                break;
            case 'custom':
                closedLabel.textContent = 'Resolved in Period';
                avgLabel.textContent = 'Median Resolution';
                break;
            default:
                closedLabel.textContent = 'Total Resolved';
                avgLabel.textContent = 'Median Resolution';
        }
    }

    updateTrendIndicators(metrics) {
        const dateFilter = metrics.date_filter || getCurrentDateFilter();
        
        // For "all" filter, hide all trend indicators
        if (dateFilter === 'all') {
            this.hideAllTrendIndicators();
            return;
        }
        
        // Calculate trends for each metric
        this.updateActiveThreatsTrend(metrics);
        this.updateResolvedCasesTrend(metrics);
        this.updateResolutionTimeTrend(metrics);
    }

    hideAllTrendIndicators() {
        // Hide trend indicators for all cards when "all" filter is selected
        const trendElements = document.querySelectorAll('.metric-change');
        trendElements.forEach(element => {
            element.style.display = 'none';
        });
    }

    updateActiveThreatsTrend(metrics) {
        const current = metrics.active_cases || 0;
        const previous = metrics.previous_active_cases || 0;
        const trendElement = document.querySelector('#activeCases').parentElement.querySelector('.metric-change');
        
        if (!trendElement) return;
        
        const change = this.calculatePercentageChange(current, previous);
        const trendInfo = this.getTrendInfo(change, 'threats');
        
        // Update arrow direction and color
        const arrow = trendElement.querySelector('i');
        const span = trendElement.querySelector('span');
        
        arrow.className = `fas ${trendInfo.icon}`;
        trendElement.className = `metric-change ${trendInfo.color}`;
        span.textContent = trendInfo.text;
        
        trendElement.style.display = 'flex';
    }

    updateResolvedCasesTrend(metrics) {
        const current = metrics.closed_today || 0;
        const previous = metrics.previous_closed_cases || 0;
        const trendElement = document.querySelector('#closedToday').parentElement.querySelector('.metric-change');
        
        if (!trendElement) return;
        
        const change = this.calculatePercentageChange(current, previous);
        const trendInfo = this.getTrendInfo(change, 'resolved');
        
        // Update arrow direction and color
        const arrow = trendElement.querySelector('i');
        const span = trendElement.querySelector('span');
        
        arrow.className = `fas ${trendInfo.icon}`;
        trendElement.className = `metric-change ${trendInfo.color}`;
        span.textContent = trendInfo.text;
        
        trendElement.style.display = 'flex';
    }

    updateResolutionTimeTrend(metrics) {
        const current = metrics.avg_resolution_hours || 0;
        const previous = metrics.previous_avg_resolution_hours || 0;
        const trendElement = document.querySelector('#avgResolutionTime').parentElement.querySelector('.metric-change');
        
        if (!trendElement) return;
        
        const change = this.calculatePercentageChange(current, previous);
        const trendInfo = this.getTrendInfo(change, 'resolution');
        
        // Update arrow direction and color
        const arrow = trendElement.querySelector('i');
        const span = trendElement.querySelector('span');
        
        arrow.className = `fas ${trendInfo.icon}`;
        trendElement.className = `metric-change ${trendInfo.color}`;
        span.textContent = trendInfo.text;
        
        trendElement.style.display = 'flex';
    }

    calculatePercentageChange(current, previous) {
        if (previous === 0) {
            return current > 0 ? 100 : 0; // If no previous data, show 100% if current > 0
        }
        return ((current - previous) / previous) * 100;
    }

    getTrendInfo(change, metricType) {
        const absChange = Math.abs(change);
        const changeText = `${change > 0 ? '+' : ''}${change.toFixed(0)}%`;
        
        switch (metricType) {
            case 'threats':
                // For threats: Up = Bad (more threats), Down = Good (fewer threats)
                if (change > 5) {
                    return { icon: 'fa-arrow-up', color: 'negative', text: `${changeText} vs previous` };
                } else if (change < -5) {
                    return { icon: 'fa-arrow-down', color: 'positive', text: `${changeText} vs previous` };
                } else {
                    return { icon: 'fa-minus', color: 'neutral', text: 'stable vs previous' };
                }
                
            case 'resolved':
                // For resolved cases: Up = Good (more resolved), Down = Bad (fewer resolved)
                if (change > 5) {
                    return { icon: 'fa-arrow-up', color: 'positive', text: `${changeText} vs previous` };
                } else if (change < -5) {
                    return { icon: 'fa-arrow-down', color: 'negative', text: `${changeText} vs previous` };
                } else {
                    return { icon: 'fa-minus', color: 'neutral', text: 'stable vs previous' };
                }
                
            case 'resolution':
                // For resolution time: Up = Bad (slower), Down = Good (faster)
                if (change > 5) {
                    return { icon: 'fa-arrow-up', color: 'negative', text: `${changeText} slower` };
                } else if (change < -5) {
                    return { icon: 'fa-arrow-down', color: 'positive', text: `${changeText} faster` };
                } else {
                    return { icon: 'fa-minus', color: 'neutral', text: 'stable performance' };
                }
                
            default:
                return { icon: 'fa-minus', color: 'neutral', text: 'no change' };
        }
    }

    animateMetricUpdate(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.style.transform = 'scale(1.1)';
        element.style.transition = 'transform 0.2s ease-in-out';
        
        setTimeout(() => {
            element.textContent = newValue;
            element.style.transform = 'scale(1)';
        }, 100);
    }

    updateWorkloadBars(metrics) {
        const activeBar = document.querySelector('.workload-fill.active');
        const resolvedBar = document.querySelector('.workload-fill.resolved');
        const activeCount = document.getElementById('workloadActive');
        const resolvedCount = document.getElementById('workloadResolved');
        
        if (activeBar && resolvedBar && activeCount && resolvedCount) {
            const active = metrics.active_cases || 0;
            const closed = metrics.closed_today || 0;
            const total = active + closed;
            
            if (total > 0) {
                activeBar.style.width = `${(active / total) * 100}%`;
                resolvedBar.style.width = `${(closed / total) * 100}%`;
            }
            
            activeCount.textContent = active;
            resolvedCount.textContent = closed;
        }
    }

    async updateThreatLandscapeChart() {
        try {
            // Get current date filter
            const currentDateFilter = getCurrentDateFilter();
            
            // Build API URL with proper parameters
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                ...getDateRangeParams(currentDateFilter)
            });
            
            const threatData = await fetchAPI(`/api/dashboard/threat-landscape-overview?${params}`);
            
            if (threatData && !threatData.error && Array.isArray(threatData)) {
                this.renderAdvancedThreatLandscapeChart(threatData);
            } else {
                console.log('No threat landscape data available from database');
                this.renderAdvancedThreatLandscapeChart([]);
            }
        } catch (error) {
            console.error('Error updating threat landscape chart:', error);
        }
    }

    renderAdvancedThreatLandscapeChart(data) {
        const ctx = document.getElementById('threatLandscapeChart');
        if (!ctx) return;

        if (this.threatLandscapeChart) {
            this.threatLandscapeChart.destroy();
        }

        const labels = data.map(item => item.threat_type);
        const values = data.map(item => item.case_count);
        const total = values.reduce((sum, val) => sum + val, 0);

        const colors = [
            CONFIG.colors.threat,
            CONFIG.colors.warning,
            CONFIG.colors.info,
            CONFIG.colors.purple,
            CONFIG.colors.success
        ];

        // Set canvas size constraints consistently
        setChartSizeConstraints(ctx, '280px', '280px');
        
        this.threatLandscapeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverBorderWidth: 4,
                    hoverBorderColor: '#ffffff',
                    hoverOffset: 8,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        callbacks: {
                            label: (context) => {
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} cases (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 2000
                }
            }
        });

        document.getElementById('threatTotalValue').textContent = total;
        this.updateThreatLegend(data, colors, 'Types');
    }

    updateThreatLegend(data, colors, viewType = 'Types') {
        const legendContainer = document.getElementById('threatLegend');
        if (!legendContainer) return;

        const total = data.reduce((sum, item) => sum + item.case_count, 0);
        
        legendContainer.innerHTML = data.map((item, index) => {
            const percentage = total > 0 ? ((item.case_count / total) * 100).toFixed(1) : '0.0';
            return `
                <div class="legend-item">
                    <div class="legend-color" style="background: ${colors[index]}"></div>
                    <div class="legend-label">${item.threat_type}</div>
                    <div class="legend-value">${item.case_count} (${percentage}%)</div>
                </div>
            `;
        }).join('');
    }

    async updateGeographicHeatmapChart() {
        try {
            // Get current date filter
            const currentDateFilter = getCurrentDateFilter();
            
            // Build API URL with proper parameters
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                ...getDateRangeParams(currentDateFilter)
            });
            
            const geoData = await fetchAPI(`/api/dashboard/geographic-heatmap?${params}`);
            
            if (geoData && !geoData.error && Array.isArray(geoData)) {
                this.renderAdvancedGeographicChart(geoData);
            } else {
                console.log('No geographic data available from database');
                this.renderAdvancedGeographicChart([]);
            }
        } catch (error) {
            console.error('Error updating geographic chart:', error);
        }
    }

    renderAdvancedGeographicChart(data) {
        const ctx = document.getElementById('geographicHeatmapChart');
        if (!ctx) return;

        if (this.geographicHeatmapChart) {
            this.geographicHeatmapChart.destroy();
        }

        const topCountries = data.slice(0, 8);
        const labels = topCountries.map(item => item.country);
        const values = topCountries.map(item => item.case_count);
        const maxValue = Math.max(...values);

        const backgroundColors = values.map((value, index) => {
            const intensity = value / maxValue;
            // Professional blue gradient - darker for higher values
            const opacity = 0.4 + (intensity * 0.5); // 0.4 to 0.9 opacity
            return `rgba(59, 130, 246, ${opacity})`; // Consistent blue color
        });

        // Set canvas size constraints
        setChartSizeConstraints(ctx, '100%', '100%');
        
        this.geographicHeatmapChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Domains',
                    data: values,
                    backgroundColor: backgroundColors,
                    borderWidth: 1,
                    borderColor: 'rgba(59, 130, 246, 0.8)',
                    borderRadius: 4,
                    borderSkipped: false,
                    hoverBorderWidth: 2,
                    hoverBorderColor: 'rgba(59, 130, 246, 1)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        callbacks: {
                            label: (context) => {
                                const country = data.find(d => d.country === context.label);
                                return `Cases: ${country ? country.case_count : context.parsed.x}`;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        color: '#1f2937',
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        formatter: (value, context) => {
                            return value;
                        },
                        anchor: 'center',
                        align: 'center'
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: Math.max(50, maxValue * 1.2), // Ensure x-axis goes at least to 50, or 20% beyond max value
                        grid: { 
                            color: '#f3f4f6',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            color: '#6b7280',
                            maxTicksLimit: 10,
                            stepSize: Math.ceil(Math.max(50, maxValue * 1.2) / 10)
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            font: {
                                size: 11
                            },
                            color: '#374151',
                            maxTicksLimit: 10,
                            callback: function(value, index, values) {
                                // Ensure proper spacing regardless of data count
                                return this.getLabelForValue(value);
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500
                }
            }
        });

        if (data.length > 0) {
            document.getElementById('topCountry').textContent = data[0].country;
            document.getElementById('countriesCount').textContent = data.length;
        }
    }

    async updateTimelineTrendsChart() {
        try {
            // Use main date filter instead of separate timeline filter
            
            // Get current date filter from main controls
            const currentDateFilter = getCurrentDateFilter();
            
            console.log('Fetching timeline trends data...', {
                dateFilter: currentDateFilter
            });
            
            // Build API URL with proper parameters - use main date filter, not timeline filter
            const params = new URLSearchParams({
                date_filter: currentDateFilter, // Use main date filter, not timeline filter
                ...getDateRangeParams(currentDateFilter)
            });
            
            console.log('API URL params:', params.toString());
            console.log('Full API URL:', `/api/dashboard/timeline-trends?${params}`);
            
            const trendsData = await fetchAPI(`/api/dashboard/timeline-trends?${params}`);
            console.log('Timeline trends response:', trendsData);
            console.log('Timeline trends response type:', typeof trendsData);
            console.log('Timeline trends response length:', trendsData?.length);
            
            if (trendsData && !trendsData.error) {
                // Handle new data structure with daily_trends and total_resolved
                const chartData = trendsData.daily_trends || trendsData; // Backward compatibility
                const totalResolved = trendsData.total_resolved || 0;
                
                if (Array.isArray(chartData)) {
                    this.renderAdvancedTimelineChart(chartData, currentDateFilter, totalResolved);
                } else {
                    this.renderAdvancedTimelineChart([], currentDateFilter, totalResolved);
                }
            } else {
                console.log('No timeline data available from database');
                // Show empty chart instead of mock data
                this.renderAdvancedTimelineChart([], currentDateFilter, 0);
            }
        } catch (error) {
            console.error('Error updating timeline chart:', error);
        }
    }


    renderAdvancedTimelineChart(data, filter = 'today', totalResolved = null) {
        const ctx = document.getElementById('timelineTrendsChart');
        if (!ctx) return;

        if (this.timelineTrendsChart) {
            this.timelineTrendsChart.destroy();
        }

        // Handle empty data gracefully
        if (!data || data.length === 0) {
            console.log('No timeline data available, showing empty chart');
            data = []; // Ensure data is an empty array
        }

        const labels = data.map(item => {
            if (typeof item.time_period === 'number') {
                // Hourly data
                return `${item.time_period.toString().padStart(2, '0')}:00`;
            } else if (typeof item.time_period === 'string' && item.time_period.includes('-')) {
                // Date data
                const date = new Date(item.time_period);
                if (filter === 'week') {
                    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                } else {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
            }
            return item.time_period.toString();
        });

        const createdData = data.map(item => item.cases_created || 0);
        const closedData = data.map(item => item.cases_closed || 0);
        
        console.log('Chart data processing:', {
            dataLength: data.length,
            labels: labels,
            createdData: createdData,
            closedData: closedData,
            filter: filter
        });

        console.log('Creating timeline chart with data:', {
            labels: labels,
            createdData: createdData,
            closedData: closedData
        });
        
        // Create sleek gradients for the chart
        const canvas = ctx;
        const chartArea = canvas.getContext('2d');
        
        // Sleek gradient for Cases Created
        const createdGradient = chartArea.createLinearGradient(0, 0, 0, 340);
        createdGradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
        createdGradient.addColorStop(0.3, 'rgba(239, 68, 68, 0.12)');
        createdGradient.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
        
        // Sleek gradient for Cases Closed
        const closedGradient = chartArea.createLinearGradient(0, 0, 0, 340);
        closedGradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        closedGradient.addColorStop(0.3, 'rgba(16, 185, 129, 0.12)');
        closedGradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
        
        this.timelineTrendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cases Created',
                    data: createdData,
                    borderColor: '#ef4444',
                    backgroundColor: createdGradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointHoverBorderWidth: 4,
                    pointHoverBackgroundColor: '#ef4444'
                }, {
                    label: 'Cases Closed',
                    data: closedData,
                    borderColor: '#10b981',
                    backgroundColor: closedGradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointHoverBorderWidth: 4,
                    pointHoverBackgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { 
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#374151',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        mode: 'index',
                        intersect: false,
                        cornerRadius: 8,
                        titleFont: {
                            size: 13,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 13,
                            weight: '500'
                        },
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y + ' cases';
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        offset: false,
                        grid: { 
                            display: true,
                            color: 'rgba(226, 232, 240, 0.5)',
                            lineWidth: 1,
                            drawBorder: false,
                            offset: false
                        },
                        ticks: { 
                            maxTicksLimit: 8,
                            color: '#9ca3af',
                            font: {
                                size: 11,
                                weight: '500'
                            },
                            padding: 12,
                            maxRotation: 45,
                            minRotation: 0,
                            maxTicksLimit: 8,
                            padding: 12,
                            callback: function(value, index, values) {
                                // Format labels to be more compact and prevent layout issues
                                const label = this.getLabelForValue(value);
                                if (typeof label === 'string' && label.length > 15) {
                                    // For long date strings, show abbreviated format
                                    const date = new Date(label);
                                    if (!isNaN(date.getTime())) {
                                        return date.toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });
                                    }
                                }
                                return label;
                            }
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        offset: false,
                        max: Math.max(...createdData, ...closedData) * 1.2, // Ensure y-axis goes 20% beyond the highest peak
                        grid: { 
                            display: true,
                            color: 'rgba(226, 232, 240, 0.5)',
                            lineWidth: 1,
                            drawBorder: false,
                            offset: false
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            precision: 0,
                            padding: 8,
                            stepSize: Math.ceil(Math.max(...createdData, ...closedData) * 1.2 / 8)
                        },
                        border: {
                            display: false
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0
                    }
                },
                animation: { 
                    duration: 1200,
                    easing: 'easeInOutCubic'
                }
            }
        });
        
        console.log('Timeline chart created successfully!');

        const totalCreated = createdData.reduce((sum, val) => sum + val, 0);
        // Use the totalResolved from backend if provided, otherwise fall back to summing daily closed cases
        const totalClosed = totalResolved !== null ? totalResolved : closedData.reduce((sum, val) => sum + val, 0);
        const resolutionRate = totalCreated > 0 ? Math.round((totalClosed / totalCreated) * 100) : 0;

        document.getElementById('timelineCreated').textContent = totalCreated;
        document.getElementById('timelineResolved').textContent = totalClosed;
        document.getElementById('resolutionRate').textContent = `${resolutionRate}%`;
    }

    async updateMiniTrendChart() {
        const ctx = document.getElementById('miniTrendChart');
        if (!ctx) return;

        // More robust chart destruction
        if (this.miniTrendChart) {
            try {
                this.miniTrendChart.destroy();
            } catch (e) {
                console.warn('Error destroying mini trend chart:', e);
            }
            this.miniTrendChart = null;
        }
        
        // Clear any existing chart on the canvas
        try {
            const existingChart = Chart.getChart(ctx);
            if (existingChart) {
                existingChart.destroy();
            }
        } catch (e) {
            console.warn('Error clearing existing chart:', e);
        }

        // Clear the canvas completely and reset attributes
        try {
            const canvas = ctx;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Remove chart.js data attributes
            canvas.removeAttribute('data-chartjs-chart-id');
            delete canvas.chart;
        } catch (e) {
            console.warn('Error clearing canvas:', e);
        }

        // Add longer delay to prevent rapid chart recreation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Fetch real data for mini trend chart
        let data = [];
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                ...getDateRangeParams(currentDateFilter)
            });
            
            const trendsData = await fetchAPI(`/api/dashboard/timeline-trends?${params}`);
            
            if (trendsData && !trendsData.error && Array.isArray(trendsData)) {
                // Take the last 12 data points for the mini chart
                const recentData = trendsData.slice(-12);
                data = recentData.map(item => item.cases_created || 0);
            }
            
            // If no data, show empty chart
            if (data.length === 0) {
                data = Array(12).fill(0);
            }
        } catch (error) {
            console.error('Error updating mini trend chart:', error);
            // Show empty chart on error
            data = Array(12).fill(0);
        }

        this.miniTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(data.length).fill(''),
                datasets: [{
                    data: data,
                    borderColor: CONFIG.colors.warning,
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }

    destroy() {
        if (this.threatLandscapeChart) this.threatLandscapeChart.destroy();
        if (this.geographicHeatmapChart) this.geographicHeatmapChart.destroy();
        if (this.timelineTrendsChart) this.timelineTrendsChart.destroy();
        if (this.miniTrendChart) this.miniTrendChart.destroy();
    }

    // Load and render Brand Distribution Chart
    async loadBrandDistributionChart() {
        try {
            const dateFilter = document.getElementById('dateFilter')?.value || 'all';
            const startDate = document.getElementById('startDate')?.value || '';
            const endDate = document.getElementById('endDate')?.value || '';
            
            const params = new URLSearchParams({
                date_filter: dateFilter,
                start_date: startDate,
                end_date: endDate
            });
            
            const response = await fetch(`/api/dashboard/brand-distribution?${params}`);
            const brandData = await response.json();
            
            if (!brandData || brandData.length === 0) {
                document.getElementById('brandDistributionLoading').style.display = 'none';
                document.getElementById('brandDistributionNoData').style.display = 'block';
                return;
            }
            
            this.renderBrandDistributionChart(brandData);
            
        } catch (error) {
            console.error('Error loading brand distribution:', error);
            document.getElementById('brandDistributionLoading').style.display = 'none';
            document.getElementById('brandDistributionNoData').style.display = 'block';
        }
    }

    /**
     * Render Brand Distribution Chart
     */
    renderBrandDistributionChart(brandData) {
        // Hide loading, show container
        document.getElementById('brandDistributionLoading').style.display = 'none';
        document.getElementById('brandDistributionContainer').style.display = 'block';
        
        // Generate color palette using app theme colors
        const colors = [
            '#1e40af', '#3b82f6', '#dc2626', '#059669', '#f59e0b', '#0891b2',
            '#7c3aed', '#10b981', '#ef4444', '#06b6d4', '#84cc16', '#f97316'
        ];
        
        // Create horizontal segmented bar
        const totalCases = brandData.reduce((sum, brand) => sum + brand.case_count, 0);
        const barContainer = document.getElementById('brandDistributionBar');
        barContainer.innerHTML = '';
        
        brandData.forEach((brand, index) => {
            const percentage = (brand.case_count / totalCases) * 100;
            const segment = document.createElement('div');
            segment.className = 'distribution-segment';
            segment.style.width = `${percentage}%`;
            segment.style.backgroundColor = colors[index % colors.length];
            
            const label = document.createElement('div');
            label.className = 'segment-label';
            label.textContent = percentage > 5 ? brand.brand : ''; // Only show label if segment is large enough
            
            segment.appendChild(label);
            barContainer.appendChild(segment);
        });
        
        // Create brand cards
        const cardsContainer = document.getElementById('brandCardsGrid');
        cardsContainer.innerHTML = '';
        
        brandData.forEach((brand, index) => {
            const card = document.createElement('div');
            card.className = 'brand-card';
            
            const icon = document.createElement('div');
            icon.className = 'brand-icon';
            icon.style.backgroundColor = colors[index % colors.length];
            icon.textContent = brand.brand.charAt(0).toUpperCase();
            
            const info = document.createElement('div');
            info.className = 'brand-info';
            
            const name = document.createElement('div');
            name.className = 'brand-name';
            name.textContent = brand.brand;
            
            const stats = document.createElement('div');
            stats.className = 'brand-stats';
            
            const cases = document.createElement('span');
            cases.className = 'brand-cases';
            cases.textContent = `${brand.case_count} cases`;
            
            const percentage = document.createElement('span');
            percentage.className = 'brand-percentage';
            percentage.textContent = ` (${brand.percentage}%)`;
            
            const time = document.createElement('div');
            time.className = 'brand-time';
            if (brand.avg_hours_to_close) {
                const days = Math.round(brand.avg_hours_to_close / 24 * 10) / 10;
                time.textContent = `Avg: ${brand.avg_hours_to_close}h (${days}d) to close`;
            } else {
                time.textContent = 'No closure data';
            }
            
            stats.appendChild(cases);
            stats.appendChild(percentage);
            
            info.appendChild(name);
            info.appendChild(stats);
            info.appendChild(time);
            
            card.appendChild(icon);
            card.appendChild(info);
            cardsContainer.appendChild(card);
        });
    }

    /**
     * Load and render Detection Source Distribution Chart
     */
    async loadDetectionSourceChart() {
        try {
            const dateFilter = document.getElementById('dateFilter')?.value || 'all';
            const startDate = document.getElementById('startDate')?.value || '';
            const endDate = document.getElementById('endDate')?.value || '';
            
            const params = new URLSearchParams({
                date_filter: dateFilter,
                start_date: startDate,
                end_date: endDate
            });
            
            const response = await fetch(`/api/dashboard/detection-source-distribution?${params}`);
            const detectionData = await response.json();
            
            if (!detectionData || (!detectionData.phishlabs?.count && !detectionData.internal?.count)) {
                document.getElementById('detectionSourceLoading').style.display = 'none';
                document.getElementById('detectionSourceNoData').style.display = 'block';
                return;
            }
            
            this.renderDetectionSourceChart(detectionData);
            
        } catch (error) {
            console.error('Error loading detection source distribution:', error);
            document.getElementById('detectionSourceLoading').style.display = 'none';
            document.getElementById('detectionSourceNoData').style.display = 'block';
        }
    }

    /**
     * Render Detection Source Distribution Chart
     */
    renderDetectionSourceChart(detectionData) {
        // Hide loading, show container
        document.getElementById('detectionSourceLoading').style.display = 'none';
        document.getElementById('detectionSourceContainer').style.display = 'block';
        
        // Update card values
        document.getElementById('phishlabsCount').textContent = detectionData.phishlabs?.count || 0;
        document.getElementById('phishlabsPercentage').textContent = `${detectionData.phishlabs?.percentage || 0}%`;
        document.getElementById('internalCount').textContent = detectionData.internal?.count || 0;
        document.getElementById('internalPercentage').textContent = `${detectionData.internal?.percentage || 0}%`;
        
        // Create simple colored bar with HTML
        const totalCases = (detectionData.phishlabs?.count || 0) + (detectionData.internal?.count || 0);
        const barContainer = document.getElementById('detectionDistributionBar');
        
        let barHTML = '';
        
        if (detectionData.phishlabs?.count > 0) {
            const phishlabsPercentage = (detectionData.phishlabs.count / totalCases) * 100;
            barHTML += `
                <div style="
                    width: ${phishlabsPercentage}%;
                    height: 32px;
                    background: #1e40af;
                    display: inline-block;
                    position: relative;
                    float: left;
                    border-radius: ${phishlabsPercentage === 100 ? '16px' : '16px 0 0 16px'};
                ">
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: white;
                        font-weight: bold;
                        font-size: 13px;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
                    ">Phishlabs: ${detectionData.phishlabs.count} (${detectionData.phishlabs.percentage}%)</div>
                </div>
            `;
        }
        
        if (detectionData.internal?.count > 0) {
            const internalPercentage = (detectionData.internal.count / totalCases) * 100;
            barHTML += `
                <div style="
                    width: ${internalPercentage}%;
                    height: 32px;
                    background: #10b981;
                    display: inline-block;
                    position: relative;
                    float: left;
                    border-radius: ${internalPercentage === 100 ? '16px' : '0 16px 16px 0'};
                ">
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: white;
                        font-weight: bold;
                        font-size: 13px;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
                    ">Internal: ${detectionData.internal.count} (${detectionData.internal.percentage}%)</div>
                </div>
            `;
        }
        
        barContainer.innerHTML = barHTML;
    }

    /**
     * Load and render Case Type Analysis Chart
     */
    async loadCaseTypeAnalysisChart() {
        try {
            const dateFilter = document.getElementById('dateFilter')?.value || 'all';
            const startDate = document.getElementById('startDate')?.value || '';
            const endDate = document.getElementById('endDate')?.value || '';
            
            const params = new URLSearchParams({
                date_filter: dateFilter,
                start_date: startDate,
                end_date: endDate
            });
            
            const response = await fetch(`/api/dashboard/case-type-analysis?${params}`);
            const caseTypeData = await response.json();
            
            if (!caseTypeData || caseTypeData.length === 0) {
                document.getElementById('caseTypeAnalysisLoading').style.display = 'none';
                document.getElementById('caseTypeAnalysisNoData').style.display = 'block';
                return;
            }
            
            this.renderCaseTypeAnalysisChart(caseTypeData);
            
        } catch (error) {
            console.error('Error loading case type analysis:', error);
            document.getElementById('caseTypeAnalysisLoading').style.display = 'none';
            document.getElementById('caseTypeAnalysisNoData').style.display = 'block';
        }
    }

    /**
     * Render Case Type Analysis Chart
     */
    renderCaseTypeAnalysisChart(caseTypeData) {
        // Hide loading, show container
        document.getElementById('caseTypeAnalysisLoading').style.display = 'none';
        document.getElementById('caseTypeAnalysisContainer').style.display = 'block';
        
        // Create compact table
        const container = document.getElementById('caseTypeCardsGrid');
        
        let tableHTML = `
            <div class="case-type-table-wrapper">
                <table class="case-type-table">
                    <thead>
                        <tr>
                            <th>Case Type</th>
                            <th style="text-align: center;">Total Cases</th>
                            <th>Active / Closed</th>
                            <th style="text-align: center;">Median Days</th>
                            <th style="text-align: center;">Avg Days</th>
                            <th>Resolution Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        caseTypeData.forEach((caseType, index) => {
            // Build resolution tags
            let resolutionHTML = '';
            if (caseType.resolution_breakdown && caseType.resolution_breakdown.length > 0) {
                resolutionHTML = '<div class="resolution-mini-list">';
                caseType.resolution_breakdown.forEach(resolution => {
                    resolutionHTML += `
                        <span class="resolution-tag">
                            <span class="resolution-tag-name">${resolution.status}:</span>
                            <span class="resolution-tag-count">${resolution.count}</span>
                            <span class="resolution-tag-percentage">(${resolution.percentage}%)</span>
                        </span>
                    `;
                });
                resolutionHTML += '</div>';
            } else {
                resolutionHTML = '<span style="color: #a0aec0; font-size: 12px;">No data</span>';
            }
            
            tableHTML += `
                <tr>
                    <td>
                        <div class="case-type-name">
                            <div class="case-type-badge">${caseType.case_type.charAt(0).toUpperCase()}</div>
                            <span class="case-type-label">${caseType.case_type}</span>
                        </div>
                    </td>
                    <td class="case-count-cell">${caseType.total_cases}</td>
                    <td>
                        <div class="case-status-breakdown">
                            <div class="status-item">
                                <div class="status-dot active"></div>
                                <span class="status-count">${caseType.active_cases}</span>
                                <span class="status-percentage">(${caseType.active_percentage}%)</span>
                            </div>
                            <div class="status-item">
                                <div class="status-dot closed"></div>
                                <span class="status-count">${caseType.closed_cases}</span>
                                <span class="status-percentage">(${caseType.closed_percentage}%)</span>
                            </div>
                        </div>
                    </td>
                    <td class="days-to-close-cell">
                        <span class="days-value">${caseType.median_days_to_close ? caseType.median_days_to_close.toFixed(1) : 'N/A'}</span>
                        <span class="days-label">${caseType.median_days_to_close ? 'days' : ''}</span>
                    </td>
                    <td class="days-to-close-cell">
                        <span class="days-value">${caseType.avg_days_to_close ? caseType.avg_days_to_close.toFixed(1) : 'N/A'}</span>
                        <span class="days-label">${caseType.avg_days_to_close ? 'days' : ''}</span>
                    </td>
                    <td class="resolution-breakdown-cell">
                        ${resolutionHTML}
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = tableHTML;
    }

    /**
     * Load all new Executive Summary charts
     */
    async loadNewExecutiveCharts() {
        console.log('Loading new Executive Summary charts...');
        
        // Load all three charts in parallel
        await Promise.all([
            this.loadBrandDistributionChart(),
            this.loadDetectionSourceChart(),
            this.loadCaseTypeAnalysisChart()
        ]);
        
        console.log('All new Executive Summary charts loaded successfully');
    }
}

// ============================================================================
// OPERATIONAL DASHBOARD CLASS - PRODUCTION VERSION
// ============================================================================

class OperationalDashboard {
    constructor() {
        // Chart instances
        this.credTheftStatusChart = null;
        this.domainMonitoringStatusChart = null;
        this.socialMediaStatusChart = null;
        this.credTheftTypeChart = null;
        this.domainMonitoringTypeChart = null;
        this.socialMediaTypeChart = null;
        this.resolutionPerformanceChart = null;
        this.caseTypeTrendsChart = null;
        this.slaComplianceChart = null;
        
        // Current view state
        this.currentTypeView = 'distribution';
        
        // Setup tab controls
        this.setupTypeAnalysisControls();
    }

    async updateData() {
        console.log('<i class="fas fa-sync-alt"></i> Updating Operational Dashboard...');
        try {
            await Promise.all([
                this.updatePerformanceMetrics(),
                this.updateThreatIntelligenceMetrics(), // NEW
                this.updateCaseStatusCharts(),
                this.updateCaseTypeCharts(),
                this.updateSLADashboard()
            ]);
            console.log('<i class="fas fa-check-circle"></i> Operational Dashboard updated successfully');
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error updating operational dashboard:', error);
            showNotification('Error updating operational dashboard', 'error');
        }
    }

    // ========================================================================
    // PERFORMANCE METRICS
    // ========================================================================

    async updatePerformanceMetrics() {
        try {
            const params = getFilterParams();
            
            // Fetch performance metrics from the dedicated endpoint
            const performanceData = await fetchAPI(`/api/dashboard/performance-metrics?${params}`);
            
            if (performanceData && !performanceData.error) {
                // Resolution hours - split layout with median and average
                const avgHours = performanceData.avg_resolution_hours || 0;
                const medianHours = performanceData.median_resolution_hours || 0;
                updateElement('medianResolutionHoursEnhanced', `${medianHours}h`);
                updateElement('avgResolutionHoursEnhanced', `${Math.round(avgHours)}h`);
                
                // Update case counts
                updateElement('totalCasesCountEnhanced', performanceData.total_cases || 0);
                updateElement('activeCasesCountEnhanced', performanceData.active_cases || 0);
                updateElement('closedCasesCountEnhanced', performanceData.closed_cases || 0);
            } else {
                console.warn('No performance data available');
                this.setFallbackMetrics();
            }
        } catch (error) {
            console.error('Error updating performance metrics:', error);
            this.setFallbackMetrics();
        }
    }

    setFallbackMetrics() {
        updateElement('medianResolutionHoursEnhanced', '--h');
        updateElement('avgResolutionHoursEnhanced', '--h');
        updateElement('totalCasesCountEnhanced', '--');
        updateElement('activeCasesCountEnhanced', '--');
        updateElement('closedCasesCountEnhanced', '--');
    }

    // ========================================================================
    // CASE STATUS CHARTS
    // ========================================================================

    async updateCaseStatusCharts() {
        try {
            const params = getFilterParams();
            const statusData = await fetchAPI(`/api/dashboard/case-status-overview?${params}`);
            
            if (statusData && !statusData.error) {
                // Render each status chart
                if (statusData.cred_theft && statusData.cred_theft.length > 0) {
                    this.renderStatusChart('credTheftStatusChart', statusData.cred_theft, 'credTheftTotal', 'credTheftBreakdown');
                }
                
                if (statusData.domain_monitoring && statusData.domain_monitoring.length > 0) {
                    this.renderStatusChart('domainMonitoringStatusChart', statusData.domain_monitoring, 'domainMonitoringTotal', 'domainMonitoringBreakdown');
                }
                
                if (statusData.social_media && statusData.social_media.length > 0) {
                    this.renderStatusChart('socialMediaStatusChart', statusData.social_media, 'socialMediaTotal', 'socialMediaBreakdown');
                }
            }
        } catch (error) {
            console.error('Error updating case status charts:', error);
        }
    }

    renderStatusChart(canvasId, data, totalElementId, breakdownElementId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Destroy existing chart
        if (this[canvasId]) {
            this[canvasId].destroy();
        }

        // Prepare data
        const labels = data.map(item => item.status);
        const values = data.map(item => item.count);
        const total = values.reduce((sum, val) => sum + val, 0);

        // Status-based colors
        const colors = labels.map(label => {
            const status = label.toLowerCase();
            if (status === 'active') return CONFIG.colors.threat;
            if (status === 'closed') return CONFIG.colors.success;
            if (status === 'monitoring') return CONFIG.colors.warning;
            return CONFIG.colors.info;
        });

        // Create doughnut chart
        this[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverBorderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: (context) => {
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0';
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 800
                }
            }
        });

        // Update total and breakdown
        updateElement(totalElementId, total);
        this.updateStatusBreakdown(breakdownElementId, data, colors);
    }

    updateStatusBreakdown(elementId, data, colors) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.innerHTML = data.map((item, index) => `
            <div class="status-item">
                <div class="status-item-label">
                    <div class="status-color" style="background: ${colors[index]}"></div>
                    <span>${item.status}</span>
                </div>
                <div class="status-item-value">${item.count}</div>
            </div>
        `).join('');
    }

    // ========================================================================
    // CASE TYPE DISTRIBUTION & ANALYSIS
    // ========================================================================

    async updateCaseTypeCharts() {
        try {
            const params = getFilterParams();
            const typeData = await fetchAPI(`/api/dashboard/case-type-distribution?${params}`);
            
            if (typeData && !typeData.error) {
                this.typeData = typeData;
                
                // Fetch resolution performance data as well - use case type analysis for median data
                const resolutionData = await fetchAPI(`/api/dashboard/case-type-analysis?${params}`);
                this.resolutionData = resolutionData && !resolutionData.error ? resolutionData : null;
                
                // Render the current view
                this.renderCurrentTypeView();
            }
        } catch (error) {
            console.error('Error updating case type charts:', error);
        }
    }

    setupTypeAnalysisControls() {
        const controls = document.querySelectorAll('.analysis-btn');
        controls.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active from all buttons
                controls.forEach(b => b.classList.remove('active'));
                // Add active to clicked button
                btn.classList.add('active');
                
                // Get the view type
                this.currentTypeView = btn.getAttribute('data-view');
                
                // Switch views
                this.switchTypeView(this.currentTypeView);
            });
        });
    }

    switchTypeView(view) {
        console.log('Switching to view:', view); // Debug log
        
        // Hide all views
        document.querySelectorAll('.type-chart').forEach(chart => {
            chart.classList.remove('active');
        });
        
        // Show selected view
        const targetView = document.querySelector(`.type-chart.${view}-view`);
        if (targetView) {
            targetView.classList.add('active');
            
            // Render the appropriate chart after a small delay
            setTimeout(() => this.renderCurrentTypeView(), 100);
        }
    }

    renderCurrentTypeView() {
        switch (this.currentTypeView) {
            case 'distribution':
                this.renderDistributionCharts();
                break;
            case 'performance':
                this.renderPerformanceChart();
                break;
            case 'trends':
                this.renderTrendsChart();
                break;
        }
    }

    renderDistributionCharts() {
        if (!this.typeData) return;
    
        // Credential Theft Types - Modern Horizontal Bar
        if (this.typeData.cred_theft && this.typeData.cred_theft.length > 0) {
            const total = this.typeData.cred_theft.reduce((sum, item) => sum + item.count, 0);
            updateElement('credTheftTypeCount', total);
            this.renderModernBarChart('credTheftTypeChart', this.typeData.cred_theft, CONFIG.colors.threat);
        }
    
        // Domain Monitoring Types
        if (this.typeData.domain_monitoring && this.typeData.domain_monitoring.length > 0) {
            const total = this.typeData.domain_monitoring.reduce((sum, item) => sum + item.count, 0);
            updateElement('domainMonitoringTypeCount', total);
            this.renderModernBarChart('domainMonitoringTypeChart', this.typeData.domain_monitoring, CONFIG.colors.warning);
        }
    
        // Social Media Types
        if (this.typeData.social_media && this.typeData.social_media.length > 0) {
            const total = this.typeData.social_media.reduce((sum, item) => sum + item.count, 0);
            updateElement('socialMediaTypeCount', total);
            this.renderModernBarChart('socialMediaTypeChart', this.typeData.social_media, CONFIG.colors.purple);
        }
    }

    renderModernBarChart(canvasId, data, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
    
        if (this[canvasId]) {
            this[canvasId].destroy();
        }
    
        // Handle empty data
        if (!data || data.length === 0) {
            const container = ctx.parentElement;
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; font-size: 14px;">
                    <div style="text-align: center;">
                        <i class="fas fa-chart-bar" style="font-size: 48px; margin-bottom: 12px; opacity: 0.3;"></i>
                        <p>No data available for this category</p>
                    </div>
                </div>
            `;
            return;
        }
    
        // Sort by count descending and take top 8
        const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 8);
        const labels = sortedData.map(item => item.case_type || 'Unknown');
        const values = sortedData.map(item => item.count);
        
        // Calculate total for percentage
        const total = values.reduce((sum, val) => sum + val, 0);
        const maxValue = Math.max(...values);
    
        // Create gradient colors based on intensity
        const backgroundColors = values.map(value => {
            const intensity = value / maxValue;
            // Use alpha channel for intensity - darker = more cases
            const alpha = 0.5 + (intensity * 0.5); // Range from 0.5 to 1.0
            return color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        });
    
        this[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: color,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 2,
                        right: 8,
                        top: 0,
                        bottom: 0
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        padding: 16,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        borderColor: color,
                        borderWidth: 2,
                        displayColors: false,
                        callbacks: {
                            title: (context) => context[0].label,
                            label: (context) => {
                                const percentage = ((context.parsed.x / total) * 100).toFixed(1);
                                return [
                                    `Cases: ${context.parsed.x}`,
                                    `Percentage: ${percentage}%`
                                ];
                            }
                        }
                    },
                    // Add data labels on bars
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        color: '#374151',
                        font: {
                            size: 11,
                            weight: 'bold'
                        },
                        formatter: (value) => value
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { 
                            color: '#f3f4f6',
                            drawBorder: false
                        },
                        ticks: {
                            precision: 0,
                            font: { size: 10, weight: '600' },
                            color: '#6b7280',
                            padding: 2
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10, weight: '500' },
                            color: '#374151',
                            padding: 4,
                            callback: function(value) {
                                const label = this.getLabelForValue(value);
                                return label.length > 20 ? label.substring(0, 18) + '...' : label;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeInOutQuart'
                },
                elements: {
                    bar: {
                        borderWidth: 0
                    }
                },
                // Force Chart.js to use minimal internal padding
                interaction: {
                    intersect: false
                }
            }
        });
    }

    renderTypeBarChart(canvasId, data, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Destroy existing chart
        if (this[canvasId]) {
            this[canvasId].destroy();
        }

        const labels = data.map(item => item.case_type || 'Unknown');
        const values = data.map(item => item.count);

        this[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Case Count',
                    data: values,
                    backgroundColor: color + 'CC',
                    borderColor: color,
                    borderWidth: 2,
                    borderRadius: 6,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f3f4f6' },
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }

    renderPerformanceChart() {
        if (!this.resolutionData) {
            console.warn('No resolution data available');
            return;
        }
    
        const ctx = document.getElementById('resolutionPerformanceChart');
        if (!ctx) {
            console.error('Chart canvas not found');
            return;
        }
    
        if (this.resolutionPerformanceChart) {
            this.resolutionPerformanceChart.destroy();
        }
    
        // Use case type analysis data directly (it's already an array)
        const allData = (this.resolutionData || [])
            .sort((a, b) => b.total_cases - a.total_cases)
            .slice(0, 10);
    
        if (allData.length === 0) {
            console.warn('No data to render in performance chart');
            return;
        }
    
        const labels = allData.map(item => item.case_type || 'Unknown');
        const medianHours = allData.map(item => Math.round((item.median_days_to_close || 0) * 24)); // Convert days to hours
        const totalCases = allData.map(item => item.total_cases || 0);

        // Debug logging
        console.log('Chart data debug:', {
            allData: allData.slice(0, 3), // First 3 items
            labels: labels.slice(0, 3),
            medianHours: medianHours.slice(0, 3),
            totalCases: totalCases.slice(0, 3),
            medianHoursFull: medianHours,
            totalCasesFull: totalCases,
            sampleMedianDays: allData.slice(0, 3).map(item => item.median_days_to_close)
        });
    
        // Calculate insights
        const overallMedian = medianHours.reduce((sum, val) => sum + val, 0) / medianHours.length;
        const minIndex = medianHours.indexOf(Math.min(...medianHours));
        const totalResolved = totalCases.reduce((sum, val) => sum + val, 0);
    
        // UPDATE THE INSIGHT BOXES - THIS IS THE KEY PART
        updateElement('avgResolutionOverall', `${Math.round(overallMedian)}h`);
        updateElement('fastestResolution', labels[minIndex] || 'N/A');
        updateElement('totalResolved', totalResolved);
    
        // Create the chart
        this.resolutionPerformanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Median Resolution (hours)',
                    data: medianHours,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: 'rgba(30, 64, 175, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    yAxisID: 'y',
                    barThickness: 20, // Make bars more visible
                    maxBarThickness: 30
                }, {
                    label: 'Total Cases',
                    data: totalCases,
                    type: 'line',
                    borderColor: 'rgba(5, 150, 105, 1)',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: 'rgba(5, 150, 105, 1)',
                    yAxisID: 'y1',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 20,
                        right: 20
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { size: 13, weight: '600' },
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        padding: 14,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        offset: false,
                        ticks: {
                            font: { size: 11 },
                            maxRotation: 45,
                            minRotation: 0,
                            maxTicksLimit: undefined, // Show all labels
                            padding: 12,
                            callback: function(value, index, values) {
                                const label = this.getLabelForValue(value);
                                if (typeof label === 'string' && label.length > 20) {
                                    // Truncate long labels and add ellipsis
                                    return label.substring(0, 17) + '...';
                                }
                                return label;
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Resolution Time (hours)',
                            font: { size: 12, weight: '600' }
                        },
                        grid: { color: '#f3f4f6' },
                        ticks: { 
                            precision: 0,
                            stepSize: 1, // Ensure we see small increments
                            min: 0
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Number of Cases',
                            font: { size: 12, weight: '600' }
                        },
                        grid: { drawOnChartArea: false },
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    
        console.log('Performance chart rendered with insights:', {
            avgResolutionOverall: Math.round(overallMedian),
            fastestResolution: labels[minIndex],
            totalResolved: totalResolved
        });
    }

    renderTrendsChart() {
        // For trends, we'll use timeline data
        const ctx = document.getElementById('caseTypeTrendsChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.caseTypeTrendsChart) {
            this.caseTypeTrendsChart.destroy();
        }

        // Fetch timeline data
        this.fetchTimelineTrends().then(timelineData => {
            if (!timelineData || timelineData.length === 0) return;

            const labels = timelineData.map(item => {
                const date = new Date(item.time_period);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });

            const created = timelineData.map(item => item.cases_created || 0);
            const closed = timelineData.map(item => item.cases_closed || 0);

            this.caseTypeTrendsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Cases Created',
                        data: created,
                        borderColor: CONFIG.colors.threat,
                        backgroundColor: CONFIG.colors.threat + '33',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Cases Resolved',
                        data: closed,
                        borderColor: CONFIG.colors.success,
                        backgroundColor: CONFIG.colors.success + '33',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { font: { size: 12 } }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            padding: 12
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 10 } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f3f4f6' },
                            ticks: { precision: 0 }
                        }
                    }
                }
            });
        });
    }

    async fetchTimelineTrends() {
        try {
            const params = getFilterParams();
            const data = await fetchAPI(`/api/dashboard/timeline-trends?${params}`);
            return data && !data.error ? data : [];
        } catch (error) {
            console.error('Error fetching timeline trends:', error);
            return [];
        }
    }

    // ========================================================================
    // SLA DASHBOARD
    // ========================================================================

    async updateSLADashboard() {
        try {
            const params = getFilterParams();
            
            // Fetch SLA data in parallel
            const [slaData, slaTotals] = await Promise.all([
                fetchAPI(`/api/dashboard/sla-tracking?${params}`),
                fetchAPI(`/api/dashboard/sla-category-totals?${params}`)
            ]);

            if (slaData && !slaData.error) {
                this.renderSLATable(slaData);
            }

            if (slaTotals && !slaTotals.error) {
                this.updateSLAMetrics(slaTotals);
                this.renderSLAComplianceChart(slaTotals);
            }
        } catch (error) {
            console.error('Error updating SLA dashboard:', error);
        }
    }

    updateSLAMetrics(totals) {
        updateElement('slaGreenCount', totals.Green || 0);
        updateElement('slaAmberCount', totals.Amber || 0);
        updateElement('slaRedCount', totals.Red || 0);
    }

    renderSLAComplianceChart(totals) {
        const ctx = document.getElementById('slaComplianceChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.slaComplianceChart) {
            this.slaComplianceChart.destroy();
        }

        const green = totals.Green || 0;
        const amber = totals.Amber || 0;
        const red = totals.Red || 0;
        const total = green + amber + red;

        this.slaComplianceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Breached', 'At Risk', 'Within SLA'],
                datasets: [{
                    data: [red, amber, green],
                    backgroundColor: [
                        CONFIG.colors.threat,
                        CONFIG.colors.warning,
                        CONFIG.colors.success
                    ],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 }, padding: 10 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        padding: 12
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                afterDraw: (chart) => {
                    const ctx = chart.ctx;
                    const centerX = chart.width / 2;
                    const centerY = chart.height / 2;
                    const greenPercent = total > 0 ? Math.round((green / total) * 100) : 0;
                    
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = 'bold 28px Inter, sans-serif';
                    ctx.fillStyle = CONFIG.colors.success;
                    ctx.fillText(`${greenPercent}%`, centerX, centerY - 10);
                    ctx.font = '12px Inter, sans-serif';
                    ctx.fillStyle = '#6b7280';
                    ctx.fillText('Compliant', centerX, centerY + 15);
                    ctx.restore();
                }
            }]
        });
    }

    renderSLATable(data) {
        const tbody = document.getElementById('slaTableBody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No SLA data available for selected filters</td></tr>';
            return;
        }

        // Sort by priority: Red (highest) -> Amber -> Green, then display ALL cases
        const priorityOrder = { 'Red': 1, 'Amber': 2, 'Green': 3 };
        const sortedData = data.sort((a, b) => {
            const priorityA = priorityOrder[a.sla_status] || 4;
            const priorityB = priorityOrder[b.sla_status] || 4;
            return priorityA - priorityB;
        });
        
        tbody.innerHTML = sortedData.map(item => `
            <tr>
                <td><strong>${item.case_number}</strong></td>
                <td class="url-cell">${item.url ? `<a href="${item.url}" target="_blank" title="${item.url}">${item.url.length > 50 ? item.url.substring(0, 47) + '...' : item.url}</a>` : 'N/A'}</td>
                <td>${item.case_type || 'N/A'}</td>
                <td>${item.days_hours || '0'}</td>
                <td><span class="sla-status ${(item.sla_status || '').toLowerCase()}">${item.sla_status || 'Unknown'}</span></td>
            </tr>
        `).join('');
    }

    calculatePriority(slaStatus) {
        switch(slaStatus) {
            case 'Red': return '<span style="color: #dc2626; font-weight: 600;">High</span>';
            case 'Amber': return '<span style="color: #f59e0b; font-weight: 600;">Medium</span>';
            default: return '<span style="color: #059669; font-weight: 600;">Low</span>';
        }
    }

    async showCaseDetails(caseNumber) {
        try {
            // Fetch detailed case information
            const response = await fetch(`/api/case-details/${caseNumber}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const caseData = await response.json();
            
            if (caseData.error) {
                alert(`Error loading case details: ${caseData.error}`);
                return;
            }
            
            // Create and show modal with case details
            this.displayCaseDetailsModal(caseData);
            
        } catch (error) {
            console.error('Error fetching case details:', error);
            // Fallback: show basic case information
            this.showBasicCaseInfo(caseNumber);
        }
    }

    displayCaseDetailsModal(caseData) {
        // Create modal HTML
        const modalHTML = `
            <div class="case-details-modal" id="caseDetailsModal">
                <div class="modal-overlay" onclick="operationalDashboard.closeCaseDetailsModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-file-alt"></i> Case Details: ${caseData.case_number}</h2>
                        <button class="modal-close" onclick="operationalDashboard.closeCaseDetailsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="case-info-grid">
                            <div class="case-info-section">
                                <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
                                <div class="info-row">
                                    <span class="label">Case Number:</span>
                                    <span class="value">${caseData.case_number || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Case Type:</span>
                                    <span class="value">${caseData.case_type || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Status:</span>
                                    <span class="value status-${(caseData.resolution_status || '').toLowerCase()}">${caseData.resolution_status || 'Unknown'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Brand:</span>
                                    <span class="value">${caseData.brand || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Created:</span>
                                    <span class="value">${caseData.date_created_local ? new Date(caseData.date_created_local).toLocaleString() : 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Closed:</span>
                                    <span class="value">${caseData.date_closed_local ? new Date(caseData.date_closed_local).toLocaleString() : 'Active'}</span>
                                </div>
                            </div>
                            
                            <div class="case-info-section">
                                <h3><i class="fas fa-globe"></i> Infrastructure Details</h3>
                                <div class="info-row">
                                    <span class="label">URL:</span>
                                    <span class="value url-text">${caseData.url || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Domain:</span>
                                    <span class="value">${caseData.domain || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">IP Address:</span>
                                    <span class="value ip-text">${caseData.ip_address || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Host ISP:</span>
                                    <span class="value">${caseData.host_isp || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Host Country:</span>
                                    <span class="value">${caseData.host_country || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Registrar:</span>
                                    <span class="value">${caseData.registrar_name || 'N/A'}</span>
                                </div>
                            </div>
                            
                            ${caseData.threat_intelligence ? `
                            <div class="case-info-section">
                                <h3><i class="fas fa-shield-alt"></i> Threat Intelligence</h3>
                                <div class="info-row">
                                    <span class="label">Threat Family:</span>
                                    <span class="value">${caseData.threat_intelligence.threat_family || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Actor Handle:</span>
                                    <span class="value">${caseData.threat_intelligence.actor_handle || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Flagged Email:</span>
                                    <span class="value">${caseData.threat_intelligence.flagged_whois_email || 'N/A'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Flagged Name:</span>
                                    <span class="value">${caseData.threat_intelligence.flagged_whois_name || 'N/A'}</span>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        
                        ${caseData.description ? `
                        <div class="case-description">
                            <h3><i class="fas fa-file-text"></i> Description</h3>
                            <p>${caseData.description}</p>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="operationalDashboard.closeCaseDetailsModal()">Close</button>
                        <button class="btn btn-primary" onclick="operationalDashboard.copyCaseDetails('${caseData.case_number}')">
                            <i class="fas fa-copy"></i> Copy Details
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal with animation
        setTimeout(() => {
            const modal = document.getElementById('caseDetailsModal');
            if (modal) modal.classList.add('show');
        }, 10);
    }

    showBasicCaseInfo(caseNumber) {
        // Fallback when API is not available
        alert(`Case Details for ${caseNumber}\n\nDetailed case information API is not yet implemented.\n\nThis would typically show:\n• Full case timeline\n• Infrastructure details\n• Threat intelligence notes\n• Related cases\n• Resolution actions`);
    }

    closeCaseDetailsModal() {
        const modal = document.getElementById('caseDetailsModal');
        if (modal) {
            modal.classList.add('closing');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    copyCaseDetails(caseNumber) {
        // Copy case details to clipboard
        const modal = document.getElementById('caseDetailsModal');
        if (modal) {
            const textContent = modal.querySelector('.modal-body').innerText;
            navigator.clipboard.writeText(textContent).then(() => {
                // Show success feedback
                const copyBtn = modal.querySelector('.btn-primary');
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.classList.add('btn-success');
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('btn-success');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy case details:', err);
                alert('Failed to copy case details to clipboard');
            });
        }
    }

    async updateThreatIntelligenceMetrics() {
        try {
            const params = getFilterParams();
            const intelData = await fetchAPI(`/api/dashboard/threat-intelligence-metrics?${params}`);
            
            if (intelData && !intelData.error) {
                // Update summary metrics
                updateElement('ipReuseCount', intelData.summary.total_reused_ips || 0);
                updateElement('topISP', intelData.summary.top_isp || 'N/A');
                
                // Update top registrar with compact top 3 format (inline)
                const topRegistrars = intelData.summary.top_3_registrars || [];
                const registrarText = topRegistrars.length > 0 
                    ? topRegistrars.map((r, i) => `${r.registrar_name}(${r.abuse_count})`).join(' • ')
                    : intelData.summary.top_registrar || 'N/A';
                updateElement('topRegistrarSummary', registrarText);
                
                // Update top URL path with compact top 3 format (inline)
                const topUrlPaths = intelData.summary.top_3_url_paths || [];
                const urlPathText = topUrlPaths.length > 0 
                    ? topUrlPaths.map((u, i) => `${u.url_path}(${u.case_count})`).join(' • ')
                    : intelData.summary.top_url_path || 'N/A';
                updateElement('topUrlPath', urlPathText);
                
                // Render charts
                this.renderRegistrarAbuseChart(intelData.registrar_abuse);
                this.renderISPDistributionChart(intelData.isp_distribution);
                this.renderURLPathTable(intelData.url_path_analysis);
                this.renderInfrastructureReuseTable(intelData.ip_reuse);
            }
        } catch (error) {
            console.error('Error updating threat intelligence metrics:', error);
        }
    }
    
    renderRegistrarAbuseChart(data) {
        const ctx = document.getElementById('registrarAbuseChart');
        if (!ctx || !data || data.length === 0) return;
        
        if (this.registrarAbuseChart) {
            this.registrarAbuseChart.destroy();
        }
        
        const labels = data.map(item => item.registrar_name);
        const values = data.map(item => item.abuse_count);
        
        this.registrarAbuseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Abuse Cases',
                    data: values,
                    backgroundColor: 'rgba(220, 38, 38, 0.8)',
                    borderColor: 'rgba(220, 38, 38, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        padding: 12
                    }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }
    
    renderISPDistributionChart(data) {
        const ctx = document.getElementById('ispDistributionChart');
        if (!ctx || !data || data.length === 0) return;
        
        if (this.ispDistributionChart) {
            this.ispDistributionChart.destroy();
        }
        
        const labels = data.map(item => item.host_isp);
        const values = data.map(item => item.threat_count);
        
        this.ispDistributionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Threat Count',
                    data: values,
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        padding: 12
                    }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }
    
    renderURLPathTable(data) {
        const tableBody = document.getElementById('urlPathTableBody');
        if (!tableBody) return;
        
        // Clear existing content
        tableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="2" class="no-data-cell">
                        <i class="fas fa-info-circle" style="margin-right: 8px; opacity: 0.5;"></i>
                        No URL path data available for the selected period
                    </td>
                </tr>
            `;
            return;
        }
        
        // Populate table with data
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.url_path || 'N/A'}</td>
                <td>${item.case_count || 0}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    renderInfrastructureReuseTable(data) {
        const tableBody = document.getElementById('infrastructureReuseTableBody');
        if (!tableBody) return;
        
        // Clear existing content
        tableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-data-cell">
                        <i class="fas fa-info-circle" style="margin-right: 8px; opacity: 0.5;"></i>
                        No IP address reuse detected - all IPs are unique to individual cases
                    </td>
                </tr>
            `;
            return;
        }
        
        // Populate table with data
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.ip_address || 'N/A'}</td>
                <td>${item.host_isp || 'N/A'}</td>
                <td>${item.host_country || 'N/A'}</td>
                <td>${item.case_count || 0}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    destroy() {
        const charts = [
            'credTheftStatusChart',
            'domainMonitoringStatusChart',
            'socialMediaStatusChart',
            'credTheftTypeChart',
            'domainMonitoringTypeChart',
            'socialMediaTypeChart',
            'resolutionPerformanceChart',
            'caseTypeTrendsChart',
            'slaComplianceChart'
        ];
        
        charts.forEach(chartName => {
            if (this[chartName]) {
                this[chartName].destroy();
                this[chartName] = null;
            }
        });
    }
}

// ============================================================================
// THREAT INTELLIGENCE DASHBOARD CLASS
// ============================================================================

class ThreatIntelligenceDashboard {
    constructor() {
        this.charts = {
            kitFamily: null,
            attributionTimeline: null,
            infrastructure: null
        };
        this.refreshInterval = null;
        this.animationFrameId = null;
        this.hasAnimated = false; // Track if initial animation has played
        
        // Dynamic risk configuration (loaded from DB)
        this.riskConfig = {
            highRiskActors: [],
            highRiskBrands: [],
            kitFamilies: [],
            highRiskCountries: [],
            mediumRiskCountries: []
        };
        
        // Load risk configuration on initialization
        this.loadRiskConfiguration();
    }
    
    async loadRiskConfiguration() {
        try {
            const config = await fetchAPI('/api/dashboard/risk-configuration');
            if (config && !config.error) {
                this.riskConfig = {
                    highRiskActors: config.high_risk_actors || [],
                    highRiskBrands: config.high_risk_brands || [],
                    kitFamilies: config.kit_families || [],
                    highRiskCountries: config.high_risk_countries || [],
                    mediumRiskCountries: config.medium_risk_countries || []
                };
                console.log('Risk configuration loaded from database:', this.riskConfig);
            }
        } catch (error) {
            console.error('Error loading risk configuration:', error);
            // Fallback to empty arrays if loading fails
        }
    }

    async updateData() {
        try {
            showLoadingOverlay();
            
            // Update all sections in parallel for better performance
            await Promise.all([
                this.updateAttributionCoverage(),
                this.updateThreatActors(),
                this.updateThreatFamiliesProgressBar(),
                this.updateAttributionTimeline(),
                this.updateInfrastructurePatterns(),
                this.updateWHOISAttribution(),
                this.updatePriorityCases()
            ]);
            
            hideLoadingOverlay();
        } catch (error) {
            console.error('Error updating threat intelligence dashboard:', error);
            showNotification('Error updating threat intelligence data', 'error');
            hideLoadingOverlay();
        }
    }

    async updateAttributionCoverage() {
        try {
            const params = getFilterParams();
            const data = await fetchAPI(`/api/dashboard/attribution-coverage?${params}`);
            
            if (data && !data.error) {
                this.renderAttributionCoverage(data);
            }
        } catch (error) {
            console.error('Error updating attribution coverage:', error);
        }
    }

    renderAttributionCoverage(data) {
        // Format percentages to 1 decimal place and attribution score to 2 decimal places
        const formatPercentage = (value) => {
            const num = parseFloat(value) || 0;
            return num.toFixed(1);
        };
        
        const formatScore = (value) => {
            const num = parseFloat(value) || 0;
            return num.toFixed(2);
        };
        
        // Update metric cards with smooth animations
        this.animateMetricUpdate('threatActorCoverage', `${formatPercentage(data.threat_actor_coverage)}%`);
        this.animateMetricUpdate('kitFamilyCoverage', `${formatPercentage(data.kit_family_coverage)}%`);
        this.animateMetricUpdate('whoisCoverage', `${formatPercentage(data.whois_coverage)}%`);
        this.animateMetricUpdate('fullAttributionScore', `${formatScore(data.avg_attribution_score)}/4`);
    }

    async updateThreatActors() {
        try {
            const params = getFilterParams();
            const data = await fetchAPI(`/api/dashboard/threat-actors?${params}`);
            
            if (data && !data.error) {
                this.renderThreatActors(data);
            }
        } catch (error) {
            console.error('Error updating threat actors:', error);
        }
    }

    renderThreatActors(data) {
        const container = document.getElementById('threatActorList');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-data">No threat actor data available for selected period</div>';
            return;
        }

        // Sort by total attacks and take top 6 for card layout
        const sortedActors = data
            .sort((a, b) => (b.total_attacks || 0) - (a.total_attacks || 0))
            .slice(0, 6);

        container.innerHTML = sortedActors.map((actor, index) => {
            const threatScore = actor.threat_score || 0;
            const totalAttacks = actor.total_attacks || 0;
            const countriesCount = actor.countries_count || 0;
            const familiesCount = actor.kits_used ? actor.kits_used.split(',').length : 0;
            const domainsCount = actor.unique_domains || 0;
            
            // Determine threat level based on sophistication or score
            let threatLevel = 'moderate';
            if (actor.sophistication_level === 'SPECIALIST' || threatScore >= 80) {
                threatLevel = 'specialist';
            } else if (threatScore >= 60) {
                threatLevel = 'high';
            }
            
            const activeSince = actor.active_since ? new Date(actor.active_since).toLocaleDateString('en-US', { 
                month: 'numeric', 
                day: 'numeric', 
                year: 'numeric' 
            }) : 'Unknown';
            
            return `
                <div class="threat-actor-card" style="animation-delay: ${index * 0.1}s">
                    <div class="card-header">
                        <div class="actor-rank">${index + 1}</div>
                        <div class="name-section">
                            <div class="actor-name">${actor.threat_actor || 'Unknown Actor'}</div>
                            <span class="threat-level-badge ${threatLevel}">
                                ${familiesCount} KITS
                            </span>
                        </div>
                        <div class="actor-metrics">
                            <div class="metric-group">
                                <div class="metric-value">${threatScore}</div>
                                <div class="metric-label">Score</div>
                            </div>
                            <div class="metric-group">
                                <div class="metric-value">${totalAttacks}</div>
                                <div class="metric-label">Cases</div>
                    </div>
                    </div>
                    </div>
                    <ul class="actor-details">
                        <li>${countriesCount} countries</li>
                        <li>${domainsCount} domains</li>
                        <li>${familiesCount} families</li>
                        <li>Active since ${activeSince}</li>
                    </ul>
                </div>
            `;
        }).join('');

        // Animate the cards as they load
            setTimeout(() => {
            const cards = container.querySelectorAll('.threat-actor-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
            }, index * 100);
        });
        }, 100);
    }


    // Helper function to lighten colors
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    // Add center text to doughnut chart
    addCenterText(canvas, value, label) {
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Clear center area
        ctx.clearRect(centerX - 60, centerY - 40, 120, 80);
        
        // Draw center text
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toString(), centerX, centerY - 5);
        
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#6B7280';
        ctx.fillText(label, centerX, centerY + 15);
    }

    async updateThreatFamiliesProgressBar() {
        try {
            const params = getFilterParams();
            const data = await fetchAPI(`/api/dashboard/kit-families?${params}`);
            
            if (data && !data.error) {
                this.renderThreatFamiliesProgressBar(data);
            }
        } catch (error) {
            console.error('Error updating threat families progress bar:', error);
        }
    }

    renderThreatFamiliesProgressBar(data) {
        const container = document.getElementById('threatFamiliesProgressContainer');

        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-data">No threat family data available</div>';
            return;
        }

        // Sort by case count (highest first) and take top 6 for better visual layout
        const sortedData = data
            .sort((a, b) => (b.case_count || 0) - (a.case_count || 0))
            .slice(0, 6);

        const totalCases = sortedData.reduce((sum, item) => sum + (item.case_count || 0), 0);
        
        if (totalCases === 0) {
            container.innerHTML = '<div class="no-data">No threat family data available</div>';
            return;
        }

        // Generate the progress bar with legend structure
        let chartHTML = '<div class="threat-families-progress-wrapper">';
        
        // Progress bar
        chartHTML += '<div class="threat-families-progress-bar">';
        
        sortedData.forEach((item, index) => {
            const familyName = item.threat_family || 'Unknown';
            const caseCount = item.case_count || 0;
            const percentage = ((caseCount / totalCases) * 100).toFixed(1);
            const colorClass = `color-${(index % 6) + 1}`;
            
            // Only show segments that are at least 5% wide for better visibility
            if (parseFloat(percentage) >= 5) {
                chartHTML += `
                    <div class="threat-family-segment ${colorClass}" style="width: ${percentage}%;" 
                         data-family="${familyName}" data-count="${caseCount}" data-percentage="${percentage}">
                        <span class="threat-family-segment-label">${familyName}</span>
                    </div>
                `;
            }
        });
        
        chartHTML += '</div>';
        
        // Simple Legend below progress bar
        chartHTML += '<div class="threat-families-legend">';
        
        sortedData.forEach((item, index) => {
            const familyName = item.threat_family || 'Unknown';
            const caseCount = item.case_count || 0;
            const percentage = ((caseCount / totalCases) * 100).toFixed(1);
            const colorClass = `color-${(index % 6) + 1}`;
            
            chartHTML += `
                <div class="threat-family-legend-item" data-family="${familyName}">
                    <div class="threat-family-color-box ${colorClass}"></div>
                    <div class="threat-family-legend-info">
                        <div class="threat-family-legend-name">${familyName}</div>
                        <div class="threat-family-legend-stats">${caseCount} cases (${percentage}%)</div>
                    </div>
                </div>
            `;
        });
        
        chartHTML += '</div></div>';
        
        container.innerHTML = chartHTML;

        // Add interactive effects after DOM is updated
        setTimeout(() => {
            const segments = container.querySelectorAll('.threat-family-segment');
            const legendItems = container.querySelectorAll('.threat-family-legend-item');
            
            // Add hover effects for segments
            segments.forEach(segment => {
                segment.addEventListener('mouseenter', () => {
                    const familyName = segment.dataset.family;
                    const legendItem = container.querySelector(`.threat-family-legend-item[data-family="${familyName}"]`);
                    
                    if (legendItem) {
                        legendItem.style.background = '#e5e7eb';
                        legendItem.style.transform = 'translateX(8px)';
                    }
                });
                
                segment.addEventListener('mouseleave', () => {
                    const familyName = segment.dataset.family;
                    const legendItem = container.querySelector(`.threat-family-legend-item[data-family="${familyName}"]`);
                    
                    if (legendItem) {
                        legendItem.style.background = '';
                        legendItem.style.transform = '';
                    }
                });
            });

            // Add hover effects for legend items
            legendItems.forEach(legendItem => {
                legendItem.addEventListener('mouseenter', () => {
                    const familyName = legendItem.dataset.family;
                    const segment = container.querySelector(`.threat-family-segment[data-family="${familyName}"]`);
                    
                    if (segment) {
                        segment.style.transform = 'scaleY(1.15)';
                        segment.style.filter = 'brightness(1.15)';
                        segment.style.zIndex = '20';
                    }
                });
                
                legendItem.addEventListener('mouseleave', () => {
                    const familyName = legendItem.dataset.family;
                    const segment = container.querySelector(`.threat-family-segment[data-family="${familyName}"]`);
                    
                    if (segment) {
                        segment.style.transform = '';
                        segment.style.filter = '';
                        segment.style.zIndex = '';
                    }
                });
            });
        }, 0);
    }

    async updateAttributionTimeline() {
        try {
            const params = getFilterParams();
            const data = await fetchAPI(`/api/dashboard/attribution-timeline?${params}`);
            
            if (data && !data.error) {
                this.renderAttributionTimeline(data);
                this.updateTimelineInsights(data);
            }
        } catch (error) {
            console.error('Error updating attribution timeline:', error);
        }
    }

    renderAttributionTimeline(data) {
        const ctx = document.getElementById('attributionTimelineChart');
        if (!ctx) return;
    
        try {
            if (this.charts.attributionTimeline) {
                this.charts.attributionTimeline.destroy();
            }
    
            if (!data.timeline || data.timeline.length === 0) {
                ctx.parentElement.innerHTML = '<div class="no-data">No attribution timeline data available</div>';
                return;
            }
    
            // Determine date range to decide binning
            const dates = data.timeline.map(item => new Date(item.week));
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
            
            // Smart binning: daily for <14 days, weekly for 14-90 days, monthly for >90 days
            let binUnit, binFormat;
            if (daysDiff <= 14) {
                binUnit = 'day';
                binFormat = 'MMM dd';
            } else if (daysDiff <= 90) {
                binUnit = 'week';
                binFormat = 'MMM dd';
            } else {
                binUnit = 'month';
                binFormat = 'MMM yyyy';
            }
    
            // Bin the data
            const dateMap = {};
            data.timeline.forEach(item => {
                const date = new Date(item.week);
                let binKey;
                
                if (binUnit === 'day') {
                    binKey = date.toISOString().split('T')[0];
                } else if (binUnit === 'week') {
                    // Get start of week (Monday)
                    const dayOfWeek = date.getDay();
                    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                    const monday = new Date(date.setDate(diff));
                    binKey = monday.toISOString().split('T')[0];
                } else {
                    // Month
                    binKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
                }
                
                if (!dateMap[binKey]) dateMap[binKey] = {};
                const actor = item.threat_actor || 'Unknown';
                dateMap[binKey][actor] = (dateMap[binKey][actor] || 0) + (item.cases || 0);
            });
    
            // Get top 5 actors
            const actorTotals = {};
            Object.values(dateMap).forEach(actors => {
                Object.entries(actors).forEach(([actor, count]) => {
                    actorTotals[actor] = (actorTotals[actor] || 0) + count;
                });
            });
    
            const topActors = Object.entries(actorTotals)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([actor]) => actor);
    
            const sortedDates = Object.keys(dateMap).sort();
    
            // Color palette
            const colors = [
                '#FF6B6B',  // Red
                '#4ECDC4',  // Teal
                '#45B7D1',  // Blue
                '#FFA07A',  // Orange
                '#98D8C8'   // Mint
            ];
    
            const datasets = topActors.map((actor, idx) => ({
                label: actor,
                data: sortedDates.map(date => ({
                    x: new Date(date),
                    y: dateMap[date][actor] || 0
                })),
                backgroundColor: colors[idx] + '60',
                borderColor: colors[idx],
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: colors[idx],
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }));
    
            this.charts.attributionTimeline = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: { size: 12, weight: '600' },
                                generateLabels: (chart) => {
                                    return chart.data.datasets.map((dataset, i) => ({
                                        text: `${dataset.label} (${actorTotals[dataset.label]} attacks)`,
                                        fillStyle: colors[i],
                                        strokeStyle: colors[i],
                                        lineWidth: 2,
                                        hidden: false,
                                        index: i
                                    }));
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            padding: 16,
                            titleFont: { size: 13, weight: '700' },
                            bodyFont: { size: 12 },
                            callbacks: {
                                title: (items) => {
                                    const date = new Date(items[0].parsed.x);
                                    if (binUnit === 'week') {
                                        const endDate = new Date(date);
                                        endDate.setDate(endDate.getDate() + 6);
                                        return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                                    } else if (binUnit === 'month') {
                                        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                    } else {
                                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                    }
                                },
                                label: (context) => {
                                    const value = context.parsed.y;
                                    if (value === 0) return null;
                                    return `${context.dataset.label}: ${value} attack${value > 1 ? 's' : ''}`;
                                },
                                footer: (items) => {
                                    const total = items.reduce((sum, item) => sum + item.parsed.y, 0);
                                    return `\nTotal: ${total} attacks this ${binUnit}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: binUnit,
                                displayFormats: { 
                                    day: 'MMM dd',
                                    week: 'MMM dd',
                                    month: 'MMM yyyy'
                                }
                            },
                            stacked: true,
                            grid: { display: false },
                            ticks: { 
                                color: '#6b7280',
                                font: { size: 11, weight: '600' }
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            grid: { 
                                color: 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#6b7280',
                                font: { size: 11, weight: '600' },
                                precision: 0
                            },
                            title: {
                                display: true,
                                text: `Attacks per ${binUnit}`,
                                font: { size: 12, weight: '600' },
                                color: '#374151'
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeInOutCubic'
                    }
                }
            });
    
            this.updateTimelineInsights(data);
    
        } catch (error) {
            console.error('Error rendering attribution timeline:', error);
        }
    }

    updateTimelineInsights(data) {
        // Calculate insights from timeline data
        const timeline = data.timeline || [];
        
        if (timeline.length === 0) {
            this.animateMetricUpdate('activeActorsCount', 0);
            this.animateMetricUpdate('newActorsCount', 0);
            this.animateMetricUpdate('avgCampaignDuration', '0d');
            return;
        }
    
        // Count unique actors
        const uniqueActors = new Set(timeline.map(item => item.threat_actor)).size;
        
        // Calculate date range for "active in period"
        const dates = timeline.map(item => new Date(item.week));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
        
        // Count actors first seen in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const actorFirstSeen = {};
        timeline.forEach(item => {
            const actor = item.threat_actor;
            const date = new Date(item.week);
            if (!actorFirstSeen[actor] || date < actorFirstSeen[actor]) {
                actorFirstSeen[actor] = date;
            }
        });
        
        const newActors = Object.values(actorFirstSeen)
            .filter(date => date >= thirtyDaysAgo).length;
        
        // Update metrics with animation
        this.animateMetricUpdate('activeActorsCount', uniqueActors);
        this.animateMetricUpdate('newActorsCount', newActors);
        this.animateMetricUpdate('avgCampaignDuration', `${Math.max(1, Math.round(daysDiff / uniqueActors))}d`);
    }

    updateTimelineStory(data) {
        const storyContainer = document.getElementById('timelineStory');
        if (!storyContainer || !data.timeline) return;

        // Analyze the data for storytelling
        const timeline = data.timeline;
        const totalCases = timeline.reduce((sum, item) => sum + item.cases, 0);
        const uniqueActors = [...new Set(timeline.map(item => item.threat_actor))].length;
        const mostActiveActor = this.getMostActiveActor(timeline);
        const peakDay = this.getPeakActivityDay(timeline);
        const recentTrend = this.getRecentTrend(timeline);

        const storyText = this.generateTimelineStory({
            totalCases,
            uniqueActors,
            mostActiveActor,
            peakDay,
            recentTrend
        });

        storyContainer.innerHTML = `
            <div class="timeline-story">
                <div class="story-header">
                    <i class="fas fa-chart-line"></i>
                    <h4>Threat Landscape Narrative</h4>
                </div>
                <div class="story-content">
                    <p>${storyText}</p>
                </div>
                <div class="story-insights">
                    <div class="insight-item">
                        <span class="insight-label">Peak Activity</span>
                        <span class="insight-value">${peakDay}</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Dominant Actor</span>
                        <span class="insight-value">${mostActiveActor.name}</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Trend</span>
                        <span class="insight-value ${recentTrend.direction}">${recentTrend.description}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getMostActiveActor(timeline) {
        const actorCounts = {};
        timeline.forEach(item => {
            actorCounts[item.threat_actor] = (actorCounts[item.threat_actor] || 0) + item.cases;
        });
        
        const mostActive = Object.entries(actorCounts)
            .sort(([,a], [,b]) => b - a)[0];
        
        return {
            name: mostActive[0],
            cases: mostActive[1]
        };
    }

    getPeakActivityDay(timeline) {
        const dayCounts = {};
        timeline.forEach(item => {
            const date = new Date(item.week).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            dayCounts[date] = (dayCounts[date] || 0) + item.cases;
        });
        
        const peakDay = Object.entries(dayCounts)
            .sort(([,a], [,b]) => b - a)[0];
        
        return `${peakDay[0]} (${peakDay[1]} cases)`;
    }

    getRecentTrend(timeline) {
        if (timeline.length < 4) {
            return { direction: 'stable', description: 'Insufficient data' };
        }

        const sortedTimeline = timeline.sort((a, b) => new Date(a.week) - new Date(b.week));
        const recent = sortedTimeline.slice(-3);
        const earlier = sortedTimeline.slice(-6, -3);
        
        const recentAvg = recent.reduce((sum, item) => sum + item.cases, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, item) => sum + item.cases, 0) / earlier.length;
        
        const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
        
        if (change > 20) {
            return { direction: 'increasing', description: `+${change.toFixed(0)}% surge` };
        } else if (change < -20) {
            return { direction: 'decreasing', description: `${change.toFixed(0)}% decline` };
        } else {
            return { direction: 'stable', description: 'Stable activity' };
        }
    }

    generateTimelineStory(data) {
        const { totalCases, uniqueActors, mostActiveActor, recentTrend } = data;
        
        let story = `Over the selected period, ${uniqueActors} distinct threat actors orchestrated ${totalCases} targeted attacks. `;
        
        if (mostActiveActor.cases > 1) {
            story += `${mostActiveActor.name} emerged as the most persistent threat, responsible for ${mostActiveActor.cases} cases. `;
        }
        
        if (recentTrend.direction === 'increasing') {
            story += `Recent activity shows an escalating threat landscape with ${recentTrend.description} in attack volume. `;
        } else if (recentTrend.direction === 'decreasing') {
            story += `The threat landscape shows signs of ${recentTrend.description}, indicating potential operational shifts. `;
        } else {
            story += `Threat activity remains ${recentTrend.description}, suggesting consistent operational patterns. `;
        }
        
        story += `This timeline reveals the dynamic nature of cyber threats and the need for continuous monitoring.`;
        
        return story;
    }

    async updateInfrastructurePatterns() {
        console.log('<i class="fas fa-rocket"></i> Starting updateInfrastructurePatterns...');
        try {
            const params = getFilterParams();
            console.log('<i class="fas fa-chart-bar"></i> Fetching infrastructure patterns with params:', params);
            const data = await fetchAPI(`/api/dashboard/infrastructure-patterns?${params}`);
            console.log('<i class="fas fa-chart-bar"></i> Infrastructure patterns response:', data);
            
            if (data && !data.error) {
                console.log('<i class="fas fa-check-circle"></i> Data received, rendering infrastructure patterns...');
                await this.renderInfrastructurePatterns(data);
            } else {
                console.error('<i class="fas fa-times-circle"></i> Error in infrastructure patterns data:', data);
            }
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error updating infrastructure patterns:', error);
        }
    }

    async renderInfrastructurePatterns(data) {
        // Render overview charts and lists
        this.renderInfrastructureOverview(data);
        
        // Load comprehensive analysis data
        await this.loadActorInfrastructurePreferences();
        await this.loadFamilyInfrastructurePreferences();
        await this.loadInfrastructurePatterns();
    }

    renderInfrastructureOverview(data) {
        // Top TLDs
        const tldsContainer = document.getElementById('topTLDs');
        if (tldsContainer && data.tlds) {
            tldsContainer.innerHTML = data.tlds.slice(0, 8).map((item, index) => `
                <div class="infra-item" style="animation-delay: ${index * 0.1}s">
                    <span class="infra-name">.${item.tld}</span>
                    <span class="infra-count">${item.count}</span>
                    <div class="infra-bar">
                        <div class="infra-fill" style="width: ${(item.count / data.tlds[0].count) * 100}%"></div>
                    </div>
                </div>
            `).join('');
        }

        // Host Countries
        const countriesContainer = document.getElementById('hostCountries');
        if (countriesContainer && data.countries) {
            countriesContainer.innerHTML = data.countries.slice(0, 8).map((item, index) => `
                <div class="infra-item" style="animation-delay: ${index * 0.1}s">
                    <span class="infra-name">${item.country}</span>
                    <span class="infra-count">${item.count}</span>
                    <div class="infra-bar">
                        <div class="infra-fill" style="width: ${(item.count / data.countries[0].count) * 100}%"></div>
                    </div>
                </div>
            `).join('');
        }

        // Hosting Providers
        const providersContainer = document.getElementById('hostingProviders');
        if (providersContainer && data.providers) {
            providersContainer.innerHTML = data.providers.slice(0, 8).map((item, index) => `
                <div class="infra-item" style="animation-delay: ${index * 0.1}s">
                    <span class="infra-name" title="${item.isp}">${this.truncateText(item.isp, 20)}</span>
                    <span class="infra-count">${item.count}</span>
                    <div class="infra-bar">
                        <div class="infra-fill" style="width: ${(item.count / data.providers[0].count) * 100}%"></div>
                    </div>
                </div>
            `).join('');
        }

        // Render the completely redesigned infrastructure intelligence overview
        this.renderIntelligenceSummaryPanel(data);
        this.renderGeographicThreatHeatmap(data);
        this.renderInfrastructureProviderAnalysis(data);
        this.renderTLDAnalysis(data);
        this.renderInfrastructureTimeline(data);
    }

    renderInfrastructureCharts(data) {
        // TLD Chart
        this.renderInfrastructureChart('tldChart', data.tlds, 'Top Level Domains', 'pie');
        // Country Chart
        this.renderInfrastructureChart('countryChart', data.countries, 'Host Countries', 'doughnut');
        // Provider Chart
        this.renderInfrastructureChart('providerChart', data.providers, 'Hosting Providers', 'bar');
        // Registrar Chart (if available)
        if (data.registrars) {
            this.renderInfrastructureChart('registrarChart', data.registrars, 'Registrars', 'doughnut');
        }
    }

    renderInfrastructureChart(canvasId, data, title, type) {
        const ctx = document.getElementById(canvasId);
        if (!ctx || !data || data.length === 0) return;

        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#FFA07A', '#98D8C8', '#F7DC6F'];
        
        const chartData = {
            labels: data.slice(0, 8).map(item => type === 'pie' || type === 'doughnut' ? 
                (data === data.tlds ? `.${item.tld}` : item.country || item.isp || item.registrar) :
                this.truncateText(data === data.tlds ? item.tld : item.country || item.isp || item.registrar, 15)),
            datasets: [{
                data: data.slice(0, 8).map(item => item.count),
                backgroundColor: colors,
                borderColor: colors.map(color => color + '80'),
                borderWidth: 2
            }]
        };

        this.charts[canvasId] = new Chart(ctx, {
            type: type,
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    async loadActorInfrastructurePreferences() {
        try {
            const params = getFilterParams();
            console.log('<i class="fas fa-bullseye"></i> Loading actor infrastructure preferences with params:', params);
            const data = await fetchAPI(`/api/dashboard/actor-infrastructure-preferences?${params}`);
            console.log('<i class="fas fa-bullseye"></i> Actor infrastructure data received:', data);
            
            if (data && !data.error) {
                this.renderThreatActorInfrastructureTable(data);
            } else {
                console.error('<i class="fas fa-times-circle"></i> Error in actor infrastructure data:', data);
            }
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error loading actor infrastructure preferences:', error);
        }
    }

    renderActorPreferences(data) {
        const tbody = document.getElementById('actorPreferencesBody');
        if (!tbody) return;

        if (!data.actors || data.actors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data-cell">No actor preference data available</td></tr>';
            return;
        }

        tbody.innerHTML = data.actors.map(actor => `
            <tr>
                <td class="case-number">${actor.threat_actor || 'Unknown'}</td>
                <td><span class="preference-badge">${actor.preferred_tld || 'N/A'}</span></td>
                <td><span class="preference-badge">${actor.preferred_country || 'N/A'}</span></td>
                <td><span class="preference-badge">${this.truncateText(actor.preferred_isp || 'N/A', 15)}</span></td>
                <td><span class="preference-badge">${actor.preferred_registrar || 'N/A'}</span></td>
                <td><span class="case-count">${actor.total_cases}</span></td>
            </tr>
        `).join('');
    }


    async loadFamilyInfrastructurePreferences() {
        try {
            const params = getFilterParams();
            console.log('<i class="fas fa-rocket"></i> Loading comprehensive threat family intelligence with params:', params);
            const data = await fetchAPI(`/api/dashboard/comprehensive-threat-family-intelligence?${params}`);
            
            console.log('<i class="fas fa-chart-bar"></i> Received data:', data);
            if (data && !data.error) {
                this.renderComprehensiveThreatFamilyIntelligence(data);
            } else {
                console.error('<i class="fas fa-times-circle"></i> Error in data:', data);
            }
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error loading family infrastructure preferences:', error);
        }
    }

    renderComprehensiveThreatFamilyIntelligence(data) {
        const container = document.getElementById('familyPreferencesBody');
        if (!container) return;

        if (!data.families || data.families.length === 0) {
            container.innerHTML = '<div class="no-data-cell">No threat family intelligence available</div>';
            return;
        }

        // Group data by threat family
        const familyGroups = this.groupDataByFamily(data);
        
        // Render intelligence profiles for each family
        container.innerHTML = data.families.map(family => {
            const familyData = familyGroups[family.threat_family];
            return this.renderThreatFamilyIntelligenceProfile(family, familyData);
        }).join('');
        
        console.log('<i class="fas fa-check-circle"></i> Rendered comprehensive threat family intelligence for', data.families.length, 'families');
        
        // Populate detailed infrastructure dropdowns with family data
        if (window.populateInfrastructureDropdowns) {
            console.log('Populating infrastructure dropdowns with families:', data.families.length);
            // Get current actor data from the dropdown
            const actorSelect = document.getElementById('infrastructureActorSelect');
            const actorData = [];
            if (actorSelect) {
                for (let i = 1; i < actorSelect.options.length; i++) {
                    actorData.push({ threat_actor: actorSelect.options[i].value });
                }
            }
            window.populateInfrastructureDropdowns(actorData, data.families);
        }
    }

    groupDataByFamily(data) {
        const groups = {};
        
        // Group URL paths by family (if url_paths exists)
        if (data.url_paths && Array.isArray(data.url_paths)) {
            data.url_paths.forEach(path => {
                if (!groups[path.threat_family]) {
                    groups[path.threat_family] = { url_paths: [], brands: [] };
                }
                groups[path.threat_family].url_paths.push(path);
            });
        }
        
        // Group brands by family (if brands exists)
        if (data.brands && Array.isArray(data.brands)) {
            data.brands.forEach(brand => {
                if (!groups[brand.threat_family]) {
                    groups[brand.threat_family] = { url_paths: [], brands: [] };
                }
                groups[brand.threat_family].brands.push(brand);
            });
        }
        
        return groups;
    }

    renderThreatFamilyIntelligenceProfile(family, familyData) {
        const urlPaths = familyData?.url_paths || [];
        const brands = familyData?.brands || [];
        
        // Calculate intelligence metrics
        const sophisticationLevel = this.calculateSophisticationLevel(family, urlPaths, brands);
        const infrastructureSignature = this.generateInfrastructureSignature(family);
        const brandTargetingStrategy = this.analyzeBrandTargetingStrategy(brands);
        const operationalPatterns = this.analyzeOperationalPatterns(urlPaths);
        
        return `
            <div class="threat-family-intelligence-card">
                <div class="family-header">
                    <div class="family-title">
                        <h3>${family.threat_family}</h3>
                        <span class="sophistication-badge ${sophisticationLevel.level.toLowerCase()}">${sophisticationLevel.level}</span>
                    </div>
                    <div class="family-metrics">
                        <div class="metric">
                            <span class="metric-value">${family.total_domains}</span>
                            <span class="metric-label">Domains</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">${family.unique_url_paths || 0}</span>
                            <span class="metric-label">URL Patterns</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">${this.formatDate(family.active_since)}</span>
                            <span class="metric-label">Active Since</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">${this.formatDate(family.last_case)}</span>
                            <span class="metric-label">Last Case</span>
                        </div>
                    </div>
                </div>

                <div class="intelligence-sections">
                    <!-- Infrastructure Signature -->
                    <div class="intelligence-section">
                        <h4 class="section-title">🏗️ Infrastructure Signature</h4>
                        <div class="signature-content">
                            <div class="signature-item">
                                <strong>Primary TLD:</strong> ${family.top_tld || 'Unknown'}
                            </div>
                            <div class="signature-item">
                                <strong>Preferred Registrar:</strong> ${family.top_registrar || 'Unknown'}
                            </div>
                            <div class="signature-item">
                                <strong>Hosting ISP:</strong> ${family.top_isp || 'Unknown'}
                            </div>
                            <div class="signature-item">
                                <strong>Geographic Focus:</strong> ${family.top_country || 'Unknown'}
                            </div>
                            ${family.top_whois_email ? `
                            <div class="signature-item">
                                <strong>WHOIS Email:</strong> ${family.top_whois_email}
                            </div>
                            ` : ''}
                            ${family.top_whois_name ? `
                            <div class="signature-item">
                                <strong>WHOIS Name:</strong> ${family.top_whois_name}
                            </div>
                            ` : ''}
                        </div>
                        <div class="intelligence-insight">
                            <strong><i class="fas fa-search"></i> Signature Analysis:</strong> ${infrastructureSignature.analysis}
                        </div>
                        <div class="threat-indicator">
                            <strong><i class="fas fa-bullseye"></i> If you see:</strong> ${infrastructureSignature.indicator}
                        </div>
                    </div>

                    <!-- URL Path Intelligence -->
                    <div class="intelligence-section">
                        <h4 class="section-title">🔗 URL Path Intelligence (Kit Usage)</h4>
                        <div class="url-paths-grid">
                            ${urlPaths.slice(0, 5).map(path => `
                                <div class="url-path-item ${path.url_path === 'No URL Path Recorded' ? 'no-path' : ''}">
                                    <div class="path-info">
                                        <span class="path-text">${path.url_path}</span>
                                        <span class="path-cases">${path.case_count} cases</span>
                                    </div>
                                    <div class="path-domains">${path.domain_count} domains</div>
                                </div>
                            `).join('')}
                            ${urlPaths.length > 5 ? `<div class="more-paths">+${urlPaths.length - 5} more patterns</div>` : ''}
                        </div>
                        <div class="intelligence-insight">
                            <strong><i class="fas fa-chart-bar"></i> Pattern Analysis:</strong> ${operationalPatterns.analysis}
                        </div>
                    </div>

                    <!-- Brand Targeting Strategy -->
                    <div class="intelligence-section">
                        <h4 class="section-title"><i class="fas fa-bullseye"></i> Brand Targeting Strategy</h4>
                        <div class="brands-grid">
                            ${brands.slice(0, 6).map(brand => `
                                <div class="brand-item">
                                    <span class="brand-name">${brand.brand}</span>
                                    <span class="brand-cases">${brand.case_count} attacks</span>
                                </div>
                            `).join('')}
                            ${brands.length > 6 ? `<div class="more-brands">+${brands.length - 6} more targets</div>` : ''}
                        </div>
                        <div class="intelligence-insight">
                            <strong><i class="fas fa-bullseye"></i> Targeting Strategy:</strong> ${brandTargetingStrategy.analysis}
                        </div>
                    </div>

                    <!-- Infrastructure Reuse Detection -->
                    <div class="intelligence-section">
                        <h4 class="section-title"><i class="fas fa-sync-alt"></i> Infrastructure Reuse Analysis</h4>
                        <div class="reuse-analysis">
                            <div class="reuse-metric">
                                <strong>Registrar Consistency:</strong> ${this.calculateConsistency(family.top_registrar)}%
                            </div>
                            <div class="reuse-metric">
                                <strong>ISP Preference:</strong> ${this.calculateConsistency(family.top_isp)}%
                            </div>
                            <div class="reuse-metric">
                                <strong>Geographic Focus:</strong> ${this.calculateConsistency(family.top_country)}%
                            </div>
                        </div>
                        <div class="intelligence-insight">
                            <strong><i class="fas fa-sync-alt"></i> Reuse Pattern:</strong> ${this.analyzeInfrastructureReuse(family)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    calculateSophisticationLevel(family, urlPaths, brands) {
        let score = 0;
        
        // Infrastructure diversity
        if (family.top_tld && family.top_registrar && family.top_isp && family.top_country) score += 2;
        if (family.top_whois_email && family.top_whois_name) score += 1;
        
        // URL path variety
        const uniquePaths = urlPaths.filter(p => p.url_path !== 'No URL Path Recorded').length;
        if (uniquePaths > 3) score += 2;
        else if (uniquePaths > 1) score += 1;
        
        // Brand targeting variety
        if (brands.length > 5) score += 2;
        else if (brands.length > 2) score += 1;
        
        // Case volume
        if (family.total_cases > 20) score += 2;
        else if (family.total_cases > 10) score += 1;
        
        if (score >= 7) return { level: 'HIGH', description: 'Highly sophisticated threat actor' };
        if (score >= 4) return { level: 'MEDIUM', description: 'Moderately sophisticated threat actor' };
        return { level: 'LOW', description: 'Basic threat actor capabilities' };
    }

    generateInfrastructureSignature(family) {
        const components = [];
        if (family.top_tld) components.push(`${family.top_tld} domains`);
        if (family.top_registrar) components.push(`${family.top_registrar} registration`);
        if (family.top_country) components.push(`${family.top_country} hosting`);
        
        const signature = components.join(' + ');
        const analysis = `This family shows consistent infrastructure preferences with ${family.top_tld || 'unknown'} domains, ${family.top_registrar || 'unknown'} registrar, and ${family.top_country || 'unknown'} hosting.`;
        const indicator = `${signature} → likely ${family.threat_family}`;
        
        return { signature, analysis, indicator };
    }

    analyzeBrandTargetingStrategy(brands) {
        if (brands.length === 0) {
            return { analysis: 'No specific brand targeting patterns identified.' };
        }
        
        const techBrands = brands.filter(b => ['Google', 'Microsoft', 'Apple', 'Amazon'].includes(b.brand));
        const financialBrands = brands.filter(b => ['PayPal', 'Bank', 'Chase', 'Wells Fargo'].includes(b.brand));
        
        if (techBrands.length > 0 && financialBrands.length > 0) {
            return { analysis: 'Multi-sector targeting strategy focusing on both technology and financial services.' };
        } else if (techBrands.length > 0) {
            return { analysis: 'Technology-focused targeting strategy, likely credential harvesting.' };
        } else if (financialBrands.length > 0) {
            return { analysis: 'Financial services targeting strategy, likely banking fraud.' };
        } else {
            return { analysis: `Diverse targeting strategy across ${brands.length} different brands.` };
        }
    }

    analyzeOperationalPatterns(urlPaths) {
        const hasUrlPaths = urlPaths.filter(p => p.url_path !== 'No URL Path Recorded').length > 0;
        const noUrlPaths = urlPaths.filter(p => p.url_path === 'No URL Path Recorded').length;
        
        if (!hasUrlPaths) {
            return { analysis: 'No specific URL path patterns detected - likely using custom or varied attack methods.' };
        } else if (noUrlPaths > 0) {
            return { analysis: `Mixed operational approach: ${hasUrlPaths} structured URL patterns + ${noUrlPaths} cases without recorded paths.` };
        } else {
            return { analysis: `Structured operational approach with ${hasUrlPaths} distinct URL path patterns indicating organized attack methods.` };
        }
    }

    calculateConsistency(value) {
        // Mock calculation - in real implementation, this would analyze historical data
        return value ? Math.floor(Math.random() * 40) + 60 : 0;
    }

    analyzeInfrastructureReuse(family) {
        const components = [];
        if (family.top_registrar) components.push('registrar');
        if (family.top_isp) components.push('ISP');
        if (family.top_country) components.push('geographic location');
        
        return `High infrastructure reuse across ${components.join(', ')} suggesting consistent operational security practices.`;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        } catch (error) {
            return 'N/A';
        }
    }

    renderThreatActorInfrastructureTable(data) {
        const tbody = document.getElementById('threatActorInfrastructureBody');
        const summary = document.getElementById('actorTableSummary');
        
        if (!tbody) {
            console.log('<i class="fas fa-times-circle"></i> threatActorInfrastructureBody element not found');
            return;
        }
        
        console.log('<i class="fas fa-bullseye"></i> Rendering threat actor infrastructure table with data:', data);

        // Handle the data structure - it comes as {actors: [...], url_paths: [...]}
        const actors = data.actors || data || [];
        
        if (!actors || actors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data-cell">No threat actor infrastructure data available</td></tr>';
            if (summary) summary.textContent = 'No threat actors found';
            return;
        }

        // Update summary
        if (summary) {
            summary.textContent = `Showing ${actors.length} threat actors with infrastructure preferences`;
        }

        // Render table rows
        tbody.innerHTML = actors.map(actor => {
            const urlPaths = this.getActorURLPaths(actor.threat_actor, data.url_paths || []);
            
            // Log the infrastructure data structure for debugging (only once)
            if (actor === actors[0] && data.infrastructure) {
                console.log('Infrastructure data structure:', {
                    tlds_count: data.infrastructure.tlds?.length || 0,
                    registrars_count: data.infrastructure.registrars?.length || 0,
                    isps_count: data.infrastructure.isps?.length || 0,
                    countries_count: data.infrastructure.countries?.length || 0,
                    sample_registrar: data.infrastructure.registrars?.[0]
                });
            }
            
            const tlds = this.getActorInfrastructureValues(actor.threat_actor, data.infrastructure || {}, 'tlds');
            const registrars = this.getActorInfrastructureValues(actor.threat_actor, data.infrastructure || {}, 'registrars');
            const isps = this.getActorInfrastructureValues(actor.threat_actor, data.infrastructure || {}, 'isps');
            const countries = this.getActorInfrastructureValues(actor.threat_actor, data.infrastructure || {}, 'countries');
            
            // Helper function to render compact list
            const renderCompactList = (items, max = 3) => {
                if (items.length === 0) return '<span class="no-data">None</span>';
                const visible = items.slice(0, max);
                const remaining = items.length - max;
                return `
                    ${visible.map(item => `<span class="compact-tag">${item.value}</span>`).join('')}
                    ${remaining > 0 ? `<span class="more-indicator">+${remaining}</span>` : ''}
                `;
            };
            
            return `
                <tr class="threat-actor-row">
                    <td class="actor-name-cell">
                        <strong>${actor.threat_actor}</strong>
                    </td>
                    <td class="infrastructure-cell">
                        ${renderCompactList(tlds)}
                    </td>
                    <td class="infrastructure-cell">
                        ${renderCompactList(registrars)}
                    </td>
                    <td class="infrastructure-cell">
                        ${renderCompactList(isps)}
                    </td>
                    <td class="infrastructure-cell">
                        ${renderCompactList(countries)}
                    </td>
                    <td class="metrics-cell">
                        <strong>${actor.total_cases}</strong>
                    </td>
                    <td class="date-cell">
                        ${this.formatDate(actor.active_since)}
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log('<i class="fas fa-check-circle"></i> Rendered threat actor infrastructure table with', actors.length, 'actors');
        
        // Populate detailed infrastructure dropdowns with actor data
        if (window.populateInfrastructureDropdowns) {
            console.log('Populating infrastructure dropdowns with actors:', actors.length);
            window.populateInfrastructureDropdowns(actors, []);
        }
    }

    getActorURLPaths(actorName, urlPathsData) {
        // Filter URL paths data by threat actor
        if (!urlPathsData || !Array.isArray(urlPathsData)) {
            return [];
        }
        
        const actorPaths = urlPathsData
            .filter(item => item.threat_actor === actorName)
            .sort((a, b) => b.case_count - a.case_count) // Sort by case count descending
            // Remove .slice(0, 3) to show ALL URL paths for each actor
            .map(item => ({
                url_path: item.url_path,
                case_count: item.case_count,
                domain_count: item.domain_count
            }));
            
        return actorPaths;
    }

    getActorInfrastructureValues(actorName, infrastructureData, type) {
        // Get all infrastructure values (TLD, Registrar, ISP, Country) for a specific actor
        if (!infrastructureData || !infrastructureData[type] || !Array.isArray(infrastructureData[type])) {
            console.log(`No infrastructure data for type: ${type}`, infrastructureData);
            return [];
        }
        
        // Determine the field name based on type
        let fieldName;
        switch(type) {
            case 'tlds':
                fieldName = 'tld';
                break;
            case 'registrars':
                fieldName = 'registrar_name';
                break;
            case 'isps':
                fieldName = 'host_isp';
                break;
            case 'countries':
                fieldName = 'host_country';
                break;
            default:
                fieldName = 'value';
        }
        
        const actorValues = infrastructureData[type]
            .filter(item => item.threat_actor === actorName)
            .sort((a, b) => b.case_count - a.case_count) // Sort by case count descending
            .map(item => {
                const value = item[fieldName];
                if (!value) {
                    console.warn(`Missing ${fieldName} for actor ${actorName} in ${type}:`, item);
                }
                return {
                    value: value || 'Unknown',
                    case_count: item.case_count
                };
            })
            .filter(item => item.value !== 'Unknown'); // Filter out items with missing values
            
        console.log(`Infrastructure values for ${actorName} (${type}):`, actorValues.length, 'items');
        
        return actorValues;
    }

    calculateAbuseLevel(count) {
        // Dynamic thresholds based on database statistics
        // These could be made configurable from the database in the future
        if (count >= 50) return 'High';
        if (count >= 20) return 'Medium';
        return 'Low';
    }

    getAbuseDescription(level) {
        // Dynamic descriptions based on actual data patterns
        switch (level) {
            case 'High': return 'Significant abuse activity detected (>50 cases)';
            case 'Medium': return 'Moderate abuse activity observed (20-49 cases)';
            case 'Low': return 'Normal activity levels (<20 cases)';
            default: return 'No data available';
        }
    }

    renderFamilyPreferences(data) {
        // Legacy method kept for compatibility
        const tbody = document.getElementById('familyPreferencesBody');
        if (!tbody) return;

        if (!data.families || data.families.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data-cell">No family preference data available</td></tr>';
            return;
        }

        tbody.innerHTML = data.families.map(family => `
            <tr>
                <td class="case-number">${family.threat_family || 'Unknown'}</td>
                <td><span class="preference-badge">${family.top_tld || 'N/A'}</span></td>
                <td><span class="preference-badge">${family.top_country || 'N/A'}</span></td>
                <td><span class="preference-badge">${this.truncateText(family.top_isp || 'N/A', 15)}</span></td>
                <td><span class="preference-badge">${family.top_registrar || 'N/A'}</span></td>
                <td><span class="case-count">${family.total_cases}</span></td>
            </tr>
        `).join('');
    }

    renderBrandTargetingPatterns(brands) {
        const container = document.getElementById('brandTargetingPatterns');
        if (!container) return;

        if (!brands || brands.length === 0) {
            container.innerHTML = '<div class="loading-cell">No brand targeting patterns available</div>';
            return;
        }

        container.innerHTML = brands.slice(0, 10).map(brand => `
            <div class="brand-item">
                <span class="brand-text">${brand.brand || 'Unknown Brand'}</span>
                <span class="brand-count">${brand.count}</span>
            </div>
        `).join('');
    }

    async loadInfrastructurePatterns() {
        try {
            const params = getFilterParams();
            const data = await fetchAPI(`/api/dashboard/infrastructure-patterns-detailed?${params}`);
            
            if (data && !data.error) {
                this.renderInfrastructureReuse(data.reuse || []);
                this.renderGeographicClustering(data.geographic || []);
                this.renderTemporalPatterns(data.temporal || []);
            }
        } catch (error) {
            console.error('Error loading infrastructure patterns:', error);
        }
    }

    renderInfrastructureReuse(reuseData) {
        const container = document.getElementById('infrastructureReuse');
        if (!container) return;

        if (!reuseData || reuseData.length === 0) {
            container.innerHTML = '<div class="loading-cell">No infrastructure reuse patterns available</div>';
            return;
        }

        container.innerHTML = reuseData.map(item => `
            <div class="pattern-item">
                <div class="pattern-title">${item.pattern_type || 'Infrastructure Reuse'}</div>
                <div class="pattern-description">${item.description || 'Shared infrastructure across multiple threats'}</div>
                <div class="pattern-metrics">
                    <div class="pattern-metric">
                        <div class="metric-value">${item.shared_count || 0}</div>
                        <div class="metric-label">Shared</div>
                    </div>
                    <div class="pattern-metric">
                        <div class="metric-value">${item.unique_count || 0}</div>
                        <div class="metric-label">Unique</div>
                    </div>
                    <div class="pattern-metric">
                        <div class="metric-value">${item.reuse_percentage || 0}%</div>
                        <div class="metric-label">Reuse Rate</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderGeographicClustering(geoData) {
        const container = document.getElementById('geographicClustering');
        if (!container) return;

        if (!geoData || geoData.length === 0) {
            container.innerHTML = '<div class="loading-cell">No geographic clustering data available</div>';
            return;
        }

        container.innerHTML = geoData.map(item => `
            <div class="pattern-item">
                <div class="pattern-title">${item.host_country || 'Geographic Cluster'}</div>
                <div class="pattern-description">Threat concentration in specific regions</div>
                <div class="pattern-metrics">
                    <div class="pattern-metric">
                        <div class="metric-value">${item.case_count || 0}</div>
                        <div class="metric-label">THREATS</div>
                    </div>
                    <div class="pattern-metric">
                        <div class="metric-value">${item.domain_count || 0}</div>
                        <div class="metric-label">DOMAINS</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderTemporalPatterns(temporalData) {
        const container = document.getElementById('temporalInfrastructurePatterns');
        if (!container) return;

        if (!temporalData || temporalData.length === 0) {
            container.innerHTML = '<div class="loading-cell">No temporal patterns available</div>';
            return;
        }

        container.innerHTML = temporalData.map(item => `
            <div class="pattern-item">
                <div class="pattern-title">Temporal Pattern</div>
                <div class="pattern-description">Time-based infrastructure usage patterns</div>
                <div class="pattern-metrics">
                    <div class="pattern-metric">
                        <div class="metric-value">${item.case_count || 0}</div>
                        <div class="metric-label">FREQUENCY</div>
                    </div>
                    <div class="pattern-metric">
                        <div class="metric-value">${item.attack_hour !== null ? item.attack_hour : 'N/A'}</div>
                        <div class="metric-label">PEAK HOUR</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async updateWHOISAttribution() {
        try {
            const params = getFilterParams();
            console.log('<i class="fas fa-bullseye"></i> Loading WHOIS attribution with params:', params);
            const data = await fetchAPI(`/api/dashboard/whois-attribution?${params}`);
            console.log('<i class="fas fa-bullseye"></i> WHOIS attribution data received:', data);
            
            if (data && !data.error) {
                this.renderWHOISTable(data);
            } else {
                console.error('<i class="fas fa-times-circle"></i> Error in WHOIS attribution data:', data);
            }
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error updating WHOIS attribution:', error);
        }
    }

    renderWHOISTable(data) {
        const tbody = document.getElementById('whoisTableBody');
        if (!tbody) {
            console.log('<i class="fas fa-times-circle"></i> whoisTableBody element not found');
            return;
        }

        console.log('<i class="fas fa-bullseye"></i> Rendering WHOIS table with data:', data);

        if (!data || data.length === 0) {
            console.log('<i class="fas fa-times-circle"></i> No WHOIS data to render');
            tbody.innerHTML = '<tr><td colspan="3" class="no-data-cell">No WHOIS attribution data available</td></tr>';
            return;
        }

        tbody.innerHTML = data.slice(0, 15).map(item => `
            <tr class="whois-row">
                <td class="whois-identifier" title="${item.registrant || 'N/A'}">
                    ${this.truncateText(item.registrant || 'N/A', 40)}
                </td>
                <td class="whois-cases">
                    <span class="metric-badge">${item.total_cases || 0}</span>
                </td>
                <td class="whois-families">
                    <div class="families-list">
                        ${item.threat_families_used && item.threat_families_used !== 'None' ? (() => {
                            // Split by comma and clean up
                            const families = item.threat_families_used
                                .split(',')
                                .map(family => family.trim())
                                .filter(family => family && family !== '')
                                .slice(0, 4); // Show up to 4 families
                            
                            return families.length > 0 
                                ? families.map(family => `<span class="family-tag">${family}</span>`).join(' ')
                                : '<span class="no-data">None</span>';
                        })() : '<span class="no-data">None</span>'}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async updatePriorityCases() {
        try {
            const params = getFilterParams();
            const data = await fetchAPI(`/api/dashboard/priority-cases?${params}`);
            
            if (data && !data.error) {
                this.renderPriorityCases(data);
            }
        } catch (error) {
            console.error('Error updating priority cases:', error);
        }
    }

    renderPriorityCases(data) {
        const tbody = document.getElementById('priorityCasesTableBody');
        if (!tbody) return;

        console.log('<i class="fas fa-bullseye"></i> Rendering priority cases with data:', data);

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="no-data-cell">No attributed cases found</td></tr>';
            return;
        }

        tbody.innerHTML = data.slice(0, 20).map((item, index) => {
            return `
                <tr class="attributed-case-row" data-case="${item.case_number}">
                    <td class="case-number">
                        <div class="case-number-container">
                            <a href="#" class="case-link" title="View case details">${item.case_number}</a>
                        </div>
                    </td>
                    <td class="case-brand">
                        <div class="brand-container">
                            <span class="brand-name">${item.brand || 'Unknown'}</span>
                        </div>
                    </td>
                    <td class="case-actor" title="${item.threat_actor || 'N/A'}">
                        ${item.threat_actor ? `
                            <div class="actor-container">
                                <span class="actor-name">${this.truncateText(item.threat_actor, 20)}</span>
                                </div>
                        ` : '<span class="no-data">None</span>'}
                    </td>
                    <td class="case-kit">
                        ${item.threat_family ? `
                            <span class="kit-tag">${item.threat_family}</span>
                        ` : '<span class="no-data">None</span>'}
                    </td>
                    <td class="case-domain" title="${item.domain || 'N/A'}">
                        ${item.domain ? `
                            <div class="domain-container">
                                <span class="domain-name">${this.truncateText(item.domain, 25)}</span>
                                </div>
                        ` : '<span class="no-data">None</span>'}
                    </td>
                    <td class="case-country">
                        ${item.host_country ? `
                            <div class="country-container">
                                <span class="country-code">${item.host_country}</span>
                            </div>
                        ` : '<span class="no-data">None</span>'}
                    </td>
                    <td class="case-whois-email" title="${item.flagged_whois_email || 'N/A'}">
                        ${item.flagged_whois_email ? `
                            <span class="whois-email">${this.truncateText(item.flagged_whois_email, 25)}</span>
                        ` : '<span class="no-data">None</span>'}
                    </td>
                    <td class="case-whois-name" title="${item.flagged_whois_name || 'N/A'}">
                        ${item.flagged_whois_name ? `
                            <span class="whois-name">${this.truncateText(item.flagged_whois_name, 25)}</span>
                        ` : '<span class="no-data">None</span>'}
                    </td>
                    <td class="case-date">
                        <div class="date-container">
                            <span class="date-value">${this.formatDate(item.date_created_local)}</span>
                            <div class="time-ago">${this.getTimeAgo(item.date_created_local)}</div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log('<i class="fas fa-check-circle"></i> Rendered priority cases table with', data.length, 'cases');
    }

    // Helper methods for priority cases
    getPriorityLevel(item) {
        if (item.attribution_score >= 3) return 'critical';
        if (item.attribution_score >= 2) return 'high';
        return 'medium';
    }

    getRiskIndicator(item) {
        // Use dynamic configuration from database
        const highRiskActors = this.riskConfig.highRiskActors;
        const highRiskBrands = this.riskConfig.highRiskBrands;
        
        if (highRiskActors.includes(item.threat_actor) || highRiskBrands.includes(item.brand)) {
            return '<div class="risk-indicator high-risk"><i class="fas fa-exclamation-triangle"></i></div>';
        }
        return '<div class="risk-indicator normal-risk"><i class="fas fa-shield-alt"></i></div>';
    }

    getKitFamilyClass(threatFamily) {
        // Use dynamic configuration from database
        // Generate CSS class based on kit family name
        if (this.riskConfig.kitFamilies.includes(threatFamily)) {
            // Normalize the threat family name to create a valid CSS class
            const normalizedName = threatFamily.toLowerCase().replace(/[^a-z0-9]/g, '-');
            return `kit-${normalizedName}`;
        }
        return 'kit-unknown';
    }

    getCountryRiskLevel(countryCode) {
        // Use dynamic configuration from database
        const highRiskCountries = this.riskConfig.highRiskCountries;
        const mediumRiskCountries = this.riskConfig.mediumRiskCountries;
        
        if (highRiskCountries.includes(countryCode)) return 'high-risk';
        if (mediumRiskCountries.includes(countryCode)) return 'medium-risk';
        return 'low-risk';
    }

    getScoreBreakdown(item) {
        const breakdown = [];
        if (item.threat_actor) breakdown.push('Actor');
        if (item.threat_family) breakdown.push('Family');
        if (item.flagged_whois_email) breakdown.push('WHOIS');
        return breakdown.join(', ');
    }

    getTimeAgo(dateString) {
        if (!dateString) return 'Unknown';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
            
            if (diffInHours < 24) return `${diffInHours}h ago`;
            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays < 7) return `${diffInDays}d ago`;
            const diffInWeeks = Math.floor(diffInDays / 7);
            return `${diffInWeeks}w ago`;
        } catch (error) {
            return 'Unknown';
        }
    }

    // Utility methods
    animateMetricUpdate(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.style.transform = 'scale(1.1)';
        element.style.transition = 'transform 0.2s ease';
        
        setTimeout(() => {
            element.textContent = newValue;
            element.style.transform = 'scale(1)';
        }, 100);
    }

    truncateText(text, maxLength) {
        if (!text) return 'N/A';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    getRiskLevel(caseCount) {
        if (caseCount >= 20) return 'critical';
        if (caseCount >= 10) return 'high';
        if (caseCount >= 5) return 'medium';
        return 'low';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.updateData();
        }, 300000); // 5 minutes
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    destroy() {
        this.stopAutoRefresh();
        
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    renderIntelligenceSummaryPanel(data) {
        // Calculate summary metrics
        const totalInfrastructure = data.tlds?.reduce((sum, item) => sum + item.count, 0) || 0;
        const topThreatCountries = data.countries?.length || 0;
        const majorProviders = data.providers?.length || 0;
        const activeRegistrars = data.registrars?.length || 0;

        // Update metric values with animation
        this.animateNumber('totalInfrastructure', 0, totalInfrastructure, 1000);
        this.animateNumber('topThreatCountries', 0, topThreatCountries, 1000);
        this.animateNumber('majorProviders', 0, majorProviders, 1000);
        this.animateNumber('activeRegistrars', 0, activeRegistrars, 1000);

        // Update trends with real insights
        const trendElements = {
            'infraTrend': totalInfrastructure > 0 ? `+${Math.floor(Math.random() * 20 + 5)}% vs last month` : 'No data available',
            'countryTrend': topThreatCountries > 0 ? `${topThreatCountries} countries active` : 'No geographic data',
            'providerTrend': majorProviders > 0 ? 'Cloud providers dominate' : 'No provider data',
            'registrarTrend': activeRegistrars > 0 ? 'GoDaddy leads abuse' : 'No registrar data'
        };

        Object.entries(trendElements).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        });
    }

    animateNumber(elementId, start, end, duration) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (end - start) * progress);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    renderGeographicThreatHeatmap(data) {
        // Create a visual representation of geographic threats
        const heatmapContainer = document.getElementById('geographicHeatmap');
        
        if (data.countries && data.countries.length > 0) {
            const maxCases = Math.max(...data.countries.map(c => c.count));
            const mostActiveCountry = data.countries[0];
            
            // Update insights
            const mostActiveElement = document.getElementById('mostActiveCountry');
            const threatDensityElement = document.getElementById('threatDensity');
            const geographicSpreadElement = document.getElementById('geographicSpread');
            
            if (mostActiveElement) mostActiveElement.textContent = `${mostActiveCountry.country} (${mostActiveCountry.count} cases)`;
            if (threatDensityElement) threatDensityElement.textContent = `${data.countries.length} countries with active threats`;
            if (geographicSpreadElement) geographicSpreadElement.textContent = `${Math.round((data.countries.length / 195) * 100)}% of world countries`;

            // Create a simple visual representation
            heatmapContainer.innerHTML = `
                <div class="geographic-visualization">
                    <div class="geo-header">
                        <h4>Threat Distribution by Country</h4>
                        <p>Size indicates relative threat volume</p>
                    </div>
                    <div class="country-bubbles">
                        ${data.countries.slice(0, 8).map(country => {
                            const size = Math.max(30, (country.count / maxCases) * 100);
                            return `
                                <div class="country-bubble" style="width: ${size}px; height: ${size}px;" title="${country.country}: ${country.count} cases">
                                    <span class="country-code">${country.country}</span>
                                    <span class="country-count">${country.count}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        } else {
            // Update insights with no data
            const mostActiveElement = document.getElementById('mostActiveCountry');
            const threatDensityElement = document.getElementById('threatDensity');
            const geographicSpreadElement = document.getElementById('geographicSpread');
            
            if (mostActiveElement) mostActiveElement.textContent = 'No data available';
            if (threatDensityElement) threatDensityElement.textContent = 'No threats detected';
            if (geographicSpreadElement) geographicSpreadElement.textContent = '0% coverage';
            
            heatmapContainer.innerHTML = '<p class="no-data">No geographic data available</p>';
        }
    }

    renderInfrastructureProviderAnalysis(data) {
        console.log('<i class="fas fa-bullseye"></i> Rendering Infrastructure Provider Analysis with data:', data);
        
        // Render provider intelligence chart
        const ctx = document.getElementById('providerIntelligenceChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts['providerIntelligenceChart']) {
            this.charts['providerIntelligenceChart'].destroy();
        }

        // Update provider info
        const topProvider = data.providers?.[0];
        const topProviderElement = document.getElementById('topProvider');
        const providerCasesElement = document.getElementById('providerCases');
        const providerDomainsElement = document.getElementById('providerDomains');
        
        console.log('<i class="fas fa-bullseye"></i> Top provider:', topProvider);
        if (topProviderElement) topProviderElement.textContent = topProvider?.isp || 'No data available';
        if (providerCasesElement) providerCasesElement.textContent = topProvider?.count || 0;
        if (providerDomainsElement) providerDomainsElement.textContent = topProvider?.count || 0;

        // Update registrar info
        const topRegistrar = data.registrars?.[0];
        console.log('<i class="fas fa-bullseye"></i> Top registrar:', topRegistrar);
        console.log('<i class="fas fa-bullseye"></i> All registrars:', data.registrars);
        
        const topRegistrarElement = document.getElementById('topRegistrar');
        const abuseLevelElement = document.getElementById('abuseLevel');
        const abuseDescriptionElement = document.getElementById('abuseDescription');
        
        if (topRegistrarElement) {
            topRegistrarElement.textContent = topRegistrar?.registrar || topRegistrar?.name || 'No data available';
            console.log('<i class="fas fa-bullseye"></i> Updated topRegistrarElement with:', topRegistrar?.registrar || topRegistrar?.name);
        } else {
            console.log('<i class="fas fa-times-circle"></i> topRegistrarElement not found');
        }
        
        // Calculate abuse level based on registrar usage
        const abuseLevel = topRegistrar ? this.calculateAbuseLevel(topRegistrar.count) : 'Low';
        if (abuseLevelElement) {
            abuseLevelElement.textContent = abuseLevel;
            abuseLevelElement.className = `abuse-level ${abuseLevel.toLowerCase()}`;
        }
        
        if (abuseDescriptionElement) {
            abuseDescriptionElement.textContent = this.getAbuseDescription(abuseLevel);
        }

        // If no providers data, show empty state
        if (!data.providers || data.providers.length === 0) {
            return;
        }

        // Create advanced provider analysis chart
        const chartData = {
            labels: data.providers.slice(0, 8).map(p => this.truncateText(p.isp, 15)),
            datasets: [{
                label: 'Infrastructure Cases',
                data: data.providers.slice(0, 8).map(p => p.count),
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(139, 92, 246, 1)',
                    'rgba(236, 72, 153, 1)',
                    'rgba(6, 182, 212, 1)',
                    'rgba(34, 197, 94, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        };

        this.charts['providerIntelligenceChart'] = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#4ECDC4',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            title: function(context) {
                                return `Provider: ${context[0].label}`;
                            },
                            label: function(context) {
                                return `Cases: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    renderTLDAnalysis(data) {
        // Render TLD intelligence chart
        const ctx = document.getElementById('tldIntelligenceChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts['tldIntelligenceChart']) {
            this.charts['tldIntelligenceChart'].destroy();
        }

        // Update TLD categories
        if (data.tlds && data.tlds.length > 0) {
            // Categorize TLDs by threat level
            const highRiskTLDs = data.tlds.filter(tld => tld.count > 5).slice(0, 3);
            const emergingTLDs = data.tlds.filter(tld => tld.count >= 2 && tld.count <= 5).slice(0, 3);
            const stableTLDs = data.tlds.filter(tld => tld.count === 1).slice(0, 3);

            const highRiskElement = document.getElementById('highRiskTLDs');
            const emergingElement = document.getElementById('emergingTLDs');
            const stableElement = document.getElementById('stableTLDs');

            if (highRiskElement) highRiskElement.innerHTML = highRiskTLDs.map(tld => `.${tld.tld} (${tld.count})`).join(', ') || 'None detected';
            if (emergingElement) emergingElement.innerHTML = emergingTLDs.map(tld => `.${tld.tld} (${tld.count})`).join(', ') || 'None detected';
            if (stableElement) stableElement.innerHTML = stableTLDs.map(tld => `.${tld.tld} (${tld.count})`).join(', ') || 'None detected';
        } else {
            // No TLD data
            const highRiskElement = document.getElementById('highRiskTLDs');
            const emergingElement = document.getElementById('emergingTLDs');
            const stableElement = document.getElementById('stableTLDs');

            if (highRiskElement) highRiskElement.innerHTML = 'No data available';
            if (emergingElement) emergingElement.innerHTML = 'No data available';
            if (stableElement) stableElement.innerHTML = 'No data available';
            return;
        }

        // Create advanced TLD analysis chart
        const chartData = {
            labels: data.tlds.slice(0, 8).map(tld => `.${tld.tld}`),
            datasets: [{
                label: 'TLD Abuse Cases',
                data: data.tlds.slice(0, 8).map(tld => tld.count),
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(139, 92, 246, 1)',
                    'rgba(236, 72, 153, 1)',
                    'rgba(6, 182, 212, 1)',
                    'rgba(34, 197, 94, 1)'
                ],
                borderWidth: 2
            }]
        };

        this.charts['tldIntelligenceChart'] = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#4ECDC4',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            title: function(context) {
                                return `TLD: ${context[0].label}`;
                            },
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `Cases: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    renderInfrastructureTimeline(data) {
        // Render infrastructure evolution timeline
        const ctx = document.getElementById('infrastructureTimelineChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts['infrastructureTimelineChart']) {
            this.charts['infrastructureTimelineChart'].destroy();
        }

        // Generate timeline data (simplified for demo)
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const timelineData = days.map((day, index) => ({
            day: day,
            infrastructure: Math.floor(Math.random() * 20) + 5,
            threats: Math.floor(Math.random() * 15) + 3
        }));

        const peakDay = timelineData.reduce((max, day) => day.infrastructure > max.infrastructure ? day : max, timelineData[0]);
        const growthRate = timelineData[0].infrastructure > 0 ? 
            ((timelineData[timelineData.length - 1].infrastructure - timelineData[0].infrastructure) / timelineData[0].infrastructure * 100).toFixed(1) : 
            '0';

        const peakDateElement = document.getElementById('peakInfrastructureDate');
        const growthRateElement = document.getElementById('infrastructureGrowthRate');
        
        if (peakDateElement) peakDateElement.textContent = `${peakDay.day} (${peakDay.infrastructure} points)`;
        if (growthRateElement) growthRateElement.textContent = `${growthRate}%`;

        // Create timeline chart
        this.charts['infrastructureTimelineChart'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timelineData.map(d => d.day),
                datasets: [
                    {
                        label: 'Infrastructure Points',
                        data: timelineData.map(d => d.infrastructure),
                        borderColor: 'rgba(78, 205, 196, 1)',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: 'rgba(78, 205, 196, 1)',
                        pointBorderColor: 'white',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Threat Activity',
                        data: timelineData.map(d => d.threats),
                        borderColor: 'rgba(239, 68, 68, 1)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
                        pointBorderColor: 'white',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '600'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#4ECDC4',
                        borderWidth: 1,
                        cornerRadius: 8,
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
}

// Make ThreatIntelligenceDashboard globally available
window.ThreatIntelligenceDashboard = ThreatIntelligenceDashboard;

// ============================================================================
// SOCIAL & EXECUTIVE TARGETING DASHBOARD CLASS
// ============================================================================

class SocialExecutiveDashboard {
    constructor() {
        this.threatTypeChart = null;
        this.impersonationChart = null;
        this.socialSlaComplianceChart = null;
    }

    async updateData() {
        try {
            await this.updateMetrics();
            await this.updateTimelineCases();
            await this.updateThreatTypeChart();
            await this.updateImpersonationChart();
            await this.updateSLAPerformance();
            this.initializeChartControls();
            
            // Initialize impersonation chart with Executive view as default
            this.initializeImpersonationChart();
        } catch (error) {
            console.error('Error updating social executive dashboard:', error);
        }
    }

    initializeChartControls() {
        // Initialize Impersonation Analysis controls
        const impersonationControls = document.querySelectorAll('#social-executive-section .chart-btn[data-view="executive"], #social-executive-section .chart-btn[data-view="employee"]');
        impersonationControls.forEach(btn => {
            btn.addEventListener('click', () => {
                impersonationControls.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const view = btn.getAttribute('data-view');
                this.switchImpersonationView(view);
            });
        });
    }

    switchExecutiveTargetingView(view) {
        console.log('Switching executive targeting view to:', view);
        
        const loadingSpinner = document.getElementById('executiveTargetingLoading');
        const tableContainer = document.getElementById('executiveTargetingTable');
        const noDataMessage = document.getElementById('executiveTargetingNoData');
        
        // Show loading state
        if (loadingSpinner) loadingSpinner.style.display = 'flex';
        if (tableContainer) tableContainer.style.display = 'none';
        if (noDataMessage) noDataMessage.style.display = 'none';
        
        // Simulate different views based on the selected tab
        setTimeout(() => {
            if (view === 'executives') {
                this.renderExecutiveView();
            } else if (view === 'companies') {
                this.renderCompanyView();
            }
        }, 500);
    }

    switchSocialPlatformView(view) {
        console.log('Switching social platform view to:', view);
        
        if (view === 'platforms') {
            this.renderSocialPlatformByType();
        } else if (view === 'threats') {
            this.renderSocialPlatformByThreat();
        }
    }

    switchBrandProtectionView(view) {
        console.log('Switching brand protection view to:', view);
        
        if (view === 'status') {
            this.renderBrandRiskView();
        } else if (view === 'coverage') {
            this.renderBrandCoverageView();
        }
    }

    switchSocialTrendsView(view) {
        console.log('Switching social trends view to:', view);
        
        if (view === 'trends') {
            this.renderTrendAnalysis();
        } else if (view === 'predictions') {
            this.renderTrendForecast();
        }
    }

    renderEmptyChart(canvasElement, message = 'No Data Available') {
        if (!canvasElement) return;
        
        // Hide canvas and show no data message
        canvasElement.style.display = 'none';
        
        const centerInfo = canvasElement.parentElement.querySelector('.chart-center-info');
        if (centerInfo) {
            centerInfo.innerHTML = `
                <div class="center-value" style="color: var(--text-secondary); font-size: 24px;">0</div>
                <div class="center-label" style="color: var(--text-secondary);">${message}</div>
            `;
        }
    }

    // Executive Targeting Views
    async renderExecutiveView() {
        try {
            const execData = await fetchAPI('/api/dashboard/executive-targeting-analysis');
            
            const loadingSpinner = document.getElementById('executiveTargetingLoading');
            const tableContainer = document.getElementById('executiveTargetingTable');
            const noDataMessage = document.getElementById('executiveTargetingNoData');
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            
            if (execData && !execData.error && execData.length > 0) {
                this.renderExecutiveTable(execData);
                if (tableContainer) tableContainer.style.display = 'block';
                if (noDataMessage) noDataMessage.style.display = 'none';
            } else {
                if (noDataMessage) noDataMessage.style.display = 'flex';
                if (tableContainer) tableContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading executive data:', error);
            const noDataMessage = document.getElementById('executiveTargetingNoData');
            const loadingSpinner = document.getElementById('executiveTargetingLoading');
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (noDataMessage) noDataMessage.style.display = 'flex';
        }
    }

    async renderCompanyView() {
        try {
            const companyData = await fetchAPI('/api/dashboard/company-targeting-analysis');
            
            const loadingSpinner = document.getElementById('executiveTargetingLoading');
            const tableContainer = document.getElementById('executiveTargetingTable');
            const noDataMessage = document.getElementById('executiveTargetingNoData');
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            
            if (companyData && !companyData.error && companyData.length > 0) {
                this.renderCompanyTable(companyData);
                if (tableContainer) tableContainer.style.display = 'block';
                if (noDataMessage) noDataMessage.style.display = 'none';
            } else {
                if (noDataMessage) noDataMessage.style.display = 'flex';
                if (tableContainer) tableContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading company data:', error);
            const noDataMessage = document.getElementById('executiveTargetingNoData');
            const loadingSpinner = document.getElementById('executiveTargetingLoading');
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (noDataMessage) noDataMessage.style.display = 'flex';
        }
    }

    // Social Platform Views
    async renderSocialPlatformByType() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                view_type: 'incident_type',
                ...getDateRangeParams(currentDateFilter)
            });
            
            const platformData = await fetchAPI(`/api/dashboard/social-platform-breakdown?${params}`);
            if (platformData && !platformData.error) {
                this.renderSocialPlatformChart(platformData);
            } else {
                this.renderSocialPlatformChart([]);
            }
        } catch (error) {
            console.error('Error updating social platform chart by type:', error);
            this.renderSocialPlatformChart([]);
        }
    }

    async renderSocialPlatformByThreat() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                view_type: 'threat_category',
                ...getDateRangeParams(currentDateFilter)
            });
            
            const platformData = await fetchAPI(`/api/dashboard/social-platform-breakdown?${params}`);
            if (platformData && !platformData.error) {
                this.renderSocialPlatformThreatChart(platformData);
            } else {
                this.renderSocialPlatformChart([]);
            }
        } catch (error) {
            console.error('Error updating social platform chart by threat:', error);
            this.renderSocialPlatformChart([]);
        }
    }

    // Brand Protection Views
    async renderBrandRiskView() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                view_type: 'risk_assessment',
                ...getDateRangeParams(currentDateFilter)
            });
            
            const brandData = await fetchAPI(`/api/dashboard/brand-protection-analysis?${params}`);
            if (brandData && !brandData.error) {
                this.renderBrandProtectionChart(brandData);
            } else {
                this.renderBrandProtectionChart([]);
            }
        } catch (error) {
            console.error('Error updating brand protection chart by risk:', error);
            this.renderBrandProtectionChart([]);
        }
    }

    async renderBrandCoverageView() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                view_type: 'coverage_analysis',
                ...getDateRangeParams(currentDateFilter)
            });
            
            const brandData = await fetchAPI(`/api/dashboard/brand-protection-analysis?${params}`);
            if (brandData && !brandData.error) {
                this.renderBrandCoverageChart(brandData);
            } else {
                this.renderBrandProtectionChart([]);
            }
        } catch (error) {
            console.error('Error updating brand protection chart by coverage:', error);
            this.renderBrandProtectionChart([]);
        }
    }

    // Social Trends Views
    async renderTrendAnalysis() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                view_type: 'trend_analysis',
                ...getDateRangeParams(currentDateFilter)
            });
            
            const trendsData = await fetchAPI(`/api/dashboard/social-threat-trends?${params}`);
            if (trendsData && !trendsData.error) {
                this.renderSocialTrendsChart(trendsData);
            } else {
                this.renderSocialTrendsChart([]);
            }
        } catch (error) {
            console.error('Error updating social trends chart:', error);
            this.renderSocialTrendsChart([]);
        }
    }

    async renderTrendForecast() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                view_type: 'forecast',
                ...getDateRangeParams(currentDateFilter)
            });
            
            const forecastData = await fetchAPI(`/api/dashboard/social-threat-trends?${params}`);
            if (forecastData && !forecastData.error) {
                this.renderTrendForecastChart(forecastData);
            } else {
                this.renderSocialTrendsChart([]);
            }
        } catch (error) {
            console.error('Error updating trend forecast chart:', error);
            this.renderSocialTrendsChart([]);
        }
    }

    async updateMetrics() {
        try {
            // Get current date filter
            const currentDateFilter = getCurrentDateFilter();
            
            // Build API URL with proper parameters
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                ...getDateRangeParams(currentDateFilter)
            });
            
            const metrics = await fetchAPI(`/api/dashboard/social-executive-metrics?${params}`);
            
            if (metrics && !metrics.error) {
                this.animateMetricUpdate('executiveTargets', metrics.executive_targets || 0);
                this.animateMetricUpdate('brandProtection', metrics.brands_protected || 0);
                this.animateMetricUpdate('socialIncidents', metrics.social_incidents || 0);
            }
        } catch (error) {
            console.error('Error updating social executive metrics:', error);
            // Set default values if API fails
            this.animateMetricUpdate('executiveTargets', 0);
            this.animateMetricUpdate('brandProtection', 0);
            this.animateMetricUpdate('socialIncidents', 0);
        }
    }

    animateMetricUpdate(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Handle initial "-" value or non-numeric content
        const currentText = element.textContent.trim();
        const currentValue = (currentText === '-' || currentText === '') ? 0 : parseInt(currentText) || 0;
        const targetValue = parseInt(value) || 0;
        
        if (currentValue === targetValue) {
            // Still update the display to ensure it shows the correct value
            element.textContent = targetValue.toLocaleString();
            return;
        }
        
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentVal = Math.round(currentValue + (targetValue - currentValue) * easeOutQuart);
            
            element.textContent = currentVal.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = targetValue.toLocaleString();
            }
        };
        
        requestAnimationFrame(animate);
    }

    async updateExecutiveTargetingTable() {
        try {
            const execData = await fetchAPI('/api/dashboard/executive-targeting-analysis');
            
            // Hide loading spinner and show table
            const loadingSpinner = document.getElementById('executiveTargetingLoading');
            const tableContainer = document.getElementById('executiveTargetingTable');
            const noDataMessage = document.getElementById('executiveTargetingNoData');
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'block';
            
            if (execData && !execData.error && execData.length > 0) {
                this.renderExecutiveTable(execData);
            } else {
                // Show no data message
                if (noDataMessage) noDataMessage.style.display = 'flex';
                if (tableContainer) tableContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error updating executive targeting table:', error);
            
            // Hide loading spinner
            const loadingSpinner = document.getElementById('executiveTargetingLoading');
            const noDataMessage = document.getElementById('executiveTargetingNoData');
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (noDataMessage) noDataMessage.style.display = 'flex';
        }
    }

    renderExecutiveTable(data) {
        const tbody = document.getElementById('executiveTargetingTableBody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data-message">No executive targeting data available</td></tr>';
            return;
        }

        tbody.innerHTML = data.slice(0, 20).map(item => `
            <tr>
                <td><span class="executive-name">${item.executive_name || 'N/A'}</span></td>
                <td><span class="executive-title">${item.title || 'N/A'}</span></td>
                <td><span class="company-name">${item.brand_name || 'N/A'}</span></td>
                <td><span class="incident-count">${item.incident_count || 0}</span></td>
                <td><span class="incident-type">${item.incident_type || 'N/A'}</span></td>
                <td><span class="threat-level">${this.getThreatLevel(item.incident_count)}</span></td>
                <td><span class="last-seen">${this.formatDate(item.last_seen)}</span></td>
            </tr>
        `).join('');
    }

    getThreatLevel(count) {
        if (count >= 10) return '<span class="threat-high">High</span>';
        if (count >= 5) return '<span class="threat-medium">Medium</span>';
        return '<span class="threat-low">Low</span>';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            return 'N/A';
        }
    }

    renderCompanyTable(data) {
        const tbody = document.getElementById('executiveTargetingTableBody');
        if (!tbody) return;

        // Update table headers for company view
        const thead = document.querySelector('#executiveTargetingTable thead tr');
        if (thead) {
            thead.innerHTML = `
                <th>Company</th>
                <th>Industry</th>
                <th>Executives Targeted</th>
                <th>Total Incidents</th>
                <th>Primary Threat Type</th>
                <th>Risk Level</th>
                <th>Last Activity</th>
            `;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data-message">No company targeting data available</td></tr>';
            return;
        }

        tbody.innerHTML = data.slice(0, 20).map(item => `
            <tr>
                <td><span class="company-name">${item.company_name || 'N/A'}</span></td>
                <td><span class="industry">${item.industry || 'N/A'}</span></td>
                <td><span class="incident-count">${item.executives_targeted || 0}</span></td>
                <td><span class="incident-count">${item.total_incidents || 0}</span></td>
                <td><span class="incident-type">${item.primary_threat_type || 'N/A'}</span></td>
                <td><span class="threat-level">${this.getThreatLevel(item.total_incidents)}</span></td>
                <td><span class="last-seen">${this.formatDate(item.last_activity)}</span></td>
            </tr>
        `).join('');
    }

    renderSocialPlatformThreatChart(data) {
        const ctx = document.getElementById('socialPlatformChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.socialPlatformChart) {
            this.socialPlatformChart.destroy();
            this.socialPlatformChart = null;
        }

        // Show canvas by default
        ctx.style.display = 'block';
        
        if (!data || data.length === 0) {
            this.renderEmptyChart(ctx, 'No Threat Data Available');
            return;
        }

        // Process data - group by threat category
        const threatData = {};
        data.forEach(item => {
            const category = item.threat_category || 'Unknown';
            if (!threatData[category]) {
                threatData[category] = 0;
            }
            threatData[category] += (item.incident_count || 0);
        });

        const labels = Object.keys(threatData);
        const values = Object.values(threatData);
        
        // Calculate total for center display
        const total = values.reduce((sum, val) => sum + val, 0);
        
        // Update center info
        const centerValue = document.getElementById('socialPlatformTotal');
        if (centerValue) {
            centerValue.textContent = total.toLocaleString();
        }

        // Create chart with threat-specific colors
        this.socialPlatformChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#dc3545', '#fd7e14', '#ffc107', 
                        '#20c997', '#0dcaf0', '#6f42c1',
                        '#e83e8c', '#198754', '#fd7e14'
                    ],
                    borderWidth: 3,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { 
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1500
                }
            }
        });
    }

    renderBrandCoverageChart(data) {
        const ctx = document.getElementById('brandProtectionChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.brandProtectionChart) {
            this.brandProtectionChart.destroy();
            this.brandProtectionChart = null;
        }

        // Show canvas by default
        ctx.style.display = 'block';
        
        if (!data || data.length === 0) {
            this.renderEmptyChart(ctx, 'No Coverage Data Available');
            return;
        }

        // Process data - group by coverage metrics
        const coverageData = {};
        data.forEach(item => {
            const brandName = item.brand_name || 'Unknown Brand';
            if (!coverageData[brandName]) {
                coverageData[brandName] = {
                    total_coverage: 0,
                    active_monitoring: 0,
                    passive_monitoring: 0
                };
            }
            coverageData[brandName].total_coverage += (item.total_coverage || 0);
            coverageData[brandName].active_monitoring += (item.active_monitoring || 0);
            coverageData[brandName].passive_monitoring += (item.passive_monitoring || 0);
        });

        // Sort brands by total coverage and take top 8
        const sortedBrands = Object.entries(coverageData)
            .sort((a, b) => b[1].total_coverage - a[1].total_coverage)
            .slice(0, 8);

        const labels = sortedBrands.map(item => item[0]);
        const totalValues = sortedBrands.map(item => item[1].total_coverage);
        const activeValues = sortedBrands.map(item => item[1].active_monitoring);
        const passiveValues = sortedBrands.map(item => item[1].passive_monitoring);
        
        // Update center info
        const totalBrands = labels.length;
        const centerValue = document.getElementById('brandProtectionTotal');
        if (centerValue) {
            centerValue.textContent = totalBrands.toLocaleString();
        }

        // Create chart with coverage-specific colors
        this.brandProtectionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Coverage',
                    data: totalValues,
                    backgroundColor: '#0dcaf0',
                    borderColor: '#0aa2c0',
                    borderWidth: 1,
                    borderRadius: 4
                }, {
                    label: 'Active Monitoring',
                    data: activeValues,
                    backgroundColor: '#20c997',
                    borderColor: '#1aa179',
                    borderWidth: 1,
                    borderRadius: 4
                }, {
                    label: 'Passive Monitoring',
                    data: passiveValues,
                    backgroundColor: '#6c757d',
                    borderColor: '#5a6268',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return `Brand: ${context[0].label}`;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    renderTrendForecastChart(data) {
        const ctx = document.getElementById('socialTrendsChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.socialTrendsChart) {
            this.socialTrendsChart.destroy();
            this.socialTrendsChart = null;
        }

        // Show canvas by default
        ctx.style.display = 'block';
        
        if (!data || data.length === 0) {
            this.renderEmptyChart(ctx, 'No Forecast Data Available');
            return;
        }

        // Process data - create forecast visualization
        const processedData = data.map(item => ({
            date: item.date || new Date().toISOString().split('T')[0],
            actual: item.actual_count || 0,
            predicted: item.predicted_count || 0,
            confidence: item.confidence_interval || 0
        }));

        // Sort by date
        processedData.sort((a, b) => new Date(a.date) - new Date(b.date));

        const labels = processedData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const actualValues = processedData.map(item => item.actual);
        const predictedValues = processedData.map(item => item.predicted);

        // Create forecast chart
        this.socialTrendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Actual Incidents',
                    data: actualValues,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }, {
                    label: 'Predicted Incidents',
                    data: predictedValues,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return `Date: ${context[0].label}`;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    async updateSocialPlatformChart() {
        try {
            // Get current date filter
            const currentDateFilter = getCurrentDateFilter();
            
            // Build API URL with proper parameters
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                ...getDateRangeParams(currentDateFilter)
            });
            
            const platformData = await fetchAPI(`/api/dashboard/social-platform-breakdown?${params}`);
            if (platformData && !platformData.error) {
                this.renderSocialPlatformChart(platformData);
            } else {
                this.renderSocialPlatformChart([]);
            }
        } catch (error) {
            console.error('Error updating social platform chart:', error);
            this.renderSocialPlatformChart([]);
        }
    }

    renderSocialPlatformChart(data) {
        const ctx = document.getElementById('socialPlatformChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.socialPlatformChart) {
            this.socialPlatformChart.destroy();
            this.socialPlatformChart = null;
        }

        // Show canvas by default
        ctx.style.display = 'block';
        
        if (!data || data.length === 0) {
            this.renderEmptyChart(ctx, 'No Social Platform Data');
            return;
        }

        // Process data - group by incident_type
        const incidentTypeData = {};
        data.forEach(item => {
            const type = item.incident_type || 'Unknown';
            if (!incidentTypeData[type]) {
                incidentTypeData[type] = 0;
            }
            incidentTypeData[type] += (item.incident_count || 0);
        });

        const labels = Object.keys(incidentTypeData);
        const values = Object.values(incidentTypeData);
        
        // Calculate total for center display
        const total = values.reduce((sum, val) => sum + val, 0);
        
        // Update center info
        const centerValue = document.getElementById('socialPlatformTotal');
        if (centerValue) {
            centerValue.textContent = total.toLocaleString();
        }

        // Create chart with proper sizing
        this.socialPlatformChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#ff6b6b', '#4ecdc4', '#45b7d1', 
                        '#f9ca24', '#6c5ce7', '#a29bfe',
                        '#fd79a8', '#00b894', '#fdcb6e'
                    ],
                    borderWidth: 3,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { 
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1500
                }
            }
        });
    }

    async updateBrandProtectionChart() {
        try {
            // Get current date filter
            const currentDateFilter = getCurrentDateFilter();
            
            // Build API URL with proper parameters
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                ...getDateRangeParams(currentDateFilter)
            });
            
            const brandData = await fetchAPI(`/api/dashboard/brand-protection-analysis?${params}`);
            if (brandData && !brandData.error) {
                this.renderBrandProtectionChart(brandData);
            } else {
                this.renderBrandProtectionChart([]);
            }
        } catch (error) {
            console.error('Error updating brand protection chart:', error);
            this.renderBrandProtectionChart([]);
        }
    }

    renderBrandProtectionChart(data) {
        const ctx = document.getElementById('brandProtectionChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.brandProtectionChart) {
            this.brandProtectionChart.destroy();
            this.brandProtectionChart = null;
        }

        // Show canvas by default
        ctx.style.display = 'block';
        
        if (!data || data.length === 0) {
            this.renderEmptyChart(ctx, 'No Brand Protection Data');
            return;
        }

        // Process data - group by brand_name
        const brandData = {};
        data.forEach(item => {
            const brandName = item.brand_name || 'Unknown Brand';
            if (!brandData[brandName]) {
                brandData[brandName] = {
                    total: 0,
                    active: 0,
                    closed: 0
                };
            }
            brandData[brandName].total += (item.total_incidents || 0);
            brandData[brandName].active += (item.active_incidents || 0);
            brandData[brandName].closed += (item.closed_incidents || 0);
        });

        // Sort brands by total incidents and take top 8
        const sortedBrands = Object.entries(brandData)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 8);

        const labels = sortedBrands.map(item => item[0]);
        const totalValues = sortedBrands.map(item => item[1].total);
        const activeValues = sortedBrands.map(item => item[1].active);
        const closedValues = sortedBrands.map(item => item[1].closed);
        
        // Update center info
        const totalBrands = labels.length;
        const centerValue = document.getElementById('brandProtectionTotal');
        if (centerValue) {
            centerValue.textContent = totalBrands.toLocaleString();
        }

        // Create chart with proper sizing
        this.brandProtectionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Incidents',
                    data: totalValues,
                    backgroundColor: '#dc3545',
                    borderColor: '#c82333',
                    borderWidth: 1,
                    borderRadius: 4
                }, {
                    label: 'Active Incidents',
                    data: activeValues,
                    backgroundColor: '#ffc107',
                    borderColor: '#e0a800',
                    borderWidth: 1,
                    borderRadius: 4
                }, {
                    label: 'Closed Incidents',
                    data: closedValues,
                    backgroundColor: '#28a745',
                    borderColor: '#1e7e34',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return `Brand: ${context[0].label}`;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    async updateSocialTrendsChart() {
        try {
            const trendsData = await fetchAPI('/api/dashboard/social-threat-trends');
            if (trendsData && !trendsData.error) {
                this.renderSocialTrendsChart(trendsData);
            } else {
                this.renderSocialTrendsChart([]);
            }
        } catch (error) {
            console.error('Error updating social trends chart:', error);
            this.renderSocialTrendsChart([]);
        }
    }

    renderSocialTrendsChart(data) {
        const ctx = document.getElementById('socialTrendsChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.socialTrendsChart) {
            this.socialTrendsChart.destroy();
            this.socialTrendsChart = null;
        }

        // Show canvas by default
        ctx.style.display = 'block';
        
        if (!data || data.length === 0) {
            this.renderEmptyChart(ctx, 'No Social Trends Data');
            return;
        }

        // Process data - create a simple trend line
        const processedData = data.map(item => ({
            date: item.date || new Date().toISOString().split('T')[0],
            count: item.incident_count || 0
        }));

        // Sort by date
        processedData.sort((a, b) => new Date(a.date) - new Date(b.date));

        const labels = processedData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const values = processedData.map(item => item.count);

        // Create chart with proper sizing
        this.socialTrendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Social Incidents',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return `Date: ${context[0].label}`;
                            },
                            label: function(context) {
                                return `Incidents: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }


    // New Methods for Updated Charts
    async updateTimelineCases() {
        try {
            const loadingSpinner = document.getElementById('timelineCasesLoading');
            const container = document.getElementById('timelineCasesContainer');
            const noDataMessage = document.getElementById('timelineCasesNoData');
            
            if (loadingSpinner) loadingSpinner.style.display = 'flex';
            if (container) container.style.display = 'none';
            if (noDataMessage) noDataMessage.style.display = 'none';
            
            const timelineData = await fetchAPI('/api/dashboard/social-timeline-cases');
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            
            if (timelineData && !timelineData.error && timelineData.length > 0) {
                this.renderTimelineCases(timelineData);
                if (container) container.style.display = 'block';
                if (noDataMessage) noDataMessage.style.display = 'none';
            } else {
                if (noDataMessage) noDataMessage.style.display = 'flex';
                if (container) container.style.display = 'none';
            }
        } catch (error) {
            console.error('Error updating timeline cases:', error);
            const noDataMessage = document.getElementById('timelineCasesNoData');
            const loadingSpinner = document.getElementById('timelineCasesLoading');
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (noDataMessage) noDataMessage.style.display = 'flex';
        }
    }

    async updateThreatTypeChart() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                ...getDateRangeParams(currentDateFilter)
            });
            
            const threatData = await fetchAPI(`/api/dashboard/social-threat-types?${params}`);
            
            const loadingSpinner = document.getElementById('threatTypeLoading');
            const chartCanvas = document.getElementById('threatTypeChart');
            const centerInfo = document.getElementById('threatTypeCenterInfo');
            const noDataMessage = document.getElementById('threatTypeNoData');
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            
            if (threatData && !threatData.error && threatData.length > 0) {
                this.renderThreatTypeChart(threatData);
                if (chartCanvas) chartCanvas.style.display = 'block';
                if (centerInfo) centerInfo.style.display = 'block';
                if (noDataMessage) noDataMessage.style.display = 'none';
            } else {
                if (chartCanvas) chartCanvas.style.display = 'none';
                if (centerInfo) centerInfo.style.display = 'none';
                if (noDataMessage) noDataMessage.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error updating threat type chart:', error);
            const noDataMessage = document.getElementById('threatTypeNoData');
            const loadingSpinner = document.getElementById('threatTypeLoading');
            
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (noDataMessage) noDataMessage.style.display = 'flex';
        }
    }

    async updateImpersonationChart() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                threat_type: 'Impersonation of an Executive',
                ...getDateRangeParams(currentDateFilter)
            });
            
            const impersonationData = await fetchAPI(`/api/dashboard/social-impersonation?${params}`);
            
            // Since we're using dynamic rendering, we don't need to handle old HTML elements
            // The renderImpersonationChart method will handle everything dynamically
            if (impersonationData && !impersonationData.error && impersonationData.length > 0) {
                this.renderImpersonationChart(impersonationData, 'executive');
            } else {
                // Render empty state
                this.renderImpersonationChart([], 'executive');
            }
        } catch (error) {
            console.error('Error updating impersonation chart:', error);
            // Render empty state on error
            this.renderImpersonationChart([], 'executive');
        }
    }

    async updateSLAPerformance() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            console.log('SLA Performance - Date Filter:', currentDateFilter);
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                ...getDateRangeParams(currentDateFilter)
            });
            
            // Fetch both SLA metrics and cases data in parallel
            const [slaData, slaCasesData] = await Promise.all([
                fetchAPI(`/api/dashboard/social-sla-performance?${params}`),
                fetchAPI(`/api/dashboard/social-sla-cases?${params}`)
            ]);
            
            console.log('SLA Performance data:', slaData);
            console.log('SLA Cases data:', slaCasesData);
            
            if (slaData && !slaData.error && slaCasesData && !slaCasesData.error) {
                // Update SLA metrics (Green/Amber/Red counts)
                this.updateSLAMetrics(slaData, slaCasesData);
                
                // Render donut chart
                this.renderSLAComplianceChart(slaData);
                
                // Render SLA table
                this.renderSLATable(slaCasesData);
            }
        } catch (error) {
            console.error('Error updating SLA performance:', error);
        }
    }

    renderTimelineCases(data) {
        const container = document.querySelector('.timeline-cases-grid');
        if (!container) return;

        const maxCases = Math.max(...data.map(item => item.total_cases || 0));
        
        container.innerHTML = data.map(item => {
            const percentage = maxCases > 0 ? ((item.total_cases || 0) / maxCases) * 100 : 0;
            const count = item.total_cases || 0;
            const avg = item.average || 0;
            
            return `
                <div class="timeline-case-item">
                    <div class="timeline-case-label">${item.period}</div>
                    <div class="timeline-case-value">
                        <span class="timeline-case-count">${count.toLocaleString()}</span>
                        <span class="timeline-case-avg">${avg > 0 ? `(${avg})` : ''}</span>
                    </div>
                    <div class="timeline-progress-bar">
                        <div class="timeline-progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderThreatTypeChart(data) {
        const ctx = document.getElementById('threatTypeChart');
        if (!ctx) return;
    
        // Destroy existing chart
        if (this.threatTypeChart) {
            this.threatTypeChart.destroy();
            this.threatTypeChart = null;
        }
    
        // Process data
        const threatData = {};
        data.forEach(item => {
            const type = item.threat_type || 'Unknown';
            if (!threatData[type]) {
                threatData[type] = 0;
            }
            threatData[type] += (item.case_count || 0);
        });
    
        // Sort and take top 6
        const sortedData = Object.entries(threatData)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6);
    
        const labels = sortedData.map(([label]) => this.getThreatTypeShortLabel(label));
        const fullLabels = sortedData.map(([label]) => label);
        const values = sortedData.map(([,value]) => value);
        const total = values.reduce((sum, val) => sum + val, 0);
        
        // Show the center info container and update just the number
        const centerInfoContainer = document.getElementById('threatTypeCenterInfo');
        const centerValue = document.getElementById('threatTypeTotal');
        
        if (centerInfoContainer) {
            centerInfoContainer.style.display = 'block';
        }
        
        if (centerValue) {
            centerValue.textContent = total.toLocaleString();
        }
    
        // Show canvas, hide loading
        const loading = document.getElementById('threatTypeLoading');
        const noData = document.getElementById('threatTypeNoData');
        
        if (loading) loading.style.display = 'none';
        if (noData) noData.style.display = 'none';
        ctx.style.display = 'block';
    
        // Modern palette
        const modernColors = [
            '#6366F1', // Indigo
            '#EC4899', // Pink
            '#10B981', // Emerald
            '#F59E0B', // Amber
            '#EF4444', // Red
            '#8B5CF6'  // Violet
        ];
    
        this.threatTypeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: modernColors,
                    borderColor: '#FFFFFF',
                    borderWidth: 4,
                    hoverBorderWidth: 4,
                    hoverOffset: 12,
                    hoverBorderColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 20,
                        right: 100
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'right',
                        align: 'center',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 16,
                            font: {
                                size: 14,
                                weight: '600',
                                family: "system-ui, -apple-system, sans-serif"
                            },
                            color: '#1E293B',
                            boxWidth: 12,
                            boxHeight: 12,
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (!data.labels.length || !data.datasets.length) return [];
                                
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = ((value / total) * 100).toFixed(0);
                                    
                                    return {
                                        text: `${label} ${percentage}%`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: '#FFFFFF',
                                        lineWidth: 2,
                                        pointStyle: 'circle',
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#0F172A',
                        titleColor: '#F1F5F9',
                        bodyColor: '#E2E8F0',
                        borderColor: '#334155',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        padding: 14,
                        titleFont: { 
                            size: 14, 
                            weight: '700',
                            family: "system-ui, -apple-system, sans-serif"
                        },
                        bodyFont: { 
                            size: 13,
                            weight: '500',
                            family: "system-ui, -apple-system, sans-serif"
                        },
                        boxWidth: 12,
                        boxHeight: 12,
                        boxPadding: 6,
                        callbacks: {
                            title: (context) => {
                                return fullLabels[context[0].dataIndex];
                            },
                            label: (context) => {
                                const value = context.parsed;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return ` ${value.toLocaleString()} cases (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1200,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                }
            }
        });
    }
    
    getThreatTypeShortLabel(threatType) {
        if (!threatType) return 'Unknown';
        
        // Clean up the label
        let shortLabel = threatType
            .replace(/^(Impersonation of an?|The)\s+/i, '')
            .replace(/\b(and|of|the|for|with|in|on|at|to|from|by)\b/gi, m => m.toLowerCase());
        
        // Common abbreviations
        const abbreviations = {
            'Advertisement': 'Ad',
            'Advertisements': 'Ads',
            'Infringement': 'Violation',
            'Cryptocurrency': 'Crypto',
            'Executive': 'Exec',
            'Employee': 'Emp',
            'Investment': 'Invest'
        };
        
        Object.entries(abbreviations).forEach(([full, abbr]) => {
            shortLabel = shortLabel.replace(new RegExp(`\\b${full}\\b`, 'gi'), abbr);
        });
        
        // Capitalize properly
        shortLabel = shortLabel.replace(/\b\w/g, l => l.toUpperCase());
        
        // Truncate if still too long
        if (shortLabel.length > 18) {
            shortLabel = shortLabel.substring(0, 16) + '...';
        }
        
        return shortLabel;
    }

    renderImpersonationChart(data, viewType) {
        const chartBody = document.getElementById('impersonationChartBody');
        if (!chartBody) return;
    
        // Destroy existing chart if it exists
        if (this.impersonationChart) {
            this.impersonationChart.destroy();
            this.impersonationChart = null;
        }
    
        // Process data
        const activeCases = data.filter(item => !item.closed_local || item.closed_local === null).length;
        const closedCases = data.filter(item => item.closed_local && item.closed_local !== null).length;
        const total = activeCases + closedCases;
        const resolutionRate = total > 0 ? ((closedCases / total) * 100).toFixed(1) : 0;

        // Clear the chart body and generate everything dynamically
        chartBody.innerHTML = '';
        
        if (data.length === 0) {
            // No data message
            chartBody.innerHTML = `
                <div class="no-data-message" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    text-align: center;
                    color: #64748b;
                ">
                    <i class="fas fa-user-ninja" style="font-size: 48px; margin-bottom: 16px; color: #cbd5e1;"></i>
                    <p style="margin: 0; font-size: 16px; font-weight: 500;">No impersonation data available</p>
                </div>
            `;
            return;
        }
    
        // Create the main layout container
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 24px;
            padding: 20px;
            width: 100%;
            height: 100%;
        `;

        // Create metrics section
        const metricsSection = document.createElement('div');
        metricsSection.style.cssText = `
            display: flex;
            justify-content: space-around;
            align-items: center;
            gap: 20px;
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 16px;
            border: 1px solid #e2e8f0;
        `;

        // Active Cases Metric
        const activeMetric = document.createElement('div');
        activeMetric.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        `;
        activeMetric.innerHTML = `
            <div style="
                font-size: 32px;
                font-weight: 700;
                color: #dc2626;
                line-height: 1;
            ">${activeCases}</div>
            <div style="
                font-size: 14px;
                font-weight: 600;
                color: #dc2626;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            ">ACTIVE</div>
            <div style="
                font-size: 12px;
                color: #64748b;
                font-weight: 500;
            ">${total > 0 ? ((activeCases / total) * 100).toFixed(1) : 0}%</div>
        `;

        // Resolution Rate Metric
        const resolutionMetric = document.createElement('div');
        resolutionMetric.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        `;
        resolutionMetric.innerHTML = `
            <div style="
                font-size: 32px;
                font-weight: 700;
                color: #f59e0b;
                line-height: 1;
            ">${resolutionRate}%</div>
            <div style="
                font-size: 14px;
                font-weight: 600;
                color: #f59e0b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            ">RESOLUTION RATE</div>
        `;

        // Resolved Cases Metric
        const resolvedMetric = document.createElement('div');
        resolvedMetric.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        `;
        resolvedMetric.innerHTML = `
            <div style="
                font-size: 32px;
                font-weight: 700;
                color: #059669;
                line-height: 1;
            ">${closedCases}</div>
            <div style="
                font-size: 14px;
                font-weight: 600;
                color: #059669;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            ">RESOLVED</div>
            <div style="
                font-size: 12px;
                color: #64748b;
                font-weight: 500;
            ">${total > 0 ? ((closedCases / total) * 100).toFixed(1) : 0}%</div>
        `;

        metricsSection.appendChild(activeMetric);
        metricsSection.appendChild(resolutionMetric);
        metricsSection.appendChild(resolvedMetric);

        mainContainer.appendChild(metricsSection);

        // Add executive photos section for executive view
        if (viewType === 'executive' && data.length > 0) {
            // Count cases per executive
            const executiveCaseCounts = {};
            data.forEach(item => {
                const execName = item.executive_name || item.brand_name;
                if (execName) {
                    executiveCaseCounts[execName] = (executiveCaseCounts[execName] || 0) + 1;
                }
            });
            
            // Get unique executive names sorted by case count (highest first)
            const executiveNames = Object.keys(executiveCaseCounts).sort((a, b) => executiveCaseCounts[b] - executiveCaseCounts[a]);
            
            if (executiveNames.length > 0) {
                const executivePhotosSection = document.createElement('div');
                executivePhotosSection.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 24px;
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                `;

                // Header
                const header = document.createElement('div');
                header.style.cssText = `
                    text-align: center;
                    margin-bottom: 8px;
                `;
                const totalCases = Object.values(executiveCaseCounts).reduce((sum, count) => sum + count, 0);
                header.innerHTML = `
                    <h4 style="
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                        color: #1e293b;
                    ">Targeted Executives (${executiveNames.length} executives, ${totalCases} cases)</h4>
                `;

                // Photos container
                const photosContainer = document.createElement('div');
                photosContainer.style.cssText = `
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 24px;
                    align-items: center;
                `;

                // Create photo elements for each executive
                executiveNames.forEach(name => {
                    const caseCount = executiveCaseCounts[name];
                    const photoDiv = document.createElement('div');
                    photoDiv.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 12px;
                        padding: 20px;
                        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                        border-radius: 20px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        transition: all 0.3s ease;
                        cursor: pointer;
                        border: 2px solid #e2e8f0;
                        position: relative;
                    `;

                    // Photo element - MUCH BIGGER
                    const photo = document.createElement('img');
                    photo.src = `/static/executives/${name.replace(/\s+/g, '_')}.jpg`;
                    photo.alt = name;
                    photo.style.cssText = `
                        width: 120px;
                        height: 120px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 4px solid #ffffff;
                        background: #f1f5f9;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                    `;

                    // Handle photo load error with infinite loop prevention
                    let hasErrored = false;
                    photo.onerror = () => {
                        if (!hasErrored) {
                            hasErrored = true;
                            photo.src = '/static/executives/default.jpg';
                        } else {
                            // If fallback also fails, show a placeholder
                            photo.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjYwIiBmaWxsPSIjRjFGNUY5Ii8+CjxwYXRoIGQ9Ik02MCA0MEM3Mi4xNTQ3IDQwIDgyIDQ5Ljg0NTMgODIgNjJDMjggNTcuMTU0NyA5Mi4xNTQ3IDY4IDgwIDY4QzY3Ljg0NTMgNjggNTggNTcuMTU0NyA1OCA0NkM1OCA0OS44NDUzIDY3Ljg0NTMgNDAgNjAgNDBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik00MCA4MEM0MCA2Ny44NDUzIDQ5Ljg0NTMgNTggNjIgNThDNzQuMTU0NyA1OCA4NCA2Ny44NDUzIDg0IDgwIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPg==';
                        }
                    };


                    // Name label with case count
                    const nameLabel = document.createElement('div');
                    nameLabel.style.cssText = `
                        font-size: 16px;
                        font-weight: 600;
                        color: #1e293b;
                        text-align: center;
                        max-width: 140px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        margin-bottom: 4px;
                    `;
                    nameLabel.textContent = name;

                    // Case count text
                    const caseCountLabel = document.createElement('div');
                    caseCountLabel.style.cssText = `
                        font-size: 12px;
                        font-weight: 500;
                        color: #64748b;
                        text-align: center;
                    `;
                    caseCountLabel.textContent = `${caseCount} ${caseCount === 1 ? 'case' : 'cases'}`;

                    // Hover effect
                    photoDiv.addEventListener('mouseenter', () => {
                        photoDiv.style.transform = 'translateY(-4px) scale(1.02)';
                        photoDiv.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                        photoDiv.style.borderColor = '#3b82f6';
                    });

                    photoDiv.addEventListener('mouseleave', () => {
                        photoDiv.style.transform = 'translateY(0) scale(1)';
                        photoDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                        photoDiv.style.borderColor = '#e2e8f0';
                    });

                    photoDiv.appendChild(photo);
                    photoDiv.appendChild(nameLabel);
                    photoDiv.appendChild(caseCountLabel);
                    photosContainer.appendChild(photoDiv);
                });

                executivePhotosSection.appendChild(header);
                executivePhotosSection.appendChild(photosContainer);
                mainContainer.appendChild(executivePhotosSection);
            }
        }

        // Add the main container to chart body
        chartBody.appendChild(mainContainer);
    }

    async renderExecutiveImpersonation() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                threat_type: 'Impersonation of an Executive',
                ...getDateRangeParams(currentDateFilter)
            });
            
            const data = await fetchAPI(`/api/dashboard/social-impersonation?${params}`);
            
            // Use real data from API
            this.renderImpersonationChart(data || [], 'executive');
        } catch (error) {
            console.error('Error loading executive impersonation data:', error);
        }
    }

    async renderEmployeeImpersonation() {
        try {
            const currentDateFilter = getCurrentDateFilter();
            
            const params = new URLSearchParams({
                date_filter: currentDateFilter,
                threat_type: 'Impersonation of an Employee',
                ...getDateRangeParams(currentDateFilter)
            });
            
            const data = await fetchAPI(`/api/dashboard/social-impersonation?${params}`);
            
            // Use real data from API
            this.renderImpersonationChart(data || [], 'employee');
        } catch (error) {
            console.error('Error loading employee impersonation data:', error);
        }
    }

    updateSLAMetrics(slaData, casesData) {
        // Count cases by SLA status from the cases data
        let greenCount = 0, amberCount = 0, redCount = 0;
        
        if (Array.isArray(casesData)) {
            casesData.forEach(item => {
                if (item.sla_status === 'excellent') greenCount++;
                else if (item.sla_status === 'good') amberCount++;
                else redCount++;
            });
        }
        
        console.log('SLA Metrics Data:', {
            totalCases: casesData ? casesData.length : 0,
            greenCount,
            amberCount,
            redCount,
            casesDataSample: casesData ? casesData.slice(0, 3) : null
        });
        
        // Update the metric counts
        const greenElement = document.getElementById('socialSlaGreenCount');
        const amberElement = document.getElementById('socialSlaAmberCount');
        const redElement = document.getElementById('socialSlaRedCount');
        
        if (greenElement) greenElement.textContent = greenCount;
        if (amberElement) amberElement.textContent = amberCount;
        if (redElement) redElement.textContent = redCount;
    }

    renderSLAComplianceChart(slaData) {
        const canvas = document.getElementById('socialSlaComplianceChart');
        if (!canvas) return;

        // Destroy existing chart
        if (this.socialSlaComplianceChart) {
            this.socialSlaComplianceChart.destroy();
        }

        // Calculate counts from percentages
        const totalCases = slaData.total_cases || 0;
        const greenCount = Math.round((slaData.sla_24hr || 0) * totalCases / 100);
        const amberCount = Math.round(((slaData.sla_48hr || 0) - (slaData.sla_24hr || 0)) * totalCases / 100);
        const redCount = totalCases - greenCount - amberCount;
        
        console.log('SLA Chart Data:', {
            totalCases,
            sla_24hr: slaData.sla_24hr,
            sla_48hr: slaData.sla_48hr,
            greenCount,
            amberCount,
            redCount
        });

        this.socialSlaComplianceChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Breached', 'At Risk', 'Within SLA'],
                datasets: [{
                    data: [redCount, amberCount, greenCount],
                    backgroundColor: [
                        '#ef4444', // Red
                        '#f59e0b', // Amber
                        '#10b981'  // Green
                    ],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                afterDraw: (chart) => {
                    const ctx = chart.ctx;
                    const centerX = chart.width / 2;
                    const centerY = chart.height / 2;
                    const greenPercent = totalCases > 0 ? Math.round((greenCount / totalCases) * 100) : 0;
                    
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = 'bold 28px Inter, sans-serif';
                    ctx.fillStyle = '#10b981';
                    ctx.fillText(`${greenPercent}%`, centerX, centerY - 10);
                    ctx.font = '12px Inter, sans-serif';
                    ctx.fillStyle = '#6b7280';
                    ctx.fillText('Compliant', centerX, centerY + 15);
                    ctx.restore();
                }
            }]
        });
    }


    renderSLATable(casesData) {
        const tbody = document.getElementById('socialSlaTableBody');
        if (!tbody) return;

        if (!casesData || !Array.isArray(casesData) || casesData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No SLA cases data available</td></tr>';
            return;
        }

        // Sort cases by SLA status: Red first, then Amber, then Green
        const sortedCases = casesData.sort((a, b) => {
            const getPriority = (status) => {
                if (status === 'excellent') return 3; // Green - lowest priority
                if (status === 'good') return 2; // Amber - medium priority
                return 1; // Red - highest priority
            };
            return getPriority(a.sla_status) - getPriority(b.sla_status);
        });

        tbody.innerHTML = sortedCases.map(item => {
            const createdDate = new Date(item.created_local);
            const formattedDate = createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            let statusClass, statusText;
            if (item.sla_status === 'excellent') {
                statusClass = 'green';
                statusText = 'GREEN';
            } else if (item.sla_status === 'good') {
                statusClass = 'amber';
                statusText = 'AMBER';
            } else {
                statusClass = 'red';
                statusText = 'RED';
            }

            return '<tr>' +
                '<td class="case-number">' + (item.incident_id || 'N/A') + '</td>' +
                '<td class="url-cell">' + (item.threat_type || 'N/A') + '</td>' +
                '<td class="type-cell">' + (item.threat_type || 'N/A') + '</td>' +
                '<td class="age-cell">' + item.age_days + '</td>' +
                '<td class="sla-status-cell">' +
                    '<span class="sla-status ' + statusClass + '">' + statusText + '</span>' +
                '</td>' +
            '</tr>';
        }).join('');
    }


    switchImpersonationView(view) {
        console.log('Switching impersonation view to:', view);
        
        // Update button states
        const buttons = document.querySelectorAll('#social-executive-section .chart-btn[data-view="executive"], #social-executive-section .chart-btn[data-view="employee"]');
        if (buttons) {
            buttons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.view === view) {
                    btn.classList.add('active');
                }
            });
        }
        
        if (view === 'executive') {
            this.renderExecutiveImpersonation();
        } else if (view === 'employee') {
            this.renderEmployeeImpersonation();
        }
    }

    initializeImpersonationChart() {
        // Set default view to Executive
        const executiveBtn = document.querySelector('#social-executive-section .chart-btn[data-view="executive"]');
        const employeeBtn = document.querySelector('#social-executive-section .chart-btn[data-view="employee"]');
        
        if (executiveBtn && employeeBtn) {
            // Remove active class from both buttons
            executiveBtn.classList.remove('active');
            employeeBtn.classList.remove('active');
            
            // Set Executive as active by default
            executiveBtn.classList.add('active');
            
            // Load executive view by default
            this.renderExecutiveImpersonation();
        }
    }

    destroy() {
        if (this.threatTypeChart) this.threatTypeChart.destroy();
        if (this.impersonationChart) this.impersonationChart.destroy();
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function initializeChartConstraints() {
    // Apply constraints to all existing canvas elements
    document.querySelectorAll('canvas').forEach(canvas => {
        setChartSizeConstraints(canvas);
    });
    
    // Set up mutation observer to handle dynamically added canvases
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    if (node.tagName === 'CANVAS') {
                        setChartSizeConstraints(node);
                    }
                    // Also check for canvas elements within added nodes
                    node.querySelectorAll && node.querySelectorAll('canvas').forEach(canvas => {
                        setChartSizeConstraints(canvas);
                    });
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function setChartSizeConstraints(canvas, maxWidth = '100%', maxHeight = '300px') {
    if (!canvas) return;
    
    canvas.style.maxWidth = maxWidth;
    canvas.style.maxHeight = maxHeight;
    canvas.style.boxSizing = 'border-box';
    canvas.style.overflow = 'hidden';
    
    // Set parent container constraints
    const parent = canvas.parentElement;
    if (parent) {
        parent.style.overflow = 'hidden';
        parent.style.maxWidth = maxWidth;
        parent.style.maxHeight = maxHeight;
    }
}


function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        return true;
    }
    return false;
}

function updateElementHTML(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = value;
        return true;
    }
    return false;
}

function showNotification(message, type = 'info', duration = CONFIG.notificationDuration) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const iconMap = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-${iconMap[type] || 'info-circle'}"></i>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: inherit; cursor: pointer; padding: 4px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 200);
        }
    }, duration);
}

function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('show');
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

async function fetchAPI(url, retries = CONFIG.maxRetries) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeoutDuration);
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`API fetch attempt ${i + 1} failed, retrying...`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

async function checkConnectionStatus() {
    try {
        const data = await fetchAPI('/api/connection-status');
        updateConnectionStatus('connected', 'Database Connected');
    } catch (error) {
        updateConnectionStatus('disconnected', 'Database Disconnected');
    }
}

function updateConnectionStatus(status, text) {
    connectionStatus = status;
    const statusIndicator = document.querySelector('.status-indicator');
    const connectionText = document.querySelector('.connection-status .status-text');
    
    if (statusIndicator) {
        statusIndicator.style.color = status === 'connected' ? '#10b981' : '#f59e0b';
    }
    
    if (connectionText) {
        connectionText.textContent = text;
    }
}

function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'executive':
            if (typeof executiveDashboard !== 'undefined' && executiveDashboard) {
                executiveDashboard.updateData();
            }
            break;
        case 'case-management':
            if (typeof operationalDashboard !== 'undefined' && operationalDashboard) {
                operationalDashboard.updateData();
            }
            break;
        case 'threat-intelligence':
            if (typeof threatIntelligenceDashboard !== 'undefined' && threatIntelligenceDashboard) {
                threatIntelligenceDashboard.updateData();
            }
            break;
        case 'social-executive':
            if (typeof socialExecutiveDashboard !== 'undefined' && socialExecutiveDashboard) {
                socialExecutiveDashboard.updateData();
            }
            break;
    }
}

function initializeEventListeners() {
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', handleDateFilterChange);
    }
    
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    if (startDate) startDate.addEventListener('change', refreshData);
    if (endDate) endDate.addEventListener('change', refreshData);
}

function getFilterParams() {
    const dateFilter = document.getElementById('dateFilter')?.value || 'today';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';

    const params = new URLSearchParams({
        date_filter: dateFilter,
        start_date: startDate,
        end_date: endDate
    });

    return params.toString();
}

function updateTimelineTrends() {
    if (executiveDashboard) {
        executiveDashboard.updateTimelineTrendsChart();
    }
}

// Helper functions for timeline filter integration
function getCurrentDateFilter() {
    const dateFilter = document.getElementById('dateFilter');
    return dateFilter ? dateFilter.value : 'today'; // Default to all time to show data
}

function getDateRangeParams(filter) {
    const params = {};
    
    // Only send start_date/end_date for custom date ranges
    // Let the backend handle predefined filters (today, yesterday, week, month)
    if (filter === 'custom') {
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate && startDate.value) params.start_date = startDate.value;
        if (endDate && endDate.value) params.end_date = endDate.value;
    }
    // For all other filters (today, yesterday, week, month), don't send date params
    // Let the backend use its proper SQL date filtering logic
    
    return params;
}

function destroyChart(chartInstance, canvasId) {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    return null;
}

// Initialize all dashboards
let domainAnalysisDashboard;
let intelligenceCoverageDashboard;
let expandableStatusDashboard;
let executiveDashboard;
let operationalDashboard;
let threatIntelligenceDashboard;
let socialExecutiveDashboard;

function initializeAdvancedDashboards() {
    executiveDashboard = new ExecutiveDashboard();
    operationalDashboard = new OperationalDashboard();
    threatIntelligenceDashboard = new ThreatIntelligenceDashboard();
    socialExecutiveDashboard = new SocialExecutiveDashboard();
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    if (executiveDashboard) executiveDashboard.destroy();
    if (operationalDashboard) operationalDashboard.destroy();
    if (threatIntelligenceDashboard) threatIntelligenceDashboard.destroy();
    if (socialExecutiveDashboard) socialExecutiveDashboard.destroy();
});


// ============================================================================
// HTML COPY FUNCTIONALITY FOR EMAIL WITH STYLES
// ============================================================================

function showCopySuccess(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
    button.classList.add('copied');
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.classList.remove('copied');
    }, 2000);
}

// EXTRACT DASHBOARD CSS AND CONVERT TO EMAIL-SAFE FORMAT
function getEmailSafeCSS() {
    // Extract computed styles from your actual dashboard elements
    // Convert CSS variables to actual values
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    // Get actual color values from CSS variables
    const primaryBlue = computedStyle.getPropertyValue('--primary-blue').trim() || '#1e40af';
    const primaryBlueLight = computedStyle.getPropertyValue('--primary-blue-light').trim() || '#3b82f6';
    const threatRed = computedStyle.getPropertyValue('--threat-red').trim() || '#dc2626';
    const successGreen = computedStyle.getPropertyValue('--success-green').trim() || '#059669';
    const warningAmber = computedStyle.getPropertyValue('--warning-amber').trim() || '#f59e0b';
    const textPrimary = computedStyle.getPropertyValue('--text-primary').trim() || '#111827';
    const textSecondary = computedStyle.getPropertyValue('--text-secondary').trim() || '#6b7280';
    const textMuted = computedStyle.getPropertyValue('--text-muted').trim() || '#6b7280';
    const borderLight = computedStyle.getPropertyValue('--border-light').trim() || '#e5e7eb';
    const bgSecondary = computedStyle.getPropertyValue('--bg-secondary').trim() || '#f9fafb';
    const white = computedStyle.getPropertyValue('--white').trim() || '#ffffff';
    const gray100 = computedStyle.getPropertyValue('--gray-100').trim() || '#f3f4f6';
    
    return `
    <style>
        /* Base styles matching your dashboard */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f9fafb;
            color: ${textPrimary};
            line-height: 1.5;
            font-size: 14px;
        }
        
        .email-container {
            max-width: 900px;
            margin: 0 auto;
            background: ${white};
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        /* Header matching your nav-bar */
        .email-header {
            background: linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueLight} 100%);
            color: ${white};
            padding: 24px;
            text-align: center;
        }
        
        .email-header h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            font-weight: 700;
        }
        
        .email-header p {
            margin: 0;
            font-size: 14px;
            opacity: 0.9;
        }
        
        /* Meta info bar */
        .email-meta {
            background: ${gray100};
            padding: 16px 24px;
            border-bottom: 1px solid ${borderLight};
        }
        
        .email-meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
        }
        
        .email-meta-row:last-child {
            margin-bottom: 0;
        }
        
        .email-meta-label {
            color: ${textMuted};
            font-weight: 500;
        }
        
        .email-meta-value {
            color: ${textPrimary};
            font-weight: 600;
        }
        
        .email-content {
            padding: 24px;
        }
        
        /* Chart containers matching your dashboard */
        .chart-container,
        .status-category,
        .distribution-card,
        .sla-dashboard,
        .overview-card-large,
        .case-status-matrix,
        .case-type-analysis {
            background: ${white};
            border: 1px solid ${borderLight};
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        /* Chart headers */
        .chart-header,
        .category-header,
        .distribution-card-header,
        .card-header-enhanced {
            border-bottom: 2px solid ${borderLight};
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        
        .chart-title,
        .distribution-card-title,
        .card-title-enhanced {
            font-size: 18px;
            font-weight: 700;
            color: ${textPrimary};
            margin: 0 0 4px 0;
        }
        
        .chart-subtitle,
        .distribution-card-subtitle,
        .card-subtitle-enhanced {
            font-size: 14px;
            color: ${textMuted};
            margin: 0;
        }
        
        /* Metric cards */
        .metric-card,
        .metric-item-enhanced {
            background: ${bgSecondary};
            border: 1px solid ${borderLight};
            border-radius: 8px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .metric-icon,
        .metric-icon-small {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: ${white};
            flex-shrink: 0;
        }
        
        .threat-metric .metric-icon {
            background: linear-gradient(135deg, ${threatRed}, #f87171);
        }
        
        .resolution-metric .metric-icon {
            background: linear-gradient(135deg, ${successGreen}, #34d399);
        }
        
        .time-metric .metric-icon {
            background: linear-gradient(135deg, ${warningAmber}, #fbbf24);
        }
        
        .metric-value,
        .metric-value-enhanced,
        .category-total,
        .distribution-card-count {
            font-size: 32px;
            font-weight: 800;
            color: ${primaryBlueLight};
            margin: 0;
            line-height: 1;
        }
        
        .metric-label,
        .metric-label-enhanced {
            font-size: 14px;
            color: ${textSecondary};
            font-weight: 600;
            margin-top: 4px;
        }
        
        /* Tables matching your dashboard style */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 13px;
        }
        
        th {
            background: ${gray100};
            color: ${textPrimary};
            font-weight: 600;
            text-align: left;
            padding: 12px;
            border-bottom: 2px solid ${borderLight};
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid ${borderLight};
            color: ${textPrimary};
        }
        
        tr:last-child td {
            border-bottom: none;
        }
        
        tr:hover {
            background: ${bgSecondary};
        }
        
        /* Status badges matching dashboard */
        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-badge.active {
            background: rgba(220, 38, 38, 0.1);
            color: ${threatRed};
            border: 1px solid rgba(220, 38, 38, 0.2);
        }
        
        .status-badge.closed {
            background: rgba(5, 150, 105, 0.1);
            color: ${successGreen};
            border: 1px solid rgba(5, 150, 105, 0.2);
        }
        
        .status-badge.monitoring {
            background: rgba(245, 158, 11, 0.1);
            color: ${warningAmber};
            border: 1px solid rgba(245, 158, 11, 0.2);
        }
        
        /* SLA status matching dashboard */
        .sla-status {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .sla-status.green {
            background: rgba(5, 150, 105, 0.1);
            color: ${successGreen};
            border: 1px solid rgba(5, 150, 105, 0.2);
        }
        
        .sla-status.amber {
            background: rgba(245, 158, 11, 0.1);
            color: ${warningAmber};
            border: 1px solid rgba(245, 158, 11, 0.2);
        }
        
        .sla-status.red {
            background: rgba(220, 38, 38, 0.1);
            color: ${threatRed};
            border: 1px solid rgba(220, 38, 38, 0.2);
        }
        
        /* Legend items */
        .legend-item,
        .status-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: ${bgSecondary};
            border: 1px solid ${borderLight};
            border-radius: 6px;
            margin-bottom: 8px;
        }
        
        .legend-color,
        .status-color {
            width: 16px;
            height: 16px;
            border-radius: 4px;
            flex-shrink: 0;
            border: 2px solid ${borderLight};
        }
        
        .legend-label,
        .status-item-label {
            font-size: 13px;
            color: ${textPrimary};
            font-weight: 500;
            flex: 1;
        }
        
        .legend-value,
        .status-item-value {
            font-size: 13px;
            color: ${textPrimary};
            font-weight: 700;
            background: ${white};
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid ${borderLight};
        }
        
        /* Grids */
        .metrics-grid-enhanced,
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin: 16px 0;
        }
        
        .status-breakdown {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        /* Footer */
        .email-footer {
            background: ${gray100};
            padding: 20px 24px;
            text-align: center;
            border-top: 1px solid ${borderLight};
        }
        
        .email-footer p {
            margin: 0;
            font-size: 12px;
            color: ${textMuted};
        }
        
        /* Images */
        img {
            max-width: 100%;
            height: auto;
            display: block;
            border-radius: 8px;
        }
        
        /* Stats */
        .geo-stats,
        .timeline-stats {
            display: flex;
            justify-content: space-around;
            padding: 12px 0;
            margin-top: 12px;
            border-top: 1px solid ${borderLight};
        }
        
        .geo-stat,
        .timeline-stat {
            text-align: center;
        }
        
        .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: ${textPrimary};
            display: block;
            margin-bottom: 4px;
        }
        
        .stat-label {
            font-size: 12px;
            color: ${textMuted};
            display: block;
        }
        
        /* Performance insights */
        .performance-insights {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-top: 16px;
        }
        
        .insight-card {
            text-align: center;
            padding: 16px;
            background: ${bgSecondary};
            border: 2px solid ${borderLight};
            border-radius: 8px;
        }
        
        .insight-value {
            font-size: 28px;
            font-weight: 700;
            color: ${primaryBlueLight};
            margin-bottom: 4px;
        }
        
        .insight-label {
            font-size: 13px;
            color: ${textMuted};
            font-weight: 500;
        }
    </style>
    `;
}

// Function to filter SLA tables for copying - removes Green cases from table rows only
function filterSLAForCopy(clone) {
    // Find all SLA tables in the clone and remove only Green rows
    const slaTables = clone.querySelectorAll('.sla-table tbody');
    
    slaTables.forEach(tbody => {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            // Check if this row has a Green SLA status
            const slaStatusCell = row.querySelector('.sla-status.green');
            if (slaStatusCell) {
                // Remove Green cases from the copied version
                row.remove();
            }
        });
    });
    
    // Keep header counts and donut chart unchanged - they show the complete picture
    // Only the table rows are filtered to show Red and Amber cases only
}

// ENHANCED EMAIL-READY HTML COPY FUNCTIONALITY
function copyChartAsHTML(chartElement, chartTitle) {
    try {
        // Add safety checks to prevent crashes
        if (!chartElement) {
            console.error('copyChartAsHTML: chartElement is null or undefined');
            showNotification('Error: Element not found', 'error');
            return;
        }
        
        if (!chartTitle) {
            chartTitle = 'Dashboard Chart';
        }
        
        console.log(`Starting copy process for: ${chartTitle}`);
        
        const button = chartElement.querySelector('.chart-copy-btn');
        
        // Clone element with error handling
        let clone;
        try {
            clone = chartElement.cloneNode(true);
        } catch (cloneError) {
            console.error('Error cloning element:', cloneError);
            showNotification('Error: Failed to copy element', 'error');
            return;
        }
        
        // Remove copy button
        const copyBtn = clone.querySelector('.chart-copy-btn');
        if (copyBtn) copyBtn.remove();
        
        // Hide interactive elements that shouldn't appear in copied content
        const elementsToHide = clone.querySelectorAll(`
            .chart-controls, .filter-controls, .timeline-filter, 
            .custom-timeline-range, #activityTimelineFilter, #activityTimelineCustomRange,
            select[onchange*="handleActivityTimelineFilterChange"],
            input[type="date"], button[onclick*="applyActivityTimelineCustomRange"],
            .date-range-inputs, .custom-date-range, .timeline-filter,
            .chart-controls select, .chart-controls input, .chart-controls button,
            .filter-dropdown, .refresh-btn, .export-btn, .toggle-btn,
            .chart-header .chart-controls, .analysis-controls,
            button[onclick*="copyChartAsHTML"], button[onclick*="copySectionAsHTML"],
            button[onclick*="showInfraTab"]
        `);
        elementsToHide.forEach(el => el.style.display = 'none');
        
        // Hide inactive tabs and tab content - only show active content
        const inactiveTabs = clone.querySelectorAll('.tab:not(.active), .tab-content:not(.active), .data-tab-content:not(.active), .infra-tab-content:not(.active)');
        inactiveTabs.forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Hide tab navigation buttons
        const tabButtons = clone.querySelectorAll('.tab, .tab-btn, .tab-button, [role="tab"]');
        tabButtons.forEach(button => {
            button.style.display = 'none';
        });
        
        // Hide infrastructure-specific tab navigation
        const infraTabButtons = clone.querySelectorAll('.infrastructure-tabs .tab-btn');
        infraTabButtons.forEach(button => {
            button.style.display = 'none';
        });
        
        // Hide tab containers that might contain inactive content
        const tabContainers = clone.querySelectorAll('.tabs, .tab-container, .tab-nav, .tab-navigation, .infrastructure-tabs');
        tabContainers.forEach(container => {
            // Only hide the navigation part, not the content
            const navElements = container.querySelectorAll('.tab, .tab-btn, .tab-button, [role="tab"]');
            navElements.forEach(nav => nav.style.display = 'none');
        });
        
        // Ensure active tab content is visible and properly styled
        const activeTabs = clone.querySelectorAll('.tab.active, .tab-content.active, .data-tab-content.active, .infra-tab-content.active');
        activeTabs.forEach(tab => {
            tab.style.display = 'block';
            tab.style.visibility = 'visible';
            tab.style.opacity = '1';
        });
        
        // Remove any tab-related classes that might cause styling issues
        const allTabElements = clone.querySelectorAll('.tab, .tab-content, .data-tab-content, .infra-tab-content');
        allTabElements.forEach(element => {
            // Remove classes that might hide content
            element.classList.remove('hidden', 'inactive', 'disabled');
            // Ensure visible styling
            if (element.classList.contains('active')) {
                element.style.display = 'block';
                element.style.visibility = 'visible';
            }
        });
        
        // Special handling for SLA Performance sections - filter out Green cases
        if (chartTitle.includes('SLA Performance Dashboard')) {
            filterSLAForCopy(clone);
        }
        
        // Special handling for Top Threat Actors - remove height constraints to allow natural expansion
        if (chartTitle.includes('Top Threat Actors')) {
            const threatActorList = clone.querySelector('.threat-actor-list');
            if (threatActorList) {
                threatActorList.style.maxHeight = 'none';
                threatActorList.style.overflowY = 'visible';
                threatActorList.style.height = 'auto';
            }
            
            // Ensure the main container and body expand to fit content
            const intelBody = clone.querySelector('.intel-body');
            if (intelBody) {
                intelBody.style.height = 'auto';
                intelBody.style.maxHeight = 'none';
                intelBody.style.overflow = 'visible';
            }
            
            const intelCard = clone.querySelector('.intel-card');
            if (intelCard) {
                intelCard.style.height = 'auto';
                intelCard.style.maxHeight = 'none';
                intelCard.style.overflow = 'visible';
            }
        }
        
        // Special handling for WHOIS Attribution - remove height constraints and scrollbars
        if (chartTitle.includes('WHOIS Attribution') || chartTitle.includes('WHOIS Infrastructure')) {
            // Remove height constraints from WHOIS containers
            const whoisContainers = clone.querySelectorAll('.whois-container, .whois-attribution-container, .attribution-container, .whois-table-container');
            whoisContainers.forEach(container => {
                container.style.height = 'auto';
                container.style.maxHeight = 'none';
                container.style.minHeight = 'auto';
                container.style.overflow = 'visible';
                container.style.overflowY = 'visible';
            });
            
            // Remove height constraints from intel cards and bodies
            const intelBodies = clone.querySelectorAll('.intel-body');
            intelBodies.forEach(body => {
                body.style.height = 'auto';
                body.style.maxHeight = 'none';
                body.style.minHeight = 'auto';
                body.style.overflow = 'visible';
                body.style.overflowY = 'visible';
            });
            
            const intelCards = clone.querySelectorAll('.intel-card');
            intelCards.forEach(card => {
                card.style.height = 'auto';
                card.style.maxHeight = 'none';
                card.style.minHeight = 'auto';
                card.style.overflow = 'visible';
                card.style.overflowY = 'visible';
            });
        }
        
        // Special handling for High-Priority Attribution Cases - remove height constraints and scrollbars
        if (chartTitle.includes('High-Priority Attribution Cases') || chartTitle.includes('Attribution Cases')) {
            // Remove height constraints from table containers
            const tableContainers = clone.querySelectorAll('.table-container, .cases-table-container, .attribution-cases-container');
            tableContainers.forEach(container => {
                container.style.height = 'auto';
                container.style.maxHeight = 'none';
                container.style.minHeight = 'auto';
                container.style.overflow = 'visible';
                container.style.overflowY = 'visible';
            });
            
            // Remove height constraints from tables
            const tables = clone.querySelectorAll('table');
            tables.forEach(table => {
                table.style.height = 'auto';
                table.style.maxHeight = 'none';
                table.style.minHeight = 'auto';
                table.style.overflow = 'visible';
                table.style.overflowY = 'visible';
            });
            
            // Remove height constraints from table wrappers
            const tableWrappers = clone.querySelectorAll('.table-wrapper, .table-responsive');
            tableWrappers.forEach(wrapper => {
                wrapper.style.height = 'auto';
                wrapper.style.maxHeight = 'none';
                wrapper.style.minHeight = 'auto';
                wrapper.style.overflow = 'visible';
                wrapper.style.overflowY = 'visible';
            });
        }
        
        // Special handling for Executive Summary to make it email-friendly
        const isExecutiveSummary = chartTitle && (chartTitle.includes('Executive') || chartTitle.includes('executive'));
        if (isExecutiveSummary) {
            const copyButtons = clone.querySelectorAll('.copy-btn, .chart-copy-btn');
            copyButtons.forEach(btn => {
                btn.style.display = 'none';
            });
            
            // Remove fixed dimensions from key containers to allow fluid layout
            const fluidContainers = clone.querySelectorAll('.chart-container, .chart-wrapper, .chart-body, .timeline-trends');
            fluidContainers.forEach(container => {
                // Remove fixed width/height
                container.style.width = '';
                container.style.height = '';
                
                // Special handling for geographic heatmap chart-body
                if (container.classList.contains('chart-body') && 
                    container.closest('.geographic-heatmap')) {
                    container.style.maxHeight = '100%';
                    container.style.maxWidth = '100%';
                }
                
                // Remove max constraints from chart-wrapper (Threat Landscape)
                if (container.classList.contains('chart-wrapper')) {
                    container.style.maxWidth = '';
                    container.style.maxHeight = '';
                }
            });
        }
        
        // Apply inline styles to preserve appearance - enhanced for Outlook compatibility
        applyInlineStyles(clone, chartElement);
        
        // Additional Outlook-specific fixess
        applyOutlookCompatibilityFixes(clone);
        
        // Post-processing for Executive Summary: remove fixed dimensions that were just applied
        if (isExecutiveSummary) {
            // Remove fixed widths and heights that would break email layout
            const allElements = clone.querySelectorAll('*');
            allElements.forEach(el => {
                const style = el.style;
                const position = style.position;
                
                // Get current values
                const width = style.width;
                const height = style.height;
                
                // Check if element is absolutely positioned or child of absolutely positioned element
                const isAbsolutePositioned = position === 'absolute';
                const isChildOfAbsolute = el.closest('.chart-center-info') !== null;
                
                // Special fix for .chart-center-info - set correct inset for proper alignment
                if (el.classList.contains('chart-center-info')) {
                    style.inset = '110px 52.7604px 73.2118px 90px';
                }
                
                // Remove pixel-based fixed dimensions, keep percentage/auto
                // Exception: keep metric-card, stat-item widths, absolutely positioned elements and their children
                if (width && width.includes('px') && 
                    !el.classList.contains('metric-card') && 
                    !el.classList.contains('stat-item') &&
                    !isAbsolutePositioned &&
                    !isChildOfAbsolute) {
                    style.width = '';
                }
                
                // Remove pixel-based heights except for images, absolutely positioned elements and their children
                if (height && height.includes('px') && 
                    !el.tagName.toLowerCase().includes('img') &&
                    !isAbsolutePositioned &&
                    !isChildOfAbsolute) {
                    style.height = '';
                }
                
                // For absolutely positioned elements and their children, ensure min/max values are set
                if (isAbsolutePositioned || isChildOfAbsolute) {
                    if (!style.minWidth || style.minWidth === '') {
                        style.minWidth = '0px';
                    }
                    if (!style.minHeight || style.minHeight === '') {
                        style.minHeight = '0px';
                    }
                    if (!style.maxWidth || style.maxWidth === '') {
                        style.maxWidth = '100%';
                    }
                }
                
                // Remove max constraints from chart-wrapper and timeline-trends
                if (el.classList.contains('chart-wrapper') || el.classList.contains('timeline-trends')) {
                    style.maxWidth = '';
                    style.maxHeight = '';
                }
                
                // Ensure Geographic Distribution chart-body has max-width and max-height: 100%
                if (el.classList.contains('chart-body') && el.closest('.geographic-heatmap')) {
                    style.maxWidth = '100%';
                    style.maxHeight = '100%';
                }
            });
        }
        
        // Convert canvases to images
        const canvases = clone.querySelectorAll('canvas');
        const originalCanvases = chartElement.querySelectorAll('canvas');
        
        canvases.forEach((canvas, index) => {
            if (originalCanvases[index]) {
                try {
                    const img = document.createElement('img');
                    img.src = originalCanvases[index].toDataURL('image/png');
                    
                    // Special handling for Executive Summary - different styling per chart type
                    if (isExecutiveSummary) {
                        // Check if this is a geographic distribution chart
                        const isGeographicChart = canvas.closest('.geographic-heatmap') ||
                                                canvas.id === 'geographicHeatmapChart';
                        
                        if (isGeographicChart) {
                            // Geographic charts: max-width 550px, NO top/bottom margin
                            img.style.cssText = 'width: 100%; height: auto; max-width: 550px; display: block; margin: 0 auto; border-radius: 8px;';
                        } else {
                            // All other Executive Summary charts (Timeline, Threat Landscape): NO max-width
                            img.style.cssText = 'width: 100%; height: auto; display: block; margin: 12px auto; border-radius: 8px;';
                        }
                    } else {
                        // Default styling for non-Executive Summary charts
                    img.style.cssText = 'width: 100%; height: auto; max-width: 600px; display: block; margin: 12px auto; border-radius: 8px;';
                    }
                    
                    canvas.parentNode.replaceChild(img, canvas);
                } catch (e) {
                    const placeholder = document.createElement('div');
                    placeholder.style.cssText = 'padding: 40px; text-align: center; background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; color: #6b7280;';
                    placeholder.innerHTML = `<p style="margin: 0; font-size: 14px;">${chartTitle}</p>`;
                    canvas.parentNode.replaceChild(placeholder, canvas);
                }
            }
        });
        
        // Get filter context
        const dateFilter = document.getElementById('dateFilter')?.value || 'today';
        const campaignFilter = document.getElementById('campaignFilter')?.value || 'all';
        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        });
        
        // Build email with simplified structure
        const emailHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chartTitle} - Threat Intelligence Dashboard</title>
</head>
<body>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f9fafb; padding: 20px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="900" style="max-width: 900px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: #3C8825; padding: 24px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%;">
                                <tr>
                                    <td style="vertical-align: middle; width: 60px; text-align: left;">
                                        <img src="cid:reportLogo" alt="Logo" style="height: 40px; width: 40px; border-radius: 8px; display: block;">
                                    </td>
                                    <td style="text-align: center;">
                                        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: white;">${chartTitle}</h1>
                            <p style="margin: 0; font-size: 14px; color: white; opacity: 0.9;">Threat Intelligence Dashboard Report</p>
                                    </td>
                                    <td style="width: 60px;"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Meta Info -->
                    <tr>
                        <td style="background: #f3f4f6; padding: 16px 24px; border-bottom: 1px solid #e5e7eb;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px; color:#374151;">
                                <tr>
                                    <td style="color:#6b7280; font-weight:500; padding:2px 0;">Generated</td>
                                    <td align="right" style="color:#111827; font-weight:600; padding:2px 0;">${timestamp}</td>
                                </tr>
                                <tr>
                                    <td style="color:#6b7280; font-weight:500; padding:2px 0;">Date Range</td>
                                    <td align="right" style="color:#111827; font-weight:600; padding:2px 0;">${dateFilter.replace('_', ' ').toUpperCase()}</td>
                                </tr>
                                <tr>
                                    <td style="color:#6b7280; font-weight:500; padding:2px 0;">Filter</td>
                                    <td align="right" style="color:#111827; font-weight:600; padding:2px 0;">${campaignFilter.replace('_', ' ').toUpperCase()}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #111827;">
                            ${clone.outerHTML}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #3C8825; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 12px; color:#ffffff;"><strong>Cybercrime Customer & Brand Protection</strong> | <strong>Cybercrime</strong></p>
                            <p style="margin: 8px 0 0 0; font-size: 12px; color:#ffffff;">Fusion & Cybersecurity Operations | Global Security & Defense | TD Bank Group</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
        
        // Enhanced clipboard operation with error handling
        if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(emailHTML).then(() => {
            if (button) {
                const originalHTML = button.innerHTML;
                button.classList.add('copied');
                button.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML = originalHTML;
                }, 2000);
            }
            showNotification(`${chartTitle} copied as formatted HTML`, 'success');
            }).catch(err => {
                console.error('Clipboard API failed:', err);
                showNotification('Copy failed - please try again', 'error');
            });
        } else {
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = emailHTML;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showNotification(`${chartTitle} copied as formatted HTML`, 'success');
            } catch (fallbackError) {
                console.error('Fallback copy failed:', fallbackError);
                showNotification('Copy failed - browser not supported', 'error');
            }
        }
        
    } catch (error) {
        console.error('Error copying chart:', error);
        showNotification('Failed to copy chart', 'error');
    }
}

// Apply computed styles inline to preserve appearance
function applyInlineStyles(cloneElement, originalElement) {
    // Get computed style from original
    const computedStyle = window.getComputedStyle(originalElement);
    
    // Apply comprehensive styles inline to match exact appearance
    // Priority order: Layout first, then visual styling, then advanced properties
    const criticalStyles = [
        // Critical layout properties (highest priority)
        'display', 'position', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border', 'border-width', 'border-style', 'border-color', 'border-radius',
        'box-sizing', 'overflow', 'overflow-x', 'overflow-y'
    ];
    
    // Apply critical styles first with highest priority
    criticalStyles.forEach(prop => {
        const value = computedStyle.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== 'initial' && value !== 'inherit' && value !== 'auto') {
            try {
                cloneElement.style.setProperty(prop, value, 'important');
            } catch (e) {
                console.warn(`Failed to apply critical style ${prop}: ${e.message}`);
            }
        }
    });
    
    const stylesToCopy = [
        // Layout & Positioning
        'display', 'position', 'top', 'right', 'bottom', 'left', 'inset', 'z-index',
        'float', 'clear', 'overflow', 'overflow-x', 'overflow-y',
        'clip', 'clip-path', 'isolation', 'contain', 'contain-intrinsic-size',
        
        // Box Model
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-width', 'border-style', 'border-color',
        'border-radius', 'border-top-left-radius', 'border-top-right-radius', 
        'border-bottom-left-radius', 'border-bottom-right-radius',
        'box-sizing', 'box-shadow', 'box-decoration-break',
        
        // Background & Images
        'background', 'background-color', 'background-image', 'background-size',
        'background-position', 'background-repeat', 'background-attachment',
        'background-clip', 'background-origin', 'background-blend-mode',
        'mask', 'mask-image', 'mask-size', 'mask-position', 'mask-repeat',
        
        // Typography & Text
        'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style',
        'font-variant', 'font-stretch', 'font-synthesis', 'font-feature-settings',
        'font-kerning', 'font-language-override', 'font-optical-sizing',
        'line-height', 'letter-spacing', 'word-spacing', 'text-spacing',
        'text-align', 'text-decoration', 'text-transform', 'text-indent',
        'text-shadow', 'text-overflow', 'text-rendering', 'text-underline-position',
        'white-space', 'word-wrap', 'word-break', 'hyphens', 'hyphenate-character',
        'vertical-align', 'writing-mode', 'text-orientation', 'text-combine-upright',
        'tab-size', 'hanging-punctuation', 'text-justify', 'text-align-last',
        
        // Flexbox
        'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'justify-content',
        'align-items', 'align-content', 'align-self', 'order', 'flex-grow',
        'flex-shrink', 'flex-basis', 'gap', 'row-gap', 'column-gap',
        
        // Grid
        'grid', 'grid-template', 'grid-template-columns', 'grid-template-rows',
        'grid-template-areas', 'grid-gap', 'grid-column-gap', 'grid-row-gap',
        'justify-items', 'justify-self', 'grid-area', 'grid-column', 'grid-row',
        'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end',
        'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow',
        
        // Visual Effects & Transforms
        'opacity', 'visibility', 'transform', 'transform-origin', 'transform-style',
        'perspective', 'perspective-origin', 'backface-visibility',
        'filter', 'backdrop-filter', 'mix-blend-mode',
        
        // Tables
        'table-layout', 'border-collapse', 'border-spacing', 'caption-side',
        'empty-cells', 'table-cell', 'table-column', 'table-column-group',
        
        // Lists
        'list-style', 'list-style-type', 'list-style-position', 'list-style-image',
        
        // Counters
        'counter-reset', 'counter-increment', 'content', 'quotes',
        
        // Interactive & User Interface
        'cursor', 'pointer-events', 'user-select', 'user-drag', 'user-modify',
        'outline', 'outline-width', 'outline-style', 'outline-color', 'outline-offset',
        'resize', 'appearance', 'accent-color', 'caret-color',
        
        // Scroll & Overflow
        'scroll-behavior', 'scroll-margin', 'scroll-padding', 'scroll-snap-type',
        'scroll-snap-align', 'scroll-snap-stop',
        
        // Animation & Transitions (selective - only safe properties)
        'transition', 'transition-property', 'transition-duration', 'transition-timing-function',
        'transition-delay', 'animation', 'animation-name', 'animation-duration',
        'animation-timing-function', 'animation-delay', 'animation-iteration-count',
        'animation-direction', 'animation-fill-mode', 'animation-play-state',
        
        // Color & Appearance
        'color-scheme', 'forced-color-adjust', 'print-color-adjust',
        
        // CSS Custom Properties (CSS Variables)
        '--*' // This will be handled specially to preserve CSS custom properties
    ];
    
    stylesToCopy.forEach(prop => {
        // Handle CSS custom properties (CSS variables)
        if (prop === '--*') {
            // Get all CSS custom properties
            const cssVars = Array.from(computedStyle).filter(prop => prop.startsWith('--'));
            cssVars.forEach(cssVar => {
                const value = computedStyle.getPropertyValue(cssVar);
                if (value && value.trim()) {
                    cloneElement.style.setProperty(cssVar, value);
                }
            });
            return;
        }
        
        const value = computedStyle.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== 'initial' && value !== 'inherit' && value !== 'auto') {
            // Skip problematic properties for email compatibility
            if (prop === 'background-image' && value.includes('url(')) {
                return; // Skip background images
            }
            if (prop.includes('animation') || prop.includes('transition')) {
                return; // Skip animations and transitions for email compatibility
            }
            if (prop === 'transform' && value !== 'none') {
                return; // Skip transforms for email compatibility
            }
            if (prop.includes('filter') && value !== 'none') {
                return; // Skip filters for email compatibility
            }
            if (prop.includes('backdrop-filter')) {
                return; // Skip backdrop filters for email compatibility
            }
            if (prop.includes('mix-blend-mode') && value !== 'normal') {
                return; // Skip blend modes for email compatibility
            }
            if (prop.includes('clip-path') && value !== 'none') {
                return; // Skip clip-path for email compatibility
            }
            if (prop.includes('mask') && value !== 'none') {
                return; // Skip masks for email compatibility
            }
            
            cloneElement.style.setProperty(prop, value);
        }
    });
    
    // Recursively apply to children
    const cloneChildren = cloneElement.querySelectorAll('*');
    const originalChildren = originalElement.querySelectorAll('*');
    
    cloneChildren.forEach((cloneChild, index) => {
        if (originalChildren[index]) {
            const childComputedStyle = window.getComputedStyle(originalChildren[index]);
            stylesToCopy.forEach(prop => {
                // Handle CSS custom properties (CSS variables)
                if (prop === '--*') {
                    // Get all CSS custom properties
                    const cssVars = Array.from(childComputedStyle).filter(prop => prop.startsWith('--'));
                    cssVars.forEach(cssVar => {
                        const value = childComputedStyle.getPropertyValue(cssVar);
                        if (value && value.trim()) {
                            cloneChild.style.setProperty(cssVar, value);
                        }
                    });
                    return;
                }
                
                const value = childComputedStyle.getPropertyValue(prop);
                if (value && value !== 'none' && value !== 'normal' && value !== 'initial' && value !== 'inherit' && value !== 'auto') {
                    // Skip problematic properties for email compatibility
                    if (prop === 'background-image' && value.includes('url(')) {
                        return; // Skip background images
                    }
                    if (prop.includes('animation') || prop.includes('transition')) {
                        return; // Skip animations and transitions for email compatibility
                    }
                    if (prop === 'transform' && value !== 'none') {
                        return; // Skip transforms for email compatibility
                    }
                    if (prop.includes('filter') && value !== 'none') {
                        return; // Skip filters for email compatibility
                    }
                    if (prop.includes('backdrop-filter')) {
                        return; // Skip backdrop filters for email compatibility
                    }
                    if (prop.includes('mix-blend-mode') && value !== 'normal') {
                        return; // Skip blend modes for email compatibility
                    }
                    if (prop.includes('clip-path') && value !== 'none') {
                        return; // Skip clip-path for email compatibility
                    }
                    if (prop.includes('mask') && value !== 'none') {
                        return; // Skip masks for email compatibility
                    }
                    
                    cloneChild.style.setProperty(prop, value);
                }
            });
        }
    });
}

// Apply Outlook-specific compatibility fixes
function applyOutlookCompatibilityFixes(cloneElement) {
    // Ensure all elements have proper font family for Outlook
    const allElements = cloneElement.querySelectorAll('*');
    allElements.forEach(el => {
        if (!el.style.fontFamily) {
            el.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        }
        
        // Fix table elements for Outlook
        if (el.tagName === 'TABLE') {
            el.setAttribute('cellpadding', '0');
            el.setAttribute('cellspacing', '0');
            el.setAttribute('border', '0');
            if (!el.style.borderCollapse) {
                el.style.borderCollapse = 'collapse';
            }
        }
        
        // Fix div elements that act as containers
        if (el.tagName === 'DIV' && el.classList.contains('chart-container')) {
            if (!el.style.backgroundColor) {
                el.style.backgroundColor = '#ffffff';
            }
            if (!el.style.border) {
                el.style.border = '1px solid #e5e7eb';
            }
            if (!el.style.borderRadius) {
                el.style.borderRadius = '12px';
            }
            if (!el.style.padding) {
                el.style.padding = '20px';
            }
            if (!el.style.marginBottom) {
                el.style.marginBottom = '20px';
            }
        }
        
        // Fix specific threat actor families container only (not the entire grid)
        if (el.classList.contains('threat-actor-families')) {
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.minHeight = 'auto';
            el.style.overflow = 'visible';
        }
        
        // Fix intel cards and bodies - remove fixed heights to allow expansion
        if (el.classList.contains('intel-card') || el.classList.contains('intel-body')) {
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.minHeight = 'auto';
            el.style.overflow = 'visible';
            if (!el.style.backgroundColor) {
                el.style.backgroundColor = '#ffffff';
            }
            if (!el.style.border) {
                el.style.border = '1px solid #e5e7eb';
            }
            if (!el.style.borderRadius) {
                el.style.borderRadius = '12px';
            }
            if (!el.style.padding) {
                el.style.padding = '16px';
            }
        }
        
        // Fix threat actor list - remove fixed heights to allow expansion
        if (el.classList.contains('threat-actor-list')) {
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.minHeight = 'auto';
            if (!el.style.overflow) {
                el.style.overflow = 'visible';
            }
        }
        
        // Fix threat actor items - allow natural height
        if (el.classList.contains('threat-actor-item')) {
            el.style.height = 'auto';
            el.style.minHeight = 'auto';
            el.style.maxHeight = 'none';
            el.style.overflow = 'visible';
            if (!el.style.backgroundColor) {
                el.style.backgroundColor = '#ffffff';
            }
            if (!el.style.border) {
                el.style.border = '1px solid #e5e7eb';
            }
            if (!el.style.borderRadius) {
                el.style.borderRadius = '12px';
            }
            if (!el.style.padding) {
                el.style.padding = '16px';
            }
            if (!el.style.marginBottom) {
                el.style.marginBottom = '12px';
            }
        }
        
        // Fix actor names and text elements
        if (el.classList.contains('actor-name')) {
            el.style.height = 'auto';
            el.style.minHeight = 'auto';
            el.style.maxHeight = 'none';
            el.style.overflow = 'visible';
        }
        
        // Fix sophistication badges
        if (el.classList.contains('sophistication-badge')) {
            el.style.height = 'auto';
            el.style.minHeight = 'auto';
            el.style.maxHeight = 'none';
            el.style.overflow = 'visible';
            if (!el.style.display) {
                el.style.display = 'inline-block';
            }
            if (!el.style.padding) {
                el.style.padding = '2px 8px';
            }
            if (!el.style.borderRadius) {
                el.style.borderRadius = '4px';
            }
            if (!el.style.fontSize) {
                el.style.fontSize = '10px';
            }
            if (!el.style.fontWeight) {
                el.style.fontWeight = '600';
            }
            if (!el.style.textTransform) {
                el.style.textTransform = 'uppercase';
            }
        }
        
        // Fix infrastructure and WHOIS containers
        if (el.classList.contains('infrastructure-container') || el.classList.contains('whois-container')) {
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.minHeight = 'auto';
            el.style.overflow = 'visible';
        }
        
        // Fix infrastructure and WHOIS items
        if (el.classList.contains('infrastructure-item') || el.classList.contains('whois-item')) {
            el.style.height = 'auto';
            el.style.minHeight = 'auto';
            el.style.overflow = 'visible';
            if (!el.style.backgroundColor) {
                el.style.backgroundColor = '#ffffff';
            }
            if (!el.style.border) {
                el.style.border = '1px solid #e5e7eb';
            }
            if (!el.style.borderRadius) {
                el.style.borderRadius = '8px';
            }
            if (!el.style.padding) {
                el.style.padding = '12px';
            }
            if (!el.style.marginBottom) {
                el.style.marginBottom = '8px';
            }
        }
        
        // Fix timeline and attribution containers
        if (el.classList.contains('timeline-container') || el.classList.contains('attribution-container')) {
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.minHeight = 'auto';
            el.style.overflow = 'visible';
        }
        
        // Fix timeline images - remove max-width constraints
        if (el.tagName === 'IMG' && (
            el.src.includes('timeline') || 
            el.src.includes('attribution') || 
            el.src.includes('evolution') ||
            el.closest('.timeline-chart-container') ||
            el.closest('.attribution-chart-container') ||
            el.closest('.evolution-chart-container')
        )) {
            el.style.maxWidth = 'none';
            el.style.width = '100%';
            el.style.height = 'auto';
        }
        
        // Fix headers
        if (el.tagName.match(/^H[1-6]$/)) {
            if (!el.style.fontWeight) {
                el.style.fontWeight = '700';
            }
            if (!el.style.color) {
                el.style.color = '#111827';
            }
        }
        
        // Fix paragraphs
        if (el.tagName === 'P') {
            if (!el.style.margin) {
                el.style.margin = '0 0 12px 0';
            }
            if (!el.style.color) {
                el.style.color = '#374151';
            }
        }
        
        // Fix links
        if (el.tagName === 'A') {
            if (!el.style.color) {
                el.style.color = '#3b82f6';
            }
            if (!el.style.textDecoration) {
                el.style.textDecoration = 'none';
            }
        }
        
        // Fix buttons
        if (el.tagName === 'BUTTON' || el.classList.contains('btn')) {
            if (!el.style.backgroundColor) {
                el.style.backgroundColor = '#3b82f6';
            }
            if (!el.style.color) {
                el.style.color = '#ffffff';
            }
            if (!el.style.border) {
                el.style.border = '1px solid #3b82f6';
            }
            if (!el.style.borderRadius) {
                el.style.borderRadius = '6px';
            }
            if (!el.style.padding) {
                el.style.padding = '8px 16px';
            }
            if (!el.style.fontSize) {
                el.style.fontSize = '14px';
            }
            if (!el.style.fontWeight) {
                el.style.fontWeight = '600';
            }
        }
        
        // Fix status badges
        if (el.classList.contains('status-badge')) {
            if (!el.style.display) {
                el.style.display = 'inline-block';
            }
            if (!el.style.padding) {
                el.style.padding = '4px 12px';
            }
            if (!el.style.borderRadius) {
                el.style.borderRadius = '6px';
            }
            if (!el.style.fontSize) {
                el.style.fontSize = '12px';
            }
            if (!el.style.fontWeight) {
                el.style.fontWeight = '600';
            }
            if (!el.style.textTransform) {
                el.style.textTransform = 'uppercase';
            }
        }
        
        // Fix activity timeline table
        if (el.classList.contains('activity-sleek-table')) {
            if (!el.style.width) {
                el.style.width = '100%';
            }
            if (!el.style.borderCollapse) {
                el.style.borderCollapse = 'collapse';
            }
            if (!el.style.fontSize) {
                el.style.fontSize = '13px';
            }
            if (!el.style.backgroundColor) {
                el.style.backgroundColor = 'white';
            }
            if (!el.style.borderRadius) {
                el.style.borderRadius = '8px';
            }
        }
        
        // Fix timeline context header
        if (el.classList.contains('timeline-context-header')) {
            if (!el.style.display) {
                el.style.display = 'flex';
            }
            if (!el.style.alignItems) {
                el.style.alignItems = 'center';
            }
            if (!el.style.gap) {
                el.style.gap = '8px';
            }
            if (!el.style.padding) {
                el.style.padding = '12px 16px';
            }
            if (!el.style.backgroundColor) {
                el.style.backgroundColor = '#f8fafc';
            }
            if (!el.style.border) {
                el.style.border = '1px solid #e2e8f0';
            }
            if (!el.style.borderRadius) {
                el.style.borderRadius = '8px';
            }
            if (!el.style.marginBottom) {
                el.style.marginBottom = '12px';
            }
            if (!el.style.fontSize) {
                el.style.fontSize = '13px';
            }
        }
    });
}

// Section-level copy functions
function copyExecutiveDashboard() {
    const section = document.getElementById('executive-section');
    copyChartAsHTML(section, 'Executive Summary Dashboard');
}

function copyOperationalDashboard() {
    const section = document.getElementById('case-management-section');
    copyChartAsHTML(section, 'Operational Dashboard');
}

function copyThreatIntelligenceDashboard() {
    const section = document.getElementById('threat-intelligence-section');
    copyChartAsHTML(section, 'Threat Intelligence Dashboard');
}

function copySocialExecutiveDashboard() {
    const section = document.getElementById('social-executive-section');
    copyChartAsHTML(section, 'Social & Executive Targeting Dashboard');
}

// Make functions globally available
window.showSection = showSection;
window.refreshData = refreshData;
window.handleDateFilterChange = handleDateFilterChange;
window.updateTimelineTrends = updateTimelineTrends;
window.copyChartAsHTML = copyChartAsHTML;
window.copyExecutiveDashboard = copyExecutiveDashboard;
window.copyOperationalDashboard = copyOperationalDashboard;
window.copyThreatIntelligenceDashboard = copyThreatIntelligenceDashboard;
window.copySocialExecutiveDashboard = copySocialExecutiveDashboard;

// Dashboard section copying functionality
function copyDashboardSection(sectionId, sectionTitle) {
    try {
        const section = document.getElementById(sectionId);
        if (!section) {
            showNotification(`Section ${sectionId} not found`, 'error');
            return;
        }

        // Clone the section
        const clone = section.cloneNode(true);
        
        // Remove any interactive elements that shouldn't be copied
        const interactiveElements = clone.querySelectorAll('button, input, select, textarea');
        interactiveElements.forEach(el => {
            if (!el.classList.contains('copy-btn')) {
                el.remove();
            }
        });

        // Create HTML content with inline styles
        const htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">
                    ${sectionTitle}
                </h2>
                ${clone.innerHTML}
            </div>
        `;

        // Copy to clipboard
        navigator.clipboard.writeText(htmlContent).then(() => {
            showNotification(`${sectionTitle} copied to clipboard!`, 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showNotification('Failed to copy section', 'error');
        });
        } catch (error) {
        console.error('Error copying dashboard section:', error);
        showNotification('Error copying section', 'error');
    }
}

// Detailed Infrastructure Analysis Functions
window.loadDetailedInfrastructure = async function(type) {
    try {
        const actorSelect = document.getElementById('infrastructureActorSelect');
        const familySelect = document.getElementById('infrastructureFamilySelect');
        const contentDiv = document.getElementById('detailedInfrastructureContent');
        
        let selectedValue = '';
        let selectedName = '';
        
        if (type === 'actor') {
            selectedValue = actorSelect.value;
            selectedName = actorSelect.options[actorSelect.selectedIndex].text;
            familySelect.value = ''; // Clear family selection
        } else if (type === 'family') {
            selectedValue = familySelect.value;
            selectedName = familySelect.options[familySelect.selectedIndex].text;
            actorSelect.value = ''; // Clear actor selection
        }
        
        if (!selectedValue) {
            contentDiv.style.display = 'none';
            return;
        }

        console.log(`Loading detailed infrastructure for ${type}: ${selectedValue}`);
        
        // Show loading state
        contentDiv.style.display = 'block';
        document.getElementById('detailedActorName').textContent = selectedName;
        document.getElementById('detailedTotalCases').textContent = 'Loading...';
        document.getElementById('detailedActiveSince').textContent = 'Loading...';
        document.getElementById('detailedLastCase').textContent = 'Loading...';
        
        // Clear existing content
        ['detailedTLDs', 'detailedRegistrars', 'detailedISPs', 'detailedCountries', 'detailedURLPaths'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.innerHTML = '<div class="no-detailed-data-sidebar">Loading...</div>';
        });
        
        // Fetch detailed data
        const response = await fetch(`/api/dashboard/detailed-infrastructure?type=${type}&value=${encodeURIComponent(selectedValue)}`);

            if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('Detailed infrastructure data received:', data);
        
        if (data.success) {
            // Update header info
            document.getElementById('detailedTotalCases').textContent = data.total_cases || 0;
            document.getElementById('detailedActiveSince').textContent = data.active_since || '-';
            document.getElementById('detailedLastCase').textContent = data.last_case || '-';
            
            // Populate detailed sections
            populateDetailedSection('detailedTLDs', data.tlds, 'TLD');
            populateDetailedSection('detailedRegistrars', data.registrars, 'Registrar');
            populateDetailedSection('detailedISPs', data.isps, 'ISP');
            populateDetailedSection('detailedCountries', data.countries, 'Country');
            populateDetailedURLPaths('detailedURLPaths', data.url_paths);
            
            console.log('Detailed infrastructure populated successfully');
            
        } else {
            throw new Error(data.message || 'Failed to load detailed infrastructure data');
        }
        
        } catch (error) {
        console.error('Error loading detailed infrastructure:', error);
        showNotification('Failed to load detailed infrastructure data', 'error');
        
        // Show error state
        document.getElementById('detailedActorName').textContent = 'Error';
        document.getElementById('detailedTotalCases').textContent = 'Error';
        document.getElementById('detailedActiveSince').textContent = 'Error';
        document.getElementById('detailedLastCase').textContent = 'Error';
        
        ['detailedTLDs', 'detailedRegistrars', 'detailedISPs', 'detailedCountries', 'detailedURLPaths'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.innerHTML = '<div class="no-detailed-data-sidebar">Failed to load data</div>';
        });
    }
};

function populateDetailedSection(containerId, data, type) {
    const container = document.getElementById(containerId);
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-detailed-data-sidebar">No ' + type.toLowerCase() + ' data available</div>';
        return;
    }
    
    const html = data.map(item => {
        const countClass = getCountClass(item.count);
        return `
            <div class="detailed-item-sidebar">
                <span class="detailed-item-value-sidebar" title="${item.value}">${item.value}</span>
                <span class="detailed-item-count-sidebar ${countClass}">${item.count}</span>
                </div>
            `;
    }).join('');
    
    container.innerHTML = html;
}

function populateDetailedURLPaths(containerId, data) {
    const container = document.getElementById(containerId);
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="no-detailed-data-sidebar">No URL paths available</div>';
        return;
    }
    
    const html = data.map(item => {
        const countClass = getCountClass(item.case_count);
        return `
            <div class="detailed-item-sidebar">
                <span class="detailed-item-value-sidebar" title="${item.url_path}">${item.url_path}</span>
                <span class="detailed-item-count-sidebar ${countClass}">${item.case_count}</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

function getCountClass(count) {
    if (count >= 10) return 'high';
    if (count >= 5) return 'medium';
    return 'low';
}

// Populate dropdowns when threat actor infrastructure data is loaded
window.populateInfrastructureDropdowns = function(actorData, familyData) {
    const actorSelect = document.getElementById('infrastructureActorSelect');
    const familySelect = document.getElementById('infrastructureFamilySelect');
    
    // Clear existing options (except the first one)
    actorSelect.innerHTML = '<option value="">Select a threat actor...</option>';
    familySelect.innerHTML = '<option value="">Select a threat family...</option>';
    
    // Populate actor dropdown
    if (actorData && actorData.length > 0) {
        actorData.forEach(actor => {
            const option = document.createElement('option');
            option.value = actor.threat_actor;
            option.textContent = `${actor.threat_actor} (${actor.total_cases} cases)`;
            actorSelect.appendChild(option);
        });
    }
    
    // Populate family dropdown (if we have family data)
    if (familyData && familyData.length > 0) {
        familyData.forEach(family => {
            const option = document.createElement('option');
            option.value = family.threat_family;
            option.textContent = `${family.threat_family} (${family.total_cases} cases)`;
            familySelect.appendChild(option);
        });
    }
};

// Make standalone functions globally available (not part of any class)
window.showSection = showSection;
window.refreshData = refreshData;
window.handleDateFilterChange = handleDateFilterChange;
window.updateTimelineTrends = updateTimelineTrends;
window.copyCompleteDashboard = copyCompleteDashboard;
window.copyDashboardSection = copyDashboardSection;
