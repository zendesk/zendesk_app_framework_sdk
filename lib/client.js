var Serializable = require('serializable');

var Client = function(origin, appGuid) {
  this._origin = origin;
  this._source = window.top;
  this._appGuid = appGuid;
  this._messageHandlers = {};
  this.ready = false;

  this.on('app.registered', function() {
    this.ready = true;
  }, this);

  this.postMessage('iframe.handshake');
};

Client.prototype = {
  postMessage: function(key, data) {
    if (this.ready || key === 'iframe.handshake') {
      var msg = new Serializable({ key: key, message: data, appGuid: this._appGuid });
      this._source.postMessage(msg, this._origin);
    } else {
      this.on('app.registered', this.postMessage.bind(this, key, data));
    }
  },
  on: function(key, handler, context) {
    if (typeof handler == 'function') {
      this._messageHandlers[key] = this._messageHandlers[key] || [];
      this._messageHandlers[key].push(context ? handler.bind(context) : handler);
    }
  },
  off: function(key, handler) {
    if (!this._messageHandlers[key]) { return false; }
    var index = this._messageHandlers[key].indexOf(handler);
    return this._messageHandlers[key].splice(index, 1)[0];
  },
  has: function(key, handler) {
    if (!this._messageHandlers[key]) { return false; }
    return this._messageHandlers[key].indexOf(handler) !== -1;
  },
  trigger: function(key, data) {
    if (!this._messageHandlers[key]) { return false; }
    this._messageHandlers[key].forEach(function(handler) {
      handler(data);
    });
  }
};

module.exports = Client;
