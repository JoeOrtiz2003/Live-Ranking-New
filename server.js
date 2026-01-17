// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

let controlState = { action: "show", timestamp: Date.now() };
let wwcdGame = "Game 1"; // default
let killsGame = "Game 1"; // default
let matchRankingGame = "Game 1"; // default
let scrollQueue = []; // Use a queue for scroll directions
let killedAction = "show"; // show/hide for killed animation
let commsAction = "show"; // show/hide for comms
let maxEliminatedTeams = 16;
let totalCards = 5;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get current state
app.get('/api/control', (req, res) => {
  // Return the next scroll direction in the queue, if any
  const nextScroll = scrollQueue.length > 0 ? scrollQueue.shift() : null;
  res.json({ 
    ...controlState, 
    wwcdGame, 
    killsGame, 
    matchRankingGame, 
    scrollDirection: nextScroll,
    killedAction,
    commsAction,
    maxEliminatedTeams,
    totalCards
  });
});

// Set new state
app.post('/api/control', (req, res) => {
  const { action, game, direction, value } = req.body; // Add value for settings
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
  } else if (action === "scroll" && direction) {
    scrollQueue.push(direction); // Add to queue
    res.json({ success: true });
  } else if (action === "killed_show") {
    killedAction = "show";
    res.json({ success: true });
  } else if (action === "killed_hide") {
    killedAction = "hide";
    res.json({ success: true });
  } else if (action === "comms_show") {
    commsAction = "show";
    res.json({ success: true });
  } else if (action === "comms_hide") {
    commsAction = "hide";
    res.json({ success: true });
  } else if (action === "comms_hide_all") {
    commsAction = "hide_all";
    res.json({ success: true });
  } else if (action === "comms_refresh_all") {
    commsAction = "refresh_all";
    res.json({ success: true });
  } else if (action === "set_max_eliminated" && value !== undefined) {
    maxEliminatedTeams = value;
    res.json({ success: true });
  } else if (action === "set_total_cards" && value !== undefined) {
    totalCards = value;
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

// Serve killed.html at /Killed
app.get('/Killed', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'killed.html'));
});

// Serve comms.html at /Comms
app.get('/Comms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'comms.html'));
});

// Fallback: redirect to controller
app.get('*', (req, res) => {
  res.redirect('/Controller');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
