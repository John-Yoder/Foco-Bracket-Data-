// src/dataProcessing/interactiveQueryTool.js

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const nameMappings = require('./nameMappings'); // Ensure correct path

// Load playerStats.json
function loadPlayerStats() {
  const playerStatsFilePath = path.join(__dirname, '../data/playerStats.json');

  if (!fs.existsSync(playerStatsFilePath)) {
    console.error('Error: playerStats.json not found. Please run computePlayerStats.js first.');
    process.exit(1);
  }

  const rawData = fs.readFileSync(playerStatsFilePath, 'utf-8');
  return JSON.parse(rawData);
}

// Load matches.json
function loadMatches() {
  const matchesFilePath = path.join(__dirname, '../data/matches.json');

  if (!fs.existsSync(matchesFilePath)) {
    console.error('Error: matches.json not found. Please ensure it exists.');
    process.exit(1);
  }

  const rawData = fs.readFileSync(matchesFilePath, 'utf-8');
  return JSON.parse(rawData);
}

// Normalize player names
function normalizePlayerName(name) {
  const separator = '| ';
  const index = name.indexOf(separator);
  if (index !== -1) {
    return name.substring(index + separator.length).trim();
  }
  return name.trim();
}

// Combines all aliases of a player into a single primary name
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

// Main interactive function
async function main() {
  const playerStats = loadPlayerStats();
  const matches = loadMatches();

  // Step 1: Ask for the type of query
  const { queryType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'queryType',
      message: 'What type of query would you like to perform?',
      choices: [
        'Head-to-Head Query',
        'Player Stats Query',
      ],
    },
  ]);

  // Common Filters
  let filters = {
    timePeriod: null,
    events: null,
    matchType: null,
    decidingGamesOnly: false,
    minSetsPlayed: 0,
  };

  // Apply filters
  await applyFilters(filters);

  if (queryType === 'Head-to-Head Query') {
    await headToHeadQuery(matches, filters);
  } else if (queryType === 'Player Stats Query') {
    await playerStatsQuery(matches, filters);
  }
}

// Function to apply common filters
async function applyFilters(filters) {
  // Time Period Filter
  const { timePeriodChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'timePeriodChoice',
      message: 'Select a time period filter:',
      choices: [
        'All Time',
        'Last 6 Months',
        'Last 1 Month',
        'Last 10 Days',
        'Custom Date Range',
      ],
    },
  ]);

  if (timePeriodChoice === 'Custom Date Range') {
    const { startDate, endDate } = await inquirer.prompt([
      {
        type: 'input',
        name: 'startDate',
        message: 'Enter start date (YYYY-MM-DD):',
        validate: validateDate,
      },
      {
        type: 'input',
        name: 'endDate',
        message: 'Enter end date (YYYY-MM-DD):',
        validate: validateDate,
      },
    ]);
    filters.timePeriod = { startDate, endDate };
  } else if (timePeriodChoice !== 'All Time') {
    filters.timePeriod = timePeriodChoice;
  }

  // Match Type Filter
  const { matchType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'matchType',
      message: 'Select match type:',
      choices: [
        'Sets',
        'Games',
      ],
    },
  ]);
  filters.matchType = matchType;

  // Deciding Games Filter
  const { decidingGamesOnly } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'decidingGamesOnly',
      message: 'Include only deciding games?',
      default: false,
    },
  ]);
  filters.decidingGamesOnly = decidingGamesOnly;

  // Minimum Sets Played Filter
  const { minSetsPlayed } = await inquirer.prompt([
    {
      type: 'number',
      name: 'minSetsPlayed',
      message: 'Minimum number of sets played (0 for no minimum):',
      default: 0,
      validate: value => (value >= 0 ? true : 'Please enter a non-negative number'),
    },
  ]);
  filters.minSetsPlayed = minSetsPlayed;
}

// Validate date input
function validateDate(input) {
  const isValid = /^\d{4}-\d{2}-\d{2}$/.test(input);
  return isValid || 'Please enter a valid date in YYYY-MM-DD format';
}

// Function for Head-to-Head Query
async function headToHeadQuery(matches, filters) {
  const { player1Name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'player1Name',
      message: 'Enter the name of the first player:',
    },
  ]);

  const { player2Name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'player2Name',
      message: 'Enter the name of the second player:',
    },
  ]);

  const player1Aliases = nameCombiner(player1Name);
  const player2Aliases = nameCombiner(player2Name);

  // Filter matches
  let filteredMatches = filterMatches(matches, filters);

  // Filter matches between the two players
  filteredMatches = filteredMatches.filter(match => {
    const winnerNormalized = normalizePlayerName(match.winnerName);
    const loserNormalized = normalizePlayerName(match.loserName);

    return (
      (player1Aliases.includes(winnerNormalized) && player2Aliases.includes(loserNormalized)) ||
      (player2Aliases.includes(winnerNormalized) && player1Aliases.includes(loserNormalized))
    );
  });

  if (filteredMatches.length === 0) {
    console.log(`No matches found between ${player1Name} and ${player2Name} with the applied filters.`);
    return;
  }

  // Compute head-to-head stats
  const stats = {
    [player1Name]: { wins: 0, losses: 0 },
    [player2Name]: { wins: 0, losses: 0 },
  };

  filteredMatches.forEach(match => {
    const winnerNormalized = normalizePlayerName(match.winnerName);
    if (player1Aliases.includes(winnerNormalized)) {
      stats[player1Name].wins += 1;
      stats[player2Name].losses += 1;
    } else {
      stats[player2Name].wins += 1;
      stats[player1Name].losses += 1;
    }
  });

  // Display results
  console.log(`\nHead-to-Head Results between ${player1Name} and ${player2Name}:\n`);
  console.log(`${player1Name} - Wins: ${stats[player1Name].wins}, Losses: ${stats[player1Name].losses}`);
  console.log(`${player2Name} - Wins: ${stats[player2Name].wins}, Losses: ${stats[player2Name].losses}`);

  const totalMatches = filteredMatches.length;
  const player1WinRate = ((stats[player1Name].wins / totalMatches) * 100).toFixed(2);
  const player2WinRate = ((stats[player2Name].wins / totalMatches) * 100).toFixed(2);

  console.log(`\nWin Rates:`);
  console.log(`${player1Name}: ${player1WinRate}%`);
  console.log(`${player2Name}: ${player2WinRate}%`);
}

