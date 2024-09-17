// src/dataProcessing/computePlayerDataPoints.js

const fs = require('fs');
const path = require('path');
const moment = require('moment');
const nameMappings = require('./nameMappings'); // Ensure correct path

// Load data
function loadData() {
  const playerStatsFilePath = path.join(__dirname, '../data/playerStats.json');
  const matchesFilePath = path.join(__dirname, '../data/matches.json');
  const headToHeadFilePath = path.join(__dirname, '../data/HeadToHead.json');

  if (!fs.existsSync(playerStatsFilePath)) {
    console.error('Error: playerStats.json not found. Please run computePlayerStats.js first.');
    process.exit(1);
  }
  if (!fs.existsSync(matchesFilePath)) {
    console.error('Error: matches.json not found.');
    process.exit(1);
  }
  if (!fs.existsSync(headToHeadFilePath)) {
    console.error('Error: HeadToHead.json not found.');
    process.exit(1);
  }

  const playerStats = JSON.parse(fs.readFileSync(playerStatsFilePath, 'utf-8'));
  const matches = JSON.parse(fs.readFileSync(matchesFilePath, 'utf-8'));
  const headToHead = JSON.parse(fs.readFileSync(headToHeadFilePath, 'utf-8'));

  return { playerStats, matches, headToHead };
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

  // Also include the normalized input if it's not already in the list
  if (!associatedNames.includes(normalizedInput)) {
    associatedNames.push(normalizedInput);
  }

  return associatedNames;
}

