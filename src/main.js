// main.js
const fs = require('fs');
const path = require('path');
const getEventId = require('./getEventId');
const getEventSets = require('./getEventSets');
const getSetScore = require('./getSetScore');
const sleep = require('./sleep');

(async () => {
  const tournaments = [
    { tournamentName: 'foco-weekly-wednesday-201', eventName: 'melee-singles' },
    { tournamentName: 'foco-weekly-wednesday-202', eventName: 'melee-singles' },
    // Add more tournaments here
  ];

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
    if (!eventData) continue;

    const { eventId, eventName: actualEventName, startAt } = eventData;
    console.log(`Fetched Event ID: ${eventId} for ${actualEventName}`);

    const sets = await getEventSets(eventId);
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
      }
      await sleep(200); // Adjust delay as needed
    }

    allEventData[eventKey] = {
      tournamentName: tournamentName,
      eventName: actualEventName,
      eventId: eventId,
      startAt: startAt,
      sets: eventSets,
    };

    await sleep(500); // Adjust delay as needed
  }

  // Save data to file
  fs.writeFileSync(dataFilePath, JSON.stringify(allEventData, null, 2));
  console.log(`Data saved to ${dataFilePath}`);

})();
