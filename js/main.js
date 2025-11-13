/**
 * Options Trading Journal - Main Application Entry Point
 * Initializes all components and wires up UI event handlers
 * Requirements: 1.5, 3.1, 3.2, 4.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

// Application state
let dataStore;
let analyticsEngine;
let strategyDetector;
let csvParser;
let dashboardController;

// Table sorting state
let currentSortColumn = 'pl'; // Default sort by P/L
let currentSortDirection = 'desc'; // Descending by default

/**
 * Initialize application on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('Options Trading Journal - Initializing...');
  
  // Initialize core components
  dataStore = new DataStore();
  analyticsEngine = new AnalyticsEngine();
  strategyDetector = new StrategyDetector();
  csvParser = new CSVParser();
  
  // Initialize dashboard controller
  dashboardController = new DashboardController(
    dataStore,
    analyticsEngine,
    strategyDetector,
    csvParser
  );
  
  // Set up UI event listeners
  setupEventListeners();
  
  // Initialize dashboard (will load persisted data if available)
  dashboardController.initialize();
  
  // Load and apply persisted filters (Requirement 3.2)
  loadFilters();
  
  console.log('Options Trading Journal - Ready');
});

/**
 * Set up all UI event listeners
 */
function setupEventListeners() {
  // File upload button handlers
  const uploadBtn = document.getElementById('upload-btn');
  const emptyStateUploadBtn = document.getElementById('empty-state-upload-btn');
  const uploadZone = document.getElementById('upload-zone');
  const closeUploadBtn = document.getElementById('close-upload-btn');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');
  
  // Reload data button
  const reloadBtn = document.getElementById('reload-btn');
  
  // Filter controls
  const dateRangeFilter = document.getElementById('date-range-filter');
  const positionStatusFilter = document.getElementById('position-status-filter');
  
  // Table headers for sorting
  const tableHeaders = document.querySelectorAll('#symbol-strategy-table th.sortable');
  
  // Upload button click - show upload zone
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      uploadZone.classList.remove('hidden');
    });
  }
  
  // Empty state upload button
  if (emptyStateUploadBtn) {
    emptyStateUploadBtn.addEventListener('click', () => {
      uploadZone.classList.remove('hidden');
    });
  }
  
  // Close upload zone
  if (closeUploadBtn) {
    closeUploadBtn.addEventListener('click', () => {
      uploadZone.classList.add('hidden');
    });
  }
  
  // Browse files button
  if (browseBtn) {
    browseBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }
  
  // File input change - handle file upload (Requirement 1.5)
  if (fileInput) {
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        handleFileUpload(file);
        // Reset file input
        fileInput.value = '';
      }
    });
  }
  
  // Drag and drop handlers
  if (dropZone) {
    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.style.borderColor = '#3b82f6';
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '';
    });
    
    dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropZone.style.borderColor = '';
      
      const file = event.dataTransfer.files[0];
      if (file && file.type === 'text/csv') {
        handleFileUpload(file);
      } else {
        dashboardController.showToast('Please upload a CSV file', 'error');
      }
    });
  }
  
  // Reload data button - clear data and show upload (Requirement 1.5)
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      if (confirm('This will clear all current data. Are you sure?')) {
        dashboardController.clearData();
        uploadZone.classList.remove('hidden');
      }
    });
  }
  
  // Date range filter - immediate update (Requirements 8.1, 8.2, 8.3, 8.4)
  if (dateRangeFilter) {
    dateRangeFilter.addEventListener('change', () => {
      handleFilterChange();
    });
  }
  
  // Position status filter - immediate update (Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6)
  if (positionStatusFilter) {
    positionStatusFilter.addEventListener('change', () => {
      handleFilterChange();
    });
  }
  
  // Table header sorting (Requirements 7.3, 7.4)
  tableHeaders.forEach(header => {
    header.addEventListener('click', () => {
      // Get column name from data attribute or text (excluding sort indicator)
      const column = header.getAttribute('data-column') || 
                     header.textContent.replace(/[▲▼]/g, '').trim().toLowerCase();
      handleTableSort(column, header);
    });
    
    // Add keyboard support for accessibility
    header.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        // Get column name from data attribute or text (excluding sort indicator)
        const column = header.getAttribute('data-column') || 
                       header.textContent.replace(/[▲▼]/g, '').trim().toLowerCase();
        handleTableSort(column, header);
      }
    });
  });
}

