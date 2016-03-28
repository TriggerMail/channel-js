import Channel from '../';

const channel = new Channel();
const messageDiv = document.getElementById('message');

channel.onMessage((message) => {
  messageDiv.innerHTML = JSON.stringify(message);
});

channel.onError((err) => {
  console.error(err);
})

channel.onDisconnect((err) => {
  console.warn('Channel is disconnected');
  if (err) {
    console.error(err);
  }
});
