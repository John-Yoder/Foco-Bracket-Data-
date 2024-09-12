const { get } = require('http');

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const startggURL = 'https://api.start.gg/gql/alpha';
const startggKey = "709731062d65fab7d19ae2f024121883";

const getEventId = (tournamentName, eventName) => {
    const eventSlug = `tournament/${tournamentName}/event/${eventName}`;
    let eventId;
    fetch(startggURL, {
              method: 'POST',
              headers: {
                  'content-type': 'application/json',
                  'Accept': 'application/json',
                  Authorization: 'Bearer ' + startggKey
              },
              body: JSON.stringify({
                  query: "query EventQuery($slug:String) {event(slug: $slug) {id name}}",
                  variables: {
                      slug: eventSlug
                  },
              })
          }).then(r => r.json())
          .then(data => {
              console.log(data.data);
              eventId = data.data.event.id
          })
    return eventId;
}

const getCompletedMatches = (eventId) => {
    fetch('https://api.start.gg/gql/alpha', {
              method: 'POST',
                  headers: {
                      'content-type': 'application/json',
                      'Accept': 'application/json',
                      Authorization: 'Bearer ' + startggKey
                  },
                  body: JSON.stringify({
                      query: "query EventSets($eventId: ID!, $page: Int!, $perPage: Int!) { event(id: $eventId) {sets(page: $page perPage: $perPage sortType: STANDARD) {pageInfo {total} nodes {id slots {entrant {name}}}}}}",
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
//https://www.start.gg/tournament/foco-weekly-wednesday-201/event/melee-singles
getEventId('foco-weekly-wednesday-201', 'melee-singles');
getCompletedMatches(636204);
