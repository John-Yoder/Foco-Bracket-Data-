// src/dataProcessing/queryPlayerStats.js
const fs = require('fs');
const path = require('path');

/**
 * Reads the playerStats.json file and returns the parsed data.
 * @returns {Object} Parsed player statistics data.
 */
function readPlayerStats() {
  const playerStatsFilePath = path.join(__dirname, '../data/playerStats.json');

  // Check if playerStats.json exists
  if (!fs.existsSync(playerStatsFilePath)) {
    console.error(`Error: playerStats.json not found at ${playerStatsFilePath}. Please run computePlayerStats.js first.`);
    process.exit(1);
  }

  // Read the file
  let rawData;
  try {
    rawData = fs.readFileSync(playerStatsFilePath, 'utf-8');
  } catch (readError) {
    console.error(`Error reading playerStats.json: ${readError.message}`);
    process.exit(1);
  }

  // Parse JSON
  let playerStats;
  try {
    playerStats = JSON.parse(rawData);
  } catch (parseError) {
    console.error(`Error parsing playerStats.json: ${parseError.message}`);
    process.exit(1);
  }

  return playerStats;
}

/**
 * Generates a sorted list of players based on matchesPlayed.
 * @param {Object} playerStats - The player statistics data.
 * @returns {Array} Sorted array of players with matchesPlayed.
 */
function generateSortedPlayerList(playerStats) {
  const playerList = [];

  for (const playerName in playerStats) {
    if (playerStats.hasOwnProperty(playerName)) {
      const player = playerStats[playerName];
      playerList.push({
        name: player.name,
        matchesPlayed: player.matchesPlayed,
      });
    }
  }

  // Sort the list in descending order based on matchesPlayed
  playerList.sort((a, b) => b.matchesPlayed - a.matchesPlayed);

  return playerList;
}

/**
 * Displays the sorted list of players.
 * @param {Array} playerList - The sorted array of players.
 */
function displayPlayerList(playerList) {
  console.log('Player Statistics: Number of Sets Played (Sorted Descending)\n');
  console.log('Rank | Player Name           | Sets Played');
  console.log('-----|-----------------------|------------');

  playerList.forEach((player, index) => {
    const rank = index + 1;
    const name = player.name.padEnd(23, ' ');
    const sets = player.matchesPlayed.toString().padStart(11, ' ');
    console.log(`${rank.toString().padEnd(4, ' ')} | ${name} | ${sets}`);
  });

  console.log('\nTotal Players:', playerList.length);
}

// Main Execution
function main() {
  const playerStats = readPlayerStats();
  const sortedPlayerList = generateSortedPlayerList(playerStats);
  displayPlayerList(sortedPlayerList);
}

main();
