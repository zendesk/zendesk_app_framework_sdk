var PROMISE_TIMEOUT = 5000, // 5 seconds
    ZAF_EVENT       = /^zaf\./,
    version         = require('version'),
    Promise         = require('../vendor/ayepromise'),
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
      pendingPromise.reject(data.error);
    } else {
      pendingPromise.resolve(data.result);
    }
  } else if (ZAF_EVENT.test(data.key)) {
    var key = data.key.replace(ZAF_EVENT, '');
    client && client.trigger(key, data.message);
  }
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
  metadata: function() {
    var deferred = Promise.defer();
    if (this._metadata) {
      deferred.resolve(this._metadata);
    } else {
      this.on('app.registered', function(metadata, context) {
        deferred.resolve(metadata);
      });
    }
    return deferred.promise;
  },

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
  context: function() {
    var deferred = Promise.defer();
    if (this._context) {
      deferred.resolve(this._context);
    } else {
      this.on('app.registered', function(metadata, context) {
        deferred.resolve(context);
      });
    }
    return deferred.promise;
  },

  /// #### client.ui(name, [data])
  ///
  /// Make a UI request.
  ///
  /// ##### Returns
  ///
  /// A [Promises/A+](https://promisesaplus.com) conformant `promise` object.
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  ///
  /// client.ui('ticket.fields.value', { id: 'custom_field_1234' }).then(function(data) {
  ///   console.log(data); // { value: 'Printer on Fire' }
  /// });
  /// ```
  ui: function(name, data) {
    var id = ++promiseCount;
    var deferred = Promise.defer();

    // ensure promise is cleaned up when resolved
    deferred.promise.then(removePromise.bind(null, id), removePromise.bind(null, id));

    // timeout the promise to ensure it will be garbage collected if nobody responds
    setTimeout(function() {
      deferred.reject(new Error('UI Request Timeout'));
    }, PROMISE_TIMEOUT);

    pendingPromises[id] = deferred;

    var msg = JSON.stringify({ request: name, message: data, appGuid: this._appGuid, id: id });
    rawPostMessage(this, msg);

    return deferred.promise;
  }
};

module.exports = Client;
