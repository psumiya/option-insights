/**
 * Strategy Detector Component
 * 
 * Responsible for classifying option strategies from trade data.
 * 
 * Current Implementation:
 * - Returns the manually entered Strategy field from the CSV (pass-through)
 * 
 * Future Enhancement Points:
 * - Implement leg-based strategy detection by analyzing option positions
 * - Register custom detection rules using registerDetector()
 * - Support multi-leg strategy classification (Iron Condor, Butterfly, etc.)
 * - Add confidence scoring for detected strategies
 * 
 * Example Future Usage:
 * ```javascript
 * const detector = new StrategyDetector();
 * 
 * // Register a custom detector for Iron Condor
 * detector.registerDetector((trade) => {
 *   const legs = parseLegs(trade);
 *   if (isIronCondor(legs)) {
 *     return { strategy: "Iron Condor", confidence: 0.95 };
 *   }
 *   return null;
 * });
 * 
 * const strategy = detector.detect(trade);
 * ```
 */
class StrategyDetector {
  constructor() {
    /**
     * Array of custom detection functions
     * Each detector should return a strategy name or null
     * @type {Function[]}
     * @private
     */
    this.customDetectors = [];
  }

  /**
   * Detect strategy from trade data
   * 
   * Current implementation returns the manually entered Strategy field.
   * Future implementations will analyze trade legs to automatically classify strategies.
   * 
   * @param {Object} trade - Trade record with strategy information
   * @param {string} trade.Strategy - Manually entered strategy name
   * @param {string} [trade.Type] - Option type (Call/Put)
   * @param {number} [trade.Strike] - Strike price
   * @param {Date} [trade.Expiry] - Expiration date
   * @param {number} [trade.Volume] - Number of contracts
   * @returns {string} Strategy classification
   * 
   * @example
   * const detector = new StrategyDetector();
   * const strategy = detector.detect({ Strategy: "Long Call", Type: "Call", Strike: 150 });
   * // Returns: "Long Call"
   */
  detect(trade) {
    // Future enhancement: Run custom detectors first
    // for (const detector of this.customDetectors) {
    //   const result = detector(trade);
    //   if (result) {
    //     return result;
    //   }
    // }

    // Current implementation: Pass-through manually entered strategy
    return trade.Strategy || "Unknown";
  }

  /**
   * Register a custom strategy detection rule
   * 
   * This method allows extending the strategy detection logic without modifying
   * the core StrategyDetector class. Custom detectors are called in registration
   * order before falling back to the manual Strategy field.
   * 
   * Extension Point for Future Development:
   * - Implement leg-based pattern matching
   * - Add machine learning classification
   * - Support platform-specific strategy naming conventions
   * 
   * @param {Function} detector - Custom detection function
   *   Function signature: (trade: Object) => string | null
   *   Should return strategy name if detected, null otherwise
   * 
   * @example
   * detector.registerDetector((trade) => {
   *   // Example: Detect credit spread pattern
   *   if (trade.Credit > trade.Debit && trade.Type === "Put") {
   *     return "Credit Spread";
   *   }
   *   return null;
   * });
   * 
   * @example
   * // Advanced: Multi-leg detection
   * detector.registerDetector((trade) => {
   *   const legs = parseTradeLegs(trade);
   *   
   *   if (legs.length === 4 && isIronCondorPattern(legs)) {
   *     return "Iron Condor";
   *   }
   *   
   *   if (legs.length === 2 && isVerticalSpread(legs)) {
   *     return legs[0].Credit > 0 ? "Credit Spread" : "Debit Spread";
   *   }
   *   
   *   return null;
   * });
   */
  registerDetector(detector) {
    if (typeof detector !== 'function') {
      throw new TypeError('Detector must be a function');
    }
    
    this.customDetectors.push(detector);
  }

  /**
   * Clear all registered custom detectors
   * Useful for testing or resetting detection logic
   * 
   * @example
   * detector.clearDetectors();
   */
  clearDetectors() {
    this.customDetectors = [];
  }

  /**
   * Get the number of registered custom detectors
   * 
   * @returns {number} Number of registered detectors
   */
  getDetectorCount() {
    return this.customDetectors.length;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StrategyDetector;
}
