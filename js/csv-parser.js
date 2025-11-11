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
    // Required fields that must be present in every trade record
    this.requiredFields = [
      'Symbol',
      'Type',
      'Strategy',
      'Strike',
      'Expiry',
      'Volume',
      'Entry',
      'Delta',
      'Debit',
      'Credit',
      'Account'
    ];
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
    
    if (headers.length === 0) {
      throw new ParseError('CSV header row is empty');
    }

    const records = [];
    const errors = [];

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

        // Validate the record
        const validation = this.validate(record, i + 1);
        
        if (!validation.isValid) {
          errors.push({
            row: i + 1,
            errors: validation.errors
          });
        } else {
          records.push(this.normalizeRecord(record));
        }
      } catch (error) {
        errors.push({
          row: i + 1,
          errors: [`Parse error: ${error.message}`]
        });
      }
    }

    // If there are validation errors, throw with details
    if (errors.length > 0) {
      const errorMessage = this.formatValidationErrors(errors);
      throw new ParseError(errorMessage);
    }

    if (records.length === 0) {
      throw new ParseError('No valid trade records found in CSV');
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
   * Validate a single trade record
   * @param {Object} record - Raw CSV row object
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Object} - Validation result with isValid flag and errors array
   */
  validate(record, rowNumber) {
    const errors = [];

    // Check for required fields
    this.requiredFields.forEach(field => {
      if (!record.hasOwnProperty(field) || record[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate numeric fields
    const numericFields = ['Strike', 'Volume', 'Delta', 'Debit', 'Credit'];
    numericFields.forEach(field => {
      if (record[field] !== '' && record[field] !== undefined) {
        const value = parseFloat(record[field]);
        if (isNaN(value)) {
          errors.push(`Invalid numeric value for ${field}: ${record[field]}`);
        }
      }
    });

    // Validate date fields
    const dateFields = ['Expiry', 'Entry'];
    dateFields.forEach(field => {
      if (record[field] !== '' && record[field] !== undefined) {
        const date = new Date(record[field]);
        if (isNaN(date.getTime())) {
          errors.push(`Invalid date format for ${field}: ${record[field]}`);
        }
      }
    });

    // Validate Exit date if present (optional field)
    if (record.Exit && record.Exit !== '') {
      const date = new Date(record.Exit);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid date format for Exit: ${record.Exit}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      rowNumber: rowNumber
    };
  }

  /**
   * Normalize record data types
   * @param {Object} record - Raw record object
   * @returns {Object} - Normalized record with proper data types
   */
  normalizeRecord(record) {
    return {
      Symbol: record.Symbol,
      Type: record.Type,
      Strategy: record.Strategy,
      Strike: parseFloat(record.Strike),
      Expiry: new Date(record.Expiry),
      Volume: parseFloat(record.Volume),
      Entry: new Date(record.Entry),
      Delta: parseFloat(record.Delta),
      Exit: record.Exit && record.Exit !== '' ? new Date(record.Exit) : null,
      Debit: parseFloat(record.Debit),
      Credit: parseFloat(record.Credit),
      Account: record.Account
    };
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
