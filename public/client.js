const socket = new WebSocket('ws://localhost:3001'); // Replace with your WebSocket server URL

socket.onopen = (event) => {
  console.log('WebSocket connection established');
};

socket.onmessage = (event) => {
  const response = JSON.parse(event.data);
  const responseDiv = document.getElementById('response');

  if (response.success) {
    if (response.data.type === 'walletAddress') {
      responseDiv.textContent = `Your wallet address is ${response.data.address}`;
    } else if (response.data.type === 'messageSent') {
      responseDiv.textContent = `Message sent: "${response.data.content}"`;
    }
  } else {
    responseDiv.textContent = `Error: ${response.error ? response.error.error : 'Unknown error'}`;
  }
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
};

document.getElementById('startConversationButton').addEventListener('click', () => {
  fetch('/start-conversation', { method: 'POST' })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      if (data.success) {
        document.getElementById('sendMessageButton').disabled = false;
      } else {
        console.error('Error starting conversation:', data.error ? data.error : 'Unknown error');
      }
    })
    .catch((error) => {
      console.error('Error starting conversation:', error);
    });
});

document.getElementById('sendMessageButton').addEventListener('click', () => {
  socket.send('gm');
});
