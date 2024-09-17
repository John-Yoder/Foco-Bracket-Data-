// src/dataProcessing/exampleQueryPlayerStats.js
const queryPlayerStats = require('./queryPlayerStats.js');

function examplePlayerStatsQuery() {
  const playerName = 'DayNeptune930'; // Replace with actual player name

  const options = {
    filters: [
      //{ type: 'scoreCount', values: ['3-1', '3-0'] }, // Only include matches with scores 3-1 or 3-0
      //{ type: 'bestOf', value: 'Best of 5' },         // Only include Best of 5 matches
      //{ type: 'result', value: 'win' },               // Only include matches where the player won
      // Add more filters as needed
    ],
  };

  const stats = queryPlayerStats(playerName, options);

  if (!stats) {
    console.log(`No statistics found for player ${playerName} with the specified filters.`);
    return;
  }

  console.log(`\nStatistics for ${stats.name}:`);
  console.log(`Matches Played: ${stats.matchesPlayed}`);
  console.log(`Wins: ${stats.wins}`);
  console.log(`Losses: ${stats.losses}`);
  console.log(`Win Rate: ${stats.winRate.toFixed(2)}%`);
  console.log(`Straight Game Wins: ${stats.straightGameWins}`);
  console.log(`Straight Game Win Rate: ${stats.straightGameWinRate.toFixed(2)}%`);
  console.log(`Deciding Game Wins: ${stats.decidingGameWins}`);
  console.log(`Deciding Game Win Rate: ${stats.decidingGameWinRate.toFixed(2)}%`);
  console.log(`Game Win Rate: ${stats.gameWinRate.toFixed(2)}%`);
  
  
  // Add more statistics as needed

  // Optionally, list the filtered matches

  /*
  console.log('\nFiltered Matches:');
  stats.matches.forEach((match, index) => {
    console.log(`\nMatch ${index + 1}:`);
    console.log(`Opponent: ${match.opponentName}`);
    console.log(`Result: ${match.result}`);
    console.log(`Score: ${match.score}`);
    console.log(`Best of: ${match.bestOf}`);
    console.log(`Completed At: ${new Date(match.completedAt * 1000).toLocaleString()}`);
    console.log('---');
  });
  */
}

examplePlayerStatsQuery();
