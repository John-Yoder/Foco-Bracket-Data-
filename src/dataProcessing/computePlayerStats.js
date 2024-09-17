// src/dataProcessing/computePlayerStats.js
const fs = require('fs');
const path = require('path');

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
 * Computes comprehensive player statistics from matches.
 * @param {Array} matches - Array of match objects.
 * @returns {Object} Player statistics data.
 */
function computePlayerStats(matches) {
  console.log(`Starting computation for ${matches.length} matches.`);
  const playerStats = {}; // Object to store player statistics

  for (const match of matches) {
    try {
    } catch (error) {
        console.error('An error occurred:', error);
    }
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

      // Validate essential fields
      if (!winnerName || !loserName || typeof winnerScore !== 'number' || typeof loserScore !== 'number') {
        console.warn(`Incomplete match data for setId ${match.setId}. Skipping this match.`);
        continue;
      }

      // Normalize player names
      const normalizedWinnerName = normalizePlayerName(winnerName);
      const normalizedLoserName = normalizePlayerName(loserName);

      const players = [
        {
          name: normalizedWinnerName,
          result: 'win',
          score: { for: winnerScore, against: loserScore },
          eventStartAt,
          completedAt,
          bestOf,
        },
        {
          name: normalizedLoserName,
          result: 'loss',
          score: { for: loserScore, against: winnerScore },
          eventStartAt,
          completedAt,
          bestOf,
        },
      ];

      for (const player of players) {
        const playerKey = player.name; // Use normalized name as the key

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
          console.log(`Initialized stats for player: ${playerKey}`);
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
          opponentName: player.result === 'win' ? normalizedLoserName : normalizedWinnerName,
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

        console.log(`Updated stats for ${playerKey}:`, {
          matchesPlayed: stats.matchesPlayed,
          wins: stats.wins,
          losses: stats.losses,
          winRate: stats.winRate.toFixed(2),
          gameWinRate: stats.gameWinRate.toFixed(2),
          straightGameWinRate: stats.straightGameWinRate.toFixed(2),
          decidingGameWinRate: stats.decidingGameWinRate.toFixed(2),
        });
      }
    }

    // After processing all matches, write the playerStats to JSON
    // Define the output path for playerStats.json
        try {
        // Your code that might throw an error
        // After processing all matches, write the playerStats to JSON
        // Define the output path for playerStats.json
        const playerStatsFilePath = path.join(__dirname, '../data/playerStats.json');
        const absolutePlayerStatsPath = path.resolve(playerStatsFilePath);
        console.log(`Output path for playerStats.json: ${absolutePlayerStatsPath}`);
    
        // Ensure the data directory exists
        const dataDir = path.dirname(playerStatsFilePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log(`Created data directory at ${dataDir}`);
        }
    
        // Save playerStats data to playerStats.json
        fs.writeFileSync(playerStatsFilePath, JSON.stringify(playerStats, null, 2));
        console.log('Player stats saved successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
    } playerStatsFilePath = path.join(__dirname, '../data/playerStats.json');
    const absolutePlayerStatsPath = path.resolve(playerStatsFilePath);
    console.log(`Output path for playerStats.json: ${absolutePlayerStatsPath}`);

    // Ensure the data directory exists
    const dataDir = path.dirname(playerStatsFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory at ${dataDir}`);
    }

    // Save playerStats data to playerStats.json
    try {
      console.log(`Writing player statistics to ${absolutePlayerStatsPath}...`);
      fs.writeFileSync(absolutePlayerStatsPath, JSON.stringify(playerStats, null, 2));
      console.log(`Player statistics saved to ${absolutePlayerStatsPath}`);
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
    const absoluteMatchesPath = path.resolve(matchesFilePath);
    console.log(`Input path for matches.json: ${absoluteMatchesPath}`);

    // Check if matches.json exists
    if (!fs.existsSync(matchesFilePath)) {
      console.error('matches.json not found. Please run processData.js first.');
      process.exit(1);
    }

    // Read and parse matches.json
    let matches;
    try {
      const rawMatches = fs.readFileSync(matchesFilePath, 'utf-8');
      matches = JSON.parse(rawMatches);
      console.log(`Successfully parsed ${matches.length} matches.`);
    } catch (parseError) {
      console.error('Error parsing matches.json:', parseError);
      process.exit(1);
    }

    // Compute player statistics
    computePlayerStats(matches);
  }
