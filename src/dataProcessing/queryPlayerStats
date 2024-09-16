// src/dataProcessing/queryPlayerStats.js
const fs = require('fs');
const path = require('path');

/**
 * Queries player statistics based on player name and filtering options.
 * @param {string} playerName - Name of the player.
 * @param {Object} options - Filtering options.
 * @returns {Object|null} Player statistics object or null if not found.
 */
function queryPlayerStats(playerName, options = {}) {
  const playerStatsFilePath = path.join(__dirname, '../data/playerStats.json');
  
  // Check if the playerStats data file exists
  if (!fs.existsSync(playerStatsFilePath)) {
    console.error('Player statistics file not found. Please run analyze.js first.');
    return null;
  }

  // Read and parse the playerStats data
  const rawData = fs.readFileSync(playerStatsFilePath, 'utf-8');
  let playerStats;
  try {
    playerStats = JSON.parse(rawData);
  } catch (parseError) {
    console.error('Error parsing playerStats.json:', parseError);
    return null;
  }

  const stats = playerStats[playerName];

  if (!stats) {
    console.error(`No statistics found for player ${playerName}`);
    return null;
  }

  // Clone the stats object to avoid mutating the original data
  let filteredStats = { ...stats };

  // Apply filters to matches
  if (options.filters && options.filters.length > 0) {
    filteredStats.matches = filteredStats.matches.filter(match => {
      let include = true;

      for (const filter of options.filters) {
        switch (filter.type) {
          case 'scoreCount':
            // Example filter: count a score of 3-1 differently from 3-0
            if (filter.values && !filter.values.includes(match.score)) {
              include = false;
            }
            break;
          case 'bestOf':
            if (filter.value && match.bestOf !== filter.value) {
              include = false;
            }
            break;
          case 'result':
            if (filter.value && match.result !== filter.value) {
              include = false;
            }
            break;
          // Add more filter cases as needed
          default:
            break;
        }
      }

      return include;
    });
  }

  // Recalculate statistics based on filtered matches
  const totalMatches = filteredStats.matches.length;
  const totalWins = filteredStats.matches.filter(m => m.result === 'win').length;
  const totalLosses = filteredStats.matches.filter(m => m.result === 'loss').length;
  const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

  // Calculate straight game wins and deciding game wins
  const straightGameWins = filteredStats.matches.filter(
    m => m.result === 'win' && m.score.endsWith('-0')
  ).length;

  const decidingGameWins = filteredStats.matches.filter(
    m =>
      m.result === 'win' &&
      ((m.bestOf === 'Best of 5' && m.score.endsWith('-2')) ||
        (m.bestOf === 'Best of 3' && m.score.endsWith('-1')))
  ).length;

  // Update the filteredStats with recalculated values
  filteredStats.matchesPlayed = totalMatches;
  filteredStats.wins = totalWins;
  filteredStats.losses = totalLosses;
  filteredStats.winRate = winRate;
  filteredStats.straightGameWins = straightGameWins;
  filteredStats.decidingGameWins = decidingGameWins;

  return filteredStats;
}

module.exports = queryPlayerStats;
