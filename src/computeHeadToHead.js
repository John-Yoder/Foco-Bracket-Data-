// computeHeadToHead.js
const fs = require('fs');
const path = require('path');

function computeHeadToHead(matches) {
  const headToHead = {}; // Object to store head-to-head data

  for (const match of matches) {
    const { winnerId, winnerName, loserId, loserName, winnerScore, loserScore, bestOf, tournamentName, eventName, eventId, setId, completedAt } = match;

    // Initialize entries in headToHead object
    if (!headToHead[winnerId]) {
      headToHead[winnerId] = { name: winnerName, opponents: {} };
    }
    if (!headToHead[loserId]) {
      headToHead[loserId] = { name: loserName, opponents: {} };
    }

    // Update winner's record against loser
    if (!headToHead[winnerId].opponents[loserId]) {
      headToHead[winnerId].opponents[loserId] = [];
    }
    headToHead[winnerId].opponents[loserId].push({
      opponentId: loserId,
      opponentName: loserName,
      result: 'win',
      score: `${winnerScore}-${loserScore}`,
      bestOf: bestOf,
      tournamentName: tournamentName,
      eventName: eventName,
      eventId: eventId,
      setId: setId,
      completedAt: completedAt,
    });

    // Update loser's record against winner
    if (!headToHead[loserId].opponents[winnerId]) {
      headToHead[loserId].opponents[winnerId] = [];
    }
    headToHead[loserId].opponents[winnerId].push({
      opponentId: winnerId,
      opponentName: winnerName,
      result: 'loss',
      score: `${loserScore}-${winnerScore}`,
      bestOf: bestOf,
      tournamentName: tournamentName,
      eventName: eventName,
      eventId: eventId,
      setId: setId,
      completedAt: completedAt,
    });
  }

  // Save headToHead data to a file
  const headToHeadFilePath = path.join(__dirname, 'headToHead.json');
  fs.writeFileSync(headToHeadFilePath, JSON.stringify(headToHead, null, 2));
  console.log(`Head-to-head data saved to ${headToHeadFilePath}`);

  return headToHead;
}

module.exports = computeHeadToHead;