// Main function to compute data points
function computePlayerDataPoints() {
  const { playerStats, matches, headToHead } = loadData();

  const playerDataPoints = {};

  const players = Object.keys(playerStats);

  players.forEach(playerName => {
    const playerStat = playerStats[playerName];
    const aliases = nameCombiner(playerName);

    // Filter matches involving the player (considering aliases)
    const playerMatches = matches.filter(match => {
      const winnerAliases = nameCombiner(match.winnerName);
      const loserAliases = nameCombiner(match.loserName);
      return aliases.some(alias => winnerAliases.includes(alias) || loserAliases.includes(alias));
    });

    // Sort matches by completion time
    playerMatches.sort((a, b) => a.completedAt - b.completedAt);

    // Initialize data points
    const data = {
      playerName: playerName,
      // Basic Stats
      totalMatchesPlayed: 0,
      totalWins: 0,
      totalLosses: 0,
      overallWinRate: 0,
      // Game Stats
      totalGamesPlayed: 0,
      totalGamesWon: 0,
      totalGamesLost: 0,
      gameWinRate: 0,
      averageGamesPerMatch: 0,
      // Time-Based Stats
      winRateLast6Months: 0,
      winRateLast3Months: 0,
      winRateLast1Month: 0,
      winRateLast10Days: 0,
      matchesPlayedLast6Months: 0,
      matchesPlayedLast3Months: 0,
      matchesPlayedLast1Month: 0,
      matchesPlayedLast10Days: 0,
      // Streaks
      currentWinStreak: 0,
      longestWinStreak: 0,
      currentLosingStreak: 0,
      longestLosingStreak: 0,
      // Match Type Performance
      winRateBestOf3: 0,
      winRateBestOf5: 0,
      winRateDecidingGames: 0,
      winRateStraightMatches: 0,
      // Opponent-Based Statistics
      averageOpponentWinRate: 0,
      winRateAgainstHigherRanked: 0,
      winRateAgainstLowerRanked: 0,
      mostCommonOpponent: null,
      winRateAgainstMostCommonOpponent: 0,
      // Head-to-Head Records
      headToHeadRecords: {},
      // Event-Based Statistics
      totalEventsParticipated: 0,
      // Temporal Statistics
      averageTimeBetweenMatches: 0,
      timeSinceLastMatch: 0,
      // Additional Metrics
      performanceTrend: 'stable',
      winRateAfterWin: 0,
      winRateAfterLoss: 0,
    };

    // Basic Stats
    data.totalMatchesPlayed = playerMatches.length;
    data.totalWins = playerMatches.filter(match => aliases.includes(normalizePlayerName(match.winnerName))).length;
    data.totalLosses = data.totalMatchesPlayed - data.totalWins;
    data.overallWinRate = data.totalMatchesPlayed > 0 ? (data.totalWins / data.totalMatchesPlayed) * 100 : 0;

    // Game Stats
    data.totalGamesPlayed = playerMatches.reduce((sum, match) => {
      return sum + match.winnerScore + match.loserScore;
    }, 0);

    data.totalGamesWon = playerMatches.reduce((sum, match) => {
      const playerIsWinner = aliases.includes(normalizePlayerName(match.winnerName));
      return sum + (playerIsWinner ? match.winnerScore : match.loserScore);
    }, 0);

    data.totalGamesLost = data.totalGamesPlayed - data.totalGamesWon;
    data.gameWinRate = data.totalGamesPlayed > 0 ? (data.totalGamesWon / data.totalGamesPlayed) * 100 : 0;
    data.averageGamesPerMatch = data.totalMatchesPlayed > 0 ? data.totalGamesPlayed / data.totalMatchesPlayed : 0;

    // Time-Based Stats
    const now = moment();
    const sixMonthsAgo = now.clone().subtract(6, 'months');
    const threeMonthsAgo = now.clone().subtract(3, 'months');
    const oneMonthAgo = now.clone().subtract(1, 'month');
    const tenDaysAgo = now.clone().subtract(10, 'days');

    let matchesLast6Months = [];
    let matchesLast3Months = [];
    let matchesLast1Month = [];
    let matchesLast10Days = [];

    playerMatches.forEach(match => {
      const matchTime = moment.unix(match.completedAt);

      if (matchTime.isAfter(sixMonthsAgo)) {
        matchesLast6Months.push(match);
        if (matchTime.isAfter(threeMonthsAgo)) {
          matchesLast3Months.push(match);
          if (matchTime.isAfter(oneMonthAgo)) {
            matchesLast1Month.push(match);
            if (matchTime.isAfter(tenDaysAgo)) {
              matchesLast10Days.push(match);
            }
          }
        }
      }
    });

    // Calculate win rates over time
    data.matchesPlayedLast6Months = matchesLast6Months.length;
    data.winRateLast6Months = calculateWinRate(matchesLast6Months, aliases);

    data.matchesPlayedLast3Months = matchesLast3Months.length;
    data.winRateLast3Months = calculateWinRate(matchesLast3Months, aliases);

    data.matchesPlayedLast1Month = matchesLast1Month.length;
    data.winRateLast1Month = calculateWinRate(matchesLast1Month, aliases);

    data.matchesPlayedLast10Days = matchesLast10Days.length;
    data.winRateLast10Days = calculateWinRate(matchesLast10Days, aliases);

    // Streaks
    const streaks = calculateStreaks(playerMatches, aliases);
    data.currentWinStreak = streaks.currentWinStreak;
    data.longestWinStreak = streaks.longestWinStreak;
    data.currentLosingStreak = streaks.currentLosingStreak;
    data.longestLosingStreak = streaks.longestLosingStreak;

    // Match Type Performance
    const bestOf3Matches = playerMatches.filter(match => match.bestOf === 'Best of 3');
    const bestOf5Matches = playerMatches.filter(match => match.bestOf === 'Best of 5');

    data.winRateBestOf3 = calculateWinRate(bestOf3Matches, aliases);
    data.winRateBestOf5 = calculateWinRate(bestOf5Matches, aliases);

    // Deciding Games and Straight Matches
    const decidingMatches = playerMatches.filter(match => {
      const totalGames = match.winnerScore + match.loserScore;
      if (match.bestOf === 'Best of 5') {
        return totalGames === 5;
      } else if (match.bestOf === 'Best of 3') {
        return totalGames === 3;
      }
      return false;
    });
    data.winRateDecidingGames = calculateWinRate(decidingMatches, aliases);

    const straightMatches = playerMatches.filter(match => {
      const totalGames = match.winnerScore + match.loserScore;
      return match.winnerScore === totalGames;
    });
    data.winRateStraightMatches = calculateWinRate(straightMatches, aliases);

    // Opponent-Based Statistics
    const opponentWinRates = [];
    const winsAgainstHigher = [];
    const winsAgainstLower = [];
    const lossesAgainstHigher = [];
    const lossesAgainstLower = [];

    const opponentMatchCounts = {};

    playerMatches.forEach(match => {
      const opponentName = aliases.includes(normalizePlayerName(match.winnerName))
        ? normalizePlayerName(match.loserName)
        : normalizePlayerName(match.winnerName);
      const opponentAliases = nameCombiner(opponentName);
      const opponentPrimaryName = nameMappings[opponentName] || opponentName;

      const opponentStat = playerStats[opponentPrimaryName];
      const opponentWinRate = opponentStat ? opponentStat.winRate : null;

      if (opponentWinRate !== null) {
        opponentWinRates.push(opponentWinRate);

        if (opponentWinRate > data.overallWinRate) {
          if (aliases.includes(normalizePlayerName(match.winnerName))) {
            winsAgainstHigher.push(match);
          } else {
            lossesAgainstHigher.push(match);
          }
        } else {
          if (aliases.includes(normalizePlayerName(match.winnerName))) {
            winsAgainstLower.push(match);
          } else {
            lossesAgainstLower.push(match);
          }
        }
      }

      // Most common opponent
      opponentMatchCounts[opponentPrimaryName] = (opponentMatchCounts[opponentPrimaryName] || 0) + 1;
    });

    data.averageOpponentWinRate = opponentWinRates.length > 0 ? average(opponentWinRates) : 0;

    const totalMatchesAgainstHigher = winsAgainstHigher.length + lossesAgainstHigher.length;
    data.winRateAgainstHigherRanked = totalMatchesAgainstHigher > 0
      ? (winsAgainstHigher.length / totalMatchesAgainstHigher) * 100
      : 0;

    const totalMatchesAgainstLower = winsAgainstLower.length + lossesAgainstLower.length;
    data.winRateAgainstLowerRanked = totalMatchesAgainstLower > 0
      ? (winsAgainstLower.length / totalMatchesAgainstLower) * 100
      : 0;

    // Most Common Opponent
    const mostCommonOpponent = Object.entries(opponentMatchCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostCommonOpponent) {
      data.mostCommonOpponent = mostCommonOpponent[0];
      const h2hMatches = playerMatches.filter(match => {
        const opponentInMatch = aliases.includes(normalizePlayerName(match.winnerName))
          ? normalizePlayerName(match.loserName)
          : normalizePlayerName(match.winnerName);
        const opponentAliases = nameCombiner(opponentInMatch);
        return opponentAliases.includes(data.mostCommonOpponent);
      });
      data.winRateAgainstMostCommonOpponent = calculateWinRate(h2hMatches, aliases);
    }

    // Events Participated
    const eventsParticipated = new Set(playerMatches.map(match => match.eventId));
    data.totalEventsParticipated = eventsParticipated.size;

    // Temporal Statistics
    const matchDates = playerMatches.map(match => moment.unix(match.completedAt)).sort((a, b) => a - b);
    if (matchDates.length > 1) {
      const timeDiffs = [];
      for (let i = 1; i < matchDates.length; i++) {
        timeDiffs.push(matchDates[i].diff(matchDates[i - 1], 'days'));
      }
      data.averageTimeBetweenMatches = average(timeDiffs);
    } else {
      data.averageTimeBetweenMatches = 0;
    }
    if (matchDates.length > 0) {
      data.timeSinceLastMatch = now.diff(matchDates[matchDates.length - 1], 'days');
    } else {
      data.timeSinceLastMatch = null;
    }

    // Performance Trend
    data.performanceTrend = calculatePerformanceTrend(playerMatches, aliases);

    // Win Rate After Win/Loss
    const winAfterWin = [];
    const winAfterLoss = [];
    for (let i = 1; i < playerMatches.length; i++) {
      const prevMatch = playerMatches[i - 1];
      const currentMatch = playerMatches[i];

      const prevResult = aliases.includes(normalizePlayerName(prevMatch.winnerName)) ? 'win' : 'loss';
      const currentResult = aliases.includes(normalizePlayerName(currentMatch.winnerName)) ? 'win' : 'loss';

      if (prevResult === 'win') {
        winAfterWin.push(currentResult === 'win' ? 1 : 0);
      } else {
        winAfterLoss.push(currentResult === 'win' ? 1 : 0);
      }
    }
    data.winRateAfterWin = winAfterWin.length > 0 ? (sum(winAfterWin) / winAfterWin.length) * 100 : 0;
    data.winRateAfterLoss = winAfterLoss.length > 0 ? (sum(winAfterLoss) / winAfterLoss.length) * 100 : 0;

    // Head-to-Head Records with Enhanced Stats
    data.headToHeadRecords = {};

    // Build a map of opponent primary names to their aliases
    const opponentAliasesMap = {};

    playerMatches.forEach(match => {
      const opponentName = aliases.includes(normalizePlayerName(match.winnerName))
        ? normalizePlayerName(match.loserName)
        : normalizePlayerName(match.winnerName);
      const opponentAliases = nameCombiner(opponentName);
      const opponentPrimaryName = nameMappings[opponentName] || opponentName;
      opponentAliasesMap[opponentPrimaryName] = opponentAliases;
    });

    for (const opponentPrimaryName in opponentAliasesMap) {
      const opponentAliases = opponentAliasesMap[opponentPrimaryName];

      // Filter head-to-head matches against this opponent (considering aliases)
      const h2hMatches = playerMatches.filter(match => {
        const opponentInMatch = aliases.includes(normalizePlayerName(match.winnerName))
          ? normalizePlayerName(match.loserName)
          : normalizePlayerName(match.winnerName);
        const opponentInMatchAliases = nameCombiner(opponentInMatch);
        return opponentAliases.some(alias => opponentInMatchAliases.includes(alias));
      });

      // Sort matches by completion time
      h2hMatches.sort((a, b) => a.completedAt - b.completedAt);

      const totalMatches = h2hMatches.length;
      const wins = h2hMatches.filter(match => aliases.includes(normalizePlayerName(match.winnerName))).length;
      const losses = totalMatches - wins;
      const winRate = (wins / totalMatches) * 100;

      // Last N matchups stats
      const recentStats = calculateRecentH2HStats(h2hMatches, aliases);

      // Win rate by match format
      const { winRateBestOf3, winRateBestOf5 } = calculateH2HWinRateByFormat(h2hMatches, aliases);

      // Date and event of last matchup
      const lastMatch = h2hMatches[h2hMatches.length - 1];
      const daysSinceLastMatch = moment().diff(moment.unix(lastMatch.completedAt), 'days');

      // Additional beneficial stats
      const avgMargin = calculateAverageMargin(h2hMatches, aliases);
      const performanceTrend = calculateH2HPerformanceTrend(h2hMatches, aliases);

      data.headToHeadRecords[opponentPrimaryName] = {
        totalMatchesPlayed: totalMatches,
        wins: wins,
        losses: losses,
        winRate: winRate,
        recentMatchups: recentStats,
        winRateBestOf3: winRateBestOf3,
        winRateBestOf5: winRateBestOf5,
        lastMatchDate: moment.unix(lastMatch.completedAt).format('YYYY-MM-DD'),
        lastMatchEvent: lastMatch.tournamentName,
        daysSinceLastMatch: daysSinceLastMatch,
        averageMargin: avgMargin,
        performanceTrend: performanceTrend,
      };
    }

    // Save data
    playerDataPoints[playerName] = data;
  });

  // Save to JSON file
  const outputPath = path.join(__dirname, '../data/playerDataPoints.json');
  fs.writeFileSync(outputPath, JSON.stringify(playerDataPoints, null, 2));
  console.log(`Player data points saved to ${outputPath}`);
}

