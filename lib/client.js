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

  /// ### Client Object
  ///
  /// #### client.postMessage(message, [data])
  ///
  /// Allows you to send message events to the Zendesk app.
  ///
  /// ##### Arguments
  ///
  ///   * `message` the name of the message event. This will determine the name of the iframe
  ///     event your app will receive. i.e. if you set this to 'hello', you app will receive
  ///     the event 'iframe.hello'.
  ///   * `data` (optional) a JSON object with any data that you want to pass along with the
  ///     event.
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  /// client.postMessage('hello', { awesome: true });
  /// ```
  postMessage: function(key, data) {
    if (this.ready || key === 'iframe.handshake') {
      var msg = JSON.stringify({ key: key, message: data, appGuid: this._appGuid });
      this._source.postMessage(msg, this._origin);
    } else {
      this.on('app.registered', this.postMessage.bind(this, key, data));
    }
  },

  /// #### client.on(eventName, handler, [context])
  ///
  /// Allows you to add handlers to a framework event. You can add as many handler as you wish.
  /// They will be executed in the order they were added.
  ///
  /// ##### Arguments
  ///
  ///   * `eventName` the name of the framework event you want to listen to. This can be framework,
  ///     request, custom or hook events. Your can listen to any events your app receives, apart from
  ///     DOM events. You don't need to register these events on app first.
  ///   * `handler` a function to be called when this event fires. You can expect to receive the same
  ///     event object your app would receive, parsed as JSON.
  ///   * `context` (optional) the value of `this` within your handler.
  ///
  /// ```javascript
  /// var client = ZAFClient.init();
  /// client.on('app.activated', function(e) {
  ///   // go nuts
  /// });
  /// ```
  ///
  /// Note: As soon as communication with the Zendesk app is estabilished the SDK will trigger an
  /// `app.registered` event. You can add as many handlers to `app.registered` as you like. They
  /// will be called immediately after the `init` callback.
  on: function(key, handler, context) {
    if (typeof handler == 'function') {
      this._messageHandlers[key] = this._messageHandlers[key] || [];
      this._messageHandlers[key].push(context ? handler.bind(context) : handler);
    }
  },

  /// #### client.off(eventName, handler)
  ///
  /// Allows you to remove a handler for a framework event.
  ///
  /// ##### Arguments
  ///
  ///   * `eventName` the name of the event.
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
  off: function(key, handler) {
    if (!this._messageHandlers[key]) { return false; }
    var index = this._messageHandlers[key].indexOf(handler);
    return this._messageHandlers[key].splice(index, 1)[0];
  },

  /// #### client.has(eventName, handler)
  ///
  /// Returns whether or not an event has the specified handler attached to it.
  ///
  /// ##### Arguments
  ///
  ///   * `eventName` the name of the event.
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
  has: function(key, handler) {
    if (!this._messageHandlers[key]) { return false; }
    return this._messageHandlers[key].indexOf(handler) !== -1;
  },

  /// #### client.trigger(eventName, [data])
  ///
  /// Triggers the specified event on the client.
  ///
  /// ##### Arguments
  ///
  ///   * `eventName` the name of the event you want to trigger
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
  trigger: function(key, data) {
    if (!this._messageHandlers[key]) { return false; }
    this._messageHandlers[key].forEach(function(handler) {
      handler(data);
    });
  }
};

module.exports = Client;
