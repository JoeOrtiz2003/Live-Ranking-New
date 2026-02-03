// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

/* =========================
   GLOBAL STATE
========================= */

let controlState = { action: "show", timestamp: Date.now() };

let wwcdGame = "Game 1";
let killsGame = "Game 1";
let matchRankingGame = "Game 1";
let commsAction = "show";
let scrollQueue = [];
let maxEliminatedTeams = 16;

// 🔥 COMMS STATE
// Initialize totalCards with a default value, but allow it to be updated dynamically
let totalCards = 3; // Default value, can be updated via API
let commsOffset = 0;

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* =========================
   GET CURRENT STATE
========================= */

app.get('/api/control', (req, res) => {
  const nextScroll = scrollQueue.length ? scrollQueue.shift() : null;

  res.json({
    action: controlState.action,
    timestamp: controlState.timestamp,

    wwcdGame,
    killsGame,
    matchRankingGame,
    commsAction,
    scrollDirection: nextScroll,

    // KILLED
    maxEliminatedTeams,

    // 🔥 COMMS DATA
    totalCards,
    commsOffset
  });
});

/* =========================
   POST CONTROL ACTIONS
========================= */

app.post('/api/control', (req, res) => {
  const { action, game, direction, value } = req.body;

  // BASIC SHOW / HIDE
  if (["show", "hide", "refresh", "scoreboard_show", "scoreboard_hide"].includes(action)) {
    controlState = { action, timestamp: Date.now() };
    return res.json({ success: true });
  }

  // GAME SELECTORS
  if (action === "wwcd_refresh" && game) {
    console.log("Received WWCD action with game:", game);
    wwcdGame = game;
    controlState = { action, game, timestamp: Date.now() };
    return res.json({ success: true, message: "WWCD game set successfully", game });
  }

  if (action === "kills" && game) {
    killsGame = game;
    controlState = { action, game, timestamp: Date.now() };
    return res.json({ success: true });
  }

  if (action === "match_ranking" && game) {
    matchRankingGame = game;
    controlState = { action, game, timestamp: Date.now() };
    return res.json({ success: true });
  }

  // SCROLL
  if (action === "scroll" && direction) {
    scrollQueue.push(direction);
    return res.json({ success: true });
  }

  // KILLED
  if (action === "killed_refresh") {
    console.log("Received killed_refresh action from client."); // Debugging log
    controlState = { action, timestamp: Date.now() };
    return res.json({ success: true, action, message: "Killed page refreshed" });
  }

  // COMMS VISIBILITY
  if (action === "comms_show") {
    commsAction = "show";
    return res.json({ success: true });
  }

  if (action === "comms_hide") {
    commsAction = "hide";
    return res.json({ success: true });
  }

  if (action === "comms_refresh_all") {
    commsAction = "refresh_all";
    return res.json({ success: true });
  }

  // COMMS PAGINATION
  if (action === "comms_next") {
    commsAction = "next";
    commsOffset += totalCards;
    return res.json({ success: true });
  }

  if (action === "comms_previous") {
    commsAction = "previous";
    commsOffset = Math.max(0, commsOffset - totalCards);
    return res.json({ success: true });
  }

  // SETTINGS
  if (action === "set_max_eliminated" && value !== undefined) {
    maxEliminatedTeams = parseInt(value);
    controlState = { action, value, timestamp: Date.now() };
    return res.json({ success: true });
  }

  // 🔥 IMPORTANT FIX
  if (action === "set_total_cards" && value !== undefined) {
    totalCards = Math.max(1, Math.min(parseInt(value), 5));
    commsOffset = 0;
    commsAction = "refresh_all";
    return res.json({ success: true });
  }

  res.status(400).json({ error: "Invalid action" });
});

/* =========================
   ROUTES
========================= */

app.get('/Controller', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'controller.html'))
);

app.get('/Ranking', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'display.html'))
);

app.get('/Scoreboard', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'scoreboard.html'))
);

app.get('/Kills', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'kills.html'))
);

app.get('/WWCD', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'wwcd.html'))
);

app.get('/Match', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'match.html'))
);

app.get('/Killed', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'killed.html'))
);

app.get('/Comms', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'comms.html'))
);

// Fallback
app.get('*', (_, res) => res.redirect('/Controller'));

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
