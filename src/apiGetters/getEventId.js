// getEventId.js
require('dotenv').config({ path: '../../.env' });
const startggURL = 'https://api.start.gg/gql/alpha';
const startggKey = process.env.STARTGG_KEY; // Replace with your actual API key

async function getEventId(tournamentName, eventName) {
  const { default: fetch } = await import('node-fetch');
  const eventSlug = `tournament/${tournamentName}/event/${eventName}`;

  try {
    const response = await fetch(startggURL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + startggKey,
      },
      body: JSON.stringify({
        query: `
          query EventQuery($slug:String) {
            event(slug: $slug) {
              id
              name
              startAt
            }
          }
        `,
        variables: {
          slug: eventSlug,
        },
      }),
    });

    const data = await response.json();
    if (data.errors) {
      console.error(`Error fetching event ID for ${eventSlug}:`, data.errors);
      return null; // Return null to indicate that the event was not found
    }

    return {
      eventId: data.data.event.id,
      eventName: data.data.event.name,
      startAt: data.data.event.startAt, // Include startAt for date filtering
    };
  } catch (error) {
    console.error(`Exception fetching event ID for ${eventSlug}:`, error);
    return null; // Return null to skip this event
  }
}

module.exports = getEventId;

getEventId('foco-weekly-wednesday-201', 'melee-singles');