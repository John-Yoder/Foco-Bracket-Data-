// src/dataProcessing/computeHeadToHead.js
const fs = require('fs');
const path = require('path');

/**
 * Computes head-to-head statistics from matches.
 * @param {Array} matches - Array of match objects.
 * @returns {Object} Head-to-head data.
 */
function computeHeadToHead(matches) {
  const headToHead = {}; // Object to store head-to-head data

  for (const match of matches) {
    const {
      winnerName,
      loserName,
      winnerScore,
      loserScore,
      bestOf,
      tournamentName,
      eventName,
      eventId,
      setId,
      completedAt,
    } = match;

    // Initialize entries in headToHead object
    if (!headToHead[winnerName]) {
      headToHead[winnerName] = { name: winnerName, opponents: {} };
    }
    if (!headToHead[loserName]) {
      headToHead[loserName] = { name: loserName, opponents: {} };
    }

    // Update winner's record against loser
    if (!headToHead[winnerName].opponents[loserName]) {
      headToHead[winnerName].opponents[loserName] = [];
    }
    headToHead[winnerName].opponents[loserName].push({
      opponentName: loserName,
      result: 'win',
      score: `${winnerScore}-${loserScore}`,
      bestOf: bestOf,
      tournamentName: tournamentName,
      eventName: eventName,
      eventId: eventId,
      setId: setId,
      completedAt: completedAt,
    });

    // Update loser's record against winner
    if (!headToHead[loserName].opponents[winnerName]) {
      headToHead[loserName].opponents[winnerName] = [];
    }
    headToHead[loserName].opponents[winnerName].push({
      opponentName: winnerName,
      result: 'loss',
      score: `${loserScore}-${winnerScore}`,
      bestOf: bestOf,
      tournamentName: tournamentName,
      eventName: eventName,
      eventId: eventId,
      setId: setId,
      completedAt: completedAt,
    });
  }

  // Define the output path for headToHead.json
  const headToHeadFilePath = path.join(__dirname, '../data/headToHead.json');

  // Ensure the data directory exists
  const dataDir = path.dirname(headToHeadFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Save headToHead data to headToHead.json
  try {
    fs.writeFileSync(headToHeadFilePath, JSON.stringify(headToHead, null, 2));
    console.log(`Head-to-head data saved to ${headToHeadFilePath}`);
  } catch (writeError) {
    console.error('Error writing to headToHead.json:', writeError);
  }

  return headToHead;
}

module.exports = computeHeadToHead;

// Execute the function if the script is run directly
if (require.main === module) {
  // Define the path to matches.json
  const matchesFilePath = path.join(__dirname, '../data/matches.json');

  // Check if matches.json exists
  if (!fs.existsSync(matchesFilePath)) {
    console.error('matches.json not found. Please run processData.js first.');
    process.exit(1);
  }

  // Read and parse matches.json
  const rawMatches = fs.readFileSync(matchesFilePath, 'utf-8');
  let matches;
  try {
    matches = JSON.parse(rawMatches);
  } catch (parseError) {
    console.error('Error parsing matches.json:', parseError);
    process.exit(1);
  }

  // Compute head-to-head statistics
  computeHeadToHead(matches);
}
