'use strict';

import request from 'superagent';

// Statuses
const OK = 200;
const NO_CONTENT = 205;
const GONE = 410;
const FORBIDDEN = 403;

let _baseConfig = {
  basePath: '/_ah/polling',
  interval: 1000,
  requestTimeout: 5000,
  retries: 5,
  timeout: 30000
};

export default class Channel {
  constructor(accessToken, config={}) {
    this.accessToken = accessToken;
    this.basePath = config.basePath || _baseConfig.basePath;
    this.interval = config.interval || _baseConfig.interval;
    this.requestTimeout = config.requestTimeout || _baseConfig.requestTimeout;
    this.retries = config.retries || _baseConfig.retries;
    this.timeout = config.timeout || _baseConfig.timeout;

    // message queue
    this.queue = [];

    // event handlers
    this._handlers = {
      onMessage: [],
      onError: [],
      onDisconnect: []
    };

    // init polling interval function
    this.pollingInterval = setInterval(() => {this._poll()}, this.interval);
  }

  // set global config for module
  static config(config) {
    Object.assign(_baseConfig, config);
  }

  onMessage(handler) {
    this._handlers.onMessage.push(handler);

    if (this.queue.length) {
      this.queue.forEach((message) => {
        handler(message);
      });
      // flush queue
      this.queue = [];
    }
  }

  onError(handler) {
    this._handlers.onError.push(handler);
  }

  onDisconnect(handler) {
    this._handlers.onDisconnect.push(handler);
  }

  // close channel
  close() {
    this._onDisconnected();
  }

  _onError(err, res) {
    if (res.status == GONE) {
      return this._onDisconnected();
    }

    if (res.status == FORBIDDEN) {
      return this._onDisconnected(err);
    }

    this._handlers.onError.forEach((handler) => {
      handler(err);
    });

    if (!this.retries) {
      this.retries = 1;
    } else if (retries) {

    }

    if (!this.errorTimestamp) {
      // save timestamp of the first error
      this.errorTimestamp = Date.now();
    } else {
      // if first occured error is older than timeout, that means we
      // lost connection
      if ((Date.now() - this.errorTimestamp) > this.timeout) {
        this._onDisconnected(err);
      }
    }
  }

  _onDisconnected(err) {
    this.disconnected = true;
    delete this.errorTimestamp;
    this.pollingInterval = clearInterval(this.pollingInterval);

    if (err) {
      this._handlers.onDisconnect.forEach((handler) => {
        handler(err);
      });
    }
  }

  _poll() {
    if (!this.disconnected && !this.pendingRequest) {
      this.pendingRequest = request
        .head(`${this.basePath}?token=${this.accessToken}`)
        .timeout(this.requestTimeout)
        .end((err, res) => {
          delete this.pendingRequest;

          if (err) {
            this._onError(err, res);
          } else {
            delete this.errorTimestamp;
            // status 200 means that channel has messages
            if (res.status == OK) {
              this._getMessage();
            }
          }
        });
    }
  }

  _getMessage() {
    request
      .get(`${(this.basePath)}?token=${this.accessToken}`)
      .timeout(this.requestTimeout)
      .end((err, res) => {
        if (err) {
          this._onError(err, res);
        } else {
          delete this.errorTimestamp;

          if (res.status == OK) {
            this._handlers.onMessage.forEach((handler) => {
              handler(res.body, res);
            });
          }
        }
      });
  }
}
