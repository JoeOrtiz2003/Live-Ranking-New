// =====================
// CONFIG
// =====================
const sheetId = '1srwCRcCf_grbInfDSURVzXXRqIqxQ6_IIPG-4_gnSY8';
let sheetName = 'WWCD';

// Default fallback (will be overridden by controller)
let totalCards = 5;

let isVisible = true;
let lastCommsAction = null;
let currentOffset = 0;

// =====================
// QUERY HELPERS
// =====================
function generateQueries(count, offset = 0) {
  const baseColumns = ["B", "C", "D", "E", "G"];
  return Array.from({ length: count }, (_, i) =>
    `SELECT ${baseColumns.join(", ")} LIMIT 1 OFFSET ${offset + i}`
  );
}

let queries = generateQueries(totalCards);
let urls = queries.map(q =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(q)}`
);

// =====================
// CARD BUILDING
// =====================
function createPlaceholderCard(index) {
  const wrapper = document.createElement("div");
  wrapper.className = "card-wrapper";

  const card = document.createElement("div");
  card.className = "game-card placeholder";
  card.id = `card-${index}`;

  card.innerHTML = `
    <div class="map-name">Loading...</div>
    <img class="bg" src="" alt="map" style="opacity:0;">
    <div class="game-card-content">
      <div class="card-extra">
        <img class="logo" src="" alt="logo" style="opacity:0;">
        <div class="total">TOTAL</div>
        <div class="total-value">--</div>
      </div>
    </div>
    <div class="game-num">--</div>
  `;

  wrapper.appendChild(card);
  return wrapper;
}

function buildCards() {
  const container = document.getElementById("games-container");
  if (!container) return;

  container.innerHTML = "";
  for (let i = 0; i < totalCards; i++) {
    container.appendChild(createPlaceholderCard(i));
  }
}

// =====================
// DATA FETCH
// =====================
function fetchCardData(url) {
  return fetch(url)
    .then(res => res.text())
    .then(text => {
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/);
      if (!match) return null;

      const json = JSON.parse(match[1]);
      const row = json.table.rows[0];
      if (!row) return null;

      const v = c => (c && c.v != null) ? c.v : '';

      return {
        game: v(row.c[0]),
        map: v(row.c[1]),
        logoURL: v(row.c[2]),
        total: v(row.c[3]),
        mapURL: v(row.c[4])
      };
    })
    .catch(() => null);
}

function updateCard(card, data, full = true) {
  if (!card || !data) return;

  if (full) {
    card.classList.remove("placeholder");
    card.querySelector(".map-name").textContent = data.map;
    card.querySelector(".bg").src = data.mapURL;
    card.querySelector(".bg").style.opacity = 1;
    card.querySelector(".game-num").textContent = data.game;
  }

  const logo = card.querySelector(".logo");
  logo.src = data.logoURL;
  logo.style.opacity = 1;

  card.querySelector(".total-value").textContent = data.total;
}

// =====================
// REFRESH
// =====================
function refreshAll() {
  urls.forEach((url, i) => {
    fetchCardData(url).then(data => {
      const card = document.getElementById(`card-${i}`);
      if (card && data) updateCard(card, data, true);
    });
  });
}

// =====================
// CONTROL POLLING
// =====================
function rebuildUrls() {
  queries = generateQueries(totalCards, currentOffset);
  urls = queries.map(q =>
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(q)}`
  );
}

function pollControlState() {
  fetch('/api/control')
    .then(res => res.json())
    .then(data => {

      // TOTAL CARDS
      if (typeof data.totalCards === 'number' && data.totalCards !== totalCards) {
        totalCards = data.totalCards;
        currentOffset = 0;
        rebuildUrls();
        buildCards();
        refreshAll();
      }

      // PAGINATION
      if (typeof data.commsOffset === 'number' && data.commsOffset !== currentOffset) {
        currentOffset = data.commsOffset;
        rebuildUrls();
        buildCards();
        refreshAll();
      }

      // ACTIONS (prevent repeat animation)
      if (data.commsAction !== lastCommsAction) {
        lastCommsAction = data.commsAction;
        handleCommsAction(data.commsAction);
      }

      if (data.commsAction === 'refresh_all') {
        refreshAll();
      }
    })
    .catch(console.error);
}

// =====================
// ANIMATIONS
// =====================
function handleCommsAction(action) {
  const container = document.getElementById('games-container');
  if (!container) return;

  const cards = Array.from(document.querySelectorAll('.game-card'));

  if (action === 'show') {
    container.style.display = 'flex';
    cards.forEach((c, i) => {
      c.style.opacity = 0;
      c.style.transform = 'translateY(40px)';
      c.style.transition = 'none';
      setTimeout(() => {
        c.style.transition = 'all 0.45s ease';
        c.style.opacity = 1;
        c.style.transform = 'translateY(0)';
      }, i * 120);
    });
  }

  if (action === 'hide') {
    cards.slice().reverse().forEach((c, i) => {
      setTimeout(() => {
        c.style.transition = 'all 0.45s ease';
        c.style.opacity = 0;
        c.style.transform = 'translateY(40px)';
      }, i * 120);
    });
    setTimeout(() => container.style.display = 'none', cards.length * 120 + 300);
  }

  if (action === 'next' || action === 'previous') {
    const dir = action === 'next' ? -100 : 100;
    cards.forEach((c, i) => {
      setTimeout(() => {
        c.style.transition = 'all 0.4s ease';
        c.style.opacity = 0;
        c.style.transform = `translateX(${dir}px)`;
      }, i * 80);
    });
    setTimeout(() => {
      buildCards();
      refreshAll();
    }, cards.length * 80 + 200);
  }
}

// =====================
// INIT
// =====================
buildCards();
refreshAll();
setInterval(pollControlState, 500);

function sendTotalCards(val) {
  if (!val) {
    alert('Enter a number');
    return;
  }
  const cappedVal = Math.min(parseInt(val), 5); // Cap at maximum 5
  post({ action: 'set_total_cards', value: cappedVal }).then(() => {
    // Fetch updated totalCards from the backend
    fetch('/api/control')
      .then(res => res.json())
      .then(data => {
        if (data.totalCards !== undefined) {
          totalCards = data.totalCards; // Update the global totalCards variable
          currentOffset = 0; // Reset offset when total cards change
          queries = generateQueries(totalCards, currentOffset);
          urls = queries.map(query =>
            `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`
          );
          buildCards();
          refreshAll();
        }
      })
      .catch(err => console.error('Error fetching updated totalCards:', err));
  });
}
