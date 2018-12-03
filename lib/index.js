import Client from './client'
import { queryParameters } from './utils'

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
 * const client = ZAFClient.init((context) => {
 *   const currentUser = context.currentUser;
 *   console.log('Hi ' + currentUser.name);
 * });
 * ```
 */

const ZAFClient = {
  init: function (callback, loc) {
    loc = loc || window.location
    const queryParams = queryParameters(loc.search)
    const hashParams = queryParameters(loc.hash)
    const origin = queryParams.origin || hashParams.origin
    const appGuid = queryParams.app_guid || hashParams.app_guid
    if (!origin || !appGuid) { return false }

    const client = new Client({ origin, appGuid })

    if (typeof callback === 'function') {
      client.on('app.registered', callback.bind(client))
    }

    return client
  }
}

export default ZAFClient
