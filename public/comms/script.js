const sheetId = '1srwCRcCf_grbInfDSURVzXXRqIqxQ6_IIPG-4_gnSY8';
let sheetName = 'WWCD';
let totalCards = 3; // number of cards
let isVisible = true;
let lastCommsAction = null; // Track previous state to prevent repeated animations
let currentOffset = 0; // Track current pagination offset

function generateQueries(count, offset = 0) {
  const baseColumns = ["B", "C", "D", "E", "G"];
  
  return Array.from({ length: count }, (_, i) => 
    `SELECT ${baseColumns.join(", ")} LIMIT 1 OFFSET ${offset + i}`
  );
}

let queries = generateQueries(totalCards);
let urls = queries.map(query =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`
);

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

function updateCard(card, data, fullUpdate = true) {
  if (!data) return;
  const { game, map, logoURL, total, mapURL } = data;

  if (fullUpdate) {
    card.classList.remove("placeholder");
    card.querySelector(".map-name").textContent = map;
    const bgImg = card.querySelector(".bg");
    bgImg.src = mapURL;
    bgImg.style.opacity = 1;
    card.querySelector(".game-num").textContent = game;
  }

  const logoImg = card.querySelector(".logo");
  logoImg.src = logoURL;
  logoImg.style.opacity = 1;
  card.querySelector(".total-value").textContent = total;
}

function fetchCardData(url) {
  return fetch(url)
    .then(res => res.text())
    .then(text => {
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/);
      if (!match || !match[1]) return null;
      const json = JSON.parse(match[1]);
      const row = json.table.rows[0];
      if (!row) return null;

      const getValue = (cell) => (cell && cell.v != null) ? cell.v : '';

      return {
        game: getValue(row.c[0]),
        map: getValue(row.c[1]),
        logoURL: getValue(row.c[2]),
        total: getValue(row.c[3]),
        mapURL: getValue(row.c[4])
      };
    })
    .catch(() => null);
}

function buildCards() {
  const container = document.getElementById("games-container");
  container.innerHTML = "";

  urls.forEach((url, i) => {
    const placeholder = createPlaceholderCard(i);
    container.appendChild(placeholder);
  });
}

async function refreshAll() {
  urls.forEach((url, i) => {
    fetchCardData(url).then(data => {
      const card = document.getElementById(`card-${i}`);
      if (card && data) updateCard(card, data, true);
    });
  });
}

async function refreshExtra() {
  urls.forEach((url, i) => {
    fetchCardData(url).then(data => {
      const card = document.getElementById(`card-${i}`);
      if (card && data) updateCard(card, data, false);
    });
  });
}

// --- Initial build only once ---
buildCards();

// Poll server for control messages
function pollControlState() {
  fetch('/api/control')
    .then(res => res.json())
    .then(data => {
      // Handle totalCards change first
      if (data.totalCards !== undefined && data.totalCards !== totalCards) {
        totalCards = data.totalCards;
        currentOffset = 0; // Reset offset when total cards change
        queries = generateQueries(totalCards, currentOffset);
        urls = queries.map(query =>
          `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`
        );
        buildCards();
        refreshAll();
      }

      // Handle pagination offset change
      if (data.commsOffset !== undefined && data.commsOffset !== currentOffset) {
        currentOffset = data.commsOffset;
        queries = generateQueries(totalCards, currentOffset); // Use totalCards for pagination
        urls = queries.map(query =>
          `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`
        );
        buildCards();
        refreshAll();
      }

      // Only animate if commsAction state has changed
      if (data.commsAction !== lastCommsAction) {
        lastCommsAction = data.commsAction;

        if (data.commsAction === 'show') {
          isVisible = true;
          const container = document.getElementById('games-container');
          container.style.display = 'flex';
          
          // Slide up animation left to right
          const cards = Array.from(document.querySelectorAll('.game-card'));
          cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(50px)';
            card.style.transition = 'none'; // Disable transition initially
            setTimeout(() => {
              card.style.transition = 'all 0.5s ease';
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }, 10 + index * 150); // Base delay of 10ms to ensure reflow
          });
        } else if (data.commsAction === 'hide') {
          isVisible = false;
          const container = document.getElementById('games-container');
          
          // Slide down animation right to left
          const cards = Array.from(document.querySelectorAll('.game-card')).reverse();
          cards.forEach((card, index) => {
            setTimeout(() => {
              card.style.transition = 'all 0.5s ease';
              card.style.opacity = '0';
              card.style.transform = 'translateY(50px)';
            }, index * 150);
          });
          
          setTimeout(() => {
            container.style.display = 'none';
            // Reset styles for next show
            Array.from(document.querySelectorAll('.game-card')).forEach(card => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
              card.style.transition = 'none';
            });
          }, cards.length * 150 + 500);
        } else if (data.commsAction === 'next') {
          // Slide left animation for next
          const container = document.getElementById('games-container');
          const cards = Array.from(document.querySelectorAll('.game-card'));
          
          cards.forEach((card, index) => {
            setTimeout(() => {
              card.style.transition = 'all 0.5s ease';
              card.style.opacity = '0';
              card.style.transform = 'translateX(-100px)';
            }, index * 100);
          });
          
          setTimeout(() => {
            buildCards();
            refreshAll();
            // Reset to initial state for new cards
            const newCards = Array.from(document.querySelectorAll('.game-card'));
            newCards.forEach((card, index) => {
              card.style.opacity = '0';
              card.style.transform = 'translateX(100px)';
              card.style.transition = 'none';
              setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateX(0)';
              }, 10 + index * 100);
            });
          }, cards.length * 100 + 200);
        } else if (data.commsAction === 'previous') {
          // Slide right animation for previous
          const container = document.getElementById('games-container');
          const cards = Array.from(document.querySelectorAll('.game-card'));
          
          cards.forEach((card, index) => {
            setTimeout(() => {
              card.style.transition = 'all 0.5s ease';
              card.style.opacity = '0';
              card.style.transform = 'translateX(100px)';
            }, index * 100);
          });
          
          setTimeout(() => {
            buildCards();
            refreshAll();
            // Reset to initial state for new cards
            const newCards = Array.from(document.querySelectorAll('.game-card'));
            newCards.forEach((card, index) => {
              card.style.opacity = '0';
              card.style.transform = 'translateX(-100px)';
              card.style.transition = 'none';
              setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateX(0)';
              }, 10 + index * 100);
            });
          }, cards.length * 100 + 200);
        }
      }

      // Handle refresh separately (can happen multiple times)
      if (data.commsAction === 'refresh_all') {
        refreshAll();
      }
    })
    .catch(err => console.error('Error polling control state:', err));
}

setInterval(pollControlState, 500);

function sendTotalCards(val) {
  if (!val) {
    alert('Enter a number');
    return;
  }
  const cappedVal = Math.min(parseInt(val), 5); // Cap at maximum 5
  post({ action: 'set_total_cards', value: cappedVal }).then(() => {
    // Update totalCards and rebuild cards immediately
    totalCards = cappedVal;
    currentOffset = 0; // Reset offset when total cards change
    queries = generateQueries(totalCards, currentOffset);
    urls = queries.map(query =>
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`
    );
    buildCards();
    refreshAll();
  });
}
