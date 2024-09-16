// analyze.js
```
const processData = require('./dataProcessing/processData');
const computeHeadToHead = require('./dataProcessing/computeHeadToHead');
const computePlayerStats = require('./dataProcessing/computePlayerStats');

function analyzeData() {
  const matches = processData(); // Processes data.json and outputs matches.json
  const headToHead = computeHeadToHead(matches);
  const playerStats = computePlayerStats(matches);

  // Now you have matches.json, headToHead.json, and playerStats.json
}

analyzeData();
```