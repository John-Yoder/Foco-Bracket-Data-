// src/dataProcessing/exampleQueryHeadToHead.js
const queryHeadToHeadByName = require('./queryHeadToHead');

function exampleHeadToHeadQuery() {
  const player1Name = 'PlayerOne'; // Replace with actual player name
  const player2Name = 'PlayerTwo'; // Replace with actual player name

  const options = {
    lastNMatches: 10,       // Get only the last 10 matches
    bestOf: 'Best of 5',    // Filter for Best of 5 sets
    lastNEvents: 5,         // Limit to the last 5 events
    // Add more filters as needed
  };

  const matches = queryHeadToHeadByName(player1Name, player2Name, options);

  if (matches.length === 0) {
    console.log(`No matches found between ${player1Name} and ${player2Name} with the specified filters.`);
    return;
  }

  console.log(`Head-to-head matches between ${player1Name} and ${player2Name}:`);
  matches.forEach((match, index) => {
    console.log(`\nMatch ${index + 1}:`);
    console.log(`Tournament: ${match.tournamentName}`);
    console.log(`Event: ${match.eventName}`);
    console.log(`Set ID: ${match.setId}`);
    console.log(`Winner: ${match.result === 'win' ? player1Name : player2Name} (${match.score})`);
    console.log(`Best of: ${match.bestOf}`);
    console.log(`Completed At: ${new Date(match.completedAt * 1000).toLocaleString()}`);
    console.log('---');
  });
}

exampleHeadToHeadQuery();
