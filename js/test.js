const { add } = require('./index.js');

function runTests() {
    console.log('Running tests...\n');
    
    // Test 1: Adding two positive numbers
    const test1 = add(2, 3) === 5;
    console.log('Test 1:', test1 ? '✓ PASS' : '✗ FAIL', '(2 + 3 = 5)');
    
    // Test 2: Adding a positive and negative number
    const test2 = add(5, -3) === 2;
    console.log('Test 2:', test2 ? '✓ PASS' : '✗ FAIL', '(5 + -3 = 2)');
    
    // Test 3: Adding two negative numbers
    const test3 = add(-2, -4) === -6;
    console.log('Test 3:', test3 ? '✓ PASS' : '✗ FAIL', '(-2 + -4 = -6)');
    
    const allPassed = test1 && test2 && test3;
    console.log('\nTest Results:', allPassed ? 'All tests passed!' : 'Some tests failed.');
    
    process.exit(allPassed ? 0 : 1);
}

runTests();