/**
 * CSV Data Viewer
 * Displays raw CSV data in a table without any processing
 */

class CSVDataViewer {
    constructor() {
        this.container = document.querySelector('#tab-panel-data .overflow-x-auto');
        this.rawCSVText = null;
        this.parsedData = null;
    }

    /**
     * Store the raw CSV file for later display
     * @param {File} file - The raw CSV file
     */
    async loadCSVFile(file) {
        try {
            this.rawCSVText = await file.text();
            this.parseCSV();
            this.render();
        } catch (error) {
            console.error('Error loading CSV file:', error);
        }
    }

    /**
     * Parse CSV text into rows and columns
     */
    parseCSV() {
        if (!this.rawCSVText) {
            this.parsedData = null;
            return;
        }

        const lines = this.rawCSVText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            this.parsedData = null;
            return;
        }

        // First line is headers
        const headers = this.parseCSVLine(lines[0]);
        
        // Rest are data rows
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const row = this.parseCSVLine(lines[i]);
            if (row.length > 0) {
                rows.push(row);
            }
        }

        this.parsedData = {
            headers: headers,
            rows: rows
        };
    }

    /**
     * Parse a single CSV line, handling quoted values
     * @param {string} line - CSV line to parse
     * @returns {Array} - Array of values
     */
    parseCSVLine(line) {
        const values = [];
        let currentValue = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    // Escaped quote
                    currentValue += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                // End of value
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        // Add last value
        values.push(currentValue.trim());

        return values;
    }

    /**
     * Render the CSV data as a table
     */
    render() {
        if (!this.container) {
            console.warn('CSV data viewer container not found');
            return;
        }

        if (!this.parsedData || !this.parsedData.headers || this.parsedData.rows.length === 0) {
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

        // Create table
        const table = document.createElement('table');
        table.className = 'data-table';
        table.setAttribute('role', 'table');

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        this.parsedData.headers.forEach(header => {
            const th = document.createElement('th');
            th.setAttribute('role', 'columnheader');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        
        this.parsedData.rows.forEach(row => {
            const tr = document.createElement('tr');
            
            row.forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);

        // Replace existing content
        this.container.innerHTML = '';
        this.container.appendChild(table);
    }

    /**
     * Clear the data
     */
    clear() {
        this.rawCSVText = null;
        this.parsedData = null;
        this.render();
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CSVDataViewer = CSVDataViewer;
}
