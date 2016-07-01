var Client    = require('client'),
    Utils     = require('utils'),
    ZAFClient = {};

/// ### ZAFClient API
///
/// When you include the ZAF SDK on your website, you get access to the `ZAFClient` object.
///
/// #### ZAFClient.init([source], [callback(context)])
///
/// Returns a [`client`](#client-object) object.
///
/// ##### Arguments
///   The arguments can be either nothing, a source, a callback, or a source and callback.
///
///   * `callback(context)` (optional) a function called as soon as communication with
///     the Zendesk app is established. The callback receives a context object with
///     data related to the Zendesk app, including `currentAccount`, `currentUser`, and `location`
///   * `source` (optional) a window object with ZendeskApps, to control what window we are
///     connecting to.
///
/// Examples:
///
/// ```javascript
/// var client = ZAFClient.init();
///
/// client = ZAFClient.init(function(context) {
///   var currentUser = context.currentUser;
///   console.log('Hi ' + currentUser.name);
/// });
///
/// client = ZAFClient.init(window.parent);
///
/// client = ZAFClient.init(window.parent, function(context) {});
/// ```
ZAFClient.init = function(sourceOrCallback, callback) {
  var params = Utils.queryParameters(),
      client,
      source = typeof sourceOrCallback === 'object' ? sourceOrCallback : undefined;

  // if callback is present but not a function the user likely switched the arguments
  if (!params.origin || !params.app_guid || typeof callback === 'object') { return false; }

  callback = callback || sourceOrCallback;

  client = new Client(params.origin, params.app_guid, source);

  if (typeof callback === 'function') {
    client.on('app.registered', callback.bind(client));
  }

  return client;
};

module.exports = ZAFClient;
