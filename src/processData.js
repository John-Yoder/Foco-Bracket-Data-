// processData.js
const fs = require('fs');
const path = require('path');

function processData() {
  const dataFilePath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(dataFilePath)) {
    console.error('Data file not found. Please run main.js first.');
    return;
  }

  const rawData = fs.readFileSync(dataFilePath);
  const allEventData = JSON.parse(rawData);

  const matches = []; // Array to store all matches

  for (const eventKey in allEventData) {
    const eventData = allEventData[eventKey];
    const { tournamentName, eventName, eventId, startAt, sets } = eventData;

    for (const set of sets) {
      const setId = set.id;
      const slots = set.slots;
      const setScoreData = set.setScore;
      const completedAt = set.completedAt; // Unix timestamp

      // Extract player IDs and names
      const player1 = slots[0].entrant;
      const player2 = slots[1].entrant;

      // Extract scores
      const setSlots = setScoreData.slots;
      const standing1 = setSlots[0].standing;
      const standing2 = setSlots[1].standing;

      const score1 = standing1.stats.score.value;
      const score2 = standing2.stats.score.value;

      // Determine winner and loser
      let winner, loser, winnerScore, loserScore;

      if (standing1.placement === 1) {
        winner = player1;
        loser = player2;
        winnerScore = score1;
        loserScore = score2;
      } else {
        winner = player2;
        loser = player1;
        winnerScore = score2;
        loserScore = score1;
      }

      // Determine best-of-N
      const maxScore = Math.max(winnerScore, loserScore);
      const bestOf = maxScore === 3 ? 'Best of 5' : 'Best of 3';

      // Add match to matches array
      matches.push({
        setId: setId,
        tournamentName: tournamentName,
        eventName: eventName,
        eventId: eventId,
        eventStartAt: startAt, // Unix timestamp
        completedAt: completedAt, // Unix timestamp
        winnerId: winner.id,
        winnerName: winner.name,
        loserId: loser.id,
        loserName: loser.name,
        winnerScore: winnerScore,
        loserScore: loserScore,
        bestOf: bestOf,
      });
    }
  }

  // Save matches to a file
  const matchesFilePath = path.join(__dirname, 'matches.json');
  fs.writeFileSync(matchesFilePath, JSON.stringify(matches, null, 2));
  console.log(`Matches data saved to ${matchesFilePath}`);

  return matches;
}

module.exports = processData;
