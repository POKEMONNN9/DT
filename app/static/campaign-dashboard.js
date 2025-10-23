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

// Global variables
let campaignManagement;

// Global wrapper functions for HTML onclick handlers
function showCampaignTab(tabName) {
    if (window.campaignManagement) {
        window.campaignManagement.showCampaignTab(tabName);
    }
}

function clearFilters() {
    console.log('<i class="fas fa-broom"></i> Clearing all filters...');
    
    // Clear campaign selections
    if (window.campaignManagement) {
        window.campaignManagement.selectedCampaignsForViewer = [];
        window.campaignManagement.updateSelectedCampaignsList();
    }
    
    // Clear form inputs
    const caseNumberFilter = document.getElementById('case-number-filter');
    const ageFilter = document.getElementById('age-filter');
    const campaignDateFilter = document.getElementById('campaignDateFilter');
    
    if (caseNumberFilter) caseNumberFilter.value = '';
    if (ageFilter) ageFilter.value = '';
    if (campaignDateFilter) campaignDateFilter.value = 'all';
    
    console.log('<i class="fas fa-check-circle"></i> All filters cleared');
}

function applyCustomRange() {
    if (window.campaignManagement) {
        window.campaignManagement.applyCustomRange();
    }
}

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


// ============================== NOTIFICATIONS ==============================
function showNotification(message, type = 'info', duration) {
    if (!duration) {
        duration = (window.CONFIG && window.CONFIG.notificationDuration) ? window.CONFIG.notificationDuration : 3000;
    }
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

// ============================== DATA VIEWER ==============================
window.showDataTab = function(campaignName, tabType) {
    if (window.campaignManagement && window.campaignManagement.showDataTab) {
        window.campaignManagement.showDataTab(campaignName, tabType);
    } else {
        console.error('CampaignManagement not available or showDataTab method not found');
    }
};

// ============================== DATA EXPORT ==============================
window.exportTable = function(tableId, type) {
    if (window.campaignManagement && window.campaignManagement.exportTable) {
        window.campaignManagement.exportTable(tableId, type);
    } else {
        console.error('CampaignManagement not available or exportTable method not found');
    }
};

// ============================== TABLE COLUMNS ==============================
window.toggleTableColumns = function(tableId) {
    if (window.campaignManagement && window.campaignManagement.toggleTableColumns) {
        window.campaignManagement.toggleTableColumns(tableId);
    } else {
        console.error('CampaignManagement not available or toggleTableColumns method not found');
    }
};

// ============================== CASES TABS ==============================
window.switchCasesTab = function(tab) {
    if (window.campaignManagement && window.campaignManagement.switchCasesTab) {
        window.campaignManagement.switchCasesTab(tab);
    } else {
        console.error('CampaignManagement not available or switchCasesTab method not found');
    }
};

window.switchInfrastructureTab = function(tabName) {
    if (window.campaignManagement && window.campaignManagement.switchInfrastructureTab) {
        window.campaignManagement.switchInfrastructureTab(tabName);
    } else {
        console.error('CampaignManagement not available or switchInfrastructureTab method not found');
    }
};

// ============================== CAMPAIGN MANAGEMENT CLASS ==============================
class CampaignManagement {
    constructor() {
        this.currentCampaign = null;
        this.campaigns = [];
        this.selectedCampaignsForViewer = [];
        this.campaignDateFilter = {
            type: 'all',
            startDate: null,
            endDate: null,
            specificDates: []
        };
        this.init();
    }

    // ============================== INITIALIZATION ==============================
    async init() {
        console.log('<i class="fas fa-bullseye"></i> Initializing Campaign Management...');
        await this.loadCampaigns();
        this.setupEventListeners();
        this.populateAnalysisCampaignFilter();
    }

    // ============================== LOAD CAMPAIGNS ==============================
    async loadCampaigns() {
        try {
            console.log('<i class="fas fa-clipboard"></i> Loading campaigns...');
            const response = await fetch('/api/campaigns/list');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.campaigns = await response.json();
            console.log('<i class="fas fa-check-circle"></i> Loaded campaigns:', this.campaigns.length);
            this.renderCampaignList();
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error loading campaigns:', error);
            this.showNotification('Error loading campaigns', 'error');
        }
    }

    // ============================== RENDER CAMPAIGN LIST ==============================
    renderCampaignList() {
        const campaignList = document.getElementById('campaignList');
        if (!campaignList) return;

        if (this.campaigns.length === 0) {
            campaignList.innerHTML = `
                <div class="loading-placeholder">
                    <i class="fas fa-folder-open"></i>
                    <p>No campaigns found</p>
                    <p>Click "Create Campaign" to get started</p>
                </div>
            `;
            return;
        }

        campaignList.innerHTML = this.campaigns.map(campaign => {
            const incompleteCount = campaign.incomplete_metadata_count || 0;
            const metadataStatus = incompleteCount > 0 
                ? `<span style="color: #f59e0b; font-size: 11px; margin-left: 8px;" title="${incompleteCount} identifier(s) with incomplete metadata">
                     <i class="fas fa-exclamation-triangle"></i> ${incompleteCount} pending
                   </span>`
                : '';
            
            return `
            <div class="campaign-item" data-campaign="${campaign.name}" onclick="campaignManagement.selectCampaign('${campaign.name}')">
                <div class="campaign-item-info">
                    <div class="campaign-item-name">${campaign.name}${metadataStatus}</div>
                    <div class="campaign-item-description">${campaign.description || 'No description'}</div>
                    <div class="campaign-item-stats">
                        <div class="campaign-item-stat">
                            <i class="fas fa-tags"></i>
                            ${campaign.identifier_count} identifiers
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // ============================== SELECT CAMPAIGN ==============================
    async selectCampaign(campaignName) {
        try {
            // Update UI
            document.querySelectorAll('.campaign-item').forEach(item => {
                item.classList.remove('selected');
            });
            document.querySelector(`[data-campaign="${campaignName}"]`).classList.add('selected');

            // Find campaign data
            this.currentCampaign = this.campaigns.find(c => c.name === campaignName);
            if (!this.currentCampaign) {
                console.error('Campaign not found:', campaignName);
                return;
            }

            // Update header
            document.getElementById('selectedCampaignName').textContent = this.currentCampaign.name;
            document.getElementById('campaignActions').style.display = 'flex';

            // Show campaign details
            this.renderCampaignDetails();
            
            // Load cases and domains
            await this.loadCampaignCases();
            await this.loadCampaignDomains();

            console.log('<i class="fas fa-check-circle"></i> Selected campaign:', campaignName);
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error selecting campaign:', error);
            this.showNotification('Error selecting campaign', 'error');
        }
    }

    // ============================== RENDER CAMPAIGN DETAILS HTML ==============================
    renderCampaignDetails() {
        const detailsContent = document.getElementById('campaignDetailsContent');
        if (!detailsContent || !this.currentCampaign) return;

        detailsContent.innerHTML = `
            <div class="campaign-details-info">
                <div class="detail-item">
                    <label>Description:</label>
                    <p>${this.currentCampaign.description || 'No description provided'}</p>
                </div>
                <div class="detail-item">
                    <label>Status:</label>
                    <select id="campaignStatusSelect" class="status-select" onchange="campaignManagement.updateCampaignStatus('${this.currentCampaign.name}')">
                        <option value="ACTIVE" ${this.currentCampaign.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                        <option value="CLOSED" ${this.currentCampaign.status === 'CLOSED' ? 'selected' : ''}>CLOSED</option>
                    </select>
                </div>
                <div class="detail-item">
                    <label>Identifiers:</label>
                    <span class="metric-value">${this.currentCampaign.identifier_count || 0}</span>
                </div>
                <div class="detail-item">
                    <label>Created:</label>
                    <span>${this.currentCampaign.created_date}</span>
                </div>
                <div class="detail-item">
                    <label>Last Updated:</label>
                    <span>${this.currentCampaign.last_updated}</span>
                </div>
            </div>

            <!-- Bulk Case Addition Section -->
            <div class="bulk-case-addition-section">
                <div class="section-header">
                    <h4><i class="fas fa-plus-circle"></i> Add Cases to Campaign</h4>
                    <p class="section-description">Add multiple cases, domains, or URLs to this campaign in bulk</p>
                </div>
                
                <div class="bulk-input-container">
                    <div class="input-group">
                        <label for="bulkCaseInput">Enter values (comma or newline separated):</label>
                        <textarea 
                            id="bulkCaseInput" 
                            class="bulk-input" 
                            placeholder="Enter case numbers, domains, URLs, or incident IDs...&#10;Examples:&#10;CASE-2025-001, malicious-domain.com&#10;TI-2025-002&#10;https://phishing-site.com"
                            rows="4"
                        ></textarea>
                    </div>
                    
                    <div class="search-options">
                        <label>
                            <input type="radio" name="searchType" value="partial" checked>
                            Partial Match (contains)
                        </label>
                        <label>
                            <input type="radio" name="searchType" value="exact">
                            Exact Match
                        </label>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="campaignManagement.addBulkCases('${this.currentCampaign.name}')">
                            <i class="fas fa-search"></i> Validate & Add Cases
                        </button>
                        <button class="btn btn-secondary" onclick="campaignManagement.clearBulkInput()">
                            <i class="fas fa-times"></i> Clear
                        </button>
                    </div>
                </div>
                
                <!-- Validation Results -->
                <div id="bulkValidationResults" class="validation-results" style="display: none;">
                    <!-- Results will be populated here -->
                </div>
            </div>

            <!-- Campaign Identifiers List -->
            <div class="campaign-identifiers-section">
                <div class="section-header">
                    <h4><i class="fas fa-list"></i> Campaign Identifiers</h4>
                    <p class="section-description">Current identifiers and cases in this campaign</p>
                </div>
                
                <div class="identifiers-list" id="campaignIdentifiersList">
                    <!-- Identifiers will be populated here -->
                </div>
            </div>
        `;

        // Populate the identifiers list
        this.renderCampaignIdentifiersList();
    }

    // ============================== UPDATE CAMPAIGN STATUS ==============================
    async updateCampaignStatus(campaignName) {
        const statusSelect = document.getElementById('campaignStatusSelect');
        const newStatus = statusSelect.value;
        
        try {
            // Update the campaign status in the local data
            if (this.currentCampaign) {
                this.currentCampaign.status = newStatus;
                this.currentCampaign.last_updated = new Date().toISOString().split('T')[0];
            }
            
            // Save to campaigns.json
            await this.saveCampaignData();
            
            this.showNotification(`Campaign status updated to ${newStatus}`, 'success');
        } catch (error) {
            console.error('Error updating campaign status:', error);
            this.showNotification('Error updating campaign status', 'error');
            // Revert the select value
            statusSelect.value = this.currentCampaign.status;
        }
    }

    // ============================== RENDER CAMPAIGN IDENTIFIERS LIST ==============================
    renderCampaignIdentifiersList() {
        const identifiersList = document.getElementById('campaignIdentifiersList');
        if (!identifiersList || !this.currentCampaign) return;

        if (!this.currentCampaign.identifiers || this.currentCampaign.identifiers.length === 0) {
            identifiersList.innerHTML = `
                <div class="no-data-placeholder">
                    <i class="fas fa-inbox"></i>
                    <p>No identifiers in this campaign yet</p>
                    <small>Use the bulk addition tool above to add cases, domains, or URLs</small>
                </div>
            `;
        } else {
            identifiersList.innerHTML = this.currentCampaign.identifiers.map(identifier => `
                <div class="identifier-item">
                    <div class="identifier-info">
                        <div class="identifier-type">${identifier.table || identifier.type}</div>
                        <div class="identifier-value">${identifier.value}</div>
                        <div class="identifier-description">${identifier.description || 'No description'}</div>
                    </div>
                    <div class="identifier-actions">
                        <button class="btn-remove" onclick="campaignManagement.removeIdentifier('${identifier.field || 'case_number'}', '${identifier.value}')" title="Remove identifier">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    // ============================== ADD BULK CASES ==============================
    async addBulkCases(campaignName) {
        const bulkInput = document.getElementById('bulkCaseInput');
        const searchType = document.querySelector('input[name="searchType"]:checked').value;
        const resultsDiv = document.getElementById('bulkValidationResults');
        
        if (!bulkInput.value.trim()) {
            this.showNotification('Please enter some values to add', 'warning');
            return;
        }

        // Parse input values
        const inputValues = bulkInput.value
            .split(/[,\n]/)
            .map(val => val.trim())
            .filter(val => val.length > 0);

        if (inputValues.length === 0) {
            this.showNotification('No valid values found', 'warning');
            return;
        }

        this.showNotification(`Validating ${inputValues.length} values...`, 'info');
        
        try {
            const validationResults = await this.validateBulkCases(inputValues, searchType);
            this.displayValidationResults(validationResults, campaignName);
        } catch (error) {
            console.error('Error validating bulk cases:', error);
            this.showNotification('Error validating cases', 'error');
        }
    }

    // ============================== VALIDATE BULK CASES ==============================
    async validateBulkCases(values, searchType) {
        const results = {
            found: [],
            notFound: [],
            errors: []
        };

        // Separate identifiers (numeric) from domains/URLs (non-numeric)
        const identifiers = [];
        const domainValues = [];
        
        for (const value of values) {
            const isNumeric = /^\d+$/.test(value);
            if (isNumeric) {
                identifiers.push(value);
            } else {
                domainValues.push(value);
            }
        }

        // ========== OPTIMIZED: Bulk validate all identifiers with 3 queries instead of N*3 queries ==========
        if (identifiers.length > 0) {
            try {
                console.log(`🚀 Bulk validating ${identifiers.length} identifiers using optimized endpoint (3 queries total)`);
                const startTime = performance.now();
                
                // Join identifiers with newlines for the bulk endpoint
                const identifiersText = identifiers.join('\n');
                
                const bulkResponse = await fetch('/api/campaigns/bulk-validate-identifiers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        identifiers: identifiersText
                    })
                });
                
                if (bulkResponse.ok) {
                    const bulkData = await bulkResponse.json();
                    const endTime = performance.now();
                    const timeElapsed = (endTime - startTime).toFixed(0);
                    
                    console.log(`✅ Bulk validation complete in ${timeElapsed}ms:`, bulkData.performance);
                    console.log(`   - Found: ${bulkData.total_found} identifiers`);
                    console.log(`   - Not found: ${bulkData.total_not_found} identifiers`);
                    console.log(`   - Queries saved: ${bulkData.performance.queries_saved}`);
                    console.log(`   - Efficiency: ${bulkData.performance.efficiency_improvement}`);
                    
                    // Add found identifiers to results
                    bulkData.identifiers.forEach(item => {
                        results.found.push({
                            table: item.table,
                            field: item.field,
                            value: item.value,
                            description: `${item.type}: ${item.value} - Brand: ${item.brand || 'N/A'}, Created: ${item.date_created || 'N/A'}`,
                            originalInput: item.value,
                            metadata: item
                        });
                    });
                    
                    // Add not found identifiers to results
                    bulkData.not_found.forEach(value => {
                        results.notFound.push({
                            value,
                            type: 'identifier',
                            reason: 'Not found in any table (cred theft, domain monitoring, or social media)'
                        });
                    });
                } else {
                    console.error('Bulk validation failed, falling back to individual queries');
                    // Fallback: validate individually if bulk fails
                    for (const value of identifiers) {
                        const caseResults = await this.searchNumericValue(value, searchType);
                        if (caseResults.length > 0) {
                            results.found.push(...caseResults);
                        } else {
                            results.notFound.push({
                                value,
                                type: 'numeric',
                                reason: 'No matching case found'
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error in bulk validation:', error);
                results.errors.push({
                    value: 'bulk-validation',
                    error: `Bulk validation failed: ${error.message}`
                });
            }
        }

        // ========== Non-numeric values (domains/URLs) - still individual queries ==========
        // These need individual queries because they search across multiple fields/tables
        for (const value of domainValues) {
            try {
                const domainResults = await this.searchDomainValue(value, searchType);
                if (domainResults.length > 0) {
                    results.found.push(...domainResults);
                } else {
                    results.notFound.push({
                        value,
                        type: 'domain/url',
                        reason: 'No matching domain or URL found'
                    });
                }
            } catch (error) {
                results.errors.push({
                    value,
                    error: error.message
                });
            }
        }

        // ========== Additional pass: try case_number search for alphanumeric case IDs ==========
        // Many case numbers are not purely numeric (e.g., CASE-2025-001). Ensure we also query case_number.
        for (const value of values) {
            // Heuristic: if value contains letters or hyphens/underscores, it might be a case_number string
            const looksLikeCaseId = /[A-Za-z]/.test(value) || /[-_]/.test(value);
            if (!looksLikeCaseId) continue;
            try {
                const caseDataResponse = await fetch(`/api/search-case-data?value=${encodeURIComponent(value)}&type=${searchType}`);
                if (caseDataResponse.ok) {
                    const caseData = await caseDataResponse.json();
                    if (Array.isArray(caseData) && caseData.length > 0) {
                        caseData.forEach(item => {
                            results.found.push({
                                table: 'phishlabs_case_data_incidents',
                                field: 'case_number',
                                value: item.case_number,
                                description: `Case: ${item.case_type || 'Unknown'} - ${item.title || 'No title'}`,
                                originalInput: value
                            });
                        });
                        // Remove any previous notFound entry for this value
                        results.notFound = results.notFound.filter(n => n.value !== value);
                    }
                }
            } catch (error) {
                // Ignore; keep any domain/url results already collected
            }
        }

        return results;
    }

    // ============================== SEARCH NUMERIC VALUE ==============================
    async searchNumericValue(value, searchType) {
        const results = [];
        
        try {
            // Search in phishlabs_case_data_incidents (for case_number)
            const caseDataResponse = await fetch(`/api/search-case-data?value=${encodeURIComponent(value)}&type=${searchType}`);
            if (caseDataResponse.ok) {
                const caseData = await caseDataResponse.json();
                caseData.forEach(item => {
                    results.push({
                        table: 'phishlabs_case_data_incidents',
                        field: 'case_number',
                        value: item.case_number,
                        description: `Case: ${item.case_type || 'Unknown'} - ${item.title || 'No title'}`,
                        originalInput: value
                    });
                });
            }

            // Search in phishlabs_threat_intelligence_incident (for infrid)
            const threatResponse = await fetch(`/api/search-threat-intelligence?value=${encodeURIComponent(value)}&type=${searchType}`);
            if (threatResponse.ok) {
                const threatData = await threatResponse.json();
                threatData.forEach(item => {
                    results.push({
                        table: 'phishlabs_threat_intelligence_incident',
                        field: 'infrid',
                        value: item.infrid,
                        description: `Domain Monitoring: ${item.cat_name || 'Unknown'} - ${item.url || 'No URL'}`,
                        originalInput: value
                    });
                });
            }

            // Search in phishlabs_incident (for incident_id)
            const incidentResponse = await fetch(`/api/search-incident?value=${encodeURIComponent(value)}&type=${searchType}`);
            if (incidentResponse.ok) {
                const incidentData = await incidentResponse.json();
                incidentData.forEach(item => {
                    results.push({
                        table: 'phishlabs_incident',
                        field: 'incident_id',
                        value: item.incident_id,
                        description: `Social Media: ${item.incident_type || 'Unknown'} - ${item.title || 'No title'}`,
                        originalInput: value
                    });
                });
            }
        } catch (error) {
            console.error('Error searching numeric value:', error);
        }

        return results;
    }

    // ============================== SEARCH DOMAIN VALUE ==============================
    async searchDomainValue(value, searchType) {
        const results = [];
        
        try {
            // Search in phishlabs_case_data_associated_urls
            const urlResponse = await fetch(`/api/search-associated-urls?value=${encodeURIComponent(value)}&type=${searchType}`);
            if (urlResponse.ok) {
                const urlData = await urlResponse.json();
                urlData.forEach(item => {
                    results.push({
                        table: 'phishlabs_case_data_incidents', // Store the main case table
                        field: 'case_number', // Store the case_number for data fetching
                        value: item.case_number, // Store the case_number, not the URL
                        description: `Case: ${item.case_number} - Found via URL: ${item.url}`,
                        originalInput: value,
                        foundIn: 'phishlabs_case_data_associated_urls'
                    });
                });
            }

            // Search in phishlabs_case_data_note_bots
            const botsResponse = await fetch(`/api/search-note-bots?value=${encodeURIComponent(value)}&type=${searchType}`);
            if (botsResponse.ok) {
                const botsData = await botsResponse.json();
                botsData.forEach(item => {
                    results.push({
                        table: 'phishlabs_case_data_incidents', // Store the main case table
                        field: 'case_number', // Store the case_number for data fetching
                        value: item.case_number, // Store the case_number, not the URL
                        description: `Case: ${item.case_number} - Found via Bot Note URL: ${item.url}`,
                        originalInput: value,
                        foundIn: 'phishlabs_case_data_note_bots'
                    });
                });
            }

            // Search in phishlabs_case_data_note_threatactor_handles
            const handlesResponse = await fetch(`/api/search-threatactor-handles?value=${encodeURIComponent(value)}&type=${searchType}`);
            if (handlesResponse.ok) {
                const handlesData = await handlesResponse.json();
                handlesData.forEach(item => {
                    results.push({
                        table: 'phishlabs_case_data_incidents', // Store the main case table
                        field: 'case_number', // Store the case_number for data fetching
                        value: item.case_number, // Store the case_number, not the URL
                        description: `Case: ${item.case_number} - Found via Threat Actor URL: ${item.url}`,
                        originalInput: value,
                        foundIn: 'phishlabs_case_data_note_threatactor_handles'
                    });
                });
            }

            // Search in phishlabs_threat_intelligence_incident
            const threatResponse = await fetch(`/api/search-threat-intelligence-domain?value=${encodeURIComponent(value)}&type=${searchType}`);
            if (threatResponse.ok) {
                const threatData = await threatResponse.json();
                threatData.forEach(item => {
                    results.push({
                        table: 'phishlabs_threat_intelligence_incident',
                        field: 'infrid', // Store the infrid for data fetching
                        value: item.infrid, // Store the infrid, not the domain/URL
                        description: `Domain Monitoring: ${item.infrid} - Found via ${item.url ? 'URL: ' + item.url : 'Domain: ' + item.domain}`,
                        originalInput: value,
                        foundIn: 'phishlabs_threat_intelligence_incident'
                    });
                });
            }
        } catch (error) {
            console.error('Error searching domain value:', error);
        }

        return results;
    }

    // ============================== DISPLAY VALIDATION RESULTS ==============================
    displayValidationResults(results, campaignName) {
        const resultsDiv = document.getElementById('bulkValidationResults');
        resultsDiv.style.display = 'block';

        let html = '<div class="validation-summary">';
        
        // Summary
        html += `
            <div class="summary-stats">
                <span class="stat found">${results.found.length} Found</span>
                <span class="stat not-found">${results.notFound.length} Not Found</span>
                <span class="stat errors">${results.errors.length} Errors</span>
            </div>
        `;

        // Found items
        if (results.found.length > 0) {
            html += `
                <div class="found-section">
                    <h5><i class="fas fa-check-circle text-success"></i> Found Cases (${results.found.length})</h5>
                    <div class="found-list">
                        ${results.found.map(item => `
                            <div class="found-item">
                                <div class="found-info">
                                    <strong>${item.table}</strong> - ${item.value}
                                    <small>${item.description}</small>
                                </div>
                                <button class="btn btn-sm btn-success" onclick="campaignManagement.addSingleCase('${campaignName}', '${item.table}', '${item.field}', '${item.value}', '${item.description.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-plus"></i> Add
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="campaignManagement.addAllFoundCases('${campaignName}', ${JSON.stringify(results.found).replace(/"/g, '&quot;')})">
                        <i class="fas fa-plus-circle"></i> Add All Found Cases
                    </button>
                </div>
            `;
        }

        // Not found items
        if (results.notFound.length > 0) {
            html += `
                <div class="not-found-section">
                    <h5><i class="fas fa-exclamation-triangle text-warning"></i> Not Found (${results.notFound.length})</h5>
                    <div class="not-found-list">
                        ${results.notFound.map(item => `
                            <div class="not-found-item">
                                <code>${item.value}</code> - ${item.reason}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Errors
        if (results.errors.length > 0) {
            html += `
                <div class="errors-section">
                    <h5><i class="fas fa-times-circle text-danger"></i> Errors (${results.errors.length})</h5>
                    <div class="errors-list">
                        ${results.errors.map(item => `
                            <div class="error-item">
                                <code>${item.value}</code> - ${item.error}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        resultsDiv.innerHTML = html;
    }

    // ============================== ADD SINGLE CASE ==============================
    async addSingleCase(campaignName, table, field, value, description) {
        try {
            const identifier = {
                table,
                field,
                value,
                description,
                added_date: new Date().toISOString()
            };

            // Add to campaign
            if (!this.currentCampaign.identifiers) {
                this.currentCampaign.identifiers = [];
            }
            
            // Check if already exists
            const exists = this.currentCampaign.identifiers.some(id => 
                id.table === table && id.field === field && id.value === value
            );
            
            if (exists) {
                this.showNotification('This identifier is already in the campaign', 'warning');
                return;
            }

            this.currentCampaign.identifiers.push(identifier);
            this.currentCampaign.identifier_count = this.currentCampaign.identifiers.length;
            this.currentCampaign.last_updated = new Date().toISOString().split('T')[0];

            // Save to campaigns.json
            await this.saveCampaignData();

            // Refresh the display
            this.renderCampaignIdentifiersList();

            this.showNotification('Case added to campaign successfully', 'success');
        } catch (error) {
            console.error('Error adding case:', error);
            this.showNotification('Error adding case to campaign', 'error');
        }
    }

    // ============================== ADD ALL FOUND CASES ==============================
    async addAllFoundCases(campaignName, foundCases) {
        try {
            let addedCount = 0;
            let skippedCount = 0;

            for (const caseItem of foundCases) {
                const identifier = {
                    table: caseItem.table,
                    field: caseItem.field,
                    value: caseItem.value,
                    description: caseItem.description,
                    added_date: new Date().toISOString()
                };

                // Check if already exists
                const exists = this.currentCampaign.identifiers.some(id => 
                    id.table === identifier.table && id.field === identifier.field && id.value === identifier.value
                );
                
                if (!exists) {
                    this.currentCampaign.identifiers.push(identifier);
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }

            this.currentCampaign.identifier_count = this.currentCampaign.identifiers.length;
            this.currentCampaign.last_updated = new Date().toISOString().split('T')[0];

            // Save to campaigns.json
            await this.saveCampaignData();

            // Refresh the display
            this.renderCampaignIdentifiersList();

            // Hide validation results
            document.getElementById('bulkValidationResults').style.display = 'none';

            this.showNotification(`Added ${addedCount} cases to campaign${skippedCount > 0 ? `, ${skippedCount} already existed` : ''}`, 'success');
        } catch (error) {
            console.error('Error adding all cases:', error);
            this.showNotification('Error adding cases to campaign', 'error');
        }
    }

    // ============================== CLEAR BULK INPUT ==============================
    clearBulkInput() {
        document.getElementById('bulkCaseInput').value = '';
        document.getElementById('bulkValidationResults').style.display = 'none';
    }

    // ============================== SAVE CAMPAIGN DATA ==============================
    async saveCampaignData() {
        // This method should save the campaign data to campaigns.json
        // Convert the list format to dictionary format that backend expects
        try {
            console.log('💾 Saving campaign data...', {
                totalCampaigns: this.campaigns.length,
                currentCampaign: this.currentCampaign ? this.currentCampaign.name : 'none',
                currentIdentifierCount: this.currentCampaign ? this.currentCampaign.identifiers?.length : 0
            });
            
            // CRITICAL: Reload campaigns from backend first to avoid overwriting changes
            // This prevents data loss if another tab/user made changes
            try {
                const response = await fetch('/api/campaigns');
                if (response.ok) {
                    const latestCampaigns = await response.json();
                    
                    // Merge current campaign's changes into the latest data
                    if (this.currentCampaign && latestCampaigns[this.currentCampaign.name]) {
                        // Update the latest version with our current campaign's changes
                        latestCampaigns[this.currentCampaign.name] = {
                            ...latestCampaigns[this.currentCampaign.name],
                            name: this.currentCampaign.name,
                            description: this.currentCampaign.description,
                            status: this.currentCampaign.status,
                            identifiers: this.currentCampaign.identifiers || [],
                            last_updated: new Date().toISOString().split('T')[0]
                        };
                        console.log('🔄 Merged current campaign changes into latest data');
                    }
                    
                    // Update our local campaigns list with the merged data
                    this.campaigns = Object.values(latestCampaigns);
                }
            } catch (reloadError) {
                console.warn('⚠️ Could not reload latest campaigns, proceeding with current data:', reloadError);
            }
            
            // Convert list format to dictionary format
            const campaignsDict = {};
            this.campaigns.forEach(campaign => {
                // Deduplicate identifiers based on unique combination of table + field + value
                const uniqueIdentifiers = [];
                const seen = new Set();
                
                (campaign.identifiers || []).forEach(identifier => {
                    // Create unique key based on case_number, infrid, or incident_id
                    let uniqueKey;
                    if (identifier.field === 'case_number' || identifier.field === 'infrid' || identifier.field === 'incident_id') {
                        uniqueKey = `${identifier.field}:${identifier.value}`;
                    } else {
                        // Fallback for other field types
                        uniqueKey = `${identifier.table}:${identifier.field}:${identifier.value}`;
                    }
                    
                    if (!seen.has(uniqueKey)) {
                        seen.add(uniqueKey);
                        uniqueIdentifiers.push(identifier);
                    }
                });
                
                console.log(`Campaign ${campaign.name}: ${campaign.identifiers?.length || 0} identifiers, ${uniqueIdentifiers.length} after dedup`);
                
                campaignsDict[campaign.name] = {
                    name: campaign.name,
                    description: campaign.description || '',
                    status: campaign.status || 'ACTIVE',
                    identifiers: uniqueIdentifiers,
                    created_date: campaign.created_date || new Date().toISOString().split('T')[0],
                    last_updated: new Date().toISOString().split('T')[0] // Always update to current time
                };
            });

            console.log('💾 Sending to backend:', {
                campaignCount: Object.keys(campaignsDict).length,
                totalIdentifiers: Object.values(campaignsDict).reduce((sum, c) => sum + c.identifiers.length, 0)
            });

            const response = await fetch('/api/save-campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({campaigns: campaignsDict})
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save campaign data');
            }
            
            const result = await response.json();
            console.log('✅ Campaign data saved successfully:', result);
            
        } catch (error) {
            console.error('❌ Error saving campaign data:', error);
            throw error;
        }
    }

    // ============================== RENDER CAMPAIGN IDENTIFIERS ==============================
    renderCampaignIdentifiers() {
        const casesContainer = document.getElementById('campaignCasesContainer');
        const domainsContainer = document.getElementById('campaignDomainsContainer');
        const campaignDetailsContent = document.getElementById('campaignDetailsContent');
        
        if (!casesContainer || !domainsContainer) return;

        // Only render if we're in the campaign details view
        if (!campaignDetailsContent || campaignDetailsContent.style.display === 'none') {
            return;
        }

        // Update headers
        casesContainer.querySelector('h4').textContent = 'Identifiers';
        domainsContainer.querySelector('h4').textContent = 'All Campaign Data';

        // Show containers only in campaign details view
        casesContainer.style.display = 'block';
        domainsContainer.style.display = 'block';

        // Render identifiers
        const casesList = document.getElementById('campaignCasesList');
        if (casesList && this.currentCampaign.identifiers) {
            if (this.currentCampaign.identifiers.length === 0) {
                casesList.innerHTML = '<div class="no-data-placeholder">No identifiers in this campaign</div>';
            } else {
                casesList.innerHTML = this.currentCampaign.identifiers.map(identifier => {
                    // Handle both string and object formats
                    let identifierType, identifierValue, description;
                    
                    if (typeof identifier === 'string') {
                        // Simple string format
                        identifierType = 'case_number';
                        identifierValue = identifier;
                        description = 'Legacy identifier';
                    } else if (typeof identifier === 'object') {
                        // Object format
                        identifierType = identifier.field || 'unknown';
                        identifierValue = identifier.value;
                        description = identifier.description || 'No description';
                    }
                    
                    return `
                    <div class="case-item">
                        <div class="case-item-info">
                                <div class="case-item-name">${identifierType}: ${identifierValue}</div>
                                <div class="case-item-description">${description}</div>
                        </div>
                        <div class="case-item-actions">
                                <button class="btn-remove" onclick="campaignManagement.removeIdentifier('${identifierType}', '${identifierValue}')" title="Remove identifier">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        }

        // Add "View All Data" button to domains container
        const domainsList = document.getElementById('campaignDomainsList');
        if (domainsList) {
            domainsList.innerHTML = `
                <div class="campaign-data-actions">
                    <button class="btn btn-primary" onclick="loadSelectedCampaignsData()" style="width: 100%; margin-bottom: 16px;">
                        <i class="fas fa-search"></i> View All Campaign Data
                    </button>
                    <p style="text-align: center; color: #6b7280; font-size: 0.875rem;">
                        This will search across all database tables for the identifiers in this campaign
                    </p>
                </div>
            `;
        }
    }

    // ============================== LOAD CAMPAIGN CASES ==============================
    async loadCampaignCases() {
        try {
            const response = await fetch(`/api/campaigns/${encodeURIComponent(this.currentCampaign.name)}/cases`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const cases = await response.json();
            this.renderCampaignCases(cases);
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error loading campaign cases:', error);
            this.showNotification('Error loading campaign cases', 'error');
        }
    }

    // ============================== LOAD CAMPAIGN DOMAINS ==============================
    async loadCampaignDomains() {
        try {
            const response = await fetch(`/api/campaigns/${encodeURIComponent(this.currentCampaign.name)}/domains`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const domains = await response.json();
            this.renderCampaignDomains(domains);
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error loading campaign domains:', error);
            this.showNotification('Error loading campaign domains', 'error');
        }
    }

    // ============================== RENDER CAMPAIGN CASES ==============================
    renderCampaignCases(cases) {
        const casesList = document.getElementById('campaignCasesList');
        if (!casesList) return;

        if (cases.length === 0) {
            casesList.innerHTML = '<div class="no-data-placeholder">No cases in this campaign</div>';
            return;
        }

        casesList.innerHTML = cases.map(caseItem => `
            <div class="case-item">
                <div class="case-item-info">
                    <div class="case-item-name">${caseItem.case_number}</div>
                    <div class="case-item-description">${caseItem.description || 'No description'}</div>
                </div>
                <div class="case-item-actions">
                    <button class="btn-remove" onclick="campaignManagement.removeCase('${caseItem.case_number}')" title="Remove case">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ============================== RENDER CAMPAIGN DOMAINS ==============================
    renderCampaignDomains(domains) {
        const domainsList = document.getElementById('campaignDomainsList');
        if (!domainsList) return;

        if (domains.length === 0) {
            domainsList.innerHTML = '<div class="no-data-placeholder">No domains in this campaign</div>';
            return;
        }

        domainsList.innerHTML = domains.map(domainItem => `
            <div class="domain-item">
                <div class="domain-item-info">
                    <div class="domain-item-name">${domainItem.domain}</div>
                    <div class="domain-item-description">${domainItem.description || 'No description'}</div>
                </div>
                <div class="domain-item-actions">
                    <button class="btn-remove" onclick="campaignManagement.removeDomain('${domainItem.domain}')" title="Remove domain">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ============================== REMOVE CASE ==============================
    async removeCase(caseNumber) {
        if (!this.currentCampaign) return;
        
        if (!confirm(`Are you sure you want to remove case ${caseNumber} from campaign ${this.currentCampaign.name}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/campaigns/${encodeURIComponent(this.currentCampaign.name)}/cases/${encodeURIComponent(caseNumber)}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            this.showNotification('Case removed successfully', 'success');
            await this.loadCampaignCases();
            await this.loadCampaigns(); // Refresh campaign list to update counts
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error removing case:', error);
            this.showNotification('Error removing case', 'error');
        }
    }

    // ============================== REMOVE DOMAIN ==============================
    async removeDomain(domain) {
        if (!this.currentCampaign) return;
        
        if (!confirm(`Are you sure you want to remove domain ${domain} from campaign ${this.currentCampaign.name}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/campaigns/${encodeURIComponent(this.currentCampaign.name)}/domains/${encodeURIComponent(domain)}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            this.showNotification('Domain removed successfully', 'success');
            await this.loadCampaignDomains();
            await this.loadCampaigns(); // Refresh campaign list to update counts
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error removing domain:', error);
            this.showNotification('Error removing domain', 'error');
        }
    }

    // ============================== SETUP EVENT LISTENERS ==============================
    setupEventListeners() {
        // Modal event listeners
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
            
            // Close filter dropdowns when clicking outside
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

        // Form submission handlers
        document.getElementById('campaignForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCampaign();
        });

        document.getElementById('addCaseForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCase();
        });

        document.getElementById('addDomainForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDomain();
        });

        // Analysis date filter event listener
        document.getElementById('analysisDateFilter')?.addEventListener('change', (e) => {
            const value = e.target.value;
            const customRangeSection = document.getElementById('analysisCustomRangeSection');
            
            // Hide custom range section first
            if (customRangeSection) customRangeSection.style.display = 'none';
            
            // Show appropriate section
            if (value === 'custom') {
                if (customRangeSection) customRangeSection.style.display = 'block';
            }
        });

        // Campaign Cases Statistics chart buttons event listeners
        document.addEventListener('click', (e) => {
            if (e.target.closest('#campaign-cases-section .chart-btn')) {
                const btn = e.target.closest('#campaign-cases-section .chart-btn');
                const view = btn.getAttribute('data-view');
                this.switchCasesTab(view);
            }
        });

        // Age filter event listener
        document.getElementById('age-filter')?.addEventListener('change', () => {
            this.applyFilters();
        });

        // Case number filter event listener
        document.getElementById('case-number-filter')?.addEventListener('input', () => {
            this.applyFilters();
        });
    }

    // ============================== SHOW NOTIFICATION ==============================
    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // ============================== CLOSE ALL MODALS ==============================
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // ============================== DESTROY ==============================
    destroy() {
        // Cleanup any resources if needed
        console.log('<i class="fas fa-broom"></i> Campaign Management destroyed');
    }

    // ============================== UPDATE DATA ==============================
    updateData() {
        // Refresh campaign data when section is shown
        console.log('<i class="fas fa-sync-alt"></i> Updating Campaign Management data...');
        this.loadCampaigns();
        this.loadCampaignCheckboxes();
    }

    // ============================== LOAD CAMPAIGN CHECKBOXES ==============================
    async loadCampaignCheckboxes() {
        try {
            const response = await fetch('/api/campaigns/list');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const campaigns = await response.json();
            this.renderCampaignDropdown(campaigns);
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error loading campaign dropdown:', error);
        }
    }

    // ============================== RENDER CAMPAIGN DROPDOWN ==============================
    renderCampaignDropdown(campaigns) {
        const dropdown = document.getElementById('campaignDropdown');
        if (!dropdown) {
            console.warn('Campaign dropdown element not found');
            return;
        }

        // Clear existing options except the first one
        dropdown.innerHTML = '<option value="">Select Campaigns...</option>';
        
        // Add campaign options
        campaigns.forEach(campaign => {
            const option = document.createElement('option');
            option.value = campaign.name;
            option.textContent = `${campaign.name} (${campaign.identifier_count} items)`;
            dropdown.appendChild(option);
        });

        console.log(`<i class="fas fa-check-circle"></i> Loaded ${campaigns.length} campaigns into dropdown`);
    }

    // ============================== TOGGLE CAMPAIGN SELECTION ==============================
    toggleCampaignSelection() {
        const dropdown = document.getElementById('campaignDropdown');
        const campaignName = dropdown.value;
        
        if (!campaignName) return;
        
        if (!this.selectedCampaignsForViewer.includes(campaignName)) {
            this.selectedCampaignsForViewer.push(campaignName);
            this.updateSelectedCampaignsList();
        }

        // Reset dropdown
        dropdown.value = '';
    }

    // ============================== UPDATE SELECTED CAMPAIGNS LIST ==============================
    updateSelectedCampaignsList() {
        const container = document.getElementById('selectedCampaignsTags');
        if (!container) {
            console.warn('Selected campaigns container not found');
            return;
        }
        
        if (this.selectedCampaignsForViewer.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = this.selectedCampaignsForViewer.map(campaignName => `
            <div class="campaign-tag">
                <span>${campaignName}</span>
                <button class="remove-tag" onclick="campaignManagement.removeCampaignFromViewer('${campaignName}')" title="Remove ${campaignName}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    // ============================== REMOVE CAMPAIGN FROM VIEWER ==============================
    removeCampaignFromViewer(campaignName) {
        this.selectedCampaignsForViewer = this.selectedCampaignsForViewer.filter(name => name !== campaignName);
        this.updateSelectedCampaignsList();
    }

    // ============================== SELECT ALL CAMPAIGNS FOR VIEWER ==============================
    selectAllCampaignsForViewer() {
        const dropdown = document.getElementById('campaignDropdown');
        if (!dropdown) return;
        
        const allCampaigns = Array.from(dropdown.options)
            .filter(option => option.value)
            .map(option => option.value);
        
        this.selectedCampaignsForViewer = [...new Set([...this.selectedCampaignsForViewer, ...allCampaigns])];
        this.updateSelectedCampaignsList();
    }

    // ============================== DESelect ALL CAMPAIGNS FOR VIEWER ==============================
    deselectAllCampaignsForViewer() {
        this.selectedCampaignsForViewer = [];
        this.updateSelectedCampaignsList();
    }

    // ============================== HANDLE CAMPAIGN DATE FILTER CHANGE ==============================
    handleCampaignDateFilterChange() {
        const filter = document.getElementById('campaignDateFilter');
        const customRangeSection = document.getElementById('customRangeSection');
        
        if (!filter) return;
        
        // Hide custom range section first
        if (customRangeSection) customRangeSection.style.display = 'none';
        
        // Show relevant section based on selection
        if (filter.value === 'custom') {
            if (customRangeSection) customRangeSection.style.display = 'block';
        }
    }

    // ============================== LOAD CAMPAIGN DATA ==============================
    async loadCampaignData() {
        
        if (this.selectedCampaignsForViewer.length === 0) {
            alert('Please select at least one campaign');
            return;
        }
        
        const resultsContainer = document.getElementById('campaignDataResults');
        const sectionContainer = document.getElementById('campaignUpdatesSection');
        
        if (!resultsContainer) return;
        
        // Show loading state
        resultsContainer.innerHTML = `
            <div class="loading-data">
                <i class="fas fa-spinner"></i>
                <p>Loading campaign data...</p>
            </div>
        `;
        
        try {
            // Build API URL with date filters
            let apiUrl = `/api/campaigns/data/multiple?campaigns=${this.selectedCampaignsForViewer.join('&campaigns=')}`;
            
            // Add date filters if applicable
            const dateFilter = document.getElementById('campaignDateFilter');
            if (dateFilter && dateFilter.value && dateFilter.value !== 'all') {
                apiUrl += `&date_filter=${dateFilter.value}`;
                
                // Add custom date parameters if applicable
                if (dateFilter.value === 'custom') {
                    const startDate = document.getElementById('campaignStartDate');
                    const endDate = document.getElementById('campaignEndDate');
                    if (startDate && startDate.value) apiUrl += `&start_date=${startDate.value}`;
                    if (endDate && endDate.value) apiUrl += `&end_date=${endDate.value}`;
                }
            }
            
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const campaignsData = await response.json();
            console.log('<i class="fas fa-chart-bar"></i> Campaign data received:', campaignsData);
            console.log('<i class="fas fa-chart-bar"></i> Campaign data keys:', Object.keys(campaignsData));
            this.renderEnhancedCampaignsData(campaignsData);
            
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error loading campaigns data:', error);
            
            // Check if it's a connection error
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                resultsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Connection Error</h3>
                        <p>Unable to connect to the server. Please check your connection and try again.</p>
                        <button onclick="campaignManagement.loadCampaignData()" class="retry-btn">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                `;
            } else {
                resultsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error Loading Data</h3>
                        <p>${error.message}</p>
                        <button onclick="campaignManagement.loadCampaignData()" class="retry-btn">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    // ============================== REFRESH CAMPAIGN METADATA ==============================
    async refreshCampaignMetadata(forceRefresh = false) {
        /**
         * Refresh metadata for selected campaigns
         * forceRefresh: if true, refreshes all identifiers regardless of age
         */
        try {
            if (this.selectedCampaignsForViewer.length === 0) {
                this.showNotification('Please select at least one campaign', 'warning');
                return;
            }
            
            const statusIndicator = document.getElementById('metadataStatusIndicator');
            if (statusIndicator) {
                statusIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing metadata...';
                statusIndicator.style.color = '#3b82f6';
            }
            
            let totalRefreshed = 0;
            let totalFailed = 0;
            
            // Refresh each selected campaign
            for (const campaignName of this.selectedCampaignsForViewer) {
                const forceParam = forceRefresh ? '?force=true' : '';
                const response = await fetch(`/api/campaigns/${campaignName}/refresh-metadata${forceParam}`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    totalRefreshed += result.total_refreshed || 0;
                    totalFailed += result.failed || 0;
                    console.log(`<i class="fas fa-sync"></i> Refreshed ${result.total_refreshed} identifiers for ${campaignName}`);
                } else {
                    console.error(`<i class="fas fa-times-circle"></i> Failed to refresh ${campaignName}`);
                    totalFailed++;
                }
            }
            
            // Show result
            if (statusIndicator) {
                if (totalRefreshed > 0) {
                    statusIndicator.innerHTML = `<i class="fas fa-check-circle"></i> Refreshed ${totalRefreshed} identifier(s)`;
                    statusIndicator.style.color = '#10b981';
                    setTimeout(() => {
                        statusIndicator.innerHTML = '';
                    }, 5000);
                } else {
                    statusIndicator.innerHTML = '<i class="fas fa-info-circle"></i> All metadata up to date';
                    statusIndicator.style.color = '#6b7280';
                    setTimeout(() => {
                        statusIndicator.innerHTML = '';
                    }, 3000);
                }
            }
            
            this.showNotification(`Metadata refreshed: ${totalRefreshed} updated, ${totalFailed} failed`, 'success');
            
            // Reload campaign data to show updated information
            await this.loadCampaigns();
            if (this.selectedCampaignsForViewer.length > 0) {
                await this.loadCampaignData();
            }
            
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error refreshing metadata:', error);
            this.showNotification('Failed to refresh metadata', 'error');
            
            const statusIndicator = document.getElementById('metadataStatusIndicator');
            if (statusIndicator) {
                statusIndicator.innerHTML = '<i class="fas fa-exclamation-circle"></i> Refresh failed';
                statusIndicator.style.color = '#ef4444';
            }
        }
    }

    // ============================== RENDER ENHANCED CAMPAIGN DATA ==============================
    renderEnhancedCampaignsData(campaignsData) {
        const resultsContainer = document.getElementById('campaignDataResults');
        const sectionContainer = document.getElementById('campaignUpdatesSection');
        
        if (!resultsContainer) return;

        // Show the entire section when data is loaded
        if (sectionContainer) {
            sectionContainer.style.display = 'block';
        }

        // Store campaign data globally for switchToDataView function
        window.currentCampaignsData = campaignsData;
        console.log('💾 Stored campaign data globally:', window.currentCampaignsData);

        let html = '';

        for (const [campaignName, data] of Object.entries(campaignsData)) {
            // Enrich Cred Theft rows with best URL/host_isp/registrar from associated_urls
            try {
                if (Array.isArray(data.associated_urls) && Array.isArray(data.case_data_incidents)) {
                    const bestByCase = new Map();
                    data.associated_urls.forEach(u => {
                        const cn = u.case_number;
                        if (!cn) return;
                        const curr = bestByCase.get(cn);
                        const currLen = curr && curr.url ? curr.url.length : -1;
                        const newLen = u.url ? u.url.length : -1;
                        if (!curr || newLen > currLen) {
                            bestByCase.set(cn, u);
                        }
                    });
                    data.case_data_incidents.forEach(item => {
                        const best = bestByCase.get(item.case_number);
                        if (best) {
                            if (!item.url) item.url = best.url || item.url;
                            if (!item.host_isp) item.host_isp = best.host_isp || item.host_isp;
                            if (!item.registrar_name) item.registrar_name = best.registrar_name || item.registrar_name;
                        }
                    });
                }
            } catch (e) {
                console.warn('Campaign data enrichment skipped due to error:', e);
            }
            html += `
                <div class="enhanced-campaign-section">
                    <div class="campaign-header">
                        <h2 class="campaign-title">
                            ${campaignName}
                            <button class="csv-export-btn" onclick="campaignManagement.exportCampaignCSV('${campaignName}')" title="Export all data for ${campaignName}">
                                <i class="fas fa-download"></i>
                            </button>
                        </h2>
                        <div class="campaign-stats">
                            <span class="stat-item" onclick="campaignManagement.switchToDataView('${campaignName}', 'cred-theft')">
                                <i class="fas fa-key"></i>
                                ${data.case_data_incidents ? data.case_data_incidents.length : 0} Cred Theft
                            </span>
                            <span class="stat-item" onclick="campaignManagement.switchToDataView('${campaignName}', 'domain-monitoring')">
                                <i class="fas fa-globe"></i>
                                ${data.threat_intelligence_incidents ? data.threat_intelligence_incidents.length : 0} Domain Monitoring
                            </span>
                            <span class="stat-item" onclick="campaignManagement.switchToDataView('${campaignName}', 'social-media')">
                                <i class="fas fa-share-alt"></i>
                                ${data.social_incidents ? data.social_incidents.length : 0} Social Media
                            </span>
                        </div>
                    </div>
                    
                    <div class="campaign-data-content">
                        <div class="data-tab-content" id="${campaignName}-cred-theft">
                            <h4><i class="fas fa-key"></i> Cred Theft Cases</h4>
                            ${this.renderCampaignDataTable(data.case_data_incidents, 'Cred Theft', campaignName)}
                        </div>
                        <div class="data-tab-content" id="${campaignName}-domain-monitoring">
                            <h4><i class="fas fa-globe"></i> Domain Monitoring Cases</h4>
                            ${this.renderCampaignDataTable(data.threat_intelligence_incidents, 'Domain Monitoring', campaignName)}
                        </div>
                        <div class="data-tab-content" id="${campaignName}-social-media">
                            <h4><i class="fas fa-share-alt"></i> Social Media Cases</h4>
                            ${this.renderCampaignDataTable(data.social_incidents, 'Social Media', campaignName)}
                        </div>
                    </div>
                </div>
            `;
        }

        resultsContainer.innerHTML = html;
        
        // Apply any active filters after rendering the data
        this.applyFilters();
    }

    // ============================== SWITCH TO DATA VIEW ==============================
    switchToDataView(campaignName, dataType) {
        console.log(`<i class="fas fa-sync-alt"></i> Switching to ${dataType} view for ${campaignName}`);
        
        // Find the campaign section
        const campaignSection = document.querySelector(`#${campaignName}-cred-theft`)?.closest('.enhanced-campaign-section');
        
        if (!campaignSection) {
            console.log(`<i class="fas fa-times-circle"></i> Campaign section not found for: ${campaignName}`);
            return;
        }
        
        console.log(`📍 Found campaign section:`, campaignSection);
        
        // Hide all tab contents
        const allTabs = campaignSection.querySelectorAll('.data-tab-content');
        console.log(`<i class="fas fa-clipboard"></i> Found ${allTabs.length} tab contents:`, allTabs);
        
        allTabs.forEach(tab => {
            tab.classList.remove('active');
            tab.style.display = 'none'; // Force hide with inline style
            console.log(`🚫 Hiding tab: ${tab.id}`);
        });
        
        // Remove active class from all stat items in this campaign
        const statItems = campaignSection.querySelectorAll('.stat-item');
        statItems.forEach(item => item.classList.remove('active'));
        
        // Show the selected tab
        let targetTabId;
        switch(dataType) {
            case 'cred-theft':
                targetTabId = `${campaignName}-cred-theft`;
                break;
            case 'domain-monitoring':
                targetTabId = `${campaignName}-domain-monitoring`;
                break;
            case 'social-media':
                targetTabId = `${campaignName}-social-media`;
                break;
            default:
                console.log(`<i class="fas fa-times-circle"></i> Unknown data type: ${dataType}`);
                return;
        }
        
        const targetTab = document.getElementById(targetTabId);
        if (targetTab) {
            targetTab.classList.add('active');
            targetTab.style.display = 'block'; // Force show with inline style
            console.log(`<i class="fas fa-check-circle"></i> Showing tab: ${targetTabId}`);
        } else {
            console.log(`<i class="fas fa-times-circle"></i> Target tab not found: ${targetTabId}`);
        }
        
        // Add active class to clicked stat item
        const clickedStatItem = campaignSection.querySelector(`[onclick*="${dataType}"]`);
        if (clickedStatItem) {
            clickedStatItem.classList.add('active');
        }
        
        console.log(`<i class="fas fa-check-circle"></i> Switched to ${dataType} view for ${campaignName}`);
    }

    // ============================== GET TABLE HEADERS ==============================
    getTableHeaders(dataType) {
        switch(dataType) {
            case 'Cred Theft':
                return ['Case Number', 'URL', 'Case Type', 'Date Created', 'Date Closed', 'Age (D)', 'Status', 'Registrar', 'Host ISP'];
            case 'Domain Monitoring':
                return ['Incident ID', 'URL', 'Category', 'Created Date', 'Resolved Date', 'Age (D)', 'Status'];
            case 'Social Media':
                return ['Incident ID', 'URL', 'Threat Type', 'Created', 'Closed', 'Age (D)', 'Status'];
            default:
                return [];
        }
    }

    // ============================== RENDER TABLE ROW ==============================
    renderTableRow(item, dataType) {
        switch(dataType) {
            case 'Cred Theft':
                return `
                    <tr>
                        <td>${item.case_number || '-'}</td>
                        <td>${item.url || '-'}</td>
                        <td>${item.case_type || '-'}</td>
                        <td>${item.date_created_local || '-'}</td>
                        <td>${item.date_closed_local || '-'}</td>
                        <td><span class="age-badge">${item.age_days !== null && item.age_days !== undefined ? item.age_days : '-'}</span></td>
                        <td>
                            <span class="status-badge ${item.case_status_display ? 'data-inconsistency' : (item.case_status || '').toLowerCase()}">
                                ${item.case_status_display || item.case_status || '-'}
                            </span>
                        </td>
                        <td>${item.registrar_name || '-'}</td>
                        <td>${item.host_isp || '-'}</td>
                    </tr>
                `;
            case 'Domain Monitoring':
                return `
                    <tr>
                        <td>${item.infrid || '-'}</td>
                        <td>${item.url || '-'}</td>
                        <td>${item.cat_name || '-'}</td>
                        <td>${item.create_date || '-'}</td>
                        <td>${item.date_resolved || '-'}</td>
                        <td><span class="age-badge">${item.age_days !== null && item.age_days !== undefined ? item.age_days : '-'}</span></td>
                        <td>
                            <span class="status-badge ${(item.incident_status || '').toLowerCase()}">
                                ${item.incident_status || '-'}
                            </span>
                        </td>
                    </tr>
                `;
            case 'Social Media':
                return `
                    <tr>
                        <td>${item.incident_id || '-'}</td>
                        <td>${item.url || '-'}</td>
                        <td>${item.threat_type || '-'}</td>
                        <td>${item.created_local || '-'}</td>
                        <td>${item.closed_local || '-'}</td>
                        <td><span class="age-badge">${item.age_days !== null && item.age_days !== undefined ? item.age_days : '-'}</span></td>
                        <td>
                            <span class="status-badge ${(item.status || '').toLowerCase()}">
                                ${item.status || '-'}
                            </span>
                        </td>
                    </tr>
                `;
            default:
                return '';
        }
    }

    // ============================== ESCAPE HTML ATTRIBUTE ==============================
    escapeHtmlAttr(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    
    // ============================== DECODE HTML ENTITIES ==============================
    decodeHtmlEntities(text) {
        if (!text) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    // ============================== RENDER CAMPAIGN DATA TABLE ==============================
    renderCampaignDataTable(data, dataType, campaignName) {
        if (!data || data.length === 0) {
            return `
                <div class="data-table-section">
                    <div class="table-container">
                        <div class="no-data">
                            <i class="fas fa-inbox"></i>
                            <p>No ${dataType} data available</p>
                        </div>
                    </div>
                </div>
            `;
        }

        const headers = this.getTableHeaders(dataType);
        const tableId = `${campaignName}-${dataType.replace(/\s+/g, '-').toLowerCase()}-table`;
        
        // Get unique values for filterable columns
        const filterOptions = this.getFilterOptions(data, dataType);
        const filterableColumns = Object.keys(filterOptions);
        
        const rows = data.map(item => this.renderTableRow(item, dataType)).join('');

        // Generate header cells with filter icons only
        const headerCells = headers.map((header, index) => {
            const isFilterable = filterableColumns.includes(header);
            const filterId = `${tableId}-filter-${header.replace(/\s+/g, '-').toLowerCase()}`;
            
            if (isFilterable) {
                return `
                    <th class="filterable-header" data-filter-id="${filterId}">
                        <div class="header-wrapper">
                            <span class="header-text">${header}</span>
                            <i class="fas fa-filter filter-icon" onclick="window.campaignManagement.toggleColumnFilter(event, '${filterId}')"></i>
                        </div>
                    </th>
                `;
            } else {
                return `<th>${header}</th>`;
            }
        }).join('');
        
        // Generate dropdowns separately (outside table)
        const dropdowns = filterableColumns.map(columnName => {
            const filterId = `${tableId}-filter-${columnName.replace(/\s+/g, '-').toLowerCase()}`;
            const options = filterOptions[columnName];
            return `
                <div class="column-filter-dropdown" id="${filterId}" data-table="${tableId}" data-column="${this.escapeHtmlAttr(columnName)}">
                    <div class="filter-dropdown-content">
                        <div class="filter-options">
                            ${options.map(opt => `<label class="filter-option"><input type="checkbox" value="${this.escapeHtmlAttr(opt)}"><span>${opt}</span></label>`).join('')}
                        </div>
                        <div class="filter-actions">
                            <button class="filter-btn apply-btn" onclick="window.campaignManagement.applyColumnFilter('${filterId}')" title="Apply filter">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="filter-btn clear-btn" onclick="window.campaignManagement.clearColumnFilter('${filterId}')" title="Clear all selections">
                                <i class="fas fa-eraser"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="enhanced-table-container">
                <table class="enhanced-data-table modern-table filterable-table" id="${tableId}">
                    <thead>
                        <tr>
                            ${headerCells}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                ${dropdowns}
            </div>
        `;
    }
    
    // ============================== GET FILTER OPTIONS ==============================
    getFilterOptions(data, dataType) {
        const options = {};
        
        console.log(`📊 Getting filter options for ${dataType}, data count: ${data ? data.length : 0}`);
        
        switch(dataType) {
            case 'Cred Theft':
                options['Case Type'] = [...new Set(data.map(item => item.case_type).filter(v => v))].sort();
                options['Status'] = [...new Set(data.map(item => item.case_status || item.case_status_display).filter(v => v))].sort();
                options['Registrar'] = [...new Set(data.map(item => item.registrar_name).filter(v => v && v !== '-'))].sort();
                options['Host ISP'] = [...new Set(data.map(item => item.host_isp).filter(v => v && v !== '-'))].sort();
                console.log(`🔍 Cred Theft filter options:`, options);
                break;
            case 'Domain Monitoring':
                options['Category'] = [...new Set(data.map(item => item.cat_name).filter(v => v))].sort();
                options['Status'] = [...new Set(data.map(item => item.incident_status).filter(v => v))].sort();
                console.log(`🔍 Domain Monitoring filter options:`, options);
                break;
            case 'Social Media':
                options['Threat Type'] = [...new Set(data.map(item => item.threat_type).filter(v => v))].sort();
                options['Status'] = [...new Set(data.map(item => item.status).filter(v => v))].sort();
                console.log(`🔍 Social Media filter options:`, options);
                break;
        }
        
        return options;
    }
    
    // ============================== TOGGLE COLUMN FILTER ==============================
    toggleColumnFilter(event, filterId) {
        event.stopPropagation();
        
        const dropdown = document.getElementById(filterId);
        if (!dropdown) return;
        
        // Close all other dropdowns
        document.querySelectorAll('.column-filter-dropdown').forEach(d => {
            if (d.id !== filterId) {
                d.style.display = 'none';
            }
        });
        
        // Check if visible
        const isVisible = dropdown.style.display === 'block';
        
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
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
    
    // ============================== APPLY COLUMN FILTER ==============================
    applyColumnFilter(filterId) {
        const dropdown = document.getElementById(filterId);
        if (!dropdown) return;
        
        const tableId = dropdown.dataset.table;
        const columnName = this.decodeHtmlEntities(dropdown.dataset.column);
        const table = document.getElementById(tableId);
        if (!table) return;
        
        // Get selected values and decode HTML entities
        const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:checked');
        const selectedValues = Array.from(checkboxes).map(cb => this.decodeHtmlEntities(cb.value).trim());
        
        console.log(`🔍 Filter applied - Column: "${columnName}", Selected values:`, selectedValues);
        
        // Get column index
        const headers = Array.from(table.querySelectorAll('thead th .header-text, thead th:not(.filterable-header)'))
            .map(el => el.textContent.trim());
        const columnIndex = headers.indexOf(columnName);
        
        if (columnIndex === -1) {
            console.error(`❌ Column "${columnName}" not found in headers:`, headers);
            return;
        }
        
        // Store active filter
        if (!table.dataset.activeFilters) {
            table.dataset.activeFilters = '{}';
        }
        const activeFilters = JSON.parse(table.dataset.activeFilters);
        
        if (selectedValues.length > 0) {
            activeFilters[columnIndex] = selectedValues;
        } else {
            delete activeFilters[columnIndex];
        }
        
        table.dataset.activeFilters = JSON.stringify(activeFilters);
        
        // Apply all filters
        this.applyAllFilters(tableId);
        
        // Add visual indicator
        const filterIcon = dropdown.previousElementSibling.querySelector('.filter-icon');
        if (filterIcon) {
            if (selectedValues.length > 0) {
                filterIcon.classList.add('active');
            } else {
                filterIcon.classList.remove('active');
            }
        }
        
        // Close dropdown and remove scroll listener
        dropdown.style.display = 'none';
        if (dropdown._repositionHandler) {
            window.removeEventListener('scroll', dropdown._repositionHandler, true);
            dropdown._repositionHandler = null;
            dropdown._headerElement = null;
        }
        
        showNotification(`Filter applied to ${columnName}`, 'success');
    }
    
    // ============================== CLEAR COLUMN FILTER ==============================
    clearColumnFilter(filterId) {
        const dropdown = document.getElementById(filterId);
        if (!dropdown) return;
        
        // Uncheck all checkboxes
        const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        
        // Apply (which will remove the filter)
        this.applyColumnFilter(filterId);
    }
    
    // ============================== APPLY ALL FILTERS ==============================
    applyAllFilters(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const activeFilters = JSON.parse(table.dataset.activeFilters || '{}');
        const tbody = table.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');
        
        console.log(`🔎 Applying filters:`, activeFilters);
        let visibleCount = 0;
        let debuggedFirstRow = false;
        
        rows.forEach((row, rowIndex) => {
            let show = true;
            const cells = row.querySelectorAll('td');
            
            // Debug first row to see what we're comparing
            if (!debuggedFirstRow && rowIndex === 0) {
                console.log(`🔍 First row cell values:`, Array.from(cells).map((c, i) => `[${i}] "${c.textContent.trim()}"`));
                debuggedFirstRow = true;
            }
            
            // Check each active filter
            for (const [columnIndex, allowedValues] of Object.entries(activeFilters)) {
                const cellValue = cells[columnIndex]?.textContent.trim();
                
                // Debug mismatches
                if (!allowedValues.includes(cellValue)) {
                    if (rowIndex < 3) { // Only log first 3 mismatches
                        console.log(`❌ Row ${rowIndex} Column ${columnIndex}: "${cellValue}" not in`, allowedValues);
                    }
                    show = false;
                    break;
                }
            }
            
            row.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });
        
        console.log(`✅ Filter result: ${visibleCount} of ${rows.length} rows visible`);
    }

    // ============================== EXPORT CAMPAIGN CSV ==============================
    exportCampaignCSV(campaignName) {
        console.log(`<i class="fas fa-sync-alt"></i> Exporting CSV for campaign: ${campaignName}`);
        
        // Get the campaign data from the stored data
        const campaignsData = window.currentCampaignsData || {};
        const campaignData = campaignsData[campaignName];
        if (!campaignData) {
            alert('No data available for export');
            return;
        }

        // Combine all data types for export
        const allData = [];
        
        // Add Cred Theft data
        if (campaignData.case_data_incidents) {
            campaignData.case_data_incidents.forEach(item => {
                allData.push({
                    Type: 'Cred Theft',
                    'Case/Incident ID': item.case_number,
                    URL: item.url,
                    'Case Type/Category': item.case_type,
                    'Date Created': item.date_created_local,
                    'Date Closed': item.date_closed_local,
                    'Age (D)': item.age_days,
                    Status: item.case_status_display || item.case_status,
                    Registrar: item.registrar_name,
                    'Host ISP': item.host_isp
                });
            });
        }
        
        // Add Domain Monitoring data
        if (campaignData.threat_intelligence_incidents) {
            campaignData.threat_intelligence_incidents.forEach(item => {
                allData.push({
                    Type: 'Domain Monitoring',
                    'Case/Incident ID': item.infrid,
                    URL: item.url,
                    'Case Type/Category': item.cat_name,
                    'Date Created': item.create_date,
                    'Date Closed': item.date_resolved,
                    'Age (D)': item.age_days,
                    Status: item.incident_status
                });
            });
        }
        
        // Add Social Media data
        if (campaignData.social_incidents) {
            campaignData.social_incidents.forEach(item => {
                allData.push({
                    Type: 'Social Media',
                    'Case/Incident ID': item.incident_id,
                    URL: item.url,
                    'Case Type/Category': item.threat_type,
                    'Date Created': item.created_local,
                    'Date Closed': item.closed_local,
                    'Age (D)': item.age_days,
                    Status: item.status
                });
            });
        }

        // Convert to CSV
        if (allData.length === 0) {
            alert('No data available for export');
            return;
        }

        const headers = Object.keys(allData[0]);
        const csvContent = [
            headers.join(','),
            ...allData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${campaignName}_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        console.log(`<i class="fas fa-check-circle"></i> Exported ${allData.length} records for ${campaignName}`);
    }

    // ============================== SHOW CREATE CAMPAIGN MODAL ==============================
    showCreateCampaignModal() {
        document.getElementById('campaignModalTitle').textContent = 'Create Campaign';
        document.getElementById('campaignForm').reset();
        document.getElementById('campaignModal').style.display = 'block';
    }

    // ============================== SHOW EDIT CAMPAIGN MODAL ==============================
    showEditCampaignModal() {
        if (!this.currentCampaign) return;
        
        document.getElementById('campaignModalTitle').textContent = 'Edit Campaign';
        document.getElementById('campaignName').value = this.currentCampaign.name;
        document.getElementById('campaignDescription').value = this.currentCampaign.description || '';
        document.getElementById('campaignModal').style.display = 'block';
    }

    // ============================== CLOSE CAMPAIGN MODAL ==============================
    closeCampaignModal() {
        document.getElementById('campaignModal').style.display = 'none';
    }

    // ============================== SHOW ADD CASE MODAL ==============================
    showAddCaseModal() {
        if (!this.currentCampaign) {
            this.showNotification('Please select a campaign first', 'warning');
            return;
        }
        
        document.getElementById('addCaseForm').reset();
        document.getElementById('addCaseModal').style.display = 'block';
    }

    // ============================== CLOSE ADD CASE MODAL ==============================
    closeAddCaseModal() {
        document.getElementById('addCaseModal').style.display = 'none';
    }

    // ============================== SHOW ADD DOMAIN MODAL ==============================
    showAddDomainModal() {
        if (!this.currentCampaign) {
            this.showNotification('Please select a campaign first', 'warning');
            return;
        }
        
        document.getElementById('addDomainForm').reset();
        document.getElementById('addDomainModal').style.display = 'block';
    }

    // ============================== CLOSE ADD DOMAIN MODAL ==============================
    closeAddDomainModal() {
        document.getElementById('addDomainModal').style.display = 'none';
    }

    // ============================== SAVE CAMPAIGN ==============================
    async saveCampaign() {
        const formData = {
            name: document.getElementById('campaignName').value,
            description: document.getElementById('campaignDescription').value
        };

        if (!formData.name.trim()) {
            this.showNotification('Campaign name is required', 'error');
            return;
        }

        try {
            const isEdit = document.getElementById('campaignModalTitle').textContent === 'Edit Campaign';
            const url = isEdit ? `/api/campaigns/${encodeURIComponent(this.currentCampaign.name)}` : '/api/campaigns/create';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save campaign');
            }

            this.showNotification(
                isEdit ? 'Campaign updated successfully' : 'Campaign created successfully', 
                'success'
            );
            
            this.closeCampaignModal();
            await this.loadCampaigns();
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error saving campaign:', error);
            this.showNotification(error.message || 'Error saving campaign', 'error');
        }
    }

    // ============================== SAVE CASE ==============================
    async saveCase() {
        const formData = {
            case_number: document.getElementById('caseNumber').value,
            description: document.getElementById('caseDescription').value,
            table: document.getElementById('caseTable').value
        };

        if (!formData.case_number.trim()) {
            this.showNotification('Case number is required', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/campaigns/${encodeURIComponent(this.currentCampaign.name)}/cases`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add case');
            }

            this.showNotification('Case added successfully', 'success');
            this.closeAddCaseModal();
            await this.loadCampaignCases();
            await this.loadCampaigns(); // Refresh campaign list to update counts
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error adding case:', error);
            this.showNotification(error.message || 'Error adding case', 'error');
        }
    }

    // ============================== SAVE DOMAIN ==============================
    async saveDomain() {
        const formData = {
            domain: document.getElementById('domainName').value,
            description: document.getElementById('domainDescription').value,
            table: document.getElementById('domainTable').value
        };

        if (!formData.domain.trim()) {
            this.showNotification('Domain is required', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/campaigns/${encodeURIComponent(this.currentCampaign.name)}/domains`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add domain');
            }

            this.showNotification('Domain added successfully', 'success');
            this.closeAddDomainModal();
            await this.loadCampaignDomains();
            await this.loadCampaigns(); // Refresh campaign list to update counts
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error adding domain:', error);
            this.showNotification(error.message || 'Error adding domain', 'error');
        }
    }

    // ============================== DELETE CAMPAIGN ==============================
    async deleteCampaign() {
        if (!this.currentCampaign) return;
        
        const campaignName = this.currentCampaign.name;
        if (!confirm(`Are you sure you want to delete campaign "${campaignName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/campaigns/${encodeURIComponent(campaignName)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete campaign');
            }

            this.showNotification('Campaign deleted successfully', 'success');
            this.currentCampaign = null;
            
            // Reset UI
            document.getElementById('selectedCampaignName').textContent = 'Select a Campaign';
            document.getElementById('campaignActions').style.display = 'none';
            document.getElementById('campaignDetailsContent').innerHTML = `
                <div class="no-selection-placeholder">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>Select a campaign from the list to view and manage its details</p>
                </div>
            `;
            document.getElementById('campaignCasesContainer').style.display = 'none';
            document.getElementById('campaignDomainsContainer').style.display = 'none';
            
            await this.loadCampaigns();
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error deleting campaign:', error);
            this.showNotification(error.message || 'Error deleting campaign', 'error');
        }
    }

    // ============================== APPLY FILTERS ==============================
    applyFilters() {
        const ageFilter = document.getElementById('age-filter').value;
        const caseNumberFilter = document.getElementById('case-number-filter').value.toLowerCase();
        
        const tables = document.querySelectorAll('.enhanced-data-table');
        
        tables.forEach(table => {
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                let showRow = true;
                
                // Age filter
                if (ageFilter && showRow) {
                    const ageCell = row.querySelector('.age-badge');
                    if (ageCell) {
                        const ageText = ageCell.textContent.trim();
                        const age = parseInt(ageText);
                        
                        if (!isNaN(age)) {
                        if (ageFilter === '0-7' && (age < 0 || age > 7)) showRow = false;
                        else if (ageFilter === '8-30' && (age < 8 || age > 30)) showRow = false;
                        else if (ageFilter === '31-90' && (age < 31 || age > 90)) showRow = false;
                        else if (ageFilter === '90+' && age <= 90) showRow = false;
                        } else {
                            // If age is not a number (like '-'), hide the row for any age filter
                            showRow = false;
                        }
                    }
                }
                
                // Case number filter
                if (caseNumberFilter && showRow) {
                    const caseNumberCell = row.querySelector('td:first-child');
                    if (caseNumberCell && !caseNumberCell.textContent.toLowerCase().includes(caseNumberFilter)) {
                        showRow = false;
                    }
                }
                
                row.style.display = showRow ? '' : 'none';
            });
        });
    }

    // ============================== SHOW CAMPAIGN TAB ==============================
    showCampaignTab(tabName) {
        // Hide all tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.campaign-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab pane
        const targetPane = document.getElementById(`${tabName}-tab-content`);
        if (targetPane) {
            targetPane.classList.add('active');
        }
        
        // Add active class to selected tab
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // Clear Analysis content when switching away from Analysis tab
        if (tabName !== 'analysis') {
            const analysisResults = document.querySelector('#analysis-tab-content .analysis-results');
            if (analysisResults) {
                analysisResults.innerHTML = '';
            }
            const filteredAnalysis = document.querySelector('#filtered-analysis-container');
            if (filteredAnalysis) {
                filteredAnalysis.style.display = 'none';
                filteredAnalysis.innerHTML = '';
            }
        }
        
        // Load data for Data Viewer tab
        if (tabName === 'data-viewer') {
            this.loadCampaignCheckboxes();
        } else if (tabName === 'analysis') {
            this.populateAnalysisCampaignFilter();
            // Load the default analysis immediately when switching to Analysis tab
            this.loadAnalysisDashboard();
        }
        
    }

    // ============================== APPLY CUSTOM RANGE ==============================
    applyCustomRange() {
        const startDateElement = document.getElementById('campaignStartDate');
        const endDateElement = document.getElementById('campaignEndDate');
        
        const startDate = startDateElement ? startDateElement.value : '';
        const endDate = endDateElement ? endDateElement.value : '';
        
        if (!startDate || !endDate) {
            this.showNotification('Please select both start and end dates', 'error');
            return;
        }
        
        // Update campaign date filter
        this.campaignDateFilter = {
            type: 'custom',
            startDate: startDate,
            endDate: endDate
        };
        
        console.log('Custom range applied:', this.campaignDateFilter);
        this.showNotification('Custom date range applied successfully', 'success');
        
        // Refresh campaign data if loaded
        if (this.currentCampaign) {
            this.loadCampaignData();
        }
    }

    // ============================== SHOW DATA TAB ==============================
    showDataTab(campaignName, tabType) {
        // Find the campaign section by looking for the campaign title
        const campaignSections = document.querySelectorAll('.enhanced-campaign-section');
        let campaignSection = null;
        
        for (let section of campaignSections) {
            const titleElement = section.querySelector('.campaign-title');
            if (titleElement && titleElement.textContent.includes(campaignName)) {
                campaignSection = section;
                break;
            }
        }
        
        if (!campaignSection) {
            console.warn(`Campaign section not found for: ${campaignName}`);
            return;
        }
        
        // Remove active class from all tabs
        campaignSection.querySelectorAll('.data-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Hide all tab contents
        campaignSection.querySelectorAll('.data-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = campaignSection.querySelector(`[onclick="showDataTab('${campaignName}', '${tabType}')"]`);
        const selectedContent = campaignSection.querySelector(`#${campaignName}-${tabType}`);
        
        if (selectedTab) selectedTab.classList.add('active');
        if (selectedContent) selectedContent.classList.add('active');
    }

    // ============================== EXPORT TABLE ==============================
    exportTable(tableId, type) {
        const table = document.getElementById(tableId);
        if (!table) {
            this.showNotification(`Table ${tableId} not found`, 'error');
            return;
        }
        
        // Create CSV content
        let csv = '';
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            const rowData = Array.from(cells).map(cell => {
                let text = cell.textContent.trim();
                // Escape quotes and wrap in quotes if contains comma
                if (text.includes(',') || text.includes('"')) {
                    text = '"' + text.replace(/"/g, '""') + '"';
                }
                return text;
            });
            csv += rowData.join(',') + '\n';
        });
        
        // Download CSV
        try {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `campaign_${type}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification(`${type} data exported successfully`, 'success');
        } catch (error) {
            console.error('Error exporting table:', error);
            this.showNotification('Error exporting table', 'error');
        }
    }

    // ============================== TOGGLE TABLE COLUMNS ==============================
    toggleTableColumns(tableId) {
        const table = document.getElementById(tableId);
        if (!table) {
            this.showNotification(`Table ${tableId} not found`, 'error');
            return;
        }
        
        // Simple column toggle - hide/show every other column
        const headers = table.querySelectorAll('th');
        const rows = table.querySelectorAll('tr');
        
        headers.forEach((header, index) => {
            if (index > 0 && index % 2 === 0) { // Skip first column, toggle every other
                const isHidden = header.style.display === 'none';
                header.style.display = isHidden ? '' : 'none';
                
                rows.forEach(row => {
                    const cell = row.children[index];
                    if (cell) {
                        cell.style.display = isHidden ? '' : 'none';
                    }
                });
            }
        });
        
        this.showNotification('Table columns toggled', 'info');
    }

    // ============================== SHOW CREATE CAMPAIGN MODAL ==============================
    showCreateCampaignModal() {
        document.getElementById('campaignModal').style.display = 'block';
    }

    // ============================== SHOW EDIT CAMPAIGN MODAL ==============================
    showEditCampaignModal() {
        if (!this.currentCampaign) {
            this.showNotification('Please select a campaign first', 'error');
            return;
        }
        // Populate form with current campaign data
        document.getElementById('campaignName').value = this.currentCampaign.name;
        document.getElementById('campaignDescription').value = this.currentCampaign.description || '';
        document.getElementById('campaignModal').style.display = 'block';
    }

    // ============================== CLOSE CAMPAIGN MODAL ==============================
    closeCampaignModal() {
        document.getElementById('campaignModal').style.display = 'none';
        // Clear form
        document.getElementById('campaignForm').reset();
    }

    // ============================== SHOW ADD CASE MODAL ==============================
    showAddCaseModal() {
        if (!this.currentCampaign) {
            this.showNotification('Please select a campaign first', 'error');
            return;
        }
        document.getElementById('addCaseModal').style.display = 'block';
    }

    // ============================== CLOSE ADD CASE MODAL ==============================
    closeAddCaseModal() {
        document.getElementById('addCaseModal').style.display = 'none';
        document.getElementById('addCaseForm').reset();
    }

    // ============================== SHOW ADD DOMAIN MODAL ==============================
    showAddDomainModal() {
        if (!this.currentCampaign) {
            this.showNotification('Please select a campaign first', 'error');
            return;
        }
        document.getElementById('addDomainModal').style.display = 'block';
    }

    // ============================== CLOSE ADD DOMAIN MODAL ==============================
    closeAddDomainModal() {
        document.getElementById('addDomainModal').style.display = 'none';
        document.getElementById('addDomainForm').reset();
    }

    // ============================== SAVE CAMPAIGN ==============================
    async saveCampaign() {
        const name = document.getElementById('campaignName').value.trim();
        const description = document.getElementById('campaignDescription').value.trim();
        
        if (!name) {
            this.showNotification('Campaign name is required', 'error');
            return;
        }

        try {
            const campaignData = {
                name: name,
                description: description,
                status: 'active'
            };

            const response = await fetch('/api/campaigns/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(campaignData)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            this.showNotification('Campaign saved successfully', 'success');
            this.closeCampaignModal();
            await this.loadCampaigns();
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error saving campaign:', error);
            this.showNotification('Error saving campaign', 'error');
        }
    }

    // ============================== SAVE CASE ==============================
    async saveCase() {
        const caseNumber = document.getElementById('caseNumber').value.trim();
        const description = document.getElementById('caseDescription').value.trim();
        
        if (!caseNumber || !this.currentCampaign) {
            this.showNotification('Case number and campaign selection required', 'error');
            return;
        }

        try {
            const caseData = {
                case_number: caseNumber,
                description: description,
                campaign_name: this.currentCampaign.name
            };

            const response = await fetch('/api/campaigns/add-case', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(caseData)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            this.showNotification('Case added successfully', 'success');
            this.closeAddCaseModal();
            await this.loadCampaignCases();
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error saving case:', error);
            this.showNotification('Error saving case', 'error');
        }
    }

    // ============================== SAVE DOMAIN ==============================
    async saveDomain() {
        const domain = document.getElementById('domainName').value.trim();
        const description = document.getElementById('domainDescription').value.trim();
        
        if (!domain || !this.currentCampaign) {
            this.showNotification('Domain and campaign selection required', 'error');
            return;
        }

        try {
            const domainData = {
                domain: domain,
                description: description,
                campaign_name: this.currentCampaign.name
            };

            const response = await fetch('/api/campaigns/add-domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(domainData)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            this.showNotification('Domain added successfully', 'success');
            this.closeAddDomainModal();
            await this.loadCampaignDomains();
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error saving domain:', error);
            this.showNotification('Error saving domain', 'error');
        }
    }

    // ============================== DELETE CAMPAIGN ==============================
    async deleteCampaign() {
        if (!this.currentCampaign) {
            this.showNotification('Please select a campaign first', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete campaign "${this.currentCampaign.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/campaigns/${encodeURIComponent(this.currentCampaign.name)}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            this.showNotification('Campaign deleted successfully', 'success');
            this.currentCampaign = null;
            await this.loadCampaigns();
            
            // Clear campaign details
            document.getElementById('selectedCampaignName').textContent = '';
            document.getElementById('campaignActions').style.display = 'none';
            document.getElementById('campaignDetailsContent').innerHTML = '';
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error deleting campaign:', error);
            this.showNotification('Error deleting campaign', 'error');
        }
    }

    // ============================== REMOVE IDENTIFIER ==============================
    async removeIdentifier(identifierType, identifierValue) {
        if (!this.currentCampaign) return;
        
        if (!confirm(`Are you sure you want to remove ${identifierType}: ${identifierValue} from campaign ${this.currentCampaign.name}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/campaigns/${encodeURIComponent(this.currentCampaign.name)}/remove-identifier`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: identifierType,
                    value: identifierValue
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            this.showNotification('Identifier removed successfully', 'success');
            
            // Reload campaigns to get fresh data
            await this.loadCampaigns();
            
            // Refresh the current campaign data with updated information
            if (this.currentCampaign) {
                const campaignName = this.currentCampaign.name;
                // Fetch the updated campaign data
                const response = await fetch('/api/campaigns');
                const allCampaigns = await response.json();
                
                if (allCampaigns[campaignName]) {
                    this.currentCampaign = {
                        name: campaignName,
                        ...allCampaigns[campaignName]
                    };
                }
                
                // Update the UI with fresh data
                this.renderCampaignIdentifiersList();
                this.renderCampaignIdentifiers();
            }
        } catch (error) {
            console.error('<i class="fas fa-times-circle"></i> Error removing identifier:', error);
            this.showNotification('Error removing identifier', 'error');
        }
    }

    // ============================================================================
    // ANALYSIS TAB METHODS
    // ============================================================================

    // ============================== LOAD ANALYSIS DASHBOARD ==============================
    async loadAnalysisDashboard() {
        const resultsContainer = document.querySelector('#analysis-tab-content .analysis-results');
        if (!resultsContainer) {
            console.error('Analysis results container not found');
            return;
        }
        
        // Show loading state
        resultsContainer.innerHTML = `
            <div class="loading-analysis">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading analysis overview...</p>
            </div>
        `;
        
        try {
            // Load default analysis (all time, no filters) - this shows immediately
            const response = await fetch('/api/analysis/default');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            console.log('Default analysis data received:', data);
            
            this.renderDefaultAnalysis(data);
        } catch (error) {
            console.error('Error loading analysis:', error);
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Analysis</h3>
                    <p>${error.message}</p>
                    <button class="retry-btn" onclick="campaignManagement.loadAnalysisDashboard()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    // ============================== GENERATE FILTERED ANALYSIS ==============================
    async generateFilteredAnalysis() {
        // Get selected campaigns
        const selectedCampaigns = this.getSelectedAnalysisCampaigns();
        const dateFilter = document.getElementById('analysisDateFilter')?.value || 'all';
        
        // Build campaign filter parameter
        let campaignFilter = 'all';
        if (selectedCampaigns.length > 0) {
            campaignFilter = selectedCampaigns.join(',');
        }
        
        // Find filtered analysis container
        let filteredContainer = document.querySelector('#filtered-analysis-container');
        if (!filteredContainer) {
            console.error('Filtered analysis container not found');
            return;
        }
        
        // Show the container
        filteredContainer.style.display = 'block';
        
        // Show loading state in filtered container
        filteredContainer.innerHTML = `
            <div class="filtered-analysis-header">
                <h3><i class="fas fa-filter"></i> Filtered Analysis Results</h3>
                <button class="btn-close-filtered" onclick="campaignManagement.closeFilteredAnalysis()" title="Close Filtered Analysis">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="loading-analysis">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Generating comprehensive analysis...</p>
            </div>
        `;
        
        try {
            // Build URL with parameters for filtered analysis
            let url = `/api/analysis/comprehensive?campaign_filter=${encodeURIComponent(campaignFilter)}&date_filter=${encodeURIComponent(dateFilter)}`;
            
            // Add custom date parameters if applicable
            if (dateFilter === 'custom' && this.analysisCustomStartDate && this.analysisCustomEndDate) {
                url += `&start_date=${this.analysisCustomStartDate}&end_date=${this.analysisCustomEndDate}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            console.log('Filtered analysis data received:', data);
            console.log('📊 Threat Actors data:', data.actors);
            console.log('🏢 Infrastructure data:', data.infrastructure);
            
            const displayCampaignFilter = selectedCampaigns.length > 0 ? selectedCampaigns.join(', ') : 'All Campaigns';
            this.renderFilteredAnalysis(data, displayCampaignFilter, dateFilter, filteredContainer);
        } catch (error) {
            console.error('Error loading filtered analysis:', error);
            filteredContainer.innerHTML = `
                <div class="filtered-analysis-header">
                    <h3><i class="fas fa-filter"></i> Filtered Analysis Results</h3>
                    <button class="btn-close-filtered" onclick="campaignManagement.closeFilteredAnalysis()" title="Close Filtered Analysis">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Analysis</h3>
                    <p>${error.message}</p>
                    <button class="retry-btn" onclick="campaignManagement.generateFilteredAnalysis()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    // ============================== POPULATE ANALYSIS CAMPAIGN FILTER ==============================
    async populateAnalysisCampaignFilter() {
        const filterSelect = document.getElementById('analysisCampaignDropdown');
        if (!filterSelect) return;
        
        // Clear existing options
        filterSelect.innerHTML = '<option value="">Select Campaigns...</option>';
        
        // Add campaign options
        if (this.campaigns && this.campaigns.length > 0) {
            this.campaigns.forEach(campaign => {
                const option = document.createElement('option');
                option.value = campaign.name;
                option.textContent = campaign.name;
                filterSelect.appendChild(option);
            });
        }
    }

    // ============================== TOGGLE ANALYSIS CAMPAIGN SELECTION ==============================
    toggleAnalysisCampaignSelection() {
        const dropdown = document.getElementById('analysisCampaignDropdown');
        const selectedValue = dropdown.value;
        
        if (!selectedValue) return;
        
        // Get current selected campaigns
        const selectedCampaigns = this.getSelectedAnalysisCampaigns();
        
        // Toggle campaign selection
        if (selectedCampaigns.includes(selectedValue)) {
            this.removeAnalysisCampaignFromSelection(selectedValue);
        } else {
            selectedCampaigns.push(selectedValue);
            this.updateSelectedAnalysisCampaignsList(selectedCampaigns);
        }
        
        // Reset dropdown
        dropdown.value = '';
    }

    // ============================== GET SELECTED ANALYSIS CAMPAIGNS ==============================
    getSelectedAnalysisCampaigns() {
        const tagsContainer = document.getElementById('selectedAnalysisCampaignsTags');
        if (!tagsContainer) return [];
        
        const tags = tagsContainer.querySelectorAll('.campaign-tag');
        return Array.from(tags).map(tag => tag.dataset.campaign);
    }

    // ============================== REMOVE ANALYSIS CAMPAIGN FROM SELECTION ==============================
    removeAnalysisCampaignFromSelection(campaignName) {
        const tag = document.querySelector(`#selectedAnalysisCampaignsTags .campaign-tag[data-campaign="${campaignName}"]`);
        if (tag) {
            tag.remove();
        }
    }

    // ============================== SELECT ALL CAMPAIGNS FOR ANALYSIS ==============================
    selectAllCampaignsForAnalysis() {
        if (!this.campaigns || this.campaigns.length === 0) return;
        
        const allCampaigns = this.campaigns.map(campaign => campaign.name);
        this.updateSelectedAnalysisCampaignsList(allCampaigns);
    }

    // ============================== DESelect ALL CAMPAIGNS FOR ANALYSIS ==============================
    deselectAllCampaignsForAnalysis() {
        const tagsContainer = document.getElementById('selectedAnalysisCampaignsTags');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
        }
    }

    // ============================== UPDATE SELECTED ANALYSIS CAMPAIGNS LIST ==============================
    updateSelectedAnalysisCampaignsList(selectedCampaigns) {
        const tagsContainer = document.getElementById('selectedAnalysisCampaignsTags');
        if (!tagsContainer) return;
        
        tagsContainer.innerHTML = '';
        
        selectedCampaigns.forEach(campaignName => {
            const tag = document.createElement('div');
            tag.className = 'campaign-tag';
            tag.dataset.campaign = campaignName;
            tag.innerHTML = `
                <span class="tag-text">${campaignName}</span>
                <button class="remove-tag" onclick="campaignManagement.removeAnalysisCampaignFromSelection('${campaignName}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            tagsContainer.appendChild(tag);
        });
    }

    // ============================== APPLY ANALYSIS CUSTOM RANGE ==============================
    applyAnalysisCustomRange() {
        const startDate = document.getElementById('analysisStartDate').value;
        const endDate = document.getElementById('analysisEndDate').value;
        
        
        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }
        
        // Hide custom range section
        document.getElementById('analysisCustomRangeSection').style.display = 'none';
        
        // Update date filter to show custom range is selected
        const dateFilter = document.getElementById('analysisDateFilter');
        dateFilter.value = 'custom';
        
        // Store the custom dates for API calls
        this.analysisCustomStartDate = startDate;
        this.analysisCustomEndDate = endDate;
    }

    // ============================== RENDER FILTERED ANALYSIS ==============================
    renderFilteredAnalysis(data, campaignFilter, dateFilter, container) {
        container.innerHTML = `
                <div class="comprehensive-analysis">
                <!-- Analysis Header -->
                <div class="analysis-header">
                    <h2 class="clickable-title" onclick="copyChartAsHTML(this.closest('.comprehensive-analysis'), 'Comprehensive Campaign Activity and Insights')" title="Click to copy analysis for email">
                        <i class="fas fa-chart-line"></i> Comprehensive Campaign Activity and Insights
                    </h2>
                    <p class="analysis-subtitle">
                        Campaign: <strong>${campaignFilter === 'all' ? 'All Campaigns' : campaignFilter}</strong> | 
                        Date Range: <strong>${this.formatDateFilter(dateFilter)}</strong>
                    </p>
                </div>
                
                <!-- Executive Summary -->
                <div class="analysis-section">
                    <h3><i class="fas fa-crown"></i> Executive Summary</h3>
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="card-icon"><i class="fas fa-folder-open"></i></div>
                            <div class="card-content">
                                <h4>${data.summary.total_cases}</h4>
                                <p>Total Cases</p>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="card-icon"><i class="fas fa-exclamation-circle"></i></div>
                            <div class="card-content">
                                <h4>${data.summary.active_cases || 0}</h4>
                                <p>Active Cases</p>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="card-icon"><i class="fas fa-user-secret"></i></div>
                            <div class="card-content">
                                <h4>${data.summary.threat_actors}</h4>
                                <p>Threat Attribution</p>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="card-icon"><i class="fas fa-globe"></i></div>
                            <div class="card-content">
                                <h4>${data.summary.countries}</h4>
                                <p>Countries</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Detailed Analysis Tabs -->
                <div class="analysis-section">
                    <div class="analysis-tabs">
                        <button class="analysis-tab active" onclick="campaignManagement.switchAnalysisDetailTab('campaigns')">
                            <i class="fas fa-project-diagram"></i> Campaign Activity
                        </button>
                        <button class="analysis-tab" onclick="campaignManagement.switchAnalysisDetailTab('threats')">
                            <i class="fas fa-exclamation-triangle"></i> Threat Distribution
                        </button>
                        <button class="analysis-tab" onclick="campaignManagement.switchAnalysisDetailTab('actors')">
                            <i class="fas fa-user-secret"></i> Threat Actors
                        </button>
                        <button class="analysis-tab" onclick="campaignManagement.switchAnalysisDetailTab('infrastructure')">
                            <i class="fas fa-server"></i> Infrastructure
                        </button>
                        <button class="analysis-tab" onclick="campaignManagement.switchAnalysisDetailTab('geographic')">
                            <i class="fas fa-map-marked-alt"></i> Geographic
                        </button>
                    </div>
                    
                    <div class="analysis-tab-content">
                        <div class="tab-pane active" id="analysis-campaigns-pane">
                            ${this.renderFilteredCampaignCaseBreakdown(data, campaignFilter)}
                        </div>
                        <div class="tab-pane" id="analysis-threats-pane">
                            ${this.renderThreatDistribution(data.threats)}
                        </div>
                        <div class="tab-pane" id="analysis-actors-pane">
                            ${this.renderThreatActors(data.actors)}
                        </div>
                        <div class="tab-pane" id="analysis-infrastructure-pane">
                            ${this.renderInfrastructure(data.infrastructure)}
                        </div>
                        <div class="tab-pane" id="analysis-geographic-pane">
                            ${this.renderGeographic(data.geographic)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================== RENDER FILTERED CAMPAIGN CASE BREAKDOWN ==============================
    renderFilteredCampaignCaseBreakdown(data, campaignFilter) {
        // Create campaign cases stats from the filtered data
        const campaignCasesStats = [];
        
        // Get campaign data from the filtered results
        if (data.campaigns && Array.isArray(data.campaigns)) {
            data.campaigns.forEach(campaign => {
                // Map the backend data structure to our frontend format
                const credTheftCases = campaign.case_numbers || 0;
                const domainMonitoringCases = campaign.infrids || 0;
                const socialMediaCases = campaign.incident_ids || 0;
                
                campaignCasesStats.push({
                    campaign_name: campaign.name,
                    by_type: {
                        cred_theft: credTheftCases,
                        domain_monitoring: domainMonitoringCases,
                        social_media: socialMediaCases,
                        total: credTheftCases + domainMonitoringCases + socialMediaCases
                    },
                    by_status: {
                        active: campaign.active_cases || 0,
                        domain_monitoring: domainMonitoringCases, // Domain monitoring cases are always active
                        closed: campaign.closed_cases || 0,
                        total: (campaign.active_cases || 0) + domainMonitoringCases + (campaign.closed_cases || 0)
                    }
                });
            });
        }
        
        return `
            <div class="campaign-cases-container">
                <div class="cases-tabs">
                    <button class="cases-tab active" onclick="switchCasesTab('type')">By Type</button>
                    <button class="cases-tab" onclick="switchCasesTab('status')">By Status</button>
                </div>
                <div class="cases-content">
                    <div class="cases-tab-content active" id="filtered-cases-by-type">
                        ${this.renderCampaignCasesByType(campaignCasesStats)}
                    </div>
                    <div class="cases-tab-content" id="filtered-cases-by-status">
                        ${this.renderCampaignCasesByStatus(campaignCasesStats)}
                    </div>
                </div>
            </div>
        `;
    }

    // ============================== CLOSE FILTERED ANALYSIS ==============================
    closeFilteredAnalysis() {
        const filteredContainer = document.querySelector('#filtered-analysis-container');
        if (filteredContainer) {
            filteredContainer.style.display = 'none';
            filteredContainer.innerHTML = '';
        }
    }

    // ============================== FORMAT DATE FILTER ==============================
    formatDateFilter(dateFilter) {
        switch(dateFilter) {
            case 'today': return 'Today';
            case 'week': return 'Last 7 Days';
            case 'month': return 'Last 30 Days';
            case 'quarter': return 'Last 90 Days';
            case 'year': return 'Last Year';
            case 'all': return 'All Time';
            default: return dateFilter;
        }
    }

    // ============================== RENDER DEFAULT ANALYSIS ==============================
    renderDefaultAnalysis(data) {
        const container = document.querySelector('#analysis-tab-content .analysis-results');
        if (!container) return;
        
        // Store the analysis data globally for use by toggle functions
        window.currentAnalysisData = data;
        
        container.innerHTML = `
            <div class="default-analysis">
                <!-- Analysis Header -->
                <div class="analysis-header">
                    <h2 class="clickable-title" onclick="copyChartAsHTML(this.closest('.default-analysis'), 'Campaign Analysis Overview')" title="Click to copy section for email">
                        <i class="fas fa-chart-line"></i> Campaign Analysis Overview
                    </h2>
                    <p class="analysis-subtitle">All Campaigns - All Time</p>
                </div>
                
                <!-- 1. Active vs Closed Campaigns -->
                <div class="analysis-section" id="campaign-status-section">
                    <h3 class="clickable-title" onclick="copyChartAsHTML(this.closest('.analysis-section'), 'Campaign Status Overview')" title="Click to copy section for email">
                        <i class="fas fa-toggle-on"></i> Campaign Status Overview
                    </h3>
                    <div class="campaign-status-container">
                        <div class="status-card active" onclick="campaignManagement.toggleCampaignList('active', [])">
                            <div class="status-icon">
                                <i class="fas fa-play-circle"></i>
                            </div>
                            <div class="status-content">
                                <h4>${data.campaign_status.active_count}</h4>
                                <p>Active Campaigns</p>
                            </div>
                        </div>
                        <div class="status-card closed" onclick="campaignManagement.toggleCampaignList('closed', [])">
                            <div class="status-icon">
                                <i class="fas fa-stop-circle"></i>
                            </div>
                            <div class="status-content">
                                <h4>${data.campaign_status.closed_count}</h4>
                                <p>Closed Campaigns</p>
                            </div>
                        </div>
                    </div>
                        <div class="campaign-lists-container" id="campaign-lists-container" style="display: none;">
                            <div class="campaign-list" id="active-campaigns-list">
                                <h4>Active Campaigns:</h4>
                                <ul></ul>
                            </div>
                            <div class="campaign-list" id="closed-campaigns-list">
                                <h4>Closed Campaigns:</h4>
                                <ul></ul>
                            </div>
                        </div>
                </div>
                
                <!-- 2. Campaign Cases Stats -->
                <div class="analysis-section" id="campaign-cases-section">
                    <div class="chart-header">
                        <div class="chart-title-group">
                            <h3 class="chart-title clickable-title" onclick="copyChartAsHTML(this.closest('.analysis-section'), 'Campaign Cases Statistics')" title="Click to copy section for email">
                                <i class="fas fa-chart-bar"></i> Campaign Cases Breakdown
                            </h3>
                            <p class="chart-subtitle">Cases by type and status across campaigns</p>
                        </div>
                        <div class="chart-controls">
                            <button class="chart-btn active" data-view="type" onclick="campaignManagement.switchCasesTab('type')">By Type</button>
                            <button class="chart-btn" data-view="status" onclick="campaignManagement.switchCasesTab('status')">By Status</button>
                        </div>
                    </div>
                    <div class="chart-body">
                        <div class="cases-content">
                            <div class="cases-tab-content active" id="cases-by-type">
                                ${this.renderCampaignCasesByType(data.campaign_cases_stats, data.campaign_status)}
                            </div>
                            <div class="cases-tab-content" id="cases-by-status">
                                ${this.renderCampaignCasesByStatus(data.campaign_cases_stats, data.campaign_status)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 2.5. Campaign Activity Timeline -->
                <div class="analysis-section" id="campaign-activity-timeline-section">
                    <div class="chart-header">
                        <div class="chart-title-group">
                            <h3 class="chart-title clickable-title" onclick="copyChartAsHTML(this.closest('.analysis-section'), 'Campaign Activity Timeline')" title="Click to copy section for email">
                                <i class="fas fa-chart-line"></i> Campaign Activity Timeline
                            </h3>
                            <p class="chart-subtitle">Real-time campaign activity breakdown by time window</p>
                        </div>
                        <div class="chart-controls">
                            <select id="activityTimelineFilter" onchange="campaignManagement.handleActivityTimelineFilterChange()" class="timeline-filter">
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="week" selected>Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                                <option value="this_month">This Month</option>
                                <option value="last_month">Last Month</option>
                                <option value="all">All Time</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Custom Date Range (Hidden by default) -->
                    <div class="custom-timeline-range" id="activityTimelineCustomRange" style="display: none;">
                        <div class="date-range-inputs">
                            <label>Start:</label>
                            <input type="date" id="activityTimelineStartDate">
                            <label>End:</label>
                            <input type="date" id="activityTimelineEndDate">
                            <button class="btn btn-primary btn-sm" onclick="campaignManagement.applyActivityTimelineCustomRange()">
                                <i class="fas fa-check"></i> Apply
                            </button>
                        </div>
                    </div>
                    
                    <div class="chart-body" id="activityTimelineContent">
                        <div class="loading-analysis">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading activity timeline...</p>
                        </div>
                    </div>
                </div>
                
                <!-- 3. Overlapping Infrastructure -->
                <div class="analysis-section" id="overlapping-infrastructure-section">
                    <h3 class="clickable-title" onclick="copyChartAsHTML(this.closest('.analysis-section'), 'Overlapping Infrastructure')" title="Click to copy section for email">
                        <i class="fas fa-network-wired"></i> Overlapping Infrastructure
                    </h3>
                    <div class="overlapping-infrastructure-container">
                        ${this.renderOverlappingInfrastructure(data.overlapping_infrastructure)}
                    </div>
                </div>
                
            </div>
        `;
        
        // Load the activity timeline with default filter (week)
        this.updateActivityTimeline();
    }

    // ============================== HANDLE ACTIVITY TIMELINE FILTER CHANGE ==============================
    handleActivityTimelineFilterChange() {
        const filter = document.getElementById('activityTimelineFilter');
        const customRange = document.getElementById('activityTimelineCustomRange');
        
        if (filter.value === 'custom') {
            customRange.style.display = 'block';
        } else {
            customRange.style.display = 'none';
            this.updateActivityTimeline();
        }
    }

    // ============================== APPLY ACTIVITY TIMELINE CUSTOM RANGE ==============================
    applyActivityTimelineCustomRange() {
        const startDate = document.getElementById('activityTimelineStartDate')?.value;
        const endDate = document.getElementById('activityTimelineEndDate')?.value;
        
        if (!startDate || !endDate) {
            this.showNotification('Please select both start and end dates', 'warning');
            return;
        }
        
        this.updateActivityTimeline();
    }

    // ============================== UPDATE ACTIVITY TIMELINE ==============================
    async updateActivityTimeline() {
        const contentDiv = document.getElementById('activityTimelineContent');
        if (!contentDiv) return;
        
        // Get selected time window
        const timeWindow = document.getElementById('activityTimelineFilter')?.value || 'week';
        
        // Show loading state
        contentDiv.innerHTML = `
            <div class="loading-analysis">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading activity data...</p>
            </div>
        `;
        
        try {
            let apiUrl = `/api/analysis/campaign-activity-timeline?time_window=${timeWindow}`;
            
            // Add custom date parameters if applicable
            if (timeWindow === 'custom') {
                const startDate = document.getElementById('activityTimelineStartDate')?.value;
                const endDate = document.getElementById('activityTimelineEndDate')?.value;
                if (startDate) apiUrl += `&start_date=${startDate}`;
                if (endDate) apiUrl += `&end_date=${endDate}`;
            }
            
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            this.renderActivityTimeline(data);
        } catch (error) {
            console.error('Error loading activity timeline:', error);
            contentDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load activity timeline</p>
                    <button class="retry-btn" onclick="campaignManagement.updateActivityTimeline()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    // ============================== RENDER ACTIVITY TIMELINE ==============================
    renderActivityTimeline(data) {
        const contentDiv = document.getElementById('activityTimelineContent');
        if (!contentDiv) return;
        
        const campaigns = data.campaign_activity || [];
        
        if (campaigns.length === 0) {
            contentDiv.innerHTML = '<div class="no-data-placeholder"><i class="fas fa-inbox"></i><p>No data</p></div>';
            return;
        }
        
        // Calculate totals
        const totals = {
            mit: campaigns.reduce((sum, c) => sum + c.mitigating_time_window, 0),
            mon: campaigns.reduce((sum, c) => sum + c.monitoring_time_window, 0),
            cls: campaigns.reduce((sum, c) => sum + c.closed_time_window, 0),
            all: campaigns.reduce((sum, c) => sum + c.mitigating_all_time, 0)
        };
        
        // Get the selected time window for display
        const timeWindow = document.getElementById('activityTimelineFilter')?.value || 'week';
        let timeWindowLabel = this.formatDateFilter(timeWindow);
        
        // If custom range, show the actual dates
        if (timeWindow === 'custom') {
            const startDate = document.getElementById('activityTimelineStartDate')?.value;
            const endDate = document.getElementById('activityTimelineEndDate')?.value;
            if (startDate && endDate) {
                timeWindowLabel = `${startDate} to ${endDate}`;
            }
        }
        
        contentDiv.innerHTML = `
            <!-- Time Window Context Header -->
            <div class="timeline-context-header">
                <span class="context-label">Time Window:</span>
                <span class="context-value">${timeWindowLabel}</span>
                <span class="context-note">
                    (Mitigating, Monitoring, Closed columns show activity in this period. All Time shows currently active cases regardless of creation date.)
                </span>
            </div>
            
            <table class="activity-sleek-table">
                <thead>
                    <tr>
                        <th>Campaign</th>
                        <th><i class="fas fa-shield-alt"></i> Mitigating</th>
                        <th><i class="fas fa-eye"></i> Monitoring</th>
                        <th><i class="fas fa-check-circle"></i> Closed</th>
                        <th><i class="fas fa-infinity"></i> All Time</th>
                        <th style="width: 140px;">Activity</th>
                    </tr>
                </thead>
                <tbody>
                    ${campaigns.map(c => {
                        const active = c.campaign_status === 'Active';
                        const tot = c.mitigating_time_window + c.monitoring_time_window + c.closed_time_window;
                        return `
                        <tr>
                            <td><strong>${c.campaign_name}</strong> <span class="st ${active?'a':'c'}">${c.campaign_status}</span></td>
                            <td class="c-red"><span class="num">${c.mitigating_time_window}</span></td>
                            <td class="c-amber"><span class="num">${c.monitoring_time_window}</span></td>
                            <td class="c-green"><span class="num">${c.closed_time_window}</span></td>
                            <td class="c-blue"><span class="num">${c.mitigating_all_time}</span></td>
                            <td>
                                <div class="bar">
                                    ${tot>0?`<div class="b-red" style="width:${c.mitigating_time_window/tot*100}%"></div>`:''}
                                    ${tot>0?`<div class="b-amber" style="width:${c.monitoring_time_window/tot*100}%"></div>`:''}
                                    ${tot>0?`<div class="b-green" style="width:${c.closed_time_window/tot*100}%"></div>`:''}
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>TOTAL</strong></td>
                        <td class="c-red"><strong>${totals.mit}</strong></td>
                        <td class="c-amber"><strong>${totals.mon}</strong></td>
                        <td class="c-green"><strong>${totals.cls}</strong></td>
                        <td class="c-blue"><strong>${totals.all}</strong></td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    // ============================== RENDER CAMPAIGN CASES BY TYPE ==============================
    renderCampaignCasesByType(campaignCasesStats, campaignStatus = null) {
        return `
            <div class="cases-table-container">
                <table class="cases-table">
                    <thead>
                        <tr>
                            <th>Campaign Name</th>
                            <th class="cred-theft-col">Cred Theft</th>
                            <th class="domain-monitoring-col">Domain Monitoring</th>
                            <th class="social-media-col">Social Media</th>
                            <th class="total-col">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${campaignCasesStats.map(campaign => {
                            // Check campaign status from campaign_status object if available
                            let isActive;
                            if (campaignStatus && campaignStatus.active_campaigns && campaignStatus.closed_campaigns) {
                                isActive = campaignStatus.active_campaigns.includes(campaign.campaign_name);
                            } else {
                                // Fallback to checking active cases
                                isActive = campaign.by_status.active > 0;
                            }
                            const statusLabel = isActive ? 'Active' : 'Closed';
                            const statusColor = isActive ? '#10b981' : '#6b7280';
                            return `
                            <tr>
                                <td class="campaign-name">${campaign.campaign_name} <span style="color: ${statusColor}; font-size: 0.9em; font-weight: 600;">(${statusLabel})</span></td>
                                <td class="cred-theft-col">${campaign.by_type.cred_theft}</td>
                                <td class="domain-monitoring-col">${campaign.by_type.domain_monitoring}</td>
                                <td class="social-media-col">${campaign.by_type.social_media}</td>
                                <td class="total-col">${campaign.by_type.total}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td><strong>Total</strong></td>
                            <td class="cred-theft-col"><strong>${campaignCasesStats.reduce((sum, c) => sum + c.by_type.cred_theft, 0)}</strong></td>
                            <td class="domain-monitoring-col"><strong>${campaignCasesStats.reduce((sum, c) => sum + c.by_type.domain_monitoring, 0)}</strong></td>
                            <td class="social-media-col"><strong>${campaignCasesStats.reduce((sum, c) => sum + c.by_type.social_media, 0)}</strong></td>
                            <td class="total-col"><strong>${campaignCasesStats.reduce((sum, c) => sum + c.by_type.total, 0)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    // ============================== RENDER CAMPAIGN CASES BY STATUS ==============================
    renderCampaignCasesByStatus(campaignCasesStats, campaignStatus = null) {
        return `
            <div class="cases-table-container">
                <table class="cases-table">
                    <thead>
                        <tr>
                            <th>Campaign Name</th>
                            <th class="active-col">Active</th>
                            <th class="domain-monitoring-col">Domain Monitoring</th>
                            <th class="closed-col">Closed/Taken Down</th>
                            <th class="total-col">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${campaignCasesStats.map(campaign => {
                            // Check campaign status from campaign_status object if available
                            let isActive;
                            if (campaignStatus && campaignStatus.active_campaigns && campaignStatus.closed_campaigns) {
                                isActive = campaignStatus.active_campaigns.includes(campaign.campaign_name);
                            } else {
                                // Fallback to checking active cases
                                isActive = campaign.by_status.active > 0;
                            }
                            const statusLabel = isActive ? 'Active' : 'Closed';
                            const statusColor = isActive ? '#10b981' : '#6b7280';
                            return `
                            <tr>
                                <td class="campaign-name">${campaign.campaign_name} <span style="color: ${statusColor}; font-size: 0.9em; font-weight: 600;">(${statusLabel})</span></td>
                                <td class="active-col">${campaign.by_status.active}</td>
                                <td class="domain-monitoring-col">${campaign.by_status.domain_monitoring}</td>
                                <td class="closed-col">${campaign.by_status.closed}</td>
                                <td class="total-col">${campaign.by_status.total}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td><strong>Total</strong></td>
                            <td class="active-col"><strong>${campaignCasesStats.reduce((sum, c) => sum + c.by_status.active, 0)}</strong></td>
                            <td class="domain-monitoring-col"><strong>${campaignCasesStats.reduce((sum, c) => sum + c.by_status.domain_monitoring, 0)}</strong></td>
                            <td class="closed-col"><strong>${campaignCasesStats.reduce((sum, c) => sum + c.by_status.closed, 0)}</strong></td>
                            <td class="total-col"><strong>${campaignCasesStats.reduce((sum, c) => sum + c.by_status.total, 0)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    // ============================== RENDER OVERLAPPING INFRASTRUCTURE ==============================
    renderOverlappingInfrastructure(overlappingData) {
        const categories = [
            { key: 'ip_addresses', name: 'IP Addresses', icon: 'fas fa-server' },
            { key: 'domains', name: 'Domains', icon: 'fas fa-globe' },
            { key: 'threatactor_handles', name: 'Threat Actor Handles', icon: 'fas fa-user-secret' },
            { key: 'threat_family', name: 'Threat Family', icon: 'fas fa-users' },
            { key: 'flagged_whois_email', name: 'Flagged WHOIS Email', icon: 'fas fa-envelope' },
            { key: 'flagged_whois_name', name: 'Flagged WHOIS Name', icon: 'fas fa-user' },
            { key: 'url_paths', name: 'URL Paths', icon: 'fas fa-link' }
        ];

        return `
            <div class="overlapping-grid">
                ${categories.map(category => `
                    <div class="overlapping-category">
                        <div class="category-header">
                            <i class="${category.icon}"></i>
                            <h4>${category.name}</h4>
                        </div>
                        <div class="category-content">
                            ${overlappingData[category.key] && overlappingData[category.key].length > 0 ? `
                                <div class="overlapping-list">
                                    ${overlappingData[category.key].map((item, index) => `
                                        <div class="overlapping-item" onclick="campaignManagement.toggleInfrastructureCampaigns('${category.key}', ${index})">
                                            <span class="item-value">${item.value}</span>
                                            <span class="item-count">${item.count} campaigns</span>
                                        </div>
                                        <div class="infrastructure-campaigns-list" id="infrastructure-${category.key}-${index}" style="display: none;">
                                            
                                            <ul></ul>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="no-overlap">
                                    <i class="fas fa-check-circle"></i>
                                    <p>No overlapping ${category.name.toLowerCase()} found</p>
                                </div>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ============================== TOGGLE CAMPAIGN LIST ==============================
    toggleCampaignList(type, campaigns) {
        const listElement = document.getElementById(`${type}-campaigns-list`);
        const containerElement = document.getElementById('campaign-lists-container');
        
        if (!listElement || !containerElement) return;
        
        const isVisible = containerElement.style.display !== 'none';
        
        // Toggle visibility
        if (isVisible) {
            containerElement.style.display = 'none';
        } else {
            containerElement.style.display = 'flex';
            
            // Populate both lists
            const activeUl = document.getElementById('active-campaigns-list').querySelector('ul');
            const closedUl = document.getElementById('closed-campaigns-list').querySelector('ul');
            
            // Clear existing content
            activeUl.innerHTML = '';
            closedUl.innerHTML = '';
            
            // Get current campaign data
            if (window.currentAnalysisData && window.currentAnalysisData.campaign_status) {
                const activeCampaigns = window.currentAnalysisData.campaign_status.active_campaigns || [];
                const closedCampaigns = window.currentAnalysisData.campaign_status.closed_campaigns || [];
                
                if (activeCampaigns.length > 0) {
                    activeUl.innerHTML = activeCampaigns.map(campaign => `<div>${campaign}</div>`).join('');
                } else {
                    activeUl.innerHTML = '<div style="color: var(--text-secondary); font-style: italic;">No active campaigns</div>';
                }
                
                if (closedCampaigns.length > 0) {
                    closedUl.innerHTML = closedCampaigns.map(campaign => `<div>${campaign}</div>`).join('');
                } else {
                    closedUl.innerHTML = '<div style="color: var(--text-secondary); font-style: italic;">No closed campaigns</div>';
                }
            }
        }
    }

    // ============================== TOGGLE INFRASTRUCTURE CAMPAIGN LIST ==============================
    toggleInfrastructureCampaigns(categoryKey, index) {
        const listElement = document.getElementById(`infrastructure-${categoryKey}-${index}`);
        
        if (!listElement) return;
        
        const isVisible = listElement.style.display !== 'none';
        
        // Toggle visibility
        if (isVisible) {
            listElement.style.display = 'none';
        } else {
            listElement.style.display = 'block';
            
            // Populate the list if not already populated
            const ul = listElement.querySelector('ul');
            if (ul && ul.children.length === 0) {
                // Get the campaign data from the overlapping item data
                const itemElement = listElement.previousElementSibling;
                const itemValue = itemElement.querySelector('.item-value').textContent;
                const itemCount = itemElement.querySelector('.item-count').textContent;
                
                // Extract campaign count from the item count text (e.g., "2 campaigns")
                const campaignCount = parseInt(itemCount.match(/\d+/)[0]);
                
                // Find the campaigns data from the current analysis data
                if (window.currentAnalysisData && window.currentAnalysisData.overlapping_infrastructure) {
                    const categoryData = window.currentAnalysisData.overlapping_infrastructure[categoryKey];
                    if (categoryData && categoryData[index]) {
                        const campaigns = categoryData[index].campaigns || [];
                        if (campaigns.length > 0) {
                            ul.innerHTML = campaigns.map(campaign => `<div>${campaign}</div>`).join('');
                        } else {
                            ul.innerHTML = '<div>No campaign data available</div>';
                        }
                    } else {
                        ul.innerHTML = '<div>No campaign data available</div>';
                    }
                } else {
                    ul.innerHTML = '<div>Loading campaign data...</div>';
                }
            }
        }
    }

    // ============================== SWITCH CASES TAB ==============================
    switchCasesTab(tab) {
        // Hide all tab contents
        document.querySelectorAll('.cases-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all chart buttons
        document.querySelectorAll('#campaign-cases-section .chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab content
        const targetContent = document.getElementById(`cases-by-${tab}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        // Add active class to selected chart button
        const targetBtn = document.querySelector(`#campaign-cases-section .chart-btn[data-view="${tab}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
    }

    // ============================== RENDER COMPREHENSIVE ANALYSIS ==============================
    renderComprehensiveAnalysis(data, campaignFilter, dateFilter) {
        const container = document.querySelector('#analysis-tab-content .analysis-results');
        if (!container) return;
        
        const riskAssessment = this.calculateRiskAssessment(data);
        
        container.innerHTML = `
            <div class="comprehensive-analysis">
                <!-- Analysis Header -->
                <div class="analysis-header">
                    <h2 class="clickable-title" onclick="copyChartAsHTML(this.closest('.comprehensive-analysis'), 'Comprehensive Campaign Activity and Insights')" title="Click to copy analysis for email">
                        <i class="fas fa-chart-line"></i> Comprehensive Campaign Activity and Insights
                    </h2>
                    <p class="analysis-subtitle">
                        Campaign: <strong>${campaignFilter === 'all' ? 'All Campaigns' : campaignFilter}</strong> | 
                        Date Range: <strong>${this.formatDateFilter(dateFilter)}</strong>
                    </p>
                </div>
                
                <!-- Executive Summary -->
                <div class="analysis-section">
                    <h3><i class="fas fa-crown"></i> Executive Summary</h3>
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="card-icon"><i class="fas fa-folder-open"></i></div>
                            <div class="card-content">
                                <h4>${data.summary.total_cases}</h4>
                                <p>Total Cases</p>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="card-icon"><i class="fas fa-bullseye"></i></div>
                            <div class="card-content">
                                <h4>${data.summary.active_campaigns}</h4>
                                <p>Active Campaigns</p>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="card-icon"><i class="fas fa-user-secret"></i></div>
                            <div class="card-content">
                                <h4>${data.summary.threat_actors}</h4>
                                <p>Threat Actors</p>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="card-icon"><i class="fas fa-globe"></i></div>
                            <div class="card-content">
                                <h4>${data.summary.countries}</h4>
                                <p>Countries</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Detailed Analysis Tabs -->
                <div class="analysis-section">
                    <div class="analysis-tabs">
                        <button class="analysis-tab active" onclick="campaignManagement.switchAnalysisDetailTab('campaigns')">
                            <i class="fas fa-project-diagram"></i> Campaign Activity
                        </button>
                        <button class="analysis-tab" onclick="campaignManagement.switchAnalysisDetailTab('threats')">
                            <i class="fas fa-exclamation-triangle"></i> Threat Distribution
                        </button>
                        <button class="analysis-tab" onclick="campaignManagement.switchAnalysisDetailTab('actors')">
                            <i class="fas fa-mask"></i> Threat Actors
                        </button>
                        <button class="analysis-tab" onclick="campaignManagement.switchAnalysisDetailTab('infrastructure')">
                            <i class="fas fa-server"></i> Infrastructure
                        </button>
                        <button class="analysis-tab" onclick="campaignManagement.switchAnalysisDetailTab('geographic')">
                            <i class="fas fa-map"></i> Geographic
                        </button>
                    </div>
                    
                    <div class="analysis-tab-content">
                        <div class="tab-pane active" id="analysis-campaigns-pane">
                            ${this.renderCampaignPerformance(data.campaigns)}
                        </div>
                        <div class="tab-pane" id="analysis-threats-pane">
                            ${this.renderThreatDistribution(data.threats)}
                        </div>
                        <div class="tab-pane" id="analysis-actors-pane">
                            ${this.renderThreatActors(data.actors)}
                        </div>
                        <div class="tab-pane" id="analysis-infrastructure-pane">
                            ${this.renderInfrastructure(data.infrastructure)}
                        </div>
                        <div class="tab-pane" id="analysis-geographic-pane">
                            ${this.renderGeographic(data.geographic)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================== SWITCH ANALYSIS DETAIL TAB ==============================
    switchAnalysisDetailTab(tabName) {
        // Remove active class from all tabs in the filtered analysis container
        const filteredContainer = document.querySelector('#filtered-analysis-container');
        if (!filteredContainer) return;
        
        filteredContainer.querySelectorAll('.analysis-tab').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked tab
        const clickedTab = filteredContainer.querySelector(`[onclick*="'${tabName}'"]`);
        if (clickedTab) {
            clickedTab.classList.add('active');
        }
        
        // Hide all panes
        filteredContainer.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        // Show selected pane
        const targetPane = filteredContainer.querySelector(`#analysis-${tabName}-pane`);
        if (targetPane) {
            targetPane.classList.add('active');
        }
    }

    // ============================== SWITCH CASES TAB ==============================
    switchCasesTab(tab) {
        // Remove active class from all case tabs
        document.querySelectorAll('.cases-tab').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked tab
        const clickedTab = document.querySelector(`[onclick*="'${tab}'"]`);
        if (clickedTab) {
            clickedTab.classList.add('active');
        }
        
        // Hide all case tab content
        document.querySelectorAll('.cases-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show selected content
        const targetContent = document.querySelector(`#filtered-cases-by-${tab}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    // ============================== SETUP ANALYSIS TABS ==============================
    setupAnalysisTabs() {
        const tabs = document.querySelectorAll('.analysis-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                
                // Remove active class from all tabs and panes
                document.querySelectorAll('.analysis-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding pane
                e.target.classList.add('active');
                document.querySelector(`[data-content="${targetTab}"]`).classList.add('active');
            });
        });
    }

    // ============================== RENDER CAMPAIGN PERFORMANCE ==============================
    renderCampaignPerformance(campaigns) {
        if (!campaigns || campaigns.length === 0) {
            return `
                <div class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>No campaign data available</p>
                </div>
            `;
        }
        
        return `
            <div class="analysis-grid">
                ${campaigns.map(campaign => `
                    <div class="analysis-card campaign-card">
                        <div class="card-header">
                            <h4>${campaign.name}</h4>
                            <span class="status-badge ${campaign.status.toLowerCase()}">${campaign.status}</span>
                        </div>
                        <div class="card-body">
                            <div class="campaign-stats">
                                <div class="stat-row">
                                    <span>Total Cases:</span>
                                    <strong>${campaign.total_cases}</strong>
                                </div>
                                <div class="stat-row">
                                    <span>Active:</span>
                                    <strong class="text-warning">${campaign.active_cases}</strong>
                                </div>
                                <div class="stat-row">
                                    <span>Closed:</span>
                                    <strong class="text-success">${campaign.closed_cases}</strong>
                                </div>
                            </div>
                            <div class="progress-section">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${campaign.completion_rate}%"></div>
                                </div>
                                <span class="progress-label">${campaign.completion_rate}% Complete</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ============================== RENDER THREAT DISTRIBUTION ==============================
    renderThreatDistribution(threats) {
        if (!threats || threats.length === 0) {
            return `
                <div class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>No threat data available</p>
                </div>
            `;
        }
        
        const totalThreats = threats.reduce((sum, t) => sum + t.count, 0);
        
        return `
            <div class="analysis-table-container">
                <table class="analysis-table">
                    <thead>
                        <tr>
                            <th>Threat Type</th>
                            <th>Count</th>
                            <th>Percentage</th>
                            <th>Unique Registrars</th>
                            <th>Unique Host ISPs</th>
                            <th>Unique AS Numbers</th>
                            <th>Countries</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${threats.map(threat => `
                            <tr>
                                <td><strong>${threat.type}</strong></td>
                                <td>${threat.count}</td>
                                <td>
                                    <div class="percentage-bar">
                                        <div class="percentage-fill" style="width: ${(threat.count / totalThreats * 100)}%"></div>
                                        <span>${Math.round(threat.count / totalThreats * 100)}%</span>
                                    </div>
                                </td>
                                <td>${threat.unique_registrars || 0}</td>
                                <td>${threat.unique_host_isps || 0}</td>
                                <td>${threat.unique_as_numbers || 0}</td>
                                <td>${threat.countries || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ============================== RENDER THREAT ACTORS ==============================
    renderThreatActors(actors) {
        console.log('🎭 Rendering Threat Actors:', actors);
        
        if (!actors || actors.length === 0) {
            console.log('⚠️ No threat actor data to display');
            return `
                <div class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>No threat actor data available</p>
                    <p class="no-data-subtitle">Threat actors are identified from case notes and handle data</p>
                </div>
            `;
        }
        
        console.log(`✅ Displaying ${actors.length} threat actors`);
        
        return `
            <div class="analysis-table-container">
                <table class="analysis-table">
                    <thead>
                        <tr>
                            <th>Threat Actor</th>
                            <th>Type</th>
                            <th>Cases</th>
                            <th>Families</th>
                            <th>Last Seen</th>
                            <th>Activity Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${actors.map(actor => `
                            <tr>
                                <td><strong>${actor.name}</strong></td>
                                <td>${actor.record_type}</td>
                                <td>${actor.case_count}</td>
                                <td>${actor.family_count}</td>
                                <td>${this.formatDate(actor.last_seen)}</td>
                                <td>
                                    <span class="activity-level ${actor.activity_level.toLowerCase()}">
                                        ${actor.activity_level}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ============================== RENDER INFRASTRUCTURE ==============================
    renderInfrastructure(infrastructure) {
        if (!infrastructure || infrastructure.length === 0) {
            return `
                <div class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>No infrastructure data available</p>
                    <p class="no-data-subtitle">Infrastructure analysis is only available for Cred Theft cases with associated URLs</p>
                </div>
            `;
        }
        
        // Generate tab content for both views
        const byRegistrarTab = this.renderInfrastructureByRegistrar(infrastructure);
        const byISPTab = this.renderInfrastructureByISP(infrastructure);
        
        return `
            <div class="infrastructure-tabs-container">
                <div class="infrastructure-tabs">
                    <button class="infra-tab-btn active" onclick="window.campaignManagement.switchInfrastructureTab('registrar')">
                        <i class="fas fa-server"></i> By Registrar
                    </button>
                    <button class="infra-tab-btn" onclick="window.campaignManagement.switchInfrastructureTab('isp')">
                        <i class="fas fa-network-wired"></i> By ISP
                    </button>
                </div>
                
                <div id="infra-registrar-content" class="infra-tab-content active">
                    ${byRegistrarTab}
                </div>
                
                <div id="infra-isp-content" class="infra-tab-content">
                    ${byISPTab}
                </div>
            </div>
        `;
    }
    
    // ============================== SWITCH INFRASTRUCTURE TAB ==============================
    switchInfrastructureTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.infra-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.closest('.infra-tab-btn').classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.infra-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`infra-${tabName}-content`).classList.add('active');
    }
    
    // ============================== RENDER INFRASTRUCTURE BY REGISTRAR ==============================
    renderInfrastructureByRegistrar(infrastructure) {
        // Group by registrar_name
        const grouped = {};
        infrastructure.forEach(item => {
            const registrar = item.registrar_name || '-';
            if (!grouped[registrar]) {
                grouped[registrar] = [];
            }
            grouped[registrar].push(item);
        });
        
        // Sort registrars alphabetically
        const sortedRegistrars = Object.keys(grouped).sort();
        
        return `
            <div class="grouped-infrastructure">
                ${sortedRegistrars.map(registrar => `
                    <div class="infrastructure-group">
                        <h4 class="group-header">
                            <i class="fas fa-server"></i> ${registrar}
                            <span class="group-count">(${grouped[registrar].length} ${grouped[registrar].length === 1 ? 'item' : 'items'})</span>
                        </h4>
                        ${this.renderInfrastructureTable(grouped[registrar])}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // ============================== RENDER INFRASTRUCTURE BY ISP ==============================
    renderInfrastructureByISP(infrastructure) {
        // Group by isp
        const grouped = {};
        infrastructure.forEach(item => {
            const isp = item.isp || 'Unknown';
            if (!grouped[isp]) {
                grouped[isp] = [];
            }
            grouped[isp].push(item);
        });
        
        // Sort ISPs alphabetically
        const sortedISPs = Object.keys(grouped).sort();
        
        return `
            <div class="grouped-infrastructure">
                ${sortedISPs.map(isp => `
                    <div class="infrastructure-group">
                        <h4 class="group-header">
                            <i class="fas fa-network-wired"></i> ${isp}
                            <span class="group-count">(${grouped[isp].length} ${grouped[isp].length === 1 ? 'item' : 'items'})</span>
                        </h4>
                        ${this.renderInfrastructureTable(grouped[isp])}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // ============================== RENDER INFRASTRUCTURE TABLE ==============================
    renderInfrastructureTable(items) {
        return `
            <div class="analysis-table-container">
                <table class="analysis-table infrastructure-table">
                    <thead>
                        <tr>
                            <th>Domain/Identifier</th>
                            <th>Type</th>
                            <th>IP Address</th>
                            <th>Registrar</th>
                            <th>ISP</th>
                            <th>Country</th>
                            <th>Age (days)</th>
                            <th>Date Created</th>
                            <th>Date Closed</th>
                            <th>Resolution Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => {
                            // Format domain/identifier with campaign in parentheses
                            const domainDisplay = item.domain || item.identifier || '-';
                            const campaignText = item.campaigns && item.campaigns.length > 0 
                                ? `<span class="campaign-secondary">(${item.campaigns.join(', ')})</span>` 
                                : '';
                            
                            return `
                                <tr>
                                    <td><code>${domainDisplay}</code> ${campaignText}</td>
                                    <td>${item.type || 'Unknown'}</td>
                                    <td>${item.ip_address || '-'}</td>
                                    <td>${item.registrar_name || '-'}</td>
                                    <td>${item.isp || 'Unknown'}</td>
                                    <td>${item.country || 'Unknown'}</td>
                                    <td>${item.age_days !== null && item.age_days !== undefined ? item.age_days : '-'}</td>
                                    <td>${this.formatDate(item.date_created)}</td>
                                    <td>${this.formatDate(item.date_closed)}</td>
                                    <td>${item.resolution_status || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ============================== RENDER GEOGRAPHIC ==============================
    renderGeographic(geographic) {
        if (!geographic || geographic.length === 0) {
            return `
                <div class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>No geographic data available</p>
                </div>
            `;
        }
        
        const totalCases = geographic.reduce((sum, g) => sum + g.case_count, 0);
        
        return `
            <div class="analysis-table-container">
                <table class="analysis-table">
                    <thead>
                        <tr>
                            <th>Country</th>
                            <th>Cases</th>
                            <th>Percentage</th>
                            <th>Domains</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${geographic.map(geo => `
                            <tr>
                                <td><strong>${geo.country}</strong></td>
                                <td>${geo.case_count}</td>
                                <td>
                                    <div class="percentage-bar">
                                        <div class="percentage-fill" style="width: ${(geo.case_count / totalCases * 100)}%"></div>
                                        <span>${Math.round(geo.case_count / totalCases * 100)}%</span>
                                    </div>
                                </td>
                                <td>${geo.domain_count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ============================== CALCULATE RISK ASSESSMENT ==============================
    calculateRiskAssessment(data) {
        const totalCases = data.summary.total_cases;
        const threatActors = data.summary.threat_actors;
        const countries = data.summary.countries;
        const activeCampaigns = data.summary.active_campaigns;
        
        // Risk scoring algorithm
        const caseScore = Math.min(30, (totalCases / 10) * 3);
        const actorScore = Math.min(25, (threatActors / 5) * 2.5);
        const geoScore = Math.min(20, (countries / 3) * 2);
        const campaignScore = Math.min(25, (activeCampaigns / 2) * 2.5);
        
        const totalScore = Math.round(caseScore + actorScore + geoScore + campaignScore);
        
        let level, description;
        if (totalScore >= 60) {
            level = 'High';
            description = 'Elevated threat activity requiring immediate attention';
        } else if (totalScore >= 30) {
            level = 'Medium';
            description = 'Moderate threat activity requiring monitoring';
        } else {
            level = 'Low';
            description = 'Normal threat activity levels';
        }
        
        return { score: totalScore, level, description };
    }

    // ============================== GET RISK CLASS ==============================
    getRiskClass(score) {
        if (score >= 70) return 'risk-high';
        if (score >= 40) return 'risk-medium';
        return 'risk-low';
    }

    // ============================== FORMAT DATE ==============================
    formatDate(dateStr) {
        if (!dateStr || dateStr === 'N/A') return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

}

// Initialize Campaign Dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('<i class="fas fa-rocket"></i> Initializing Campaign Dashboard...');
    
    // Initialize Campaign Management
    campaignManagement = new CampaignManagement();
    window.campaignManagement = campaignManagement;
    
    console.log('<i class="fas fa-check-circle"></i> Campaign Dashboard initialized successfully');
});
