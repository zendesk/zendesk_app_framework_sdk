describe('ZAFClient', function() {
  var sandbox   = sinon.sandbox.create(),
      ZAFClient = require('index'),
      Client    = require('client'),
      Utils     = require('utils');

  beforeEach(function() {
    sandbox.stub(Utils, 'queryParameters');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('.init', function() {
    describe('given origin and app_guid exist', function() {
      beforeEach(function() {
        Utils.queryParameters.returns({
          origin:   'https://foo.zendesk.com',
          app_guid: 'A2'
        });
      });

      describe('when a callback is passed', function() {
        var callback = function() { return 'abcxyz'; };

        beforeEach(function() {
          sandbox.spy(Client.prototype, 'on');
          ZAFClient.init(callback);
        });

        it('binds the callback to app.registered', function() {
          var callbackMatcher = sinon.match(function (cb) {
            return cb() === callback();
          }, 'wrong callback');
          expect(Client.prototype.on).to.have.been.calledWith('app.registered', callbackMatcher);
        });
      });
    });

    describe('given origin and app_guid are missing', function() {
      it('returns false', function() {
        Utils.queryParameters.returns({});
        expect(ZAFClient.init()).to.be(false);
      });
    });
  });

});
