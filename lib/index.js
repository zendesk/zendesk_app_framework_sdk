var Client = require('./client')
var Utils = require('./utils')
var ZAFClient = {}

/**
 * ### ZAFClient API
 *
 * When you include the ZAF SDK on your website, you get access to the `ZAFClient` object.
 *
 * #### ZAFClient.init([callback(context)])
 *
 * Returns a [`client`](#client-object) object.
 *
 * ##### Arguments
 *
 *   * `callback(context)` (optional) a function called as soon as communication with
 *     the Zendesk app is established. The callback receives a context object with
 *     data related to the Zendesk app, including `currentAccount`, `currentUser`, and `location`
 *
 * Example:
 *
 * ```javascript
 * var client = ZAFClient.init(function(context) {
 *   var currentUser = context.currentUser;
 *   console.log('Hi ' + currentUser.name);
 * });
 * ```
 */
ZAFClient.init = function (callback, loc) {
  loc = loc || window.location
  var queryParams = Utils.queryParameters(loc.search)
  var hashParams = Utils.queryParameters(loc.hash)
  var origin = queryParams.origin || hashParams.origin
  var appGuid = queryParams.app_guid || hashParams.app_guid
  var client

  if (!origin || !appGuid) { return false }

  client = new Client({ origin: origin, appGuid: appGuid })

  if (typeof callback === 'function') {
    client.on('app.registered', callback.bind(client))
  }

  return client
}

window.ZAFClient = ZAFClient
module.exports = ZAFClient
