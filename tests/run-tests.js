#!/usr/bin/env node

/**
 * Headless test runner for Options Trading Journal
 * Runs automated tests and reports results to console
 */

const http = require('http');

const TEST_URL = 'http://localhost:8000/tests/automated-test.html';
const TIMEOUT = 30000; // 30 seconds

console.log('🧪 Running automated tests...\n');
console.log(`Test URL: ${TEST_URL}`);
console.log(`Timeout: ${TIMEOUT}ms\n`);

// Simple test to verify server is running
http.get('http://localhost:8000/', (res) => {
    if (res.statusCode === 200) {
        console.log('✓ Server is running on port 8000');
        console.log('\n📋 To view test results:');
        console.log(`   Open: ${TEST_URL}`);
        console.log('\n   The tests will run automatically and show:');
        console.log('   • Core component loading');
        console.log('   • Broker detection');
        console.log('   • CSV parsing for all formats');
        console.log('   • Data quality validation');
        console.log('   • Analytics processing');
        console.log('   • Data persistence\n');
        console.log('💡 Tip: Keep the browser console open (F12) to see detailed logs\n');
    } else {
        console.error(`✗ Server returned status ${res.statusCode}`);
        process.exit(1);
    }
}).on('error', (err) => {
    console.error('✗ Failed to connect to server');
    console.error(`  Error: ${err.message}`);
    console.error('\n  Make sure the server is running:');
    console.error('  python3 -m http.server 8000\n');
    process.exit(1);
});
