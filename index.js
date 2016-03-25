'use strict';

import request from 'superagent';


let _baseConfig = {
  basePath: '/_ah/polling',
  interval: 1000,
  requestTimeout: 10000,
  timeout: 30000
};

export default class Channel {
  constructor(accessToken, config={}) {
    this.accessToken = accessToken;
    this.basePath = config.basePath || _baseConfig.basePath;
    this.interval = config.interval || _baseConfig.interval;
    this.requestTimeout = config.requestTimeout || _baseConfig.requestTimeout;
    this.timeout = config.timeout || _baseConfig.timeout;

    // message queue
    this.queue = [];

    // event handlers
    this._onMessage = [];
    this._onError = [];
    this._onDisconnect = [];

    // init polling interval function
    this.pollingInterval = setInterval(() => {this._poll()}, this.interval);
  }

  // set global config for module
  static config(config) {
    Object.assign(_baseConfig, config);
  }

  onMessage(handler) {
    this._onMessage.push(handler);

    if (this.queue.length) {
      this.queue.forEach((message) => {
        handler(message);
      });
      // flush queue
      this.queue = [];
    }
  }

  onError(handler) {
    this._onError.push(handler);
  }

  onDisconnect(handler) {
    this._onDisconnect.push(handler);
  }

  _onError(err) {
    if (this._onError.length) {
      this._onError.forEach((handler) => {
        handler(err);
      })
    }

    if (!this.errorTimestamp) {
      // save timestamp of the first error
      this.errorTimestamp = Date.now();
    } else {
      // if first occured error is older than timeout, that means we
      // lost connection
      if ((Date.now() - this.errorTimestamp) > this.timeout) {
        this.disconnected = true;
        this.pollingInterval = clearInterval(this.pollingInterval);

        if (this._onDisconnect.length) {
          this._onDisconnect.forEach((handler) => {
            handler(err);
          });
        }
      }
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
            this._onError(err);
          } else {
            delete this.errorTimestamp;
            let contentLength = res.headers['Content-Length'] ||
              res.headers['content-length'];
            // Content-Length > 0 means that we have data on the server
            if (contentLength && Number(contentLength) > 0) {
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
          this._onError(err);
          console.warning('Can not get message from the server.');
          // try again
          this._getMessage();
        } else {
          delete this.errorTimestamp;
          this._onMessage.forEach((handler) => {
            handler(res.body, res);
          });
        }
      });
  }
}
