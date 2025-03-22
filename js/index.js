function add(a, b) {
    return a + b;
}

if (require.main === module) {
    console.log("Smart Farming Assistant - starting application.");
    console.log("2 + 3 =", add(2, 3));
}

module.exports = { add };