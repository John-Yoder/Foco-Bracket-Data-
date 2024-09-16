// exampleQuery.js
const queryHeadToHead = require('./queryHeadToHead');

function example() {
  const player1Id = '8552829'; // Replace with actual player ID for Player 1
  const player2Id = '8557021'; // Replace with actual player ID for Player 2

  // Options for filtering
  const options = {
    //lastNMatches: 10,       // Get only the last 10 matches
    //bestOf: 'Best of 5',     // Filter for Best of 5 sets
    //lastNEvents: 5,          // Limit to the last 5 events (based on event ID or date)
  };

  // Perform the query
  const matches = queryHeadToHead(player1Id, player2Id, options);

  // Output the results
  console.log(`Head-to-head matches between Player ${player1Id} and Player ${player2Id}:`);
  matches.forEach((match, index) => {
    console.log(`Match ${index + 1}:`);
    console.log(`Tournament: ${match.tournamentName}`);
    console.log(`Event: ${match.eventName}`);
    console.log(`Set ID: ${match.setId}`);
    console.log(`Winner: ${match.winnerName} (${match.winnerScore})`);
    console.log(`Loser: ${match.loserName} (${match.loserScore})`);
    console.log(`Best of: ${match.bestOf}`);
    console.log(`Completed At: ${new Date(match.completedAt * 1000).toLocaleString()}`); // Convert Unix timestamp to readable date
    console.log('---');
  });
}

example();
