// src/dataProcessing/processData.js
const fs = require('fs');
const path = require('path');

/**
 * Processes raw event data to extract match details.
 * @returns {Array} Array of match objects.
 */
function processData() {
  const dataFilePath = path.join(__dirname, '../apiGetters/data.json');
  
  // Check if the data file exists
  if (!fs.existsSync(dataFilePath)) {
    console.error('Data file not found. Please run main.js first.');
    return;
  }

  // Read and parse the data file
  const rawData = fs.readFileSync(dataFilePath, 'utf-8');
  let allEventData;
  try {
    allEventData = JSON.parse(rawData);
  } catch (parseError) {
    console.error('Error parsing data.json:', parseError);
    return;
  }

  const matches = []; // Array to store all matches

  // Iterate over each event
  for (const eventKey in allEventData) {
    const eventData = allEventData[eventKey];
    const { tournamentName, eventName, eventId, startAt, sets } = eventData;

    // Validate essential event data
    if (!tournamentName || !eventName || !eventId || !sets) {
      console.warn(`Incomplete event data for key ${eventKey}. Skipping event.`);
      continue;
    }

    // Iterate over each set within the event
    for (const set of sets) {
      try {
        const setId = set.id;
        const slots = set.slots;
        const setScoreData = set.setScore;
        const completedAt = set.completedAt || setScoreData?.completedAt || 0; // Unix timestamp

        // Validate essential set data
        if (!slots || slots.length < 2 || !setScoreData) {
          console.warn(`Incomplete data for set ID ${setId} in event ${eventName}. Skipping set.`);
          continue;
        }

        // Extract player information
        const player1 = slots[0].entrant;
        const player2 = slots[1].entrant;

        if (!player1 || !player2) {
          console.warn(`Missing player data for set ID ${setId} in event ${eventName}. Skipping set.`);
          continue;
        }

        // Extract player names directly without normalization
        const player1Name = player1.name;
        const player2Name = player2.name;

        // Extract scores from setScoreData
        const setSlots = setScoreData.slots;
        const standing1 = setSlots[0].standing;
        const standing2 = setSlots[1].standing;

        if (!standing1 || !standing2 || !standing1.stats || !standing2.stats) {
          console.warn(`Missing standing data for set ID ${setId} in event ${eventName}. Skipping set.`);
          continue;
        }

        const score1 = standing1.stats.score.value;
        const score2 = standing2.stats.score.value;

        // Determine winner and loser based on placement
        let winner, loser, winnerScore, loserScore;

        if (standing1.placement === 1) {
          winner = player1;
          loser = player2;
          winnerScore = score1;
          loserScore = score2;
        } else if (standing2.placement === 1) {
          winner = player2;
          loser = player1;
          winnerScore = score2;
          loserScore = score1;
        } else {
          console.warn(`Invalid placement data for set ID ${setId} in event ${eventName}. Skipping set.`);
          continue;
        }

        // Determine best-of-N based on the winning score
        const maxScore = Math.max(winnerScore, loserScore);
        const bestOf = maxScore >= 3 ? 'Best of 5' : 'Best of 3';

        // Construct the match object with original names
        const match = {
          setId: setId,
          tournamentName: tournamentName,
          eventName: eventName,
          eventId: eventId,
          eventStartAt: startAt, // Unix timestamp
          completedAt: completedAt, // Unix timestamp
          winnerId: winner.id,
          winnerName: winner.name, // Corrected
          loserId: loser.id,
          loserName: loser.name,   // Corrected
          winnerScore: winnerScore,
          loserScore: loserScore,
          bestOf: bestOf,
        };

        // Add the match to the matches array
        matches.push(match);
      } catch (error) {
        console.error(`Error processing set ID ${set.id} in event ${eventName}:`, error);
        continue; // Skip to the next set
      }
    }
  }

  // Define the output path for matches.json
  const matchesFilePath = path.join(__dirname, '../data/matches.json');

  // Ensure the data directory exists
  const dataDir = path.dirname(matchesFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Save the matches array to matches.json
  try {
    fs.writeFileSync(matchesFilePath, JSON.stringify(matches, null, 2));
    console.log(`Matches data saved to ${matchesFilePath}`);
  } catch (writeError) {
    console.error('Error writing to matches.json:', writeError);
  }

  return matches;
}

module.exports = processData;

// Execute the function if the script is run directly
if (require.main === module) {
  processData();
}
