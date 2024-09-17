// src/dataProcessing/queryWinRates.js

const fs = require('fs');
const path = require('path');
const nameMappings = require('./nameMappings'); // Ensure correct path

/**
 * Normalizes player names by removing any prefix followed by '| '.
 * For example:
 * - '12 | John 34' becomes 'John 34'
 * - 'a bc | John 34' becomes 'John 34'
 * - 'John 34' remains 'John 34'
 *
 * @param {string} name - The original player name.
 * @returns {string} - The normalized player name.
 */
function normalizePlayerName(name) {
  const separator = '| ';
  const index = name.indexOf(separator);
  if (index !== -1) {
    return name.substring(index + separator.length).trim();
  }
  return name.trim();
}

/**
 * Combines all aliases of a player into a single primary name.
 * @param {string} inputName - The name to query.
 * @returns {Array} - An array of all associated names (primary and aliases).
 */
function nameCombiner(inputName) {
  const normalizedInput = normalizePlayerName(inputName);
  const primaryName = nameMappings[normalizedInput] || normalizedInput;

  // Collect all names that map to the primary name
  const associatedNames = Object.keys(nameMappings).filter(alias => nameMappings[alias] === primaryName);

  // Ensure the primary name is included
  if (!associatedNames.includes(primaryName)) {
    associatedNames.push(primaryName);
  }

  return associatedNames;
}

/**
 * Aggregates player statistics from multiple associated names.
 * @param {Object} playerStats - The player statistics data from playerStats.json.
 * @param {Array} names - An array of player names to aggregate.
 * @returns {Object} - Aggregated player statistics.
 */
function aggregatePlayerStats(playerStats, names) {
  const aggregatedStats = {
    name: names[0], // Primary name
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalGamesWon: 0,
    totalGamesLost: 0,
    gameWinRate: 0,
    straightGameWins: 0,
    straightGameLosses: 0,
    straightGameMatches: 0,
    straightGameWinRate: 0,
    decidingGameWins: 0,
    decidingGameLosses: 0,
    decidingGameMatches: 0,
    decidingGameWinRate: 0,
    matches: [],
    timeBasedStats: {
      last6Months: { matchesPlayed: 0, wins: 0, winRate: 0 },
      last1Month: { matchesPlayed: 0, wins: 0, winRate: 0 },
      last10Days: { matchesPlayed: 0, wins: 0, winRate: 0 },
    },
  };

  names.forEach(name => {
    const stats = playerStats[name];
    if (stats) {
      aggregatedStats.matchesPlayed += stats.matchesPlayed;
      aggregatedStats.wins += stats.wins;
      aggregatedStats.losses += stats.losses;
      aggregatedStats.totalGamesWon += stats.totalGamesWon;
      aggregatedStats.totalGamesLost += stats.totalGamesLost;
      aggregatedStats.straightGameWins += stats.straightGameWins;
      aggregatedStats.straightGameLosses += stats.straightGameLosses;
      aggregatedStats.straightGameMatches += stats.straightGameMatches;
      aggregatedStats.decidingGameWins += stats.decidingGameWins;
      aggregatedStats.decidingGameLosses += stats.decidingGameLosses;
      aggregatedStats.decidingGameMatches += stats.decidingGameMatches;

      // Aggregate matches
      aggregatedStats.matches = aggregatedStats.matches.concat(stats.matches);

      // Aggregate time-based stats
      aggregatedStats.timeBasedStats.last6Months.matchesPlayed += stats.timeBasedStats.last6Months.matchesPlayed;
      aggregatedStats.timeBasedStats.last6Months.wins += stats.timeBasedStats.last6Months.wins;
      aggregatedStats.timeBasedStats.last1Month.matchesPlayed += stats.timeBasedStats.last1Month.matchesPlayed;
      aggregatedStats.timeBasedStats.last1Month.wins += stats.timeBasedStats.last1Month.wins;
      aggregatedStats.timeBasedStats.last10Days.matchesPlayed += stats.timeBasedStats.last10Days.matchesPlayed;
      aggregatedStats.timeBasedStats.last10Days.wins += stats.timeBasedStats.last10Days.wins;
    } else {
      console.warn(`No stats found for player: ${name}`);
    }
  });

  // Recalculate win rates
  aggregatedStats.winRate = aggregatedStats.matchesPlayed > 0 ? (aggregatedStats.wins / aggregatedStats.matchesPlayed) * 100 : 0;
  aggregatedStats.gameWinRate = (aggregatedStats.totalGamesWon + aggregatedStats.totalGamesLost) > 0
    ? (aggregatedStats.totalGamesWon / (aggregatedStats.totalGamesWon + aggregatedStats.totalGamesLost)) * 100
    : 0;
  aggregatedStats.straightGameWinRate = aggregatedStats.straightGameMatches > 0
    ? (aggregatedStats.straightGameWins / aggregatedStats.straightGameMatches) * 100
    : 0;
  aggregatedStats.decidingGameWinRate = aggregatedStats.decidingGameMatches > 0
    ? (aggregatedStats.decidingGameWins / aggregatedStats.decidingGameMatches) * 100
    : 0;

  // Recalculate time-based win rates
  for (const key in aggregatedStats.timeBasedStats) {
    const tStats = aggregatedStats.timeBasedStats[key];
    tStats.winRate = tStats.matchesPlayed > 0 ? (tStats.wins / tStats.matchesPlayed) * 100 : 0;
  }

  return aggregatedStats;
}