/**
 * Handle file upload
 * @param {File} file - CSV file to upload
 */
async function handleFileUpload(file) {
  // Hide upload zone
  const uploadZone = document.getElementById('upload-zone');
  if (uploadZone) {
    uploadZone.classList.add('hidden');
  }
  
  // Pass to dashboard controller
  await dashboardController.handleFileUpload(file);
}

/**
 * Handle filter changes with immediate update
 * Requirements: 8.3, 9.6
 */
function handleFilterChange() {
  const dateRangeFilter = document.getElementById('date-range-filter');
  const positionStatusFilter = document.getElementById('position-status-filter');
  
  const filters = {
    dateRange: {
      type: dateRangeFilter.value,
      startDate: null, // Calculated by analytics engine
      endDate: null
    },
    positionStatus: positionStatusFilter.value
  };
  
  // Pass to dashboard controller (with debouncing)
  dashboardController.handleFilterChange(filters);
}

/**
 * Load persisted filters from data store
 * Requirement: 3.2
 */
function loadFilters() {
  const filters = dataStore.getFilters();
  
  const dateRangeFilter = document.getElementById('date-range-filter');
  const positionStatusFilter = document.getElementById('position-status-filter');
  
  if (dateRangeFilter && filters.dateRange) {
    dateRangeFilter.value = filters.dateRange.type;
  }
  
  if (positionStatusFilter && filters.positionStatus) {
    positionStatusFilter.value = filters.positionStatus;
  }
}

/**
 * Handle table sorting
 * Requirements: 7.3, 7.4
 * @param {string} column - Column name to sort by
 * @param {HTMLElement} headerElement - Header element that was clicked
 */
function handleTableSort(column, headerElement) {
  const table = document.getElementById('symbol-strategy-table');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  // Skip if no data
  if (rows.length === 0 || rows[0].cells.length === 1) {
    return;
  }
  
  // Determine sort direction
  if (currentSortColumn === column) {
    // Toggle direction
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // New column, default to descending for P/L and Trades, ascending for text
    currentSortColumn = column;
    currentSortDirection = (column === 'p/l' || column === 'trades') ? 'desc' : 'asc';
  }
  
  // Get column index
  const headers = Array.from(table.querySelectorAll('th'));
  const columnIndex = headers.findIndex(h => {
    const headerColumn = h.getAttribute('data-column') || 
                         h.textContent.replace(/[▲▼]/g, '').trim().toLowerCase();
    return headerColumn === column;
  });
  
  if (columnIndex === -1) return;
  
  // Sort rows
  rows.sort((a, b) => {
    let aValue = a.cells[columnIndex].textContent.trim();
    let bValue = b.cells[columnIndex].textContent.trim();
    
    // Handle numeric columns (P/L and Trades)
    if (column === 'p/l') {
      // Remove currency formatting (handle both + and - signs, $ and commas)
      aValue = parseFloat(aValue.replace(/[$+,]/g, '').replace(/^-/, '-'));
      bValue = parseFloat(bValue.replace(/[$+,]/g, '').replace(/^-/, '-'));
    } else if (column === 'trades') {
      aValue = parseInt(aValue);
      bValue = parseInt(bValue);
    }
    
    // Compare values
    let comparison = 0;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = aValue.localeCompare(bValue);
    }
    
    return currentSortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Re-append rows in sorted order
  rows.forEach(row => tbody.appendChild(row));
  
  // Update sort indicators
  updateSortIndicators(headerElement);
}

/**
 * Update sort indicators on table headers
 * @param {HTMLElement} activeHeader - Currently sorted header
 */
function updateSortIndicators(activeHeader) {
  const headers = document.querySelectorAll('#symbol-strategy-table th.sortable');
  
  headers.forEach(header => {
    // Remove existing indicators
    const existingIndicator = header.querySelector('.sort-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Add indicator to active header
    if (header === activeHeader) {
      const indicator = document.createElement('span');
      indicator.className = 'sort-indicator';
      indicator.style.marginLeft = '4px';
      indicator.style.fontSize = '10px';
      indicator.textContent = currentSortDirection === 'asc' ? '▲' : '▼';
      header.appendChild(indicator);
    }
  });
}

/**
 * Format currency for display
 * @param {number} value - Numeric value
 * @returns {string} - Formatted currency string
 */
function formatCurrency(value) {
  const sign = value >= 0 ? '+' : '-';
  const absValue = Math.abs(value);
  return sign + '$' + absValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
