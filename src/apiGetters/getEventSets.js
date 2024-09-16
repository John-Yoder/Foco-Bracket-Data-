// getEventSets.js
require('dotenv').config();
const startggURL = 'https://api.start.gg/gql/alpha';
const startggKey = '709731062d65fab7d19ae2f024121883'; // Replace with your actual API key
const sleep = require('../sleep');

async function getEventSets(eventId) {
  const { default: fetch } = await import('node-fetch');
  let allSets = [];
  let page = 1;
  const perPage = 50; // Adjust as needed

  try {
    while (true) {
      const response = await fetch(startggURL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer ' + startggKey,
        },
        body: JSON.stringify({
          query: `
            query EventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
              event(id: $eventId) {
                id
                name
                sets(
                  page: $page
                  perPage: $perPage
                  sortType: STANDARD
                ) {
                  pageInfo {
                    total
                    totalPages
                  }
                  nodes {
                    id
                    slots {
                      id
                      entrant {
                        id
                        name
                      }
                    }
                    completedAt
                  }
                }
              }
            }
          `,
          variables: {
            eventId: eventId,
            page: page,
            perPage: perPage,
          },
        }),
      });

      const data = await response.json();
      if (data.errors) {
        console.error(`Error fetching sets for event ID ${eventId}:`, data.errors);
        return null; // Return null to indicate an error
      }

      if (!data.data.event || !data.data.event.sets) {
        console.error(`No sets found for event ID ${eventId}.`);
        return null; // Return null if sets data is missing
      }

      const sets = data.data.event.sets.nodes;
      allSets = allSets.concat(sets);

      const { totalPages } = data.data.event.sets.pageInfo;
      if (page >= totalPages) {
        break;
      }

      page++;
      await sleep(200); // Adjust delay as needed
    }

    return allSets;
  } catch (error) {
    console.error(`Exception fetching sets for event ID ${eventId}:`, error);
    return null; // Return null to skip this event
  }
}

module.exports = getEventSets;
