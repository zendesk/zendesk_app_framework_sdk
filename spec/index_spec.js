describe('ZAFClient', function() {
  var sandbox   = sinon.sandbox.create(),
      ZAFClient = require('index'),
      Utils     = require('utils'),
      location;

  function testInit(shouldInit) {
    shouldInit = 'undefined' === typeof shouldInit ?
      true :
      false;
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
          'origin=foo':             true,   // valid
          'origin=foo.zendesk.com': true,   // valid
          'origin=':                false,  // invalid
          'origin':                 false,  // invalid

          'app_guid=ABC123':        true,   // valid
          'app_guid=12':            true,   // valid
          'app_guid=+':             false,  // invalid
          'app_guid=':              false,  // invalid
          'app_guid':               false   // invalid
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
