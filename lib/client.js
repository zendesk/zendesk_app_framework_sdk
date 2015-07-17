var Promise      = require('../vendor/ayepromise'),
    requestCount = 0;

import version from 'version';

var Client = function(origin, appGuid) {
  this._origin = origin;
  this._source = window.top;
  this._appGuid = appGuid;
  this._messageHandlers = {};
  this.ready = false;

  this.on('app.registered', function() {
    this.ready = true;
  }, this);

  this.postMessage('iframe.handshake', { version: version });
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
    if (this.ready || name === 'iframe.handshake') {
      var msg = JSON.stringify({ key: name, message: data, appGuid: this._appGuid });
      this._source.postMessage(msg, this._origin);
    } else {
      this.on('app.registered', this.postMessage.bind(this, name, data));
    }
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
  /// client.on('app.activated', function(e) {
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
  /// client.on('app.activated', function appActivated(e) {
  ///   // do stuff then remove the handler
  ///   client.off('app.activated', appActivated);
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
  /// client.on('app.activated', function appActivated(e) {
  ///   // do stuff
  /// });
  ///
  /// client.has('app.activated', appActivated);   // true
  /// client.has('app.deactivated', appActivated); // false
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
  /// app.request('/api/v2/tickets.json').then(
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
  }
};

export default Client;
