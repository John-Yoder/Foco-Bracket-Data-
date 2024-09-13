// analyze.js
const processData = require('./processData');
const computeHeadToHead = require('./computeHeadToHead');

function analyzeData() {
  const matches = processData(); // Processes data.json and outputs matches.json
  const headToHead = computeHeadToHead(matches);

  // You can now perform queries on headToHead
}

analyzeData();
