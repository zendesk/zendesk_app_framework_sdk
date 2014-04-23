describe('ZAFClient', function() {
  var sandbox   = sinon.sandbox.create(),
      ZAFClient = require('index'),
      Utils     = require('utils'),
      location;

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
    window.top = {
      postMessage: sandbox.spy()
    };
    location = {
      search: 'origin=foo.zendesk.com&app_guid=AOK2'
    };
    sandbox
      .stub(Utils, 'location')
      .returns(location);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('.init', function() {

    describe('given origin and app_guid exist', function() {

      it('adds a listener for the postMessage API', function() {
        ZAFClient.init();

      });

      it('validates the correct format of "origin" and "app_guid"', function() {
        var urlParams = {
          'app_guid=A2':            false,  // invalid
          'app_guid=A2&origin=foo': true,  // invalid
          'origin=foo&app_guid=A2': true    // valid
        };
        Object.keys(urlParams).forEach(function(params) {
          location.search = params;
          ZAFClient.init();
          testInit(!!urlParams[params]);
        });
      });

    });

    describe('given origin and app_guid are missing', function() {

      it("won't add a listener for the postMessage API", function() {
        location.search = 'foo=bar&baz=quux';
        ZAFClient.init();
        testInit(false);
      });

    });

  });

});
