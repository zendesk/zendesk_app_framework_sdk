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
      var client;

      beforeEach(function() {
        Utils.queryParameters.returns({
          origin: document.location,
          app_guid: 'A2'
        });
      });

      describe('when a callback is passed', function() {
        var callback = function() { return 'abcxyz'; };
        callback.bind = function() { return callback; };

        beforeEach(function() {
          sandbox.spy(Client.prototype, 'on');
          client = ZAFClient.init(callback);
        });

        it('binds the callback to app.registered', function() {
          var callbackMatcher = sinon.match(function (cb) {
            // performs an identity check, meaning that bind must be stubbed to return the same method
            return cb === callback;
          }, 'wrong callback');
          expect(Client.prototype.on).to.have.been.calledWith('app.registered', callbackMatcher);
          expect(client._source).to.equal(window.parent);
        });
      });

      describe('when a source is passed', function() {
        var fakeWindow = { postMessage: function() {} };

        beforeEach(function() {
          client = ZAFClient.init( fakeWindow );
        });

        it('stores the correct source to the client', function() {
          expect(client._source).to.equal(fakeWindow);
        });
      });

      describe('when a source and callback are passed', function() {
        var callback = function() { return 'abcxyz'; },
            fakeWindow = { postMessage: function() {} };

        callback.bind = function() { return callback; };

        beforeEach(function() {
          sandbox.spy(Client.prototype, 'on');
          client = ZAFClient.init(fakeWindow, callback);
        });

        it('stores the correct source to the client and binds the callback to app.registered', function() {
          var callbackMatcher = sinon.match(function (cb) {
            // performs an identity check, meaning that bind must be stubbed to return the same method
            return cb === callback;
          }, 'wrong callback');
          expect(Client.prototype.on).to.have.been.calledWith('app.registered', callbackMatcher);
          expect(client._source).to.equal(fakeWindow);
        });
      });

      describe('when a callback and source are passed', function() {
        var callback = function() { return 'abcxyz'; },
            fakeWindow = { postMessage: function() {} };

        beforeEach(function() {
          client = ZAFClient.init(callback, fakeWindow);
        });

        it('errors', function() {
          expect(client).to.equal(false);
        });
      });
    });

    describe('given origin and app_guid are missing', function() {
      it("won't create a Client instance", function() {
        Utils.queryParameters.returns({});
        expect(ZAFClient.init()).to.equal(false);
      });
    });
  });

});
