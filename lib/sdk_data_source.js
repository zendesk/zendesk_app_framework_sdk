var SDKDataSource = function(client) {
  this.client = client;
};

SDKDataSource.prototype = {
  constructor: SDKDataSource,
  get: function(pathSet) {
    return this.client.ui('get', [pathSet]);
  },
  set: function(jsongEnv) {
    return this.client.ui('set', [jsongEnv]);
  },
  call: function(callPath, args, pathSuffix, paths) {
    return this.client.ui('call', [callPath, args, pathSuffix, paths]);
  }
};

module.exports = SDKDataSource;
