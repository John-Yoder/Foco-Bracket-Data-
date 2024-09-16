// src/dataProcessing/computePlayerStats.js
const fs = require('fs');
const path = require('path');

/**
 * Computes comprehensive player statistics from matches.
 * @param {Array} matches - Array of match objects.
 * @returns {Object} Player statistics data.
 */
function computePlayerStats(matches) {
  const playerStats = {}; // Object to store player statistics

  for (const match of matches) {
    const {
      winnerName,
      loserName,
      winnerScore,
      loserScore,
      bestOf,
      eventStartAt,
      completedAt,
      // ... other fields
    } = match;

    const players = [
      {
        name: winnerName,
        result: 'win',
        score: { for: winnerScore, against: loserScore },
        eventStartAt,
        completedAt,
        bestOf,
      },
      {
        name: loserName,
        result: 'loss',
        score: { for: loserScore, against: winnerScore },
        eventStartAt,
        completedAt,
        bestOf,
      },
    ];

    for (const player of players) {
      const playerKey = player.name; // Use original name as the key

      // Initialize player stats if not already present
      if (!playerStats[playerKey]) {
        playerStats[playerKey] = {
          name: player.name,
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
          matches: [], // Store match details for further analysis
          timeBasedStats: {
            last6Months: { matchesPlayed: 0, wins: 0, winRate: 0 },
            last1Month: { matchesPlayed: 0, wins: 0, winRate: 0 },
            last10Days: { matchesPlayed: 0, wins: 0, winRate: 0 },
          },
        };
      }

      const stats = playerStats[playerKey];
      stats.matchesPlayed += 1;

      // Update total games won and lost
      stats.totalGamesWon += player.score.for;
      stats.totalGamesLost += player.score.against;

      // Recalculate game win rate
      const totalGamesPlayed = stats.totalGamesWon + stats.totalGamesLost;
      stats.gameWinRate = totalGamesPlayed > 0 ? (stats.totalGamesWon / totalGamesPlayed) * 100 : 0;

      const totalMatchGames = player.score.for + player.score.against;

      if (player.result === 'win') {
        stats.wins += 1;

        // Check for straight game wins (e.g., 3-0, 2-0)
        if (player.score.against === 0) {
          stats.straightGameWins += 1;
          stats.straightGameMatches += 1;
        }

        // Check for deciding game wins (e.g., 3-2, 2-1)
        if (
          (bestOf === 'Best of 5' && totalMatchGames === 5) ||
          (bestOf === 'Best of 3' && totalMatchGames === 3)
        ) {
          stats.decidingGameWins += 1;
          stats.decidingGameMatches += 1;
        }

      } else if (player.result === 'loss') {
        stats.losses += 1;

        // Check for straight game losses (e.g., 0-3, 0-2)
        if (player.score.for === 0) {
          stats.straightGameLosses += 1;
          stats.straightGameMatches += 1;
        }

        // Check for deciding game losses (e.g., 2-3, 1-2)
        if (
          (bestOf === 'Best of 5' && totalMatchGames === 5) ||
          (bestOf === 'Best of 3' && totalMatchGames === 3)
        ) {
          stats.decidingGameLosses += 1;
          stats.decidingGameMatches += 1;
        }
      }

      // Recalculate win rates
      stats.winRate = stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0;
      stats.straightGameWinRate = stats.straightGameMatches > 0 ? (stats.straightGameWins / stats.straightGameMatches) * 100 : 0;
      stats.decidingGameWinRate = stats.decidingGameMatches > 0 ? (stats.decidingGameWins / stats.decidingGameMatches) * 100 : 0;

      // Store match details
      stats.matches.push({
        opponentName: player.result === 'win' ? loserName : winnerName,
        result: player.result,
        score: `${player.score.for}-${player.score.against}`,
        eventStartAt: player.eventStartAt,
        completedAt: player.completedAt,
        bestOf: player.bestOf,
      });

      // Update time-based stats
      const currentTime = Date.now() / 1000; // Current Unix timestamp in seconds
      const sixMonthsAgo = currentTime - 6 * 30 * 24 * 3600;
      const oneMonthAgo = currentTime - 30 * 24 * 3600;
      const tenDaysAgo = currentTime - 10 * 24 * 3600;

      const timeFrames = [
        { key: 'last6Months', since: sixMonthsAgo },
        { key: 'last1Month', since: oneMonthAgo },
        { key: 'last10Days', since: tenDaysAgo },
      ];

      for (const timeFrame of timeFrames) {
        if (player.completedAt >= timeFrame.since) {
          const tStats = stats.timeBasedStats[timeFrame.key];
          tStats.matchesPlayed += 1;
          if (player.result === 'win') {
            tStats.wins += 1;
          }
          tStats.winRate = tStats.matchesPlayed > 0 ? (tStats.wins / tStats.matchesPlayed) * 100 : 0;
        }
      }
    }
  }

  // Define the output path for playerStats.json
  const playerStatsFilePath = path.join(__dirname, '../data/playerStats.json');

  // Ensure the data directory exists
  const dataDir = path.dirname(playerStatsFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Save playerStats data to playerStats.json
  try {
    fs.writeFileSync(playerStatsFilePath, JSON.stringify(playerStats, null, 2));
    console.log(`Player statistics saved to ${playerStatsFilePath}`);
  } catch (writeError) {
    console.error('Error writing to playerStats.json:', writeError);
  }

  return playerStats;
}

module.exports = computePlayerStats;

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

  // Compute player statistics
  computePlayerStats(matches);
}