// Helper Functions

function calculateWinRate(matches, aliases) {
  const wins = matches.filter(match => aliases.includes(normalizePlayerName(match.winnerName))).length;
  const total = matches.length;
  return total > 0 ? (wins / total) * 100 : 0;
}

function calculateStreaks(matches, aliases) {
  let currentWinStreak = 0;
  let currentLosingStreak = 0;
  let longestWinStreak = 0;
  let longestLosingStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  matches.forEach(match => {
    const isWin = aliases.includes(normalizePlayerName(match.winnerName));

    if (isWin) {
      tempWinStreak += 1;
      tempLossStreak = 0;
    } else {
      tempLossStreak += 1;
      tempWinStreak = 0;
    }

    if (tempWinStreak > longestWinStreak) {
      longestWinStreak = tempWinStreak;
    }
    if (tempLossStreak > longestLosingStreak) {
      longestLosingStreak = tempLossStreak;
    }
  });

  // Current streaks
  if (matches.length > 0) {
    const lastMatchWin = aliases.includes(normalizePlayerName(matches[matches.length - 1].winnerName));

    if (lastMatchWin) {
      currentWinStreak = tempWinStreak;
      currentLosingStreak = 0;
    } else {
      currentLosingStreak = tempLossStreak;
      currentWinStreak = 0;
    }
  }

  return {
    currentWinStreak,
    longestWinStreak,
    currentLosingStreak,
    longestLosingStreak,
  };
}

