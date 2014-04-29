// Zendesk App Framework Iframe SDK
//
// Example usage:
//
// window.ZAFClient.init(function(app) {
//   app.postMessage('hello', { foo: true });
//
//   app.on('app.activated', function(data) {
//     console.log('handler 1', 'app.activated', data);
//   });
// });

var Client       = require('client'),
    Utils        = require('utils'),
    SAFE_DOMAINS = /^http(?:(?:s:\/\/\w+\.zendesk(?:-staging|-acceptance)?\.com)|(?:s?:\/\/\w+\.(?:zendesk\.dev|localhost:\d+)))$/,
    ZAF_GUID     = /([A-Za-z0-9\-]+)/,
    ZAF_EVENT    = /^zaf\./,
    ZAFClient    = {};

ZAFClient.init = function(callback) {
  var params = Utils.queryParameters(),
      client;

  if (!params.origin ||
      !params.app_guid ||
      !ZAF_GUID.test(params.app_guid)) {
    return false;
  }

  client = new Client(params.origin, params.app_guid);

  if (typeof callback === 'function') {
    client.on('app.registered', callback.bind(client));
  }

  window.addEventListener("message", function(event) {
    if (!SAFE_DOMAINS.test(event.origin)) { return; }

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
