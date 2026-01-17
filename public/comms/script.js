const sheetId = '1srwCRcCf_grbInfDSURVzXXRqIqxQ6_IIPG-4_gnSY8';
let sheetName = 'WWCD';
let totalCards = 3; // number of cards
let isVisible = true;

function generateQueries(count) {
  const baseColumns = ["B", "C", "D", "E", "G"];
  
  return Array.from({ length: count }, (_, i) => 
    `SELECT ${baseColumns.join(", ")} LIMIT 1 OFFSET ${i}`
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

  // --- Button outside the card ---
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "card-toggle-btn";
  toggleBtn.textContent = "Hide Info";

  wrapper.appendChild(toggleBtn);
  wrapper.appendChild(card);

  // --- Per-card toggle with staggered effect ---
  const extra = card.querySelector(".card-extra");
  const children = Array.from(extra.children);

  toggleBtn.addEventListener("click", () => {
    const hiding = !children[0].classList.contains("hidden");
    let targets = hiding ? children.slice().reverse() : children;

    targets.forEach((el, index) => {
      setTimeout(() => {
        if (hiding) {
          el.classList.add("hidden");   // slide-down
        } else {
          el.classList.remove("hidden"); // slide-up
        }
      }, index * 200);
    });

    toggleBtn.textContent = hiding ? "Show Info" : "Hide Info";
  });

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
      if (data.commsAction === 'show') {
        isVisible = true;
        const container = document.getElementById('games-container');
        container.style.opacity = '0';
        container.style.display = 'flex';
        setTimeout(() => {
          container.style.transition = 'opacity 0.3s ease';
          container.style.opacity = '1';
        }, 10);
      } else if (data.commsAction === 'hide') {
        isVisible = false;
        const container = document.getElementById('games-container');
        container.style.transition = 'opacity 0.3s ease';
        container.style.opacity = '0';
        setTimeout(() => {
          container.style.display = 'none';
        }, 300);
      }
      if (data.totalCards !== undefined && data.totalCards !== totalCards) {
        totalCards = data.totalCards;
        queries = generateQueries(totalCards);
        urls = queries.map(query =>
          `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`
        );
        buildCards();
        refreshAll();
      }
      if (data.commsAction === 'refresh_all') {
        refreshAll();
      }
    })
    .catch(err => console.error('Error polling control state:', err));
}

setInterval(pollControlState, 500);
