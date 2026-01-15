const sheetID = "1srwCRcCf_grbInfDSURVzXXRqIqxQ6_IIPG-4_gnSY8"; // Replace with your actual sheet ID
const sheetName = "LIVE"; // Replace with your actual sheet tab name
const query = "select AE, AO, AF, AH, AI, AK, AJ"; // Adjust to match your column setup
const sheetURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`;

// Function to fetch data from Google Sheets and populate the table
async function fetchAndDisplayData() {
    try {
        const response = await fetch(sheetURL);
        const text = await response.text();
        console.log(text); // Log the raw response
        const json = JSON.parse(text.substring(47).slice(0, -2));
        console.log(json); // Log the parsed JSON

        // Access the rows from the sheet
        const rows = json.table.rows;

        // Get the left and right grouping containers
        const leftGrouping = document.getElementById('leftGrouping');
        const rightGrouping = document.getElementById('rightGrouping');

        // Only update DOM if data has changed
        let dataChanged = false;
        const newLeft = [];
        const newRight = [];
        rows.forEach((row, index) => {
          const teamPosition = row.c[0] ? row.c[0].v : 'N/A';
          const teamLogo = row.c[1] ? row.c[1].v : '';
          const teamName = row.c[2] ? row.c[2].v : 'Unknown';
          const teamPlacePoints = row.c[3] ? row.c[3].v : '0';
          const teamElims = row.c[4] ? row.c[4].v : '0';
          const teamTotal = row.c[5] ? row.c[5].v : '0';
          const teamChickeDinner = row.c[6] ? row.c[6].v : '0';
          const html = `
            <div class="teamPositionWrapper">
              <p class="teamPosition">${teamPosition}</p>
            </div>
            <div class="teamLogoWrapper">
              <img class="teamLogo" style="display: ${teamLogo ? 'block' : 'none'}" src="${teamLogo}" alt="${teamName} Logo" onerror="this.onerror=null; this.src='default-logo.png';">
              <p class="teamName">${teamName}</p>
            </div>
            <div class="teamPlacePointsWrapper">
              <p class="teamPlacePoints">${teamPlacePoints}</p>
            </div>
            <div class="teamElimsWrapper">
              <p class="teamElims">${teamElims}</p>
            </div>
            <div class="teamTotalWrapper">
              <p class="teamTotal">${teamTotal}</p>
              <div class="teamChickenDinnerWrapper">
                <svg version="1.2" xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 36 22" width="36" height="22">
                  <path fill-rule="evenodd" class="teamChickenDinnerIMG"
                  d="M32 21.5H3.5c-1.8 0-3.3-1.4-3.3-3.2 0-0.4.3-0.6.6-0.6s.6.2.6.6c0 1.1.9 2 2.1 2H32c1.2 0 2.1-.9 2.1-2 0-.4.3-.6.6-.6s.6.2.6.6c0 1.8-1.5 3.2-3.3 3.2zM3.7 16.3c0-7 6.1-12.5 13.6-12.5 2.4 0 4.6.6 6.5 1.5.9-.2 1.8-.4 1.9-.4.1 0 .2 0 .3.1 0 0 .1 0 .1 0 .1 0 .1-.1.2-.1.1 0 .1 0 .2.1 0 0 0 .1.1.1 0 0 .1 0 .1.1 0 .1 0 .1.1.1.1.1 0 .1.1.1.1 0 0 .1.1.1.1.1.1.1.2.1 0 0 .1.1.1.1 0 0 0 .1-.1.2-.7 1.6-1.8 3.1-2.9 4-.9.7-2 1.1-3.1 1.2h-.4c-4.1 0-5-3.3-5-3.3s-.1 4.2 5 4.2h.4c1.3-.1 2.6-.6 3.7-1.4 1-.8 2.1-2.2 2.9-3.7.7 1.5 1.1 3.2 1.1 5 0 1.9-1.3 3.3-1.3 3.3H5.3c-.9-1-1.4-2.1-1.4-3.3zM28.6 5.6c0 .1.1.4.4.7.2.2.3.4.5.4l3-2.4s.8.8 1.4.5c.3-.3.4-.7.1-1-.3-.4-1.4-.4-1.4-.4s.3-.9-.1-1.5c-.1-.2-.3-.2-.5-.2-.3 0-.5.1-.7.3-.6.5-.1 1.4-.1 1.4z"/>
                </svg>
                <p class="teamChickeDinner">x${teamChickeDinner}</p>
              </div>
            </div>
          `;
          if (index < 8) newLeft.push(html);
          else if (index >= 8 && index < 16) newRight.push(html);
        });
        // Compare with current DOM
        if (leftGrouping.childNodes.length !== newLeft.length || rightGrouping.childNodes.length !== newRight.length) {
          dataChanged = true;
        } else {
          for (let i = 0; i < newLeft.length; i++) {
            if (leftGrouping.childNodes[i]?.innerHTML !== newLeft[i]) dataChanged = true;
          }
          for (let i = 0; i < newRight.length; i++) {
            if (rightGrouping.childNodes[i]?.innerHTML !== newRight[i]) dataChanged = true;
          }
        }
        if (dataChanged) {
          leftGrouping.innerHTML = '';
          rightGrouping.innerHTML = '';
          newLeft.forEach(html => {
            const div = document.createElement('div');
            div.classList.add('teamBraket');
            div.innerHTML = html;
            leftGrouping.appendChild(div);
          });
          newRight.forEach(html => {
            const div = document.createElement('div');
            div.classList.add('teamBraket');
            div.innerHTML = html;
            rightGrouping.appendChild(div);
          });
          // After repopulating, restore visibility state
          if (lastAction === "scoreboard_hide") {
            hideScoreboard();
          } else {
            showScoreboard();
          }
        }
    } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
    }
}



// Call the function to fetch and display the data every 5 seconds
fetchAndDisplayData(); // Initial fetch
setInterval(fetchAndDisplayData, 5000); // Auto-fetch every 5 seconds

function showScoreboard() {
  const leftRows = Array.from(document.querySelectorAll('#leftGrouping .teamBraket'));
  const rightRows = Array.from(document.querySelectorAll('#rightGrouping .teamBraket'));

  leftRows.forEach((row, i) => {
    row.classList.remove('left-in', 'left-out');
    row.style.opacity = 0; // Ensure hidden before animating in
    setTimeout(() => {
      row.classList.remove('left-out');
      row.classList.add('left-in');
      // Do NOT set opacity here, let CSS handle it
      row.addEventListener('animationend', function handler() {
        row.classList.remove('left-in');
        row.style.opacity = 1; // Ensure visible after animation
        row.removeEventListener('animationend', handler);
      });
    }, i * 80);
  });

  rightRows.forEach((row, i) => {
    row.classList.remove('right-in', 'right-out');
    row.style.opacity = 0; // Ensure hidden before animating in
    setTimeout(() => {
      row.classList.remove('right-out');
      row.classList.add('right-in');
      // Do NOT set opacity here, let CSS handle it
      row.addEventListener('animationend', function handler() {
        row.classList.remove('right-in');
        row.style.opacity = 1; // Ensure visible after animation
        row.removeEventListener('animationend', handler);
      });
    }, i * 80);
  });
}

function hideScoreboard() {
  const leftRows = Array.from(document.querySelectorAll('#leftGrouping .teamBraket'));
  const rightRows = Array.from(document.querySelectorAll('#rightGrouping .teamBraket'));

  leftRows.forEach((row, i) => {
    row.classList.remove('left-in', 'left-out');
    setTimeout(() => {
      row.classList.remove('left-in');
      row.classList.add('left-out');
      row.addEventListener('animationend', function handler() {
        row.classList.remove('left-out');
        row.style.opacity = 0;
        row.removeEventListener('animationend', handler);
      });
    }, i * 80);
  });

  rightRows.forEach((row, i) => {
    row.classList.remove('right-in', 'right-out');
    setTimeout(() => {
      row.classList.remove('right-in');
      row.classList.add('right-out');
      row.addEventListener('animationend', function handler() {
        row.classList.remove('right-out');
        row.style.opacity = 0;
        row.removeEventListener('animationend', handler);
      });
    }, i * 80);
  });
}

// Listen for show/hide commands from your backend or controller
window.addEventListener('message', (event) => {
  if (event.data === 'scoreboard_show') showScoreboard();
  if (event.data === 'scoreboard_hide') hideScoreboard();
});

// Optionally, for local testing, you can expose the functions
window.showScoreboard = showScoreboard;
window.hideScoreboard = hideScoreboard;

let lastAction = null;

setInterval(() => {
  fetch('/api/control')
    .then(res => res.json())
    .then(command => {
      if (command.action !== lastAction) {
        if (command.action === "scoreboard_show") {
          showScoreboard();
        } else if (command.action === "scoreboard_hide") {
          hideScoreboard();
        }
        lastAction = command.action;
      }
    });
}, 1000);

