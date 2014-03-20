(function(exports) {

  var SAFE_DOMAINS = /^http(?:s?):\/\/\w+(?:.zendesk.dev|.localhost)(?::\d+)?$|^https:\/\/\w+.zendesk.com$/,
      ZAF_EVENT    = /^zaf\./;

  function Serializable(obj) {
    Object.keys(obj).forEach(function(key) {
      this[key] = obj[key];
    }.bind(this));
  }

  Serializable.prototype.toString = function() { return JSON.stringify(this); };

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

  exports.ZAFClient = exports.ZAFClient || {};

  exports.ZAFClient.init = function(callback) {
    var client;

    window.addEventListener("message", function(event) {
      if (!SAFE_DOMAINS.test(event.origin)) { return; }

      var data = event.data;

      if (!data) { return; }

      if (typeof data === 'string') {
        try {
          data = JSON.parse(event.data) || {};
        } catch (e) {
          return;
        }
      }

      if (data.key === 'zaf.handshake') {
        client = new Client(event.source, event.origin);
        callback(client);
      } else if (ZAF_EVENT.test(data.key)) {
        var key = data.key.replace(ZAF_EVENT, '');
        client && client.trigger(key, data.message);
      }
    });
  };

}(this));

window.ZAFClient.init(function(app) {
  app.postMessage('hello', { foo: true });

  app.on('app.activated', function(data) {
    console.log('handler 1', 'app.activated', data);
  });
});
