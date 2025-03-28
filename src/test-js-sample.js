/**
 * A sample JavaScript file to test the MCP DevDocs Server
 * @module test-js-sample
 */

/**
 * Calculates the sum of two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The sum of a and b
 */
function add(a, b) {
  return a + b;
}

/**
 * A class that manages user authentication
 */
class AuthManager {
  /**
   * Creates a new AuthManager instance
   */
  constructor() {
    this._users = new Map();
  }
  
  /**
   * Logs in a user
   * @param {Object} user - The user to log in
   * @param {string} user.id - User ID
   * @param {string} user.name - User name
   * @returns {boolean} Success status
   */
  login(user) {
    this._users.set(user.id, user);
    return true;
  }
  
  /**
   * Logs out a user
   * @param {string} userId - The ID of the user to log out
   */
  logout(userId) {
    this._users.delete(userId);
  }
  
  /**
   * Checks if a user is logged in
   * @param {string} userId - The user ID to check
   * @returns {boolean} Whether the user is logged in
   */
  _isLoggedIn(userId) {
    return this._users.has(userId);
  }
}

// Sample Express-like route
const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
  // Get all users
  res.json({ users: [] });
});

app.post('/api/users', (req, res) => {
  // Create a new user
  res.json({ success: true });
});

module.exports = {
  add,
  AuthManager
};
