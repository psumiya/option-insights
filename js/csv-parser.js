/**
 * CSV Parser Component
 * Handles parsing and validation of CSV trade data files
 */

class ParseError extends Error {
  constructor(message, rowNumber = null) {
    super(message);
    this.name = 'ParseError';
    this.rowNumber = rowNumber;
  }
}

class CSVParser {
  constructor() {
    // Minimal required fields - only what's absolutely necessary
    this.requiredFields = [
      'Symbol',
      'Entry'
    ];
    
    // Optional fields with defaults
    this.optionalFields = {
      'Type': 'Unknown',
      'Strategy': 'Unknown',
      'Strike': 0,
      'Expiry': null,
      'Volume': 1,
      'Delta': 0,
      'Exit': null,
      'Debit': 0,
      'Credit': 0,
      'Account': 'Default'
    };
  }

  /**
   * Parse CSV file and return trade records
   * @param {File} file - CSV file from file input
   * @returns {Promise<Array>} - Array of parsed trade records
   * @throws {ParseError} - If CSV is invalid or missing required fields
   */
  async parse(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const csvText = event.target.result;
          const records = this.parseCSVString(csvText);
          resolve(records);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new ParseError('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Parse CSV string into array of objects
   * @param {string} csvText - Raw CSV text
   * @returns {Array} - Array of trade record objects
   * @throws {ParseError} - If CSV format is invalid
   */
  parseCSVString(csvText) {
    const lines = csvText.trim().split('\n');
    
    if (lines.length === 0) {
      throw new ParseError('CSV file is empty');
    }

    // Parse header row
    const headers = this.parseCSVLine(lines[0]);
    
    // Parse first data row for broker detection
    let firstDataRow = null;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line !== '') {
        firstDataRow = this.parseCSVLine(line);
        break;
      }
    }
    
    // Detect broker format
    let brokerType = 'generic';
    let adapter = null;
    
    if (typeof BrokerAdapter !== 'undefined') {
      brokerType = BrokerAdapter.detectBroker(headers, firstDataRow);
      console.log(`Detected broker format: ${brokerType}`);
      adapter = BrokerAdapter.getAdapter(brokerType);
    } else {
      console.warn('BrokerAdapter not loaded, using generic parser');
    }
    
    // If using broker-specific adapter, parse all rows first
    if (brokerType !== 'generic') {
      const rawRows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        const values = this.parseCSVLine(line);
        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        rawRows.push(record);
      }
      
      // Convert using broker adapter
      const convertedTrades = adapter.convert(rawRows);
      console.log(`Converted ${convertedTrades.length} trades from ${brokerType} format`);
      return convertedTrades;
    }
    
    // Continue with generic parsing
    
    if (headers.length === 0) {
      throw new ParseError('CSV header row is empty');
    }

    const records = [];
    const warnings = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (line === '') {
        continue;
      }

