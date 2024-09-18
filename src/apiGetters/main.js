// main.js
const fs = require('fs');
const path = require('path');
const getEventId = require('./getEventId');
const getEventSets = require('./getEventSets');
const getSetScore = require('./getSetScore');
const sleep = require('../sleep');

(async () => {
  const tournaments = [];

    for (let i = 190; i <= 350; i++) {
      tournaments.push({ tournamentName: `foco-weekly-wednesday-${i}`, eventName: 'melee-singles' });
    }
  const dataFilePath = path.join(__dirname, 'data.json');
  let allEventData = {};

  // Load existing data
  if (fs.existsSync(dataFilePath)) {
    const rawData = fs.readFileSync(dataFilePath);
    allEventData = JSON.parse(rawData);
  } else {
    allEventData = {};
  }

  for (const { tournamentName, eventName } of tournaments) {
    // Create a unique key for the event
    const eventKey = `${tournamentName}_${eventName}`;
    if (allEventData[eventKey]) {
      console.log(`Data for event ${eventName} in tournament ${tournamentName} already exists. Skipping...`);
      continue;
    }

    const eventData = await getEventId(tournamentName, eventName);
    if (!eventData) {
      console.log(`Skipping event ${eventName} in tournament ${tournamentName} due to errors.`);
      continue; // Skip to the next tournament
    }

    const { eventId, eventName: actualEventName, startAt } = eventData;
    console.log(`Fetched Event ID: ${eventId} for ${actualEventName}`);

    const sets = await getEventSets(eventId);
    if (!sets || sets.length === 0) {
      console.log(`No sets found for event ID ${eventId}. Skipping event.`);
      continue; // Skip to the next event
    }
    console.log(`Fetched ${sets.length} sets for event ${actualEventName}`);

    // Get set scores
    const eventSets = [];

    for (const set of sets) {
      const setScoreData = await getSetScore(set.id);
      if (setScoreData) {
        eventSets.push({
          ...set,
          setScore: setScoreData,
        });
      } else {
        console.log(`Skipping set ID ${set.id} due to errors.`);
      }
      await sleep(800); // Adjust delay as needed
    }

    allEventData[eventKey] = {
      tournamentName: tournamentName,
      eventName: actualEventName,
      eventId: eventId,
      startAt: startAt,
      sets: eventSets,
    };

    await sleep(800); // Adjust delay as needed
  }

  // Save data to file
  fs.writeFileSync(dataFilePath, JSON.stringify(allEventData, null, 2));
  console.log(`Data saved to ${dataFilePath}`);
})();
