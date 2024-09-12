require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const startggURL = 'https://api.start.gg/gql/alpha';
const startggKey = "709731062d65fab7d19ae2f024121883";
const { get } = require('http');
const sleep = require('./sleep');

const getEventSets = (eventId) => {
    fetch('https://api.start.gg/gql/alpha', {
              method: 'POST',
                  headers: {
                      'content-type': 'application/json',
                      'Accept': 'application/json',
                      Authorization: 'Bearer ' + startggKey
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
                          page: 1,
                          perPage: 5
                      },
         })
     }).then(r => r.json())
     .then(data => {
              console.log(data.data);
     });
}

module.exports = {
    getEventResults
};

getEventSets(636204);
