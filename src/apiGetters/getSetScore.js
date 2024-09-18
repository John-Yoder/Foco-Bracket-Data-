// getSetScore.js
require('dotenv').config({ path: '../../.env' });
const startggURL = 'https://api.start.gg/gql/alpha';
const startggKey = process.env.STARTGG_KEY; // Replace with your actual API key

async function getSetScore(setId) {
  const { default: fetch } = await import('node-fetch');

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
    });

    const data = await response.json();
    if (data.errors) {
      console.error(`Error fetching set score for set ${setId}:`, data.errors);
      return null; // Return null to skip this set
    }

    if (!data.data.set) {
      console.error(`Set data not found for set ID ${setId}.`);
      return null; // Return null if set data is missing
    }

    return data.data.set;
  } catch (error) {
    console.error(`Exception fetching set score for set ${setId}:`, error);
    return null; // Return null to skip this set
  }
}

module.exports = getSetScore;