/**
 * Reads and parses the playerStats.json file.
 * @returns {Object} - Parsed player statistics data.
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
 * Aggregates statistics for all players considering name mappings.
 * @param {Object} playerStats - The player statistics data.
 * @param {Object} nameMappings - The name mappings object.
 * @returns {Array} - Array of aggregated player stats.
 */
function aggregateAllPlayerStats(playerStats, nameMappings) {
  const primaryNames = new Set(Object.values(nameMappings));

  const aggregatedPlayers = {};

  primaryNames.forEach(primaryName => {
    // Find all aliases that map to this primary name
    const aliases = Object.keys(nameMappings).filter(alias => nameMappings[alias] === primaryName);

    // Ensure the primary name is included
    if (!aliases.includes(primaryName)) {
      aliases.push(primaryName);
    }

    // Aggregate stats
    const aggregatedStats = aggregatePlayerStats(playerStats, aliases);

    // Only include players with 50 or more sets played
    if (aggregatedStats.matchesPlayed >= 50) {
      aggregatedPlayers[primaryName] = aggregatedStats;
    }
  });

  return aggregatedPlayers;
}

/**
 * Formats and displays the aggregated player statistics in a table.
 * Sorts by win rate.
 * @param {Array} players - Array of aggregated player statistics.
 */
function displayWinRatesTable(players) {
  // Convert the players object to an array
  const playersArray = Object.values(players);

  // Sort the array by winRate in descending order
  playersArray.sort((a, b) => b.winRate - a.winRate);

  // Prepare table headers
  const headers = ['Rank', 'Player Name', 'Sets Played', 'Win Rate (%)'];
  const tableRows = [];

  playersArray.forEach((player, index) => {
    const rank = index + 1;
    const name = player.name;
    const setsPlayed = player.matchesPlayed;
    const winRate = player.winRate.toFixed(2);

    tableRows.push([rank, name, setsPlayed, winRate]);
  });

  // Determine column widths
  const colWidths = headers.map(header => header.length);
  tableRows.forEach(row => {
    row.forEach((cell, idx) => {
      colWidths[idx] = Math.max(colWidths[idx], cell.toString().length);
    });
  });

  // Function to format a row
  const formatRow = (row) => {
    return row.map((cell, idx) => cell.toString().padEnd(colWidths[idx])).join(' | ');
  };

  // Display headers
  console.log(formatRow(headers));

  // Display separator
  console.log(colWidths.map(width => '-'.repeat(width)).join('-|-'));

  // Display rows
  tableRows.forEach(row => {
    console.log(formatRow(row));
  });

  // Display total players
  console.log(`\nTotal Players with 50 or more sets: ${playersArray.length}`);
}

/**
 * Main function to execute the query.
 */
function main() {
  const playerStats = readPlayerStats();

  const aggregatedPlayers = aggregateAllPlayerStats(playerStats, nameMappings);

  displayWinRatesTable(aggregatedPlayers);
}

main();
