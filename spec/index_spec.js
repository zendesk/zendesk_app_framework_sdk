describe('ZAFClient', function() {
  var sandbox   = sinon.sandbox.create(),
      ZAFClient = require('index'),
      Utils     = require('utils'),
      params;

  function testInit(shouldInit) {
    shouldInit = 'undefined' === typeof shouldInit ?
      true :
      shouldInit;
    if (!!shouldInit) {
      expect(window.addEventListener).to.have.been.calledWith('message');
    } else {
      expect(window.addEventListener).to.not.have.been.calledWith('message');
    }
  }

  beforeEach(function() {
    sandbox.spy(window, 'addEventListener');
    sandbox.spy(window.top, 'postMessage');
    sandbox.stub(Utils, 'queryParameters');
  });

  afterEach(function() {
    params = {};
    sandbox.restore();
  });

  describe('.init', function() {

    describe('given origin and app_guid exist', function() {

      it('adds a listener for the postMessage API', function() {
        Utils.queryParameters.returns({
          origin:   'https://foo.com',
          app_guid: 'A2'
        });
        ZAFClient.init();
        testInit();
      });

    });

    describe('given origin and app_guid are missing', function() {

      it("won't add a listener for the postMessage API", function() {
        Utils.queryParameters.returns({});
        ZAFClient.init();
        testInit(false);
      });

    });

  });

});
