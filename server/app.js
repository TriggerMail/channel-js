'use strict';

const express = require('express');
const morgan = require('morgan');

const queue = [];

// put some data to queue
setInterval(() => {
  queue.push({timestamp: Date.now()});
}, 5000);

const app = express();
app.use(morgan('combined'));
// server static
app.use(express.static('example'));

// mock head request
app.head('/_ah/polling', (req, res) => {
  res.set('Content-Length', queue.length);
  res.send();
});

// mock get request
app.get('/_ah/polling', (req, res) => {
  if (queue.length) {
    res.json(queue.shift());
  } else {
    res.json(null);
  }
});

app.listen(8000, () => {
  console.log('Server is listening to port 8000');
});
