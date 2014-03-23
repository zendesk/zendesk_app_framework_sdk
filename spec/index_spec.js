describe('ZAFClient', function() {
  var sandbox = sinon.sandbox.create(),
      ZAFClient = require('index');

  beforeEach(function() {
    sandbox.spy(window, 'addEventListener');
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should test', function() {
    ZAFClient.init();
    expect(window.addEventListener).to.have.been.calledWith("message");
  });
});
