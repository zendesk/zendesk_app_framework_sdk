window.expect = chai.expect;

window.top = {
  postMessage: function() {}
};

if (typeof process !== 'undefined' && process.title === 'node') {
  var sinonChai = require("sinon-chai");
  chai.use(sinonChai);
}
