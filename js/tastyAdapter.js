import fs from 'fs';

// Option Strategy Classifier
// Processes option trades CSV and identifies strategy patterns

export function parseTasty(filePath) {
  // Read input CSV
  const data = fs.readFileSync(filePath, 'utf-8');

  // Process trades and classify strategies
  const result = processCSV(data);

  // View statistics
  console.log('Strategy Statistics:', result.stats);

  console.log(result.trades);

  return result.trades;
}

// Option Strategy Classifier
// Processes option trades CSV and identifies strategy patterns

// Helper: Extract strike price from symbol
function extractStrike(symbol) {
  // Symbol format: "SPY   250606P00500000"
  // Last 8 digits before P/C are strike * 1000
  const match = symbol.match(/[PC](\d{8})$/);
  if (!match) return null;
  return parseInt(match[1]) / 1000;
}

// Helper: Extract option type (PUT/CALL) from symbol
function extractOptionType(symbol) {
  if (symbol.includes('P')) return 'PUT';
  if (symbol.includes('C')) return 'CALL';
  return null;
}

// Helper: Check if action is opening
function isOpeningAction(action) {
  return action === 'BUY_TO_OPEN' || action === 'SELL_TO_OPEN';
}

// Helper: Check if action is closing
function isClosingAction(action) {
  return action === 'BUY_TO_CLOSE' || action === 'SELL_TO_CLOSE';
}

// Helper: Get signed quantity (negative for sells, positive for buys)
function getSignedQuantity(trade) {
  const qty = parseInt(trade.Quantity);
  return trade.Action.startsWith('SELL') ? -qty : qty;
}

// Main classification function
function classifyStrategy(orderGroup) {
  const legs = orderGroup.length;
  
  // Extract characteristics
  const calls = orderGroup.filter(t => extractOptionType(t.Symbol) === 'CALL');
  const puts = orderGroup.filter(t => extractOptionType(t.Symbol) === 'PUT');
  const buys = orderGroup.filter(t => t.Action === 'BUY_TO_OPEN');
  const sells = orderGroup.filter(t => t.Action === 'SELL_TO_OPEN');
  
  // Single leg strategies
  if (legs === 1) {
    const trade = orderGroup[0];
    const optionType = extractOptionType(trade.Symbol);
    
    if (optionType === 'CALL') {
      return trade.Action === 'BUY_TO_OPEN' ? 'Long Call' : 'Short Call';
    } else if (optionType === 'PUT') {
      return trade.Action === 'BUY_TO_OPEN' ? 'Long Put' : 'Short Put';
    }
  }
  
  // Two leg strategies
  if (legs === 2) {
    const strikes = orderGroup.map(t => extractStrike(t.Symbol)).sort((a, b) => a - b);
    const sameStrike = strikes[0] === strikes[1];
    
    // Call spread (2 calls)
    if (calls.length === 2) {
      const longCall = buys.find(t => extractOptionType(t.Symbol) === 'CALL');
      const shortCall = sells.find(t => extractOptionType(t.Symbol) === 'CALL');
      
      if (longCall && shortCall) {
        const longStrike = extractStrike(longCall.Symbol);
        const shortStrike = extractStrike(shortCall.Symbol);
        return longStrike < shortStrike ? 'Bull Call Spread' : 'Bear Call Spread';
      }
    }
    
    // Put spread (2 puts)
    if (puts.length === 2) {
      const longPut = buys.find(t => extractOptionType(t.Symbol) === 'PUT');
      const shortPut = sells.find(t => extractOptionType(t.Symbol) === 'PUT');
      
      if (longPut && shortPut) {
        const longStrike = extractStrike(longPut.Symbol);
        const shortStrike = extractStrike(shortPut.Symbol);
        return longStrike > shortStrike ? 'Bear Put Spread' : 'Bull Put Spread';
      }
    }
    
    // Straddle or Strangle (1 call + 1 put)
    if (calls.length === 1 && puts.length === 1) {
      return sameStrike ? 'Straddle' : 'Strangle';
    }
  }
  
  // Four leg strategies - Iron Condor
  if (legs === 4 && calls.length === 2 && puts.length === 2) {
    // Iron Condor: 2 calls (one long, one short) + 2 puts (one long, one short)
    const callBuys = calls.filter(t => t.Action === 'BUY_TO_OPEN').length;
    const callSells = calls.filter(t => t.Action === 'SELL_TO_OPEN').length;
    const putBuys = puts.filter(t => t.Action === 'BUY_TO_OPEN').length;
    const putSells = puts.filter(t => t.Action === 'SELL_TO_OPEN').length;
    
    if (callBuys === 1 && callSells === 1 && putBuys === 1 && putSells === 1) {
      return 'Iron Condor';
    }
  }
  
  // If we can't classify, it's custom
  return 'Custom';
}

// Helper: Check if trade should be processed (only option trades)
function isOptionTrade(trade) {
  return trade.Type === 'Trade' && trade['Instrument Type'] === 'Equity Option';
}

