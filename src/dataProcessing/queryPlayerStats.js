// src/dataProcessing/queryPlayerStats.js
const fs = require('fs');
const path = require('path');
const nameMappings = require('./nameMappings'); // Ensure the path is correct

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
 * Queries and displays aggregated player statistics based on the input name.
 * @param {string} inputName - The name to query.
 */
function queryPlayerStats(inputName) {
  const playerStatsFilePath = path.join(__dirname, '../data/playerStats.json');

  // Check if playerStats.json exists
  if (!fs.existsSync(playerStatsFilePath)) {
    console.error(`Error: playerStats.json not found at ${playerStatsFilePath}. Please run computePlayerStats.js first.`);
    process.exit(1);
  }

  // Read and parse playerStats.json
  let playerStats;
  try {
    const rawData = fs.readFileSync(playerStatsFilePath, 'utf-8');
    playerStats = JSON.parse(rawData);
    console.log(`Successfully parsed playerStats.json.`);
  } catch (readError) {
    console.error(`Error reading playerStats.json: ${readError.message}`);
    process.exit(1);
  }

  // Get all associated names
  const associatedNames = nameCombiner(inputName);
  console.log(`Associated names for "${inputName}":`, associatedNames);

  // Aggregate stats
  const aggregatedStats = aggregatePlayerStats(playerStats, associatedNames);

  // Display aggregated stats
  console.log(`\nAggregated Statistics for "${aggregatedStats.name}":\n`);
  console.log(`Matches Played: ${aggregatedStats.matchesPlayed}`);
  console.log(`Wins: ${aggregatedStats.wins}`);
  console.log(`Losses: ${aggregatedStats.losses}`);
  console.log(`Win Rate: ${aggregatedStats.winRate.toFixed(2)}%`);
  console.log(`Total Games Won: ${aggregatedStats.totalGamesWon}`);
  console.log(`Total Games Lost: ${aggregatedStats.totalGamesLost}`);
  console.log(`Game Win Rate: ${aggregatedStats.gameWinRate.toFixed(2)}%`);
  console.log(`Straight Game Wins: ${aggregatedStats.straightGameWins}`);
  console.log(`Straight Game Losses: ${aggregatedStats.straightGameLosses}`);
  console.log(`Straight Game Matches: ${aggregatedStats.straightGameMatches}`);
  console.log(`Straight Game Win Rate: ${aggregatedStats.straightGameWinRate.toFixed(2)}%`);
  console.log(`Deciding Game Wins: ${aggregatedStats.decidingGameWins}`);
  console.log(`Deciding Game Losses: ${aggregatedStats.decidingGameLosses}`);
  console.log(`Deciding Game Matches: ${aggregatedStats.decidingGameMatches}`);
  console.log(`Deciding Game Win Rate: ${aggregatedStats.decidingGameWinRate.toFixed(2)}%`);
  console.log(`\nTime-Based Statistics:`);
  console.log(`Last 6 Months - Matches Played: ${aggregatedStats.timeBasedStats.last6Months.matchesPlayed}, Wins: ${aggregatedStats.timeBasedStats.last6Months.wins}, Win Rate: ${aggregatedStats.timeBasedStats.last6Months.winRate.toFixed(2)}%`);
  console.log(`Last 1 Month - Matches Played: ${aggregatedStats.timeBasedStats.last1Month.matchesPlayed}, Wins: ${aggregatedStats.timeBasedStats.last1Month.wins}, Win Rate: ${aggregatedStats.timeBasedStats.last1Month.winRate.toFixed(2)}%`);
  console.log(`Last 10 Days - Matches Played: ${aggregatedStats.timeBasedStats.last10Days.matchesPlayed}, Wins: ${aggregatedStats.timeBasedStats.last10Days.wins}, Win Rate: ${aggregatedStats.timeBasedStats.last10Days.winRate.toFixed(2)}%`);
}

// Main Execution
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide a player name to query.');
    console.error('Usage: node src/dataProcessing/queryPlayerStats.js "Player Name"');
    process.exit(1);
  }

  const inputName = args.join(' ');
  queryPlayerStats(inputName);
}

main();
