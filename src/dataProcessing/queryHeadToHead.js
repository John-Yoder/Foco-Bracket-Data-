// src/dataProcessing/queryHeadToHead.js
const fs = require('fs');
const path = require('path');

/**
 * Queries head-to-head matches between two players by their names.
 * @param {string} player1Name - Name of the first player.
 * @param {string} player2Name - Name of the second player.
 * @param {Object} options - Filtering options.
 * @returns {Array} Array of match objects.
 */
function queryHeadToHeadByName(player1Name, player2Name, options = {}) {
  const headToHeadFilePath = path.join(__dirname, '../data/headToHead.json');
  
  // Check if the headToHead data file exists
  if (!fs.existsSync(headToHeadFilePath)) {
    console.error('Head-to-head data file not found. Please run analyze.js first.');
    return [];
  }

  // Read and parse the headToHead data
  const rawData = fs.readFileSync(headToHeadFilePath, 'utf-8');
  let headToHead;
  try {
    headToHead = JSON.parse(rawData);
  } catch (parseError) {
    console.error('Error parsing headToHead.json:', parseError);
    return [];
  }

  const player1Data = headToHead[player1Name];
  if (!player1Data) {
    console.error(`No data found for player ${player1Name}`);
    return [];
  }

  const matchesAgainstPlayer2 = player1Data.opponents[player2Name];
  if (!matchesAgainstPlayer2) {
    console.log(`No matches found between ${player1Name} and ${player2Name}`);
    return [];
  }

  // Apply filters
  let matches = matchesAgainstPlayer2;

  // Filter by bestOf
  if (options.bestOf) {
    matches = matches.filter(match => match.bestOf === options.bestOf);
  }

  // Filter by lastNMatches
  if (options.lastNMatches) {
    matches = matches.slice(-options.lastNMatches);
  }

  // Filter by lastNEvents
  if (options.lastNEvents) {
    // Sort matches by eventId descending (assuming higher eventId means more recent)
    matches.sort((a, b) => b.eventId - a.eventId);
    // Extract unique eventIds in descending order
    const uniqueEventIds = [...new Set(matches.map(match => match.eventId))];
    const recentEventIds = uniqueEventIds.slice(0, options.lastNEvents);
    // Filter matches to include only those in the recentEventIds
    matches = matches.filter(match => recentEventIds.includes(match.eventId));
  }

  // Filter by date ranges
  if (options.sinceDate) {
    matches = matches.filter(match => match.completedAt >= options.sinceDate);
  }

  if (options.beforeDate) {
    matches = matches.filter(match => match.completedAt <= options.beforeDate);
  }

  return matches;
}

module.exports = queryHeadToHeadByName;
