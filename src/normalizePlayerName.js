// utils.js
function normalizePlayerName(name) {
    // Convert to lowercase
    let normalized = name.toLowerCase();
  
    // Remove prefixes before the first space
    const parts = normalized.split(' ');
    if (parts.length > 1) {
      normalized = parts.slice(1).join(' ');
    }
  
    // Trim spaces
    normalized = normalized.trim();
  
    return normalized;
  }
  
  module.exports = {
    normalizePlayerName,
  };
  