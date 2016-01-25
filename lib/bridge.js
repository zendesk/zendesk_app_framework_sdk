var version = require('version'),
    Promise = require('../vendor/ayepromise'),
    ZAF_EVENT = /^zaf\./;

function isValidEvent(bridge, event) {
  return bridge.origin === event.origin && bridge.source === event.source;
}

/// ### ZAF Bridge
///
/// @internal
/// This object will mediate the connection between the client and the ZAF host
///
/// #### Message Format
///
/// Requests from the SDK Client to the Host Framework consist of the following keys:
/// * `id`      - opaque identifier for the request/message
/// * `key`     - event type/action name/etc.
/// * `message` - event/action arguments
/// * `appGuid` - app's globally unique identifier
///
/// Responses from the Host Framework to the SDK Client should contain:
/// * `id`      - relayed opaque identifer for the original request (optional, not included for events)
/// * `key`     - event type/action name/etc.
/// * `result`  - event/action result/arguments
/// * `error`   - error result/arguments (if included in the hash the request promise will be rejected)
///
var Bridge = function(origin, source, appGuid) {
  this.newMessageId = 0;
  this.requestPromises = {};
  this.origin = origin;
  this.source = source;
  this.appGuid = appGuid;
  this._onMessageEvent = this._onMessageEvent.bind(this);
  window.addEventListener("message", this._onMessageEvent);
  this.sendRequest('iframe.handshake', { version: version });
};

Bridge.prototype = {
  _onMessageEvent: function(event) {
    if (!isValidEvent(this, event)) { return; }

    var data = event.data;

    if (!data) { return; }

    console.debug('SDK <<', data);

    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return;
      }
    }

    var deferred;
    if (data.id && (deferred = this.requestPromises[data.id])) {
      if ('error' in data) {
        deferred.reject.apply(deferred, Array.isArray(data.error) ? data.error : [data.error]);
      } else {
        deferred.resolve.apply(deferred, Array.isArray(data.result) ? data.result : [data.result]);
      }
    }

    if (ZAF_EVENT.test(data.key)) {
      var key = data.key.replace(ZAF_EVENT, '');
      // client && client.trigger(key, data.message);
    }
  },

  sendRequest: function(name, data, callback) {
    var id = ++this.newMessageId;
    var msg = JSON.stringify({ id: id, key: name, message: data, appGuid: this.appGuid });
    var deferred = Promise.defer();
    console.debug('SDK >>', msg);
    this.source.postMessage(msg, this.origin);
    this.requestPromises[id] = deferred;
    if ('function' == typeof callback) {
      deferred.then(callback);
    }
    return deferred.promise;
  },

  on: function() {

  },

  off: function() {

  },

  destroy: function() {
    window.removeEventListener("message", this._onMessageEvent);
  }
};

module.exports = Bridge;
