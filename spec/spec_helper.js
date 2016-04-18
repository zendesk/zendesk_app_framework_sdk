window.expect = chai.expect;

if (self.title === 'node') {
  var sinonChai = require("sinon-chai");
  var chaiAsPromised = require("chai-as-promised");
  chai.use(sinonChai);
  chai.use(chaiAsPromised);
}
