window.expect = chai.expect;

if (typeof process !== 'undefined' && process.title === 'node') {
  var sinonChai = require("sinon-chai");
  chai.use(sinonChai);
}
