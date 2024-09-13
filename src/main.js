// main.js
const getEventId = require('./getEventId');
const getEventSets = require('./getEventSets');
const getSetScore = require('./getSetScore');
const sleep = require('./sleep');

(async () => {
  const tournaments = [
    { tournamentName: 'foco-weekly-wednesday-201', eventName: 'melee-singles' },
    // Add more tournaments here
  ];

  const allEventData = {};

  for (const { tournamentName, eventName } of tournaments) {
    const eventData = await getEventId(tournamentName, eventName);
    if (!eventData) continue;

    const { eventId, eventName: actualEventName } = eventData;
    console.log(`Fetched Event ID: ${eventId} for ${actualEventName}`);

    const sets = await getEventSets(eventId);
    console.log(`Fetched ${sets.length} sets for event ${actualEventName}`);

    allEventData[eventId] = {
      eventName: actualEventName,
      sets: [],
    };

    for (const set of sets) {
      const setScoreData = await getSetScore(set.id);
      if (setScoreData) {
        allEventData[eventId].sets.push({
          ...set,
          setScore: setScoreData,
        });
      }
      await sleep(800); // Adjust delay as needed
    }

    await sleep(1000); // Adjust delay as needed
  }

  console.log(JSON.stringify(allEventData, null, 2));
})();