// Main processing function
function processOptionTrades(trades) {
  // Filter to only option trades
  const optionTrades = trades.filter(isOptionTrade);
  
  // Step 1: Group opening trades by Order #
  const orderGroups = {};
  const openingTrades = optionTrades.filter(t => isOpeningAction(t.Action));
  
  openingTrades.forEach(trade => {
    const orderId = trade['Order #'];
    if (!orderGroups[orderId]) {
      orderGroups[orderId] = [];
    }
    orderGroups[orderId].push(trade);
  });
  
  // Step 2: Classify each order group and create position registry
  const positionRegistry = {};
  const strategyInfo = {};
  
  Object.entries(orderGroups).forEach(([orderId, group]) => {
    const strategy = classifyStrategy(group);
    const totalLegs = group.length;
    
    strategyInfo[orderId] = {
      strategy,
      totalLegs,
      underlyingSymbol: group[0]['Underlying Symbol']
    };
    
    // Register each leg in position registry
    group.forEach((trade, index) => {
      const symbol = trade.Symbol;
      
      if (!positionRegistry[symbol]) {
        positionRegistry[symbol] = {
          openOrderNumber: orderId,
          strategy,
          strategyGroupId: orderId,
          totalLegs,
          legNumber: index + 1,
          netQuantity: 0,
          trades: []
        };
      }
      
      positionRegistry[symbol].netQuantity += getSignedQuantity(trade);
      positionRegistry[symbol].trades.push(trade);
    });
  });
  
  // Step 3: Process all trades and add strategy information
  const enrichedTrades = trades.map(trade => {
    // Skip non-option trades - just pass through with empty strategy fields
    if (!isOptionTrade(trade)) {
      return {
        ...trade,
        Strategy: '',
        'Strategy Group ID': '',
        'Leg Number': '',
        'Total Legs': ''
      };
    }
    
    const symbol = trade.Symbol;
    
    if (isOpeningAction(trade.Action)) {
      // Opening trade - get info from position registry
      const position = positionRegistry[symbol];
      
      return {
        ...trade,
        Strategy: position.strategy,
        'Strategy Group ID': position.strategyGroupId,
        'Leg Number': position.legNumber,
        'Total Legs': position.totalLegs
      };
    } else if (isClosingAction(trade.Action)) {
      // Closing trade - inherit from opening position
      const position = positionRegistry[symbol];
      
      if (position) {
        // Update net quantity
        position.netQuantity += getSignedQuantity(trade);
        
        return {
          ...trade,
          Strategy: position.strategy,
          'Strategy Group ID': position.strategyGroupId,
          'Leg Number': position.legNumber,
          'Total Legs': position.totalLegs
        };
      } else {
        // Closing trade without matching opening (shouldn't happen if data is clean)
        return {
          ...trade,
          Strategy: 'Unknown',
          'Strategy Group ID': null,
          'Leg Number': null,
          'Total Legs': null
        };
      }
    }
    
    return trade;
  });
  
  return {
    enrichedTrades,
    positionRegistry,
    strategyInfo
  };
}

// Simple CSV parser
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });
    
    data.push(row);
  }
  
  return data;
}

// Helper to parse CSV line handling quoted values
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Push last field
  values.push(current);
  
  return values;
}

// Simple CSV writer
function writeCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = [headers.join(',')];
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] !== null && row[header] !== undefined ? row[header] : '';
      // Escape values with commas or quotes
      if (String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')) {
        return `"${String(value).replace(/"/g, '""')}"`;
      }
      return value;
    });
    rows.push(values.join(','));
  });
  
  return rows.join('\n');
}

// Example usage with Node.js fs
function processCSV(csvData) {
  // Parse CSV
  const trades = parseCSV(csvData);
  
  // Process trades
  const result = processOptionTrades(trades);
  
  // Convert back to CSV
  const outputCSV = writeCSV(result.enrichedTrades);
  
  return {
    trades: result.enrichedTrades,
    csv: outputCSV,
    stats: generateStats(result)
  };
}

// Helper: Generate strategy statistics
function generateStats(result) {
  const stats = {};
  
  Object.values(result.strategyInfo).forEach(info => {
    if (!stats[info.strategy]) {
      stats[info.strategy] = 0;
    }
    stats[info.strategy]++;
  });
  
  return stats;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    processOptionTrades,
    processCSV,
    classifyStrategy,
    extractStrike,
    extractOptionType,
    parseCSV,
    writeCSV,
    isOptionTrade
  };
}

// Node.js usage example:
// const fs = require('fs');
// const { processCSV } = require('./option_strategy_classifier');
//
// const data = fs.readFileSync('trades.csv', 'utf-8');
// const result = processCSV(data);
// fs.writeFileSync('trades_with_strategies.csv', result.csv, 'utf-8');
// console.log('Strategy Statistics:', result.stats);
// 
// Notes:
// - Only processes rows where Type = 'Trade' and Instrument Type = 'Equity Option'
// - Other rows (Money Movement, Receive Deliver) are passed through with empty strategy fields
// - Handles CSV with comma delimiters and proper quote escaping