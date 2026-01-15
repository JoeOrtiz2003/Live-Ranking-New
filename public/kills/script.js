const MAX_ELIMINATED_TEAMS = 18;
const AUTO_FETCH_INTERVAL = 60000;
let animationIn = false;
let moving = false;
let lengthMoved = 0;
let teamData = [];
const sheetId = '1srwCRcCf_grbInfDSURVzXXRqIqxQ6_IIPG-4_gnSY8';
let sheetName = 'Game 1'; // default

const query = 'SELECT W,Z,X';

// Helper functions
function e(id) {
    return document.getElementById(id);
}

function getCellValue(row, index) {
    const cell = row[index];
    return cell != null ? cell : "";
}

// Fetch data from Google Sheets
function getData() {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`;
    return fetch(baseUrl)
        .then(res => res.text())
        .then(text => {
            try {
                const json = JSON.parse(text.substr(47).slice(0, -2));
                const rows = json.table.rows.map(row => row.c.map(cell => (cell ? cell.v : "")));
                return [{ values: rows }];
            } catch (err) {
                console.error("Error parsing sheet data:", err);
                return [{ values: [] }];
            }
        });
}

async function getKillsGame() {
    try {
        const res = await fetch('/api/control');
        const data = await res.json();
        if (data.killsGame) {
            sheetName = data.killsGame;
        }
    } catch (e) {
        console.error('Failed to fetch Kills game:', e);
    }
}

// Main update logic
async function runTemplateUpdate() {
    await getKillsGame(); // Always update sheetName before fetching data
    if (!moving) {
        if (teamData.length > 0) {
            removeGraphs().then(() => updateData().then(() => { addGraphs(); moving = false; }));
        } else {
            updateData().then(() => { runAnimationIN(); moving = false; });
        }
    }
}

// Intro animation using GSAP
function runAnimationIN() {
    if (teamData.length > 0 && !animationIn) {
        gsap.timeline({
            onComplete: () => {
                addGraphs();
                animationIn = true;
            }
        })
        .fromTo("#main", { opacity: 0 }, {
            delay: 0.1,
            duration: 1.7,
            opacity: 1,
            ease: "Power3.easeIn"
        })
        .to("#animation-layer", {
            height: 1080,
            duration: 4,
            ease: "Power3.easeIn"
        }, "-=0.5");
    }
}

// Add bar graphs
function addGraphs() {
    if (teamData.length === 0) return;

    const showLogo = true;
    const graphWrapper = document.querySelector("#graph-wrapper>div");
    if (!graphWrapper) {
        console.error("Graph wrapper inner div not found!");
        return;
    }

    graphWrapper.innerHTML = ""; // Clear old content

    const graphHeight = graphWrapper.offsetHeight || 500;
    const imageHeight = showLogo ? 80 : 0;
    const textHeight = 40;
    const divHeight = graphHeight - imageHeight - textHeight;

    const validKills = teamData.map(t => t.kills).filter(k => typeof k === 'number' && !isNaN(k));
    const highestKills = Math.max(...validKills, 1);

    // Build all team HTML first
    let html = "";
    teamData.forEach(({ tag, kills, logo }, index) => {
        html += `
            <div class="teamWrapper">
                <p id="tag_${index}" style="margin-bottom: -${textHeight}px">${tag}</p>
                ${showLogo ? `<img class="tagIMG" id="img_${index}" style="margin-bottom: -${imageHeight}px" src="${logo}" onerror="this.src='https://placehold.co/80x80/000000/FFF?text=${tag.toUpperCase()}'">` : ""}
                <div class="displayWrapper">
                    <div id="killDisplay_${index}" class="killsDisplay"><p>${kills}</p></div>
                </div>
            </div>
        `;
    });
    graphWrapper.innerHTML = html; // Set once

    // Now animate each team
    teamData.forEach(({ tag, kills, logo }, index) => {
        const tl = gsap.timeline({
            delay: index * 0.12 // stagger for smooth cascading effect
        });

        tl.to(`#tag_${index}`, { marginBottom: 0, duration: 1.1, ease: "power2.out" });

        if (showLogo) {
            tl.to(`#img_${index}`, { marginBottom: 0, duration: 0.7, ease: "power2.out" }, "-=0.7");
        }

        tl.to(`#killDisplay_${index}`, {
            height: `${divHeight * (kills / highestKills)}px`,
            duration: 1.1,
            ease: "power3.out"
        }, "-=0.5");

        tl.to(`#killDisplay_${index}>p`, {
            height: "auto",
            duration: 0.4,
            ease: "power2.out"
        }, "-=0.8");
    });

    lengthMoved = 0;
}

// Fade out and remove graphs
function removeGraphs() {
    return new Promise(resolve => {
        const graphWrapper = document.querySelector("#graph-wrapper>div");
        gsap.to(graphWrapper, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                graphWrapper.innerHTML = "";
                graphWrapper.style.opacity = 1;
                resolve();
            }
        });
    });
}

// Update and process data
function updateData() {
    return getData().then(data => {
        const values = data[0].values;

        console.log("Raw values from sheet:", values);

        teamData = values.map(row => {
            const teamName = getCellValue(row, 0);
            const kills = parseFloat(getCellValue(row, 1)) || 0;  // Directly parse kills as number
            const logoURL = getCellValue(row, 2);
            return {
                tag: teamName?.toLowerCase?.().trim() || "",
                kills,
                logo: logoURL || `team_logos/${teamName?.toLowerCase?.().trim()}.png`
            };
        });

        // Sort by kills from highest to lowest
        teamData = teamData
            .sort((a, b) => b.kills - a.kills)  // Sort by kills in descending order
            .slice(0, MAX_ELIMINATED_TEAMS);    // Limit to top 8 teams

        console.log("Processed teamData (Sorted):", teamData);
    });
}

// Ensure description wrapper exists
function ensureDescriptionWrapper() {
  let wrapper = document.querySelector('.description-wrapper');
  if (!wrapper) {
    const parent = document.getElementById('animation-layer').firstElementChild;
    wrapper = document.createElement('div');
    wrapper.className = 'description-wrapper';
    wrapper.innerHTML = `
      <p id="damageInfo1">Elims</p>
      <div id="damageInfo2"></div>
    `;
    parent.insertBefore(wrapper, parent.firstChild);
  }
  return wrapper;
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
    runTemplateUpdate(); // Initial update
    setInterval(() => {
        runTemplateUpdate(); // Auto update data at set intervals
    }, AUTO_FETCH_INTERVAL);
});

const killsBC = new BroadcastChannel('kills_channel');
killsBC.onmessage = (event) => {
  if (event.data && event.data.game) {
    // Optionally stop any running animation here if needed
    moving = false; // If you use a moving flag for animation, stop it
    runTemplateUpdate(); // Immediately update kills display
  }
};

ensureDescriptionWrapper();
document.getElementById('damageInfo2').textContent = '';

fetch('/api/kills?game=' + selectedGame)
  .then(res => res.json())
  .then(data => {
    ensureDescriptionWrapper();
    document.getElementById('damageInfo2').textContent = data.description || 'No data';
  })
  .catch(() => {
    ensureDescriptionWrapper();
    document.getElementById('damageInfo2').textContent = 'Error loading kills data';
  });
