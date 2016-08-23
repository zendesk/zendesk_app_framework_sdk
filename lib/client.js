var PROMISE_TIMEOUT = 5000, // 5 seconds
    ZAF_EVENT       = /^zaf\./,
    version         = require('version'),
    Promise         = window.Promise || require('../vendor/native-promise-only'),
    when            = require('utils').when,
    pendingPromises = {},
    ids             = {};

function nextIdFor(name) {
  if (isNaN(ids[name])) {
    ids[name] = 0;
  }
  return ++ids[name];
}

// @internal
// #### rawPostMessage(client, msg, forceReady)
//
// Post a message to the hosting frame.
// If the client is not ready and forceReady is not specified, it will wait for client registration.
//
function rawPostMessage(client, msg, forceReady) {
  if (client.ready || forceReady) {
    client._source.postMessage(msg, client._origin);
  } else {
    client.on('app.registered', rawPostMessage.bind(null, client, msg));
  }
}

// @internal
// #### wrappedPostMessage(name, params)
//
// Wraps post message with a request/response mechanism using Promises.
// Must be invoked in the context of a Client.
//
// ##### Arguments
//
//   * `name` the name of the request to make (get/set/invoke)
//   * `data` parameters of the request (an array for get, and an object for set/invoke)
//
function wrappedPostMessage(name, params) {
  var id = nextIdFor('promise'),
      timeoutId;

  var promise = new Promise(function(resolve, reject) {
    // Time out the promise to ensure it will be garbage collected if nobody responds
    timeoutId = setTimeout(function() {
      reject(new Error('Invocation request timeout'));
    }, PROMISE_TIMEOUT);

    pendingPromises[id] = { resolve: resolve, reject: reject };

    var msg = JSON.stringify({
      id: id,
      request: name,
      params: params,
      appGuid: this._appGuid,
      instanceGuid: this._instanceGuid
    });
    rawPostMessage(this, msg);
  }.bind(this));

  // ensure promise is cleaned up when resolved
  return promise.then(removePromise.bind(null, id, timeoutId), removePromise.bind(null, id, timeoutId));
}

function createError(error) {
  if (error.path) { error.message = '"' + error.path + '" ' + error.message; }
  var err = new Error(error.message);
  err.name = error.name;
  err.stack = error.stack;
  return err;
}

function removePromise(id, timeoutId, args) {
  clearTimeout(timeoutId);
  delete pendingPromises[id];
  if (args instanceof Error) throw args;
  return args;
}

function isValidEvent(client, event) {
  return client && client._origin === event.origin && client._source === event.source;
}

function triggerEvent(client, eventName, data) {
  if (!client._messageHandlers[eventName]) { return false; }
  client._messageHandlers[eventName].forEach(function(handler) {
    handler(data);
  });
}

function messageHandler(client, event) {
  if (!isValidEvent(client, event)) { return; }

  var data = event.data;

  if (!data) { return; }

  if (typeof data === 'string') {
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      return e;
    }
  }

  var pendingPromise;
  if (data.id && (pendingPromise = pendingPromises[data.id])) {
    if (data.error) {
      var error = data.error.name ? createError(data.error) : data.error;
      pendingPromise.reject(error);
    } else {
      pendingPromise.resolve(data.result);
    }
  } else if (ZAF_EVENT.test(data.key)) {
    var key = data.key.replace(ZAF_EVENT, ''),
        msg = { appGuid: client._appGuid };
    if (data.needsReply) {
      if (client._repliesPending[key]) { return; }
      msg.key = 'iframe.reply:' + key;
      client._repliesPending[key] = true;
      when(client._messageHandlers[key]).then(
        rawPostMessage.bind(null, client, msg)
      ).catch(function(reason) {
        msg.error = {
          msg: reason
        };
        rawPostMessage(client, msg);
      }).then(function() {
        delete client._repliesPending[key];
      });
    } else {
      triggerEvent(client, key, data.message);
    }
  }
}

// When doing singular operations and we retrieve and error this function will throw that error.
function processResponse(path, result) {
  var isSingularOperation = typeof path === 'string';

  if(!isSingularOperation) {
    return result;
  }

  // CRUFT: When framework starts always appending errors we can remove the extra results.errors check
  var err = result.errors && result.errors[path];
  if (err) {
    throw createError(err);
  }

  return result;
}

