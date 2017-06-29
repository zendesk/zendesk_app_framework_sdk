import Client from './client';
import {
  queryParameters
} from './utils';

const ZAFClient = {};

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
  var queryParams = queryParameters(),
      hashParams = queryParameters(( document.location.hash || '' ).slice(1)),
      origin = queryParams.origin || hashParams.origin,
      appGuid = queryParams.app_guid || hashParams.app_guid,
      client;

  if (!origin || !appGuid) { return false; }

  client = new Client({
    origin,
    appGuid
  });

  if (typeof callback === 'function') {
    client.on('app.registered', callback.bind(client));
  }

  return client;
};

export default ZAFClient;
