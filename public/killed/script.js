const sheetID = "1srwCRcCf_grbInfDSURVzXXRqIqxQ6_IIPG-4_gnSY8";
const sheetName = "INPUT";
const showLogo = true;
const fetchInterval = 1000; // in ms
let MAX_ELIMINATED_TEAMS = 16;

const lastAliveStatus = new Map();
const shownEliminatedTags = new Set();
let isAnimating = false;
let isVisible = true; // Default to visible

function getQuery() {
  return encodeURIComponent(`SELECT I, E, F, G, J LIMIT 24 OFFSET 0`);
}

function getUrl() {
  const query = getQuery();
  return `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?sheet=${sheetName}&tq=${query}`;
}

function showEliminatedBanner(teamData, wrapper, onComplete) {
  wrapper.innerHTML = `
    <div id="innerWrapper">
      <div id="headerWrapper">
        <p id="header">Team eliminated</p>
      </div>
      <div id="textWrapper">
        <div id="textInnerWrapper">
          <div id="logoTextWrapper">
            ${
              showLogo
                ? `<img id="teamLogo" src="${teamData.logo || `team_logos/${teamData.tag}.png`}" onerror="this.src='https://placehold.co/50x50/000000/FFF?text=${encodeURIComponent(teamData.tag.toUpperCase())}'" alt=""/>`
                : ""
            }
            <p id="teamName">${teamData.name}</p>
          </div>
          <div id="killsWrapper">
            <p id="teamKills">${teamData.kills} Kills</p>
          </div>
        </div>
      </div>
    </div>
  `;

  const tl = gsap.timeline({
    defaults: { ease: "Power3.easeIn" },
    onComplete: () => {
      setTimeout(() => {
        gsap.timeline({
          defaults: { ease: "Power3.easeOut" },
          onComplete
        })
        .to("#killsWrapper", { height: 0, duration: 0.8 })
        .to("#textWrapper", { width: 0, height: 0, duration: 0.8 })
        .to("#headerWrapper", { width: 0, duration: 0.8 }, "<")
        .to("#innerWrapper", { height: 0, duration: 0.4 });
      }, 3000);
    }
  });

  tl.to("#innerWrapper", { height: "auto", duration: 0.4 })
    .to("#headerWrapper", { width: "auto", duration: 0.8 })
    .to("#textWrapper", { width: "auto", height: "auto", duration: 0.8 }, "<+=0.2")
    .to("#killsWrapper", { height: "58", duration: 0.8 });
}

function fetchTeamDataAndAnimate() {
  if (!isVisible || isAnimating || shownEliminatedTags.size >= MAX_ELIMINATED_TEAMS) return;

  const url = getUrl();
  fetch(url)
    .then(res => res.text())
    .then(rep => {
      const json = JSON.parse(rep.substr(47).slice(0, -2));
      const rows = json.table.rows;

      const eliminatedTeams = rows
        .map(row => {
          const cells = row.c || [];

          return {
            name: cells[0]?.v || "Unknown",  // D
            tag: cells[1]?.v || "XXX",       // E
            alive: cells[2]?.v ?? 1,         // F
            kills: cells[3]?.v || 0,         // G
            logo: cells[4]?.v || null        // J
          };
        })
        .filter(team => {
          const wasAlive = lastAliveStatus.has(team.tag)
            ? lastAliveStatus.get(team.tag) !== 0
            : true;

          lastAliveStatus.set(team.tag, team.alive);

          const isEliminated = (
            team.alive === 0 &&
            wasAlive &&
            !shownEliminatedTags.has(team.tag) &&
            shownEliminatedTags.size < MAX_ELIMINATED_TEAMS
          );

          return isEliminated;
        });

      if (eliminatedTeams.length === 0) return;

      isAnimating = true;
      const wrapper = document.getElementById("wrapper");

      function animateNext(index) {
        if (index >= eliminatedTeams.length || shownEliminatedTags.size >= MAX_ELIMINATED_TEAMS) {
          isAnimating = false;
          return;
        }

        const team = eliminatedTeams[index];
        shownEliminatedTags.add(team.tag);

        showEliminatedBanner(team, wrapper, () => {
          animateNext(index + 1);
        });
      }

      animateNext(0);
    })
    .catch(err => {
      console.error("Error fetching Google Sheets data:", err);
    });
}

function refreshKilledAnimation() {
  const wrapper = document.getElementById('wrapper');
  wrapper.innerHTML = ''; // Clear the current content
  shownEliminatedTags.clear();
  lastAliveStatus.clear();
  fetchTeamDataAndAnimate(); // Re-fetch and re-animate
}

// Listen for control messages from the server
function pollControlState() {
  fetch('/api/control')
    .then(res => res.json())
    .then(data => {
      if (data.killedAction === 'refresh') {
        refreshKilledAnimation();
      }
      if (data.maxEliminatedTeams !== undefined) {
        MAX_ELIMINATED_TEAMS = data.maxEliminatedTeams;
      }
    })
    .catch(err => console.error('Error polling control state:', err));
}

document.addEventListener("DOMContentLoaded", () => {
  fetchTeamDataAndAnimate();
  setInterval(fetchTeamDataAndAnimate, fetchInterval);
  setInterval(pollControlState, 500);
});
