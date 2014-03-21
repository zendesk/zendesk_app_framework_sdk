(function(exports) {
  var SAFE_DOMAINS = /^http(?:(?:s:\/\/\w+\.zendesk\.com)|(?:s?:\/\/\w+\.(?:zendesk\.dev|localhost:\d+)))$/,
      ZAF_EVENT    = /^zaf\./;

  function Serializable(obj) {
    Object.keys(obj).forEach(function(key) {
      this[key] = obj[key];
    }.bind(this));
  }

  Serializable.prototype.toString = function() { return JSON.stringify(this); };

  function Client(origin, app_guid) {
    this._origin = origin;
    this._source = window.top;
    this._messageHandlers = {};

    var msg = new Serializable({ key: 'iframe.handshake', app_guid: app_guid });
    window.top.postMessage(msg, origin);
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

  exports.ZAFClient.init = function() {
    var queryStr    = window.location.search,
        originMatch = queryStr.match(/origin=(.+)&/),
        guidMatch   = queryStr.match(/app_guid=(\d+)/);

    if (!originMatch || originMatch.length !== 2 || !guidMatch || guidMatch.length !== 2) {
      return false;
    }

    var origin = decodeURIComponent(originMatch[1]),
        app_guid = parseInt(guidMatch[1], 10),
        client = new Client(origin, app_guid);

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

      if (ZAF_EVENT.test(data.key)) {
        var key = data.key.replace(ZAF_EVENT, '');
        client && client.trigger(key, data.message);
      }
    });

    return client;
  };

}(this));

var app = window.ZAFClient.init();

app.on('app.registered', function() {
  app.postMessage('hello', { foo: true });
});

app.on('app.activated', function(data) {
  console.log('app.activated', data);
});

app.on('app.deactivated', function(data) {
  console.log('app.deactivated', data);
});
