import Channel from '../';

const channel = new Channel();
const messageDiv = document.getElementById('message');

channel.onMessage((message) => {
  messageDiv.innerHTML = JSON.stringify(message);
});
