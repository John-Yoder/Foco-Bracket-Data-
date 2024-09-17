// src/dataProcessing/advancedQueryBuilder.js

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const moment = require('moment'); // For date manipulation
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

  // Step 1: Ask the user to select filters
  const filters = await getFilters();

  // Step 2: Filter players based on the selected filters
  let filteredPlayers = applyFilters(playerStats, matches, filters);

  // Step 3: Ask the user for sorting preferences
  const sortOptions = await getSortingOptions();

  // Step 4: Sort the filtered players
  filteredPlayers = sortPlayers(filteredPlayers, sortOptions);

  // Step 5: Ask the user for output customization
  const outputOptions = await getOutputOptions();

  // Step 6: Display the results in a table
  displayResults(filteredPlayers, outputOptions);
}

// Function to get filters from the user
async function getFilters() {
  const filters = {};

  const filterQuestions = [
    {
      type: 'confirm',
      name: 'applySetsPlayedFilter',
      message: 'Do you want to filter by sets played?',
      default: false,
    },
    {
      type: 'number',
      name: 'minSetsPlayed',
      message: 'Enter minimum sets played:',
      when: answers => answers.applySetsPlayedFilter,
      validate: value => (value >= 0 ? true : 'Please enter a non-negative number'),
    },
    {
      type: 'number',
      name: 'maxSetsPlayed',
      message: 'Enter maximum sets played (leave blank for no maximum):',
      when: answers => answers.applySetsPlayedFilter,
      validate: value => (value >= 0 ? true : 'Please enter a non-negative number'),
    },
    {
      type: 'confirm',
      name: 'applyWinRateFilter',
      message: 'Do you want to filter by win rate?',
      default: false,
    },
    {
      type: 'number',
      name: 'minWinRate',
      message: 'Enter minimum win rate (in %):',
      when: answers => answers.applyWinRateFilter,
      validate: value => (value >= 0 && value <= 100 ? true : 'Please enter a number between 0 and 100'),
    },
    {
      type: 'number',
      name: 'maxWinRate',
      message: 'Enter maximum win rate (in %) (leave blank for no maximum):',
      when: answers => answers.applyWinRateFilter,
      validate: value => (value >= 0 && value <= 100 ? true : 'Please enter a number between 0 and 100'),
    },
    {
      type: 'confirm',
      name: 'applyOpponentWinRateFilter',
      message: 'Do you want to filter by opponents\' win rates?',
      default: false,
    },
    {
      type: 'number',
      name: 'minOpponentWinRate',
      message: 'Enter minimum opponent win rate (in %):',
      when: answers => answers.applyOpponentWinRateFilter,
      validate: value => (value >= 0 && value <= 100 ? true : 'Please enter a number between 0 and 100'),
    },
    {
      type: 'number',
      name: 'maxOpponentWinRate',
      message: 'Enter maximum opponent win rate (in %) (leave blank for no maximum):',
      when: answers => answers.applyOpponentWinRateFilter,
      validate: value => (value >= 0 && value <= 100 ? true : 'Please enter a number between 0 and 100'),
    },
    {
      type: 'confirm',
      name: 'applyTimePeriodFilter',
      message: 'Do you want to filter by time period?',
      default: false,
    },
    {
      type: 'list',
      name: 'timePeriodChoice',
      message: 'Select a time period filter:',
      choices: [
        'Last 6 Months',
        'Last 1 Month',
        'Last 10 Days',
        'Custom Date Range',
      ],
      when: answers => answers.applyTimePeriodFilter,
    },
    {
      type: 'input',
      name: 'startDate',
      message: 'Enter start date (YYYY-MM-DD):',
      when: answers => answers.timePeriodChoice === 'Custom Date Range',
      validate: validateDate,
    },
    {
      type: 'input',
      name: 'endDate',
      message: 'Enter end date (YYYY-MM-DD):',
      when: answers => answers.timePeriodChoice === 'Custom Date Range',
      validate: validateDate,
    },
    {
      type: 'confirm',
      name: 'applyWinStreakFilter',
      message: 'Do you want to filter by win streak?',
      default: false,
    },
    {
      type: 'number',
      name: 'minWinStreak',
      message: 'Enter minimum win streak:',
      when: answers => answers.applyWinStreakFilter,
      validate: value => (value >= 0 ? true : 'Please enter a non-negative number'),
    },
    {
      type: 'number',
      name: 'maxWinStreak',
      message: 'Enter maximum win streak (leave blank for no maximum):',
      when: answers => answers.applyWinStreakFilter,
      validate: value => (value >= 0 ? true : 'Please enter a non-negative number'),
    },
    {
      type: 'confirm',
      name: 'applyMatchFormatFilter',
      message: 'Do you want to filter by match format (Best of 3 or 5)?',
      default: false,
    },
    {
      type: 'list',
      name: 'matchFormat',
      message: 'Select match format:',
      choices: [
        'Best of 3',
        'Best of 5',
      ],
      when: answers => answers.applyMatchFormatFilter,
    },
    // Add more filters as needed
  ];

  const answers = await inquirer.prompt(filterQuestions);

  // Map answers to filters
  if (answers.applySetsPlayedFilter) {
    filters.minSetsPlayed = answers.minSetsPlayed || 0;
    filters.maxSetsPlayed = answers.maxSetsPlayed || Infinity;
  }

  if (answers.applyWinRateFilter) {
    filters.minWinRate = answers.minWinRate || 0;
    filters.maxWinRate = answers.maxWinRate || 100;
  }

  if (answers.applyOpponentWinRateFilter) {
    filters.minOpponentWinRate = answers.minOpponentWinRate || 0;
    filters.maxOpponentWinRate = answers.maxOpponentWinRate || 100;
  }

  if (answers.applyTimePeriodFilter) {
    filters.timePeriodChoice = answers.timePeriodChoice;
    if (answers.timePeriodChoice === 'Custom Date Range') {
      filters.startDate = answers.startDate;
      filters.endDate = answers.endDate;
    }
  }

  if (answers.applyWinStreakFilter) {
    filters.minWinStreak = answers.minWinStreak || 0;
    filters.maxWinStreak = answers.maxWinStreak || Infinity;
  }

  if (answers.applyMatchFormatFilter) {
    filters.matchFormat = answers.matchFormat;
  }

  return filters;
}

