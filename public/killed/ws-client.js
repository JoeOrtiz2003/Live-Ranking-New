// Simple WebSocket client for killed.html
const ws = new WebSocket(`ws://${window.location.host}/ws`);

ws.onopen = () => {
  console.log('WebSocket connection established');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'killed_refresh') {
    // Call your refresh logic here
    fetchTeamDataAndAnimate();
    console.log('Received killed_refresh event via WebSocket');
  }
};

ws.onerror = (err) => {
  console.error('WebSocket error:', err);
};

ws.onclose = () => {
  console.warn('WebSocket connection closed');
};