var Client = function(options) {
  this._parent = options.parent;
  this._origin = options.origin || this._parent && this._parent._origin;
  this._source = options.source || this._parent && this._parent._source || window.parent;
  this._appGuid = options.appGuid || this._parent && this._parent._appGuid;
  this._instanceGuid = options.instanceGuid || this._appGuid;
  this._messageHandlers = {};
  this._repliesPending = {};
  this._instanceClients = {};
  this._metadata = null;
  this._context = options.context || null;
  this.ready = false;

  if (this._parent) {
    this.ready = this._parent.ready;
    return this; // shortcut handshake
  }

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
    var msg = JSON.stringify({ key: name, message: data, appGuid: this._appGuid, instanceGuid: this._instanceGuid });
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
      handler = context ?
        handler.bind(context) :
        handler;

      this._messageHandlers[name] = this._messageHandlers[name] || [];
      this._messageHandlers[name].push(handler);

      if (name !== 'app.registered') {
        // Subscriber count is needed as the framework will only bind events on the first attached handler
        this.postMessage('iframe.on:' + name, { subscriberCount: this._messageHandlers[name].length });
      }
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
    if (this.has(name, handler)) {
      this._messageHandlers[name].splice(index, 1);
    }

    // Subscriber count is needed as the framework will only unbind events on the last detached handler (count of 0)
    this.postMessage('iframe.off:' + name, { subscriberCount: this._messageHandlers[name].length });
    return handler;
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
    if (this._parent) { throw new Error('Not Implemented'); }
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
    this.postMessage('iframe.trigger:' + name, data);
    return triggerEvent(this, name, data);
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
    if (this._parent) { return this._parent.request(options); }
    var requestKey = 'request:' + nextIdFor('request');

    return new Promise(function(resolve, reject) {
      if (typeof options === 'string') {
        options = { url: options };
      }

      this.on(requestKey + '.done', function(evt) {
        resolve.apply(this, evt.responseArgs);
      });

      this.on(requestKey + '.fail', function(evt) {
        reject.apply(this, evt.responseArgs);
      });

      this.postMessage(requestKey, options);
    }.bind(this));
  },

  instance: function(instanceGuid) {
    if (this._parent) { return this._parent.instance(instanceGuid); }
    var instanceContextKey = 'instances.' + instanceGuid;
    this._instanceClients[instanceGuid] = this._instanceClients[instanceGuid] ||
      this.get(instanceContextKey).then(function(data) {
        return new Client({
          parent: this,
          instanceGuid: instanceGuid,
          context: data[instanceContextKey]
        });
      }.bind(this));
    return this._instanceClients[instanceGuid];
  },

  metadata: function() {
    if (this._parent) { return this._parent.metadata(); }
    return new Promise(function(resolve) {
      if (this._metadata) {
        resolve(this._metadata);
      } else {
        this.on('app.registered', function() {
          resolve(this._metadata);
        }.bind(this));
      }
    }.bind(this));
  },

  context: function() {
    if (this._instanceGuid && this._instanceGuid != this._appGuid) {
      var key = 'instances.' + this._instanceGuid;
      return this.get(key).then(function(data) {
        this._context = data[key];
        return this._context;
      }.bind(this));
    }

    return new Promise(function(resolve) {
      if (this._context) {
        resolve(this._context);
      } else {
        this.on('app.registered', function() {
          resolve(this._context);
        }.bind(this));
      }
    }.bind(this));
  },

  // Accepts string or array of strings.
  get: function(path) {
    var paths = Array.isArray(path) ? path : [path];

    if (arguments.length > 1 || paths.some(function(s) {return typeof s !== 'string'; })) {
      throw new Error('The get method accepts a string or array of strings.');
    }

    return wrappedPostMessage.call(this, 'get', paths).then(processResponse.bind(null, path));
  },

  set: function(key, val) {
    var obj = key;

    if (typeof key === 'string') {
      if (arguments.length === 1) {
        throw new Error('The setter requires a value');
      }
      obj = {};
      obj[key] = val;
    }

    if (typeof obj !== 'object' || Array.isArray(obj)) {
      throw new Error('The set method accepts a key and value pair, or an object of key and value pairs.');
    }

    return wrappedPostMessage.call(this, 'set', obj).then(processResponse.bind(null, key));
  },

  invoke: function(key) {
    var obj = key;

    if (typeof key === 'string') {
      obj = {};
      obj[key] = Array.prototype.slice.call(arguments, 1);
    } else {
      throw new Error('Invoke with an object isn\'t supported.');
    }

    return wrappedPostMessage.call(this, 'invoke', obj).then(processResponse.bind(null, key));
  }
};

module.exports = Client;