// Validate date input
function validateDate(input) {
  const isValid = /^\d{4}-\d{2}-\d{2}$/.test(input);
  return isValid || 'Please enter a valid date in YYYY-MM-DD format';
}

// Function to apply filters to players
function applyFilters(playerStats, matches, filters) {
  let players = Object.values(playerStats);

  // Apply sets played filter
  if (filters.minSetsPlayed !== undefined || filters.maxSetsPlayed !== undefined) {
    players = players.filter(player => {
      const setsPlayed = player.matchesPlayed || 0;
      return setsPlayed >= filters.minSetsPlayed && setsPlayed <= filters.maxSetsPlayed;
    });
  }

  // Apply win rate filter
  if (filters.minWinRate !== undefined || filters.maxWinRate !== undefined) {
    players = players.filter(player => {
      const winRate = player.winRate || 0;
      return winRate >= filters.minWinRate && winRate <= filters.maxWinRate;
    });
  }

  // Apply win streak filter
  if (filters.minWinStreak !== undefined || filters.maxWinStreak !== undefined) {
    // You need to compute current or maximum win streaks here
    // For simplicity, let's assume we have 'currentWinStreak' in playerStats
    players = players.filter(player => {
      const winStreak = player.currentWinStreak || 0;
      return winStreak >= filters.minWinStreak && winStreak <= filters.maxWinStreak;
    });
  }

  // Apply time period filter
  if (filters.timePeriodChoice) {
    const timeFilteredMatches = filterMatchesByTime(matches, filters);
    const playersSet = new Set();

    timeFilteredMatches.forEach(match => {
      playersSet.add(normalizePlayerName(match.winnerName));
      playersSet.add(normalizePlayerName(match.loserName));
    });

    players = players.filter(player => {
      const playerName = player.name;
      return playersSet.has(playerName);
    });
  }

  // Apply match format filter
  if (filters.matchFormat) {
    const formatFilteredMatches = matches.filter(match => match.bestOf === filters.matchFormat);
    const playersSet = new Set();

    formatFilteredMatches.forEach(match => {
      playersSet.add(normalizePlayerName(match.winnerName));
      playersSet.add(normalizePlayerName(match.loserName));
    });

    players = players.filter(player => {
      const playerName = player.name;
      return playersSet.has(playerName);
    });
  }

  // Apply opponent win rate filter
  if (filters.minOpponentWinRate !== undefined || filters.maxOpponentWinRate !== undefined) {
    players = players.filter(player => {
      const opponents = Object.keys(player.opponentStats || {});
      const opponentWinRates = opponents.map(opponent => {
        const opponentStats = playerStats[opponent];
        return opponentStats ? opponentStats.winRate : null;
      }).filter(rate => rate !== null);

      const meetsCriteria = opponentWinRates.some(rate => rate >= filters.minOpponentWinRate && rate <= filters.maxOpponentWinRate);
      return meetsCriteria;
    });
  }

  return players;
}

