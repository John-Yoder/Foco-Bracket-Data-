// getEventSets.js
require('dotenv').config();
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
const startggURL = 'https://api.start.gg/gql/alpha';
const startggKey = "709731062d65fab7d19ae2f024121883";
const sleep = require('./sleep'); // Ensure sleep.js is in the same directory

async function getEventSets(eventId) {
  let allSets = [];
  let page = 1;
  const perPage = 50; // Adjust as needed

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
    }).then((res) => res.json());

    if (response.errors) {
      console.error('Error fetching event sets:', response.errors);
      break;
    }

    const sets = response.data.event.sets.nodes;
    allSets = allSets.concat(sets);

    const { totalPages } = response.data.event.sets.pageInfo;
    if (page >= totalPages) {
      break;
    }

    page++;
    await sleep(200); // Adjust delay as needed
  }

  console.log(`Fetched ${allSets.length} sets.`);
  return allSets;
}

module.exports = getEventSets;

// Example usage
(async () => {
  const sets = await getEventSets(636204);
  console.log(sets);
})();
