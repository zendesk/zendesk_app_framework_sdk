var Client       = require('client'),
    Utils        = require('utils'),
    ZAF_EVENT    = /^zaf\./,
    ZAFClient    = {};

var SAFE_DOMAINS = [
  /^https:\/\/\w+\.(?:zendesk(?:-staging|-acceptance)?|zd-(?:staging|master))\.com$/,
  /^http(?:s?:\/\/\w+\.(?:zendesk\.dev|localhost:\d+))$/
];

function testSafeDomain(domain) {
  return SAFE_DOMAINS.some(function(regex) {
    return regex.test(domain);
  });
}

/// ### ZAFClient API
///
/// #### ZAFClient.init([callback(context)])
///
/// Returns a [`client`](#client-object) object
///
/// ##### Arguments
///
///   * `callback(context)` (optional) a function that will get called as soon as communication with
///     the Zendesk app is estabilished. This callback will be passed a context object with
///     data related to the Zendesk app, including `currentAccount`, `currentUser` and `location`.
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
    if (!testSafeDomain(event.origin)) { return; }

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
