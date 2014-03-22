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
    SAFE_DOMAINS = /^http(?:(?:s:\/\/\w+\.zendesk\.com)|(?:s?:\/\/\w+\.(?:zendesk\.dev|localhost:\d+)))$/,
    ZAF_EVENT    = /^zaf\./,
    ZAFClient    = {};

var ZAFClient = {};

ZAFClient.init = function(callback) {
  var client;

  window.addEventListener("message", function(event) {
    if (!SAFE_DOMAINS.test(event.origin)) { return; }

    var data = event.data;

    if (!data) { return; }

    if (typeof data === 'string') {
      try {
        data = JSON.parse(event.data) || {};
      } catch (e) {
        return;
      }
    }

    if (data.key === 'zaf.handshake') {
      client = new Client(event.source, event.origin);
      callback(client);
    } else if (ZAF_EVENT.test(data.key)) {
      var key = data.key.replace(ZAF_EVENT, '');
      client && client.trigger(key, data.message);
    }
  });
};

module.exports = ZAFClient;

