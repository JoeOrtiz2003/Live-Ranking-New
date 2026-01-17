document.addEventListener("DOMContentLoaded", () => {
  const sheetId = '1srwCRcCf_grbInfDSURVzXXRqIqxQ6_IIPG-4_gnSY8';
  let sheetName = 'Game 1'; // default

  async function getWWCDGame() {
    try {
      const res = await fetch('/api/control');
      const data = await res.json();
      if (data.action === 'wwcd' && data.game) {
        sheetName = data.game;
      }
    } catch (e) {
      console.error('Failed to fetch WWCD game:', e);
    }
  }

  async function fetchAndRender() {
    await getWWCDGame(); // Always update sheetName before fetching data

    const query = encodeURIComponent('SELECT T, W, X, Z, Y, AA, AH'); // AQ = new bg image url column
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tq=${query}&sheet=${sheetName}`;

    fetch(url)
      .then(response => response.text())
      .then(dataText => {
        // Extract JSON from response with error handling
        const match = dataText.match(/google\.visualization\.Query\.setResponse\((.*)\);/s);
        if (!match || !match[1]) {
          console.error("Google Sheets response format error", dataText);
          const wrapper = document.querySelector("#mockupWrapper");
          if (wrapper) wrapper.innerHTML = "<p>Error: Unexpected data format.</p>";
          return;
        }
        let data;
        try {
          data = JSON.parse(match[1]);
        } catch (e) {
          console.error("Failed to parse Google Sheets JSON:", e, match[1]);
          const wrapper = document.querySelector("#mockupWrapper");
          if (wrapper) wrapper.innerHTML = "<p>Error: Invalid data received.</p>";
          return;
        }

        const rows = data.table && data.table.rows ? data.table.rows : [];

        const wrapper = document.querySelector("#mockupWrapper");
        if (!wrapper) {
          console.error("#mockupWrapper element not found in DOM.");
          return;
        }

        if (rows.length === 0) {
          wrapper.innerHTML = "<p>No data available</p>";
          return;
        }

        const firstRow = rows[0].c;

        const overallRank = firstRow[0] ? firstRow[0].v : "N/A";
        const teamName = firstRow[1] ? firstRow[1].v : "N/A";
        const teamLogoUrl = firstRow[2] ? firstRow[2].v : "";  
        const lastGameElims = firstRow[3] ? firstRow[3].v : "N/A";
        const lastGamePoints = firstRow[4] ? firstRow[4].v : "N/A";
        const lastRound = firstRow[5] ? firstRow[5].v : "N/A";
        const bgImageUrl = firstRow[6] ? firstRow[6].v : ""; // background image URL

        const totalTeams = 16; // Assuming a fixed total number of teams
        const showLogo = Boolean(teamLogoUrl);

        // Render main content inside #mockupWrapper
        wrapper.innerHTML = `
          <div class="bgImage"></div>
          <div class="marquees">
            <div>
              <p>Winner Winner Chicken Dinner -&nbsp</p>
              <p aria-hidden="true">Winner Winner Chicken Dinner -&nbsp</p>
              <p aria-hidden="true">Winner Winner Chicken Dinner -&nbsp</p>
            </div>
            <div aria-hidden="true">
              <p>Winner Winner Chicken Dinner -&nbsp</p>
              <p>Winner Winner Chicken Dinner -&nbsp</p>
              <p>Winner Winner Chicken Dinner -&nbsp</p>
            </div>
          </div>
          <div class="winnerWrapper">
            <div class="logoWrapper${showLogo ? " frame" : ""}">
              <p class="teamName${showLogo ? "" : " bigger"}">${teamName}</p>
              ${showLogo ? `<img class="teamLogo" src="${teamLogoUrl}" onerror="this.src='https://placehold.co/200x200/000000/FFF?text=NO+LOGO'" />` : ""}
            </div>
            <div class="textWrapper">
              <p class="smallerText">Overall Ranking</p>
              <p class="biggerText">#${overallRank}/${totalTeams}</p>
            </div>
            <div class="divider"></div>
            <div class="textWrapper">
              <p class="smallerText">Elims</p>
              <p id="elims" class="biggerText">${lastGameElims}</p>
            </div>
            <div class="divider"></div>
            <div class="textWrapper">
              <p class="smallerText">Points</p>
              <p id="points" class="biggerText">${lastGamePoints}</p>
            </div>
            <div class="divider"></div>
            <div class="textWrapper">
              <p class="smallerText">Total</p>
              <p id="match" class="biggerText">${lastRound}</p>
            </div>
          </div>
        `;

        // Set the background image dynamically on .bgImage element
        const bgImageEl = document.querySelector(".bgImage");
        if (bgImageEl) {
          if (bgImageUrl) {
            bgImageEl.style.backgroundImage = `url("${bgImageUrl}")`;
          } else {
            bgImageEl.style.backgroundImage = "none"; // or fallback image url here
          }
        }
      })
      .catch(error => {
        console.error("Error fetching or parsing Google Sheets data:", error);
        const wrapper = document.querySelector("#mockupWrapper");
        if (wrapper) wrapper.innerHTML = "<p>Error loading data.</p>";
      });
  }

  // Initial fetch
  fetchAndRender();

  // Set interval to fetch every 10 seconds (10000 ms)
  setInterval(fetchAndRender, 10000);

  const bc = new BroadcastChannel('wwcd_channel');
  bc.onmessage = (event) => {
    if (event.data && event.data.game) {
      // Immediately fetch and render new data
      fetchAndRender();
    }
  };
});
