// getSetScore.js
require('dotenv').config();
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
const startggURL = 'https://api.start.gg/gql/alpha';
const startggKey = "709731062d65fab7d19ae2f024121883";

async function getSetScore(setId) {
  const response = await fetch(startggURL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Bearer ' + startggKey,
    },
    body: JSON.stringify({
      query: `
        query Set($setId: ID!) {
          set(id: $setId) {
            id
            slots {
              id
              standing {
                id
                placement
                stats {
                  score {
                    label
                    value
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        setId: setId,
      },
    }),
  }).then((res) => res.json());

  if (response.errors) {
    console.error(`Error fetching set score for set ${setId}:`, response.errors);
    return null;
  }

  console.log(response.data.set);
  return response.data.set;
}

module.exports = getSetScore;

// Example usage
(async () => {
  const setScore = await getSetScore('41560843');
  console.log(setScore);
})();