function calculatePerformanceTrend(matches, aliases) {
  const lastFiveMatches = matches.slice(-5);
  const wins = lastFiveMatches.filter(match => aliases.includes(normalizePlayerName(match.winnerName))).length;
  if (wins >= 4) {
    return 'improving';
  } else if (wins <= 1) {
    return 'declining';
  } else {
    return 'stable';
  }
}

function average(arr) {
  return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
}

function sum(arr) {
  return arr.reduce((total, num) => total + num, 0);
}

// New Helper Functions for Enhanced Head-to-Head Stats

/**
 * Calculates win rates in the last N matchups (1, 3, 5, 10)
 * and game win rates in those matchups.
 * @param {Array} matches - Array of matches against an opponent.
 * @param {Array} aliases - Aliases of the player.
 * @returns {Object} - Recent matchup stats.
 */
function calculateRecentH2HStats(matches, aliases) {
  const N_values = [1, 3, 5, 10];
  const stats = {};

  N_values.forEach(N => {
    const lastNMatches = matches.slice(-N);
    const totalMatches = lastNMatches.length;
    const wins = lastNMatches.filter(match => aliases.includes(normalizePlayerName(match.winnerName))).length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : null;

    // Game win rate
    let totalGames = 0;
    let gamesWon = 0;
    lastNMatches.forEach(match => {
      const playerIsWinner = aliases.includes(normalizePlayerName(match.winnerName));
      const playerScore = playerIsWinner ? match.winnerScore : match.loserScore;
      const opponentScore = playerIsWinner ? match.loserScore : match.winnerScore;

      totalGames += playerScore + opponentScore;
      gamesWon += playerScore;
    });
    const gameWinRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : null;

    stats[`last${N}Matches`] = {
      matchesPlayed: totalMatches,
      wins: wins,
      losses: losses,
      winRate: winRate,
      gameWinRate: gameWinRate,
    };
  });

  return stats;
}

