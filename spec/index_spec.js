describe('ZAFClient', function() {
  var sandbox   = sinon.sandbox.create(),
      ZAFClient = require('index'),
      Client    = require('client'),
      Utils     = require('utils'),
      params;

  var SAFE_ORIGINS = [
    'https://foo.zendesk.com',
    'https://foo.zendesk-acceptance.com',
    'https://foo.zendesk-staging.com',
    'https://foo.zd-master.com',
    'http://dev.zendesk.dev',
    'https://dev.zendesk.dev',
    'http://dev.localhost:3000',
    'https://dev.localhost:3000',
  ];

  var UNSAFE_ORIGINS = [
    'http://foo.zendesk.com',
    'https://foo.desk.com',
    'https://localhost.com',
    'https://foo.zd-acceptance.com',
    'https://foo.zendesk-alternative.com',
  ];

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
    sandbox.stub(window, 'addEventListener');
    sandbox.stub(Utils, 'queryParameters');
  });

  afterEach(function() {
    params = {};
    sandbox.restore();
  });

  describe('.init', function() {
    describe('given origin and app_guid exist', function() {
      beforeEach(function() {
        Utils.queryParameters.returns({
          origin:   'https://foo.com',
          app_guid: 'A2'
        });
      });

      it('adds a listener for the postMessage API', function() {
        ZAFClient.init();
        testInit();
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

      describe('when a message is received', function() {
        var message, evt;

        beforeEach(function() {
          message = { awesome: true };

          evt = {
            origin: 'https://foo.zendesk.com',
            data: {
              key: 'zaf.hello',
              message: message
            }
          };

          sandbox.stub(Client.prototype, 'trigger');
          ZAFClient.init();
        });

        describe('when the origin is safe', function() {
          it("passes the message to the client", function() {
            SAFE_ORIGINS.forEach(function(origin) {
              evt.origin = origin;
              window.addEventListener.callArgWith(1, evt);
              expect(Client.prototype.trigger).to.have.been.calledWithExactly('hello', message);
            });
          });
        });

        describe('when the origin is not safe', function() {
          it("does not pass the message to the client", function() {
            UNSAFE_ORIGINS.forEach(function(origin) {
              evt.origin = origin;
              window.addEventListener.callArgWith(1, evt);
              expect(Client.prototype.trigger).to.not.have.been.called;
            });
          });
        });

        describe('when the message is a stringified JSON', function() {
          it("passes the parsed message to the client", function() {
            evt.data = JSON.stringify(evt.data);
            window.addEventListener.callArgWith(1, evt);
            expect(Client.prototype.trigger).to.have.been.calledWithExactly('hello', message);
          });
        });

        describe('when the message is not from zaf', function() {
          it("does not pass the message to the client", function() {
            evt.data.key = 'hello';
            window.addEventListener.callArgWith(1, evt);
            expect(Client.prototype.trigger).to.not.have.been.called;
          });
        });
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
