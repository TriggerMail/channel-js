'use strict';

const express = require('express');
const morgan = require('morgan');

const queue = [];
let disconnected = false;

// put some data to queue
setInterval(() => {
  queue.push({timestamp: Date.now()});
}, 5000);
// set disconnected timeput
setTimeout(() => {
  disconnected = true;
}, 30000);

const app = express();
app.use(morgan('combined'));
// server static
app.use(express.static('example'));

// mock head request
app.head('/_ah/polling', (req, res) => {
  res.set('Content-Length', queue.length);
  let status = 200;
  let message = 'OK';

  if (!queue.length) {
    status = 205;
    message = 'No Content';
  }

  if (disconnected) {
    status = 410;
    message = 'Gone';
  }

  res.status(status).send(message);
});

// mock get request
app.get('/_ah/polling', (req, res) => {
  if (disconnected) {
    return res.status(410).send('Gone');
  }

  if (queue.length) {
    res.status(200).json(queue.shift());
  } else {
    res.status(205).send('No Content');
  }
});

app.listen(8000, () => {
  console.log('Server is listening to port 8000');
});