/**
 * Calculates win rates in Best of 3 and Best of 5 matches against an opponent.
 * @param {Array} matches - Array of matches against an opponent.
 * @param {Array} aliases - Aliases of the player.
 * @returns {Object} - Win rates by match format.
 */
function calculateH2HWinRateByFormat(matches, aliases) {
  const bestOf3Matches = matches.filter(match => match.bestOf === 'Best of 3');
  const bestOf5Matches = matches.filter(match => match.bestOf === 'Best of 5');

  const winRateBestOf3 = calculateWinRate(bestOf3Matches, aliases);
  const winRateBestOf5 = calculateWinRate(bestOf5Matches, aliases);

  return {
    winRateBestOf3,
    winRateBestOf5,
  };
}

/**
 * Calculates the average margin of victory or loss against an opponent.
 * @param {Array} matches - Array of matches against an opponent.
 * @param {Array} aliases - Aliases of the player.
 * @returns {Number} - Average margin per match.
 */
function calculateAverageMargin(matches, aliases) {
  const margins = matches.map(match => {
    const playerIsWinner = aliases.includes(normalizePlayerName(match.winnerName));
    const playerScore = playerIsWinner ? match.winnerScore : match.loserScore;
    const opponentScore = playerIsWinner ? match.loserScore : match.winnerScore;
    return playerScore - opponentScore;
  });

  return average(margins);
}

/**
 * Calculates the recent performance trend against an opponent.
 * @param {Array} matches - Array of matches against an opponent.
 * @param {Array} aliases - Aliases of the player.
 * @returns {String} - 'improving', 'declining', or 'stable'.
 */
function calculateH2HPerformanceTrend(matches, aliases) {
  const lastFiveMatches = matches.slice(-5);
  const wins = lastFiveMatches.filter(match => aliases.includes(normalizePlayerName(match.winnerName))).length;
  if (wins >= 4) {
    return 'improving';
  } else if (wins <= 1) {
    return 'declining';
  } else {
    return 'stable';
  }
}

// Run the script
computePlayerDataPoints();
