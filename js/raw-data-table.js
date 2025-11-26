/**
 * Raw Data Table
 * Displays all imported trades in a sortable table
 */

class RawDataTable {
    constructor() {
        this.container = document.querySelector('#tab-panel-data .overflow-x-auto');
        this.sortColumn = null;
        this.sortDirection = 'asc';
    }

    /**
     * Render the raw data table
     * @param {Array} trades - Array of trade objects
     */
    render(trades) {
        if (!this.container) {
            console.warn('Raw data table container not found');
            return;
        }

        if (!trades || trades.length === 0) {
            this.container.innerHTML = `
                <table class="data-table" role="table">
                    <tbody>
                        <tr>
                            <td class="text-center text-text-secondary py-8">No data available</td>
                        </tr>
                    </tbody>
                </table>
            `;
            return;
        }

        // Get all unique column names from the data
        const columns = this.getColumns(trades);

        // Create table
        const table = document.createElement('table');
        table.className = 'data-table';
        table.setAttribute('role', 'table');
        table.id = 'raw-data-table';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        columns.forEach(column => {
            const th = document.createElement('th');
            th.setAttribute('role', 'columnheader');
            th.className = 'sortable';
            th.textContent = column;
            th.style.cursor = 'pointer';
            
            // Add click handler for sorting
            th.addEventListener('click', () => {
                this.handleSort(column, trades, columns);
            });
            
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        
        trades.forEach(trade => {
            const row = document.createElement('tr');
            
            columns.forEach(column => {
                const td = document.createElement('td');
                const value = trade[column];
                
                // Format the value
                td.textContent = this.formatValue(value);
                
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);

        // Replace existing table
        this.container.innerHTML = '';
        this.container.appendChild(table);
    }

    /**
     * Get all unique column names from trades
     * @param {Array} trades - Array of trade objects
     * @returns {Array} - Array of column names
     */
    getColumns(trades) {
        const columnSet = new Set();
        
        trades.forEach(trade => {
            Object.keys(trade).forEach(key => {
                // Skip internal/computed columns that start with underscore
                if (!key.startsWith('_')) {
                    columnSet.add(key);
                }
            });
        });
        
        return Array.from(columnSet);
    }

    /**
     * Format value for display
     * @param {*} value - Value to format
     * @returns {string} - Formatted value
     */
    formatValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        // Convert to string
        return String(value);
    }

    /**
     * Handle sorting when header is clicked
     * @param {string} column - Column name to sort by
     * @param {Array} trades - Array of trade objects
     * @param {Array} columns - Array of column names
     */
    handleSort(column, trades, columns) {
        // Toggle sort direction if same column
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Sort trades
        const sortedTrades = [...trades].sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle null/undefined
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';

            // Try to parse as number
            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);
            
            let comparison = 0;
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                // Both are numbers
                comparison = aNum - bNum;
            } else {
                // String comparison
                comparison = String(aVal).localeCompare(String(bVal));
            }

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        // Re-render with sorted data
        this.render(sortedTrades);
        
        // Update sort indicator
        this.updateSortIndicator(column);
    }

    /**
     * Update sort indicator on the active column
     * @param {string} activeColumn - Name of currently sorted column
     */
    updateSortIndicator(activeColumn) {
        const table = document.getElementById('raw-data-table');
        if (!table) return;

        const headers = table.querySelectorAll('th.sortable');
        
        headers.forEach(header => {
            // Remove existing indicator
            const existingIndicator = header.querySelector('.sort-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }

            // Add indicator to active column
            if (header.textContent.trim() === activeColumn) {
                const indicator = document.createElement('span');
                indicator.className = 'sort-indicator';
                indicator.style.marginLeft = '4px';
                indicator.style.fontSize = '10px';
                indicator.textContent = this.sortDirection === 'asc' ? '▲' : '▼';
                header.appendChild(indicator);
            }
        });
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.RawDataTable = RawDataTable;
}
