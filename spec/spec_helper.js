window.expect = chai.expect;

if (self.title === 'node') {
  var sinonChai = require("sinon-chai");
  chai.use(sinonChai);
}
