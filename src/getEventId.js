// getEventId.js
require('dotenv').config();
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
const startggURL = 'https://api.start.gg/gql/alpha';
const startggKey = "709731062d65fab7d19ae2f024121883"; // Ensure your API key is set in .env

async function getEventId(tournamentName, eventName) {
  const eventSlug = `tournament/${tournamentName}/event/${eventName}`;
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
          }
        }
      `,
      variables: {
        slug: eventSlug,
      },
    }),
  }).then((res) => res.json());

  if (response.errors) {
    console.error('Error fetching event ID:', response.errors);
    return null;
  }

  console.log(response.data);
  return {
    eventId: response.data.event.id,
    eventName: response.data.event.name,
  };
}

module.exports = getEventId;

// Example usage (you can remove this when importing the function elsewhere)
(async () => {
  const eventData = await getEventId('foco-weekly-wednesday-201', 'melee-singles');
  console.log(eventData);
})();
