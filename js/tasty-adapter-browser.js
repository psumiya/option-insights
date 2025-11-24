/**
 * Browser wrapper for tastyAdapter.js
 * Makes the Node.js module functions available globally for browser use
 * 
 * This file should be loaded AFTER tastyAdapter.js in the HTML
 */

// The tastyAdapter.js file exports via module.exports, but in browser context
// we need to make those functions available globally.
// Since the file uses ES6 import/export syntax, we'll need to inline the key functions
// or load it differently.

// For now, we'll just ensure the functions from tastyAdapter are available
// by checking if they're already defined globally (if loaded as a module script)

if (typeof window !== 'undefined') {
  // Check if functions are already available
  if (typeof processOptionTrades === 'undefined') {
    console.warn('tastyAdapter.js functions not found in global scope.');
    console.warn('The tastyAdapter.js file needs to be loaded as a module or its functions need to be made global.');
  }
}
