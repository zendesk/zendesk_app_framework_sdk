var PROMISE_TIMEOUT = 5000, // 5 seconds
    ZAF_EVENT       = /^zaf\./,
    version         = require('version'),
    Promise         = window.Promise || require('../vendor/ayepromise'),
    pendingPromises = {},
    promiseCount    = 0,
    requestCount    = 0;

function rawPostMessage(client, msg, forceReady) {
  if (client.ready || forceReady) {
    client._source.postMessage(msg, client._origin);
  } else {
    client.on('app.registered', rawPostMessage.bind(null, client, msg));
  }
}

function wrappedPostMessage(name) {
  var id = ++promiseCount;
  var deferred = Promise.defer();
  var params = Array.prototype.slice.call(arguments, 1);

  // ensure promise is cleaned up when resolved
  deferred.promise.then(removePromise.bind(null, id), removePromise.bind(null, id));

  // timeout the promise to ensure it will be garbage collected if nobody responds
  setTimeout(function() {
    deferred.reject(new Error('Invocation request timeout'));
  }, PROMISE_TIMEOUT);

  pendingPromises[id] = deferred;

  var msg = JSON.stringify({ id: id, request: name, params: params, appGuid: this._appGuid });
  rawPostMessage(this, msg);

  return deferred.promise;
}

function removePromise(id) {
  delete pendingPromises[id];
}

function isValidEvent(client, event) {
  return client._origin === event.origin && client._source === event.source;
}

function messageHandler(client, event) {
  if (!isValidEvent(client, event)) { return; }

  var data = event.data;

  if (!data) { return; }

  if (typeof data === 'string') {
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      return;
    }
  }

  var pendingPromise;
  if (data.id && (pendingPromise = pendingPromises[data.id])) {
    if (data.error) {
      var err = data.error;
      if (err.code) {
        err = new Error(data.error.msg);
        err.name = data.error.code;
        err.stack = data.error.stack;
      }
      pendingPromise.reject(err);
    } else {
      pendingPromise.resolve(data.result);
    }
  } else if (ZAF_EVENT.test(data.key)) {
    var key = data.key.replace(ZAF_EVENT, '');
    if (client) {
      client.trigger(key, data.message);
    }
  }
}

function cachedResponseToMessage(message, cacheName) {
  var deferred = Promise.defer();
  function resolveMetadata() {
    if (this[cacheName]) {
      deferred.resolve(this[cacheName]);
    } else {
      this.on(message, function() {
        deferred.resolve(this[cacheName]);
      }.bind(this));
    }
    return deferred.promise;
  }
  return resolveMetadata;
}

var Client = function(origin, appGuid) {
  this._origin = origin;
  this._source = window.top;
  this._appGuid = appGuid;
  this._messageHandlers = {};
  this._metadata = null;
  this._context = null;
  this.ready = false;

  this.on('app.registered', function(data) {
    this.ready = true;
    this._metadata = data.metadata;
    this._context = data.context;
  }, this);

  this.on('context.updated', function(context) {
    this._context = context;
  }, this);

  this.postMessage('iframe.handshake', { version: version });

  window.addEventListener('message', messageHandler.bind(null, this));
};

