var Client    = require('client'),
    Utils     = require('utils'),
    ZAF_EVENT = /^zaf\./,
    ZAFClient = {};

function isValidEvent(client, event) {
  return client._origin === event.origin && client._source === event.source;
}

/// ### ZAFClient API
///
/// When you include the ZAF SDK on your website, you get access to the `ZAFClient` object.
///
/// #### ZAFClient.init([callback(context)])
///
/// Returns a [`client`](#client-object) object.
///
/// ##### Arguments
///
///   * `callback(context)` (optional) a function called as soon as communication with
///     the Zendesk app is established. The callback receives a context object with
///     data related to the Zendesk app, including `currentAccount`, `currentUser`, and `location`
///
/// Example:
///
/// ```javascript
/// var client = ZAFClient.init(function(context) {
///   var currentUser = context.currentUser;
///   console.log('Hi ' + currentUser.name);
/// });
/// ```
ZAFClient.init = function(callback) {
  var params = Utils.queryParameters(),
      client;

  if (!params.origin || !params.app_guid) { return false; }

  client = new Client(params.origin, params.app_guid);

  if (typeof callback === 'function') {
    client.on('app.registered', callback.bind(client));
  }

  window.addEventListener("message", function(event) {
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

    if (ZAF_EVENT.test(data.key)) {
      var key = data.key.replace(ZAF_EVENT, '');
      client && client.trigger(key, data.message);
    }
  });

  return client;
};

module.exports = ZAFClient;