      try {
        const values = this.parseCSVLine(line);
        
        // Create record object
        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });

        // Validate and normalize the record (lenient mode)
        const normalized = this.normalizeRecord(record, i + 1);
        
        if (normalized) {
          records.push(normalized);
        } else {
          warnings.push(`Row ${i + 1}: Skipped due to missing critical data`);
        }
      } catch (error) {
        // Log warning but continue processing
        warnings.push(`Row ${i + 1}: ${error.message}`);
        console.warn(`Skipping row ${i + 1}:`, error.message);
      }
    }

    if (records.length === 0) {
      throw new ParseError('No valid trade records found in CSV. Please ensure the file has Symbol and Entry columns.');
    }

    // Log warnings if any
    if (warnings.length > 0) {
      console.warn(`CSV Import Warnings (${warnings.length} rows had issues):`, warnings);
    }

    return records;
  }

  /**
   * Parse a single CSV line, handling quoted fields and commas
   * @param {string} line - Single line from CSV
   * @returns {Array} - Array of field values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(current.trim());

    return result;
  }

  /**
   * Parse a numeric value safely
   * @param {*} value - Value to parse
   * @param {number} defaultValue - Default if parsing fails
   * @returns {number} - Parsed number or default
   * @private
   */
  _parseNumber(value, defaultValue = 0) {
    if (value === '' || value === null || value === undefined) {
      return defaultValue;
    }
    
    // Remove currency symbols, commas, and extra whitespace
    let cleaned = String(value).replace(/[$,\s\t]/g, '');
    
    // Handle parentheses as negative (accounting format)
    if (cleaned.includes('(') || cleaned.includes(')')) {
      cleaned = '-' + cleaned.replace(/[()]/g, '');
    }
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Parse a date value safely
   * @param {*} value - Value to parse
   * @returns {Date|null} - Parsed date or null
   * @private
   */
  _parseDate(value) {
    if (!value || value === '') {
      return null;
    }
    
    let dateStr = String(value).trim();
    
    // Handle MM/DD format (missing year) - assume current or next year
    if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
      const currentYear = new Date().getFullYear();
      const [month, day] = dateStr.split('/');
      
      // Try current year first
      let date = new Date(`${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      
      // If date is in the past, try next year
      if (date < new Date()) {
        date = new Date(`${currentYear + 1}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
      
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Handle MM/DD/YY format
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/');
      const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
      dateStr = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Normalize record data types with lenient validation
   * @param {Object} record - Raw record object
   * @param {number} rowNumber - Row number for logging
   * @returns {Object|null} - Normalized record with proper data types, or null if critical fields missing
   */
  normalizeRecord(record, rowNumber) {
    // Check for absolutely required fields
    if (!record.Symbol || record.Symbol === '') {
      console.warn(`Row ${rowNumber}: Missing Symbol, skipping`);
      return null;
    }

    // Parse Entry date - required
    const entryDate = this._parseDate(record.Entry);
    if (!entryDate) {
      console.warn(`Row ${rowNumber}: Invalid or missing Entry date, skipping`);
      return null;
    }

    // Build normalized record with defaults for missing fields
    const normalized = {
      Symbol: record.Symbol.trim(),
      Type: record.Type && record.Type !== '' ? record.Type.trim() : this.optionalFields.Type,
      Strategy: record.Strategy && record.Strategy !== '' ? record.Strategy.trim() : this.optionalFields.Strategy,
      Strike: this._parseNumber(record.Strike, this.optionalFields.Strike),
      Expiry: this._parseDate(record.Expiry) || entryDate, // Default to entry date if missing
      Volume: this._parseNumber(record.Volume, this.optionalFields.Volume),
      Entry: entryDate,
      Delta: this._parseNumber(record.Delta, this.optionalFields.Delta),
      Exit: this._parseDate(record.Exit),
      Debit: this._parseNumber(record.Debit, this.optionalFields.Debit),
      Credit: this._parseNumber(record.Credit, this.optionalFields.Credit),
      Account: record.Account && record.Account !== '' ? record.Account.trim() : this.optionalFields.Account
    };

    return normalized;
  }

  /**
   * Format validation errors into a readable message
   * @param {Array} errors - Array of error objects with row and errors
   * @returns {string} - Formatted error message
   */
  formatValidationErrors(errors) {
    const maxErrorsToShow = 10;
    const errorCount = errors.length;
    const errorsToShow = errors.slice(0, maxErrorsToShow);

    let message = `Found ${errorCount} validation error${errorCount > 1 ? 's' : ''}:\n\n`;

    errorsToShow.forEach(error => {
      message += `Row ${error.row}:\n`;
      error.errors.forEach(err => {
        message += `  - ${err}\n`;
      });
      message += '\n';
    });

    if (errorCount > maxErrorsToShow) {
      message += `... and ${errorCount - maxErrorsToShow} more error${errorCount - maxErrorsToShow > 1 ? 's' : ''}`;
    }

    return message.trim();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CSVParser, ParseError };
}
