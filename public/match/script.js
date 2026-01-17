const sheetId = '1srwCRcCf_grbInfDSURVzXXRqIqxQ6_IIPG-4_gnSY8';
let sheetName = 'Game 1';
const query = 'SELECT V, Y, Z, AA, X, AH, W WHERE U IS NOT NULL ORDER BY AH DESC LIMIT 20';

google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(() => {
  createRankingElements(16);
  updateSlogan(); // Set slogan on load
  fetchSheetData();
  setInterval(() => {
    updateSlogan(); // Keep slogan in sync if sheetName changes
    fetchSheetData();
  }, 5000000);
  setInterval(() => {
    fetch('/api/control')
      .then(res => res.json())
      .then(command => {
        if (command.matchRankingGame && command.matchRankingGame !== sheetName) {
          sheetName = command.matchRankingGame;
          updateSlogan();
          fetchSheetData();
        }
      });
  }, 1000);
  let lastScrollDirection = null;
  setInterval(() => {
    fetch('/api/control')
      .then(res => res.json())
      .then(command => {
        if (command.scrollDirection && command.scrollDirection !== lastScrollDirection) {
          const wrapper = document.querySelector('.bracket-wrapper');
          if (wrapper) {
            if (command.scrollDirection === 'up') {
              wrapper.scrollBy({ top: -600, behavior: 'smooth' });
            } else if (command.scrollDirection === 'down') {
              wrapper.scrollBy({ top: 600, behavior: 'smooth' });
            }
          }
          lastScrollDirection = command.scrollDirection;
        } else if (!command.scrollDirection) {
          lastScrollDirection = null;
        }
      });
  }, 500);
});

function fetchSheetData() {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${sheetName}&tq=${encodedQuery}`;

  fetch(url)
    .then(res => res.text())
    .then(rep => {
      const jsonData = JSON.parse(rep.substring(47).slice(0, -2));
      const rows = jsonData.table.rows;

      if (!rows || rows.length === 0) return;

      const getCellValue = (row, index) => {
        const cell = row.c[index];
        return cell?.v ?? '';
      };

      // Sorting: total desc -> place desc -> kills desc (your actual rule)
      const sortedRows = [...rows].sort((a, b) => {
        const totalA = a.c[3]?.v || 0;
        const totalB = b.c[3]?.v || 0;
        if (totalB !== totalA) return totalB - totalA;

        const placeA = a.c[1]?.v ?? 0;  
        const placeB = b.c[1]?.v ?? 0;
        if (placeA !== placeB) return placeB - placeA;  // higher place is better

        const killsA = a.c[2]?.v || 0;
        const killsB = b.c[2]?.v || 0;
        return killsB - killsA;
      });

      // Display Top 1 (winner box)
      const winner = sortedRows[0].c;
      document.getElementById('team_tag').textContent = winner[6]?.v ?? '';
      document.getElementById('elims').textContent = winner[2]?.v ?? '';
      document.getElementById('rank_pts').textContent = winner[1]?.v ?? '';
      document.getElementById('points_total').textContent = winner[3]?.v ?? '';
      document.getElementById('team_logo').src = winner[4]?.v || 'placeholder.png';
      document.getElementById('team_logo').alt = winner[6]?.v ?? 'Team Logo';
      if (winner[5]?.v) {
        document.querySelector('.image-frame').style.backgroundImage = `url('${winner[5].v}')`;
      }

      // Display rest of teams
      const wrapper = document.querySelector('.bracket-wrapper');
      wrapper.innerHTML = '';

      sortedRows.slice(1, 16).forEach((row, index) => {
        const teamName = getCellValue(row, 0);
        const place = getCellValue(row, 1);
        const kills = getCellValue(row, 2);
        const total = getCellValue(row, 3);
        const logoURL = getCellValue(row, 4);

        const bracket = document.createElement('div');
        bracket.className = 'bracket';
        bracket.innerHTML = `
          <p>${index + 2}</p>
          <div class="bracket-logo"><img src="${logoURL}" alt="${teamName} logo" /></div>
          <p>${teamName}</p>
          <p>${place}</p>
          <p>${kills}</p>
          <p>${total}</p>
        `;
        wrapper.appendChild(bracket);
      });
    })
    .catch(err => {
      console.error('Sheet fetch error:', err.message);
      createRankingElements(16);
    });
}

function createRankingElements(count = 16) {
  const wrapper = document.querySelector('.bracket-wrapper');
  wrapper.innerHTML = '';

  for (let i = 1; i <= count; i++) {
    const bracket = document.createElement('div');
    bracket.className = 'bracket';
    bracket.innerHTML = `
      <p>${i + 1}</p>
      <div class="bracket-logo"><img src="placeholder.png" alt="Team logo" /></div>
      <p class="team-name">Team Name</p>
      <p>0</p>
      <p>0</p>
      <p>0</p>
    `;
    wrapper.appendChild(bracket);
  }
}

const matchRankingBC = new BroadcastChannel('match_ranking_channel');
matchRankingBC.onmessage = (event) => {
  if (event.data && event.data.game) {
    sheetName = event.data.game; // Update to the selected game
    updateSlogan();              // Update the slogan text
    fetchSheetData();            // Immediately fetch and update
  }
};

// Call this function whenever sheetName changes
function updateSlogan() {
  const slogan = document.getElementById('slogan');
  if (slogan) slogan.textContent = sheetName;
}

document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.bracket-wrapper');
  const scrollUpBtn = document.getElementById('scrollUpButton');
  const scrollDownBtn = document.getElementById('scrollDownButton');
  if (wrapper && scrollUpBtn && scrollDownBtn) {
    scrollUpBtn.addEventListener('click', () => {
      wrapper.scrollBy({ top: -550, behavior: 'smooth' });
    });
    scrollDownBtn.addEventListener('click', () => {
      wrapper.scrollBy({ top: 550, behavior: 'smooth' });
    });
  }
});

const matchScrollBC = new BroadcastChannel('match_scroll_channel');
matchScrollBC.onmessage = (event) => {
  const wrapper = document.querySelector('.bracket-wrapper');
  if (!wrapper) return;
  if (event.data.direction === 'up') {
    wrapper.scrollBy({ top: -550, behavior: 'smooth' });
  } else if (event.data.direction === 'down') {
    wrapper.scrollBy({ top: 550, behavior: 'smooth' });
  }
};