// Function to filter matches by time period
function filterMatchesByTime(matches, filters) {
  let filteredMatches = matches.slice();

  const currentTime = moment();
  let sinceTime = null;
  let untilTime = null;

  if (filters.timePeriodChoice === 'Last 6 Months') {
    sinceTime = currentTime.clone().subtract(6, 'months');
  } else if (filters.timePeriodChoice === 'Last 1 Month') {
    sinceTime = currentTime.clone().subtract(1, 'month');
  } else if (filters.timePeriodChoice === 'Last 10 Days') {
    sinceTime = currentTime.clone().subtract(10, 'days');
  } else if (filters.timePeriodChoice === 'Custom Date Range') {
    sinceTime = moment(filters.startDate, 'YYYY-MM-DD');
    untilTime = moment(filters.endDate, 'YYYY-MM-DD');
  }

  if (sinceTime) {
    filteredMatches = filteredMatches.filter(match => {
      const matchTime = moment.unix(match.completedAt);
      if (untilTime) {
        return matchTime.isBetween(sinceTime, untilTime, undefined, '[]');
      } else {
        return matchTime.isAfter(sinceTime);
      }
    });
  }

  return filteredMatches;
}

// Function to get sorting options from the user
async function getSortingOptions() {
  const sortQuestions = [
    {
      type: 'list',
      name: 'sortBy',
      message: 'How would you like to sort the table?',
      choices: [
        'Sets Played',
        'Win Rate',
        'Win Streak',
        // Add more sorting options as needed
      ],
    },
    {
      type: 'list',
      name: 'sortOrder',
      message: 'Select sort order:',
      choices: [
        'Descending',
        'Ascending',
      ],
    },
  ];

  const answers = await inquirer.prompt(sortQuestions);

  return {
    sortBy: answers.sortBy,
    sortOrder: answers.sortOrder,
  };
}

// Function to sort players based on sorting options
function sortPlayers(players, sortOptions) {
  const { sortBy, sortOrder } = sortOptions;

  const sortKeyMap = {
    'Sets Played': 'matchesPlayed',
    'Win Rate': 'winRate',
    'Win Streak': 'currentWinStreak',
    // Map other sorting options to player object keys
  };

  const sortKey = sortKeyMap[sortBy];

  players.sort((a, b) => {
    const valA = a[sortKey] || 0;
    const valB = b[sortKey] || 0;

    if (sortOrder === 'Descending') {
      return valB - valA;
    } else {
      return valA - valB;
    }
  });

  return players;
}

// Function to get output customization options from the user
async function getOutputOptions() {
  const outputQuestions = [
    {
      type: 'number',
      name: 'numRows',
      message: 'How many rows would you like to display?',
      default: 10,
      validate: value => (value > 0 ? true : 'Please enter a positive number'),
    },
    {
      type: 'checkbox',
      name: 'columns',
      message: 'Select columns to include in the output:',
      choices: [
        { name: 'Player Name', value: 'name', checked: true },
        { name: 'Sets Played', value: 'matchesPlayed', checked: true },
        { name: 'Wins', value: 'wins', checked: true },
        { name: 'Losses', value: 'losses', checked: true },
        { name: 'Win Rate (%)', value: 'winRate', checked: true },
        { name: 'Current Win Streak', value: 'currentWinStreak', checked: false },
        { name: 'Maximum Win Streak', value: 'maxWinStreak', checked: false },
        // Add more columns as needed
      ],
    },
  ];

  const answers = await inquirer.prompt(outputQuestions);

  return {
    numRows: answers.numRows,
    columns: answers.columns,
  };
}

// Function to display results in a table
function displayResults(players, outputOptions) {
  const { numRows, columns } = outputOptions;

  const table = new Table({
    head: columns.map(col => {
      // Map column keys to display names
      const colNameMap = {
        name: 'Player Name',
        matchesPlayed: 'Sets Played',
        wins: 'Wins',
        losses: 'Losses',
        winRate: 'Win Rate (%)',
        currentWinStreak: 'Current Win Streak',
        maxWinStreak: 'Maximum Win Streak',
        // Add more mappings as needed
      };
      return colNameMap[col] || col;
    }),
    colWidths: columns.map(() => 15),
  });

  const rowsToDisplay = players.slice(0, numRows);

  rowsToDisplay.forEach(player => {
    const row = columns.map(col => {
      if (col === 'winRate') {
        return player.winRate ? player.winRate.toFixed(2) : 'N/A';
      } else if (player[col] !== undefined) {
        return player[col];
      } else {
        return 'N/A';
      }
    });
    table.push(row);
  });

  console.log('\nQuery Results:\n');
  console.log(table.toString());
}

main();
