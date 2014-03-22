var Serializable = require('serializable');

function Client(source, origin) {
  this._source = source;
  this._origin = origin;
  this._messageHandlers = {};
}

Client.prototype = {
  postMessage: function(key, data) {
    var msg = new Serializable({ key: key, message: data });
    this._source.postMessage(msg, this._origin);
  },
  on: function(key, handler) {
    if (typeof handler == 'function') {
      this._messageHandlers[key] = this._messageHandlers[key] || [];
      this._messageHandlers[key].push(handler);
    }
  },
  off: function(key, handler) {
    if (!this._messageHandlers[key]) { return false; }
    var index = this._messageHandlers[key].indexOf(handler);
    return this._messageHandlers.splice(index, 1);
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
