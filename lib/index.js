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
    SAFE_DOMAINS = /^http(?:(?:s:\/\/\w+\.zendesk(-staging|-acceptance)?\.com)|(?:s?:\/\/\w+\.(?:zendesk\.dev|localhost:\d+)))$/,
    ZAF_EVENT    = /^zaf\./,
    ZAFClient    = {};

function getParams() {
  var queryStr     = window.location.search,
      originMatch  = queryStr.match(/origin=(.+)&/),
      guidMatch    = queryStr.match(/app_guid=([A-Za-z0-9\-]+)/),
      parsedParams = {};

  if (originMatch && originMatch.length === 2) {
    parsedParams.origin = decodeURIComponent(originMatch[1]);
  }

  if (guidMatch && guidMatch.length === 2) {
    parsedParams.appGuid = guidMatch[1];
  }

  return parsedParams;
}

ZAFClient.init = function(callback) {
  var params = getParams(),
      client;

  if (!params.origin || !params.appGuid) { return false; }

  client = new Client(params.origin, params.appGuid);

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