// Function for Player Stats Query
async function playerStatsQuery(matches, filters) {
  const { playerName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'playerName',
      message: 'Enter the name of the player:',
    },
  ]);

  const playerAliases = nameCombiner(playerName);

  // Filter matches
  let filteredMatches = filterMatches(matches, filters);

  // Filter matches involving the player
  filteredMatches = filteredMatches.filter(match => {
    const winnerNormalized = normalizePlayerName(match.winnerName);
    const loserNormalized = normalizePlayerName(match.loserName);

    return playerAliases.includes(winnerNormalized) || playerAliases.includes(loserNormalized);
  });

  if (filteredMatches.length === 0) {
    console.log(`No matches found for ${playerName} with the applied filters.`);
    return;
  }

  // Collect stats against each opponent
  const opponentStats = {};

  filteredMatches.forEach(match => {
    const winnerNormalized = normalizePlayerName(match.winnerName);
    const loserNormalized = normalizePlayerName(match.loserName);

    const isPlayerWinner = playerAliases.includes(winnerNormalized);
    const opponentName = isPlayerWinner ? loserNormalized : winnerNormalized;

    if (!opponentStats[opponentName]) {
      opponentStats[opponentName] = { wins: 0, losses: 0 };
    }

    if (isPlayerWinner) {
      opponentStats[opponentName].wins += 1;
    } else {
      opponentStats[opponentName].losses += 1;
    }
  });

  // Filter opponents based on minimum matches played
  const { minMatchesAgainstOpponent } = await inquirer.prompt([
    {
      type: 'number',
      name: 'minMatchesAgainstOpponent',
      message: 'Minimum number of matches against an opponent to include (0 for no minimum):',
      default: 0,
      validate: value => (value >= 0 ? true : 'Please enter a non-negative number'),
    },
  ]);

  const filteredOpponentStats = Object.entries(opponentStats)
    .filter(([opponent, stats]) => stats.wins + stats.losses >= minMatchesAgainstOpponent)
    .map(([opponent, stats]) => {
      const totalMatches = stats.wins + stats.losses;
      const winRate = ((stats.wins / totalMatches) * 100).toFixed(2);
      return { opponent, matches: totalMatches, wins: stats.wins, losses: stats.losses, winRate };
    });

  if (filteredOpponentStats.length === 0) {
    console.log(`No opponents meet the minimum match requirement.`);
    return;
  }

  // Display results in a table
  const table = new Table({
    head: ['Opponent', 'Matches Played', 'Wins', 'Losses', 'Win Rate (%)'],
    colWidths: [25, 15, 10, 10, 15],
  });

  filteredOpponentStats.sort((a, b) => b.matches - a.matches);

  filteredOpponentStats.forEach(stat => {
    table.push([stat.opponent, stat.matches, stat.wins, stat.losses, stat.winRate]);
  });

  console.log(`\nWin Rates for ${playerName} against Opponents:\n`);
  console.log(table.toString());
}

// Function to filter matches based on filters
function filterMatches(matches, filters) {
  let filteredMatches = matches.slice();

  // Apply time period filter
  if (filters.timePeriod) {
    const currentTime = Date.now() / 1000; // Unix timestamp in seconds
    let sinceTimestamp = 0;

    if (filters.timePeriod === 'Last 6 Months') {
      sinceTimestamp = currentTime - 6 * 30 * 24 * 3600;
    } else if (filters.timePeriod === 'Last 1 Month') {
      sinceTimestamp = currentTime - 30 * 24 * 3600;
    } else if (filters.timePeriod === 'Last 10 Days') {
      sinceTimestamp = currentTime - 10 * 24 * 3600;
    } else if (typeof filters.timePeriod === 'object') {
      const { startDate, endDate } = filters.timePeriod;
      const startTimestamp = new Date(startDate).getTime() / 1000;
      const endTimestamp = new Date(endDate).getTime() / 1000;
      filteredMatches = filteredMatches.filter(match => {
        return match.completedAt >= startTimestamp && match.completedAt <= endTimestamp;
      });
      // No need to proceed further
      return filteredMatches;
    }

    filteredMatches = filteredMatches.filter(match => match.completedAt >= sinceTimestamp);
  }

  // Apply deciding games filter
  if (filters.decidingGamesOnly) {
    filteredMatches = filteredMatches.filter(match => {
      const totalGames = match.winnerScore + match.loserScore;
      if (match.bestOf === 'Best of 5') {
        return totalGames === 5;
      } else if (match.bestOf === 'Best of 3') {
        return totalGames === 3;
      } else {
        return false;
      }
    });
  }

  return filteredMatches;
}

main();