Client.prototype = {

  /// ### Client Object
  ///
  /// #### client.postMessage(name, [data])
  ///
  /// Allows you to send message events to the Zendesk app.
  ///
  /// ##### Arguments
  ///
  ///   * `name` the name of the message event. This determines the name of the iframe
  ///     event your app will receive. For example, if you set this to 'hello', your app will receive
  ///     the event 'iframe.hello'
  ///   * `data` (optional) a JSON object with any data that you want to pass along with the
  ///     event
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  /// client.postMessage('hello', { awesome: true });
  /// ```
  postMessage: function(name, data) {
    var msg = JSON.stringify({ key: name, message: data, appGuid: this._appGuid });
    rawPostMessage(this, msg, name === 'iframe.handshake');
  },

  /// #### client.on(name, handler, [context])
  ///
  /// Allows you to add handlers to a framework event. You can add as many handler as you wish.
  /// They will be executed in the order they were added.
  ///
  /// ##### Arguments
  ///
  ///   * `name` the name of the framework event you want to listen to. This can be
  ///     [framework](./events.html#framework-events), [request](./events.html#request-events), or
  ///     [custom](./events.html#custom-events) events. Your iframe can listen to any events your app
  ///     receives, apart from DOM events. You don't need to register these events in the app first
  ///   * `handler` a function to be called when this event fires. You can expect to receive the same
  ///     event object your app would receive, parsed as JSON
  ///   * `context` (optional) the value of `this` within your handler
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  /// client.on('app.registered', function(e) {
  ///   // go nuts
  /// });
  /// ```
  ///
  /// Note: As soon as communication with the Zendesk app is established, the SDK triggers an
  /// `app.registered` event. You can add as many handlers to `app.registered` as you like. They're
  /// called immediately after the `init` callback.
  on: function(name, handler, context) {
    if (typeof handler == 'function') {
      this._messageHandlers[name] = this._messageHandlers[name] || [];
      this._messageHandlers[name].push(context ? handler.bind(context) : handler);
    }
  },

  /// #### client.off(name, handler)
  ///
  /// Allows you to remove a handler for a framework event.
  ///
  /// ##### Arguments
  ///
  ///   * `name` the name of the event
  ///   * `handler` the function you attached earlier with `on`
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  ///
  /// client.on('app.registered', function appRegistered(e) {
  ///   // do stuff then remove the handler
  ///   client.off('app.registered', appRegistered);
  /// });
  /// ```
  off: function(name, handler) {
    if (!this._messageHandlers[name]) { return false; }
    var index = this._messageHandlers[name].indexOf(handler);
    return this._messageHandlers[name].splice(index, 1)[0];
  },

  /// #### client.has(name, handler)
  ///
  /// Returns whether or not an event has the specified handler attached to it.
  ///
  /// ##### Arguments
  ///
  ///   * `name` the name of the event
  ///   * `handler` the handler you want to test
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  ///
  /// client.on('app.registered', function appRegistered(e) {
  ///   // do stuff
  /// });
  ///
  /// client.has('app.registered', appRegistered); // true
  /// client.has('app.activated', appRegistered); // false
  /// ```
  has: function(name, handler) {
    if (!this._messageHandlers[name]) { return false; }
    return this._messageHandlers[name].indexOf(handler) !== -1;
  },

  /// #### client.trigger(name, [data])
  ///
  /// Triggers the specified event on the client.
  ///
  /// ##### Arguments
  ///
  ///   * `name` the name of the event you want to trigger
  ///   * `data` (optional) data you want to pass to the handler
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  ///
  /// client.on('activation', function {
  ///   console.log('activating!')
  /// });
  ///
  /// client.trigger('activation') // activating!
  /// ```
  trigger: function(name, data) {
    if (!this._messageHandlers[name]) { return false; }
    this._messageHandlers[name].forEach(function(handler) {
      handler(data);
    });
  },

  /// #### client.request(options)
  ///
  /// Dispatch [requests](./requests) via the Zendesk app.
  ///
  /// ##### Arguments
  ///
  ///   * `options` the url of the request or an options object containing a url key/value
  ///
  /// ##### Returns
  ///
  /// A [Promises/A+](https://promisesaplus.com) conformant `promise` object.
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  ///
  /// client.request('/api/v2/tickets.json').then(
  ///   function(tickets) {
  ///     console.log(tickets);
  ///   },
  ///   function(response) {
  ///     console.error(response.responseText);
  ///   }
  /// );
  /// ```
  request: function(options) {
    var requestKey = 'request:' + requestCount++,
        deferred = Promise.defer();

    if (typeof options === 'string') {
      options = { url: options };
    }

    this.on(requestKey + '.done', function(evt) {
      deferred.resolve.apply(this, evt.responseArgs);
    });

    this.on(requestKey + '.fail', function(evt) {
      deferred.reject.apply(this, evt.responseArgs);
    });

    this.postMessage(requestKey, options);

    return deferred.promise;
  },

  /// #### client.metadata()
  ///
  /// Request metadata for the app, such as the app ID and installation ID.
  ///
  /// ##### Returns
  ///
  /// A [Promises/A+](https://promisesaplus.com) conformant `promise` object.
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  ///
  /// client.metadata().then(function(metadata) {
  ///   console.log(metadata); // { appId: 1234, installationId: 1234 }
  /// });
  /// ```
  metadata: cachedResponseToMessage.call(this, 'app.registered', '_metadata'),

  /// #### client.context()
  ///
  /// Request context for the app, such as the host and location.
  /// Depending on the location, the context will provide additional identifiers
  /// which can be used with the REST API to request additional data.
  ///
  /// ##### Returns
  ///
  /// A [Promises/A+](https://promisesaplus.com) conformant `promise` object.
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  ///
  /// client.metadata().then(function(metadata) {
  ///   console.log(metadata); // { host: 'zendesk', hostAccountId: 'mysubdomain', location: 'ticket_sidebar', ticketId: 1234 }
  /// });
  /// ```
  context: cachedResponseToMessage.call(this, 'app.registered', '_context'),

  /// #### client.get(paths)
  ///
  /// Get data from the UI asynchronously.
  ///
  /// ##### Arguments
  ///
  ///   * `paths` an array of path strings or a single path string
  ///
  /// ##### Returns
  ///
  /// A [Promises/A+](https://promisesaplus.com) conformant `promise` object.
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  ///
  /// client.get(['ticket.subject', 'ticket.assignee.name']).then(function(data) {
  ///   console.log(data); // { 'ticket.subject': 'Help, my printer is on fire', 'ticket.assignee.name': 'Mr Smith' }
  /// });
  /// ```
  get: function(path) {
    var paths = Array.isArray(path) ? path : [path];
    return wrappedPostMessage.call(this, 'get', paths);
  },

  /// #### client.set(key, val)
  /// #### client.set(obj)
  ///
  /// Set data in the UI asynchronously.
  ///
  /// ##### Arguments
  ///
  ///   * `key` the path to which to set the value `val`
  ///   * `obj` a json object containing the keys and values to update
  ///
  /// ##### Returns
  ///
  /// A [Promises/A+](https://promisesaplus.com) conformant `promise` object returning the updated data.
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  ///
  /// client.set('ticket.subject', 'Printer Overheating Incident').then(function(ticket) {
  ///   console.log(ticket);
  /// });
  ///
  /// // or
  ///
  /// client.set({'ticket.subject': 'Printer Overheating Incident', 'ticket.type': 'incident' }).then(function(ticket) {
  ///   console.log(ticket);
  /// });
  /// ```
  set: function(key, val) {
    var obj = key;
    if (typeof key === 'string') {
      obj = {};
      obj[key] = val;
    }
    return wrappedPostMessage.call(this, 'set', obj);
  },

  /// #### client.invoke(name, [data])
  ///
  /// Remotely invoke an API from the host framework.
  ///
  /// ##### Returns
  ///
  /// A [Promises/A+](https://promisesaplus.com) conformant `promise` object.
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  ///
  /// client.invoke('ticket.comment.appendText', 'Help!').then(function(data) {
  ///   console.log('text has been appended');
  /// });
  /// ```
  invoke: function() {
    return wrappedPostMessage.bind(this, 'invoke').apply(null, arguments);
  }
};

module.exports = Client;
