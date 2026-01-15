// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

let controlState = { action: "show", timestamp: Date.now() };
let wwcdGame = "Game 1"; // default
let killsGame = "Game 1"; // default
let matchRankingGame = "Game 1"; // default
let scrollDirection = null; // Add this line

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get current state
app.get('/api/control', (req, res) => {
  res.json({ ...controlState, wwcdGame, killsGame, matchRankingGame, scrollDirection });
  // Only clear scrollDirection, not the whole state
  scrollDirection = null;
});

// Set new state
app.post('/api/control', (req, res) => {
  const { action, game, direction } = req.body; // Add direction
  if (["show", "hide", "refresh", "scoreboard_show", "scoreboard_hide"].includes(action)) {
    controlState = { action, timestamp: Date.now() };
    res.json({ success: true });
  } else if (action === "wwcd" && game) {
    wwcdGame = game;
    controlState = { action, game, timestamp: Date.now() };
    res.json({ success: true });
  } else if (action === "kills" && game) {
    killsGame = game;
    controlState = { action, game, timestamp: Date.now() };
    res.json({ success: true });
  } else if (action === "match_ranking" && game) {
    matchRankingGame = game;
    controlState = { action, game, timestamp: Date.now() };
    res.json({ success: true });
  } else if (action === "scroll" && direction) { // Add this block
    scrollDirection = direction;
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Invalid action" });
  }
});

// Serve controller.html at /controller
app.get('/Controller', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

// Serve display.html at /display
app.get('/Ranking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

// Serve scoreboard.html at /scoreboard
app.get('/Scoreboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scoreboard.html'));
});

app.get('/Kills', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kills.html'));
});

// Serve wwcd.html at /WWCD
app.get('/WWCD', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'wwcd.html'));
});

app.get('/Match', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'match.html'));
});

// Fallback: redirect to controller
app.get('*', (req, res) => {
  res.redirect('/Controller');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
