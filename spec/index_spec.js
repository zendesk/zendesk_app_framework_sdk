describe('ZAFClient', function() {
  var sandbox   = sinon.sandbox.create(),
      ZAFClient = require('index'),
      Client    = require('client'),
      Utils     = require('utils');

  function testInit(shouldInit) {
    shouldInit = 'undefined' === typeof shouldInit ?
      true :
      shouldInit;
    if (shouldInit) {
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
        var message, evt, trigger, client;

        beforeEach(function() {
          message = { awesome: true };

          evt = {
            data: {
              key: 'zaf.hello',
              message: message
            }
          };

          trigger = sandbox.stub(Client.prototype, 'trigger');
          client = ZAFClient.init();
        });

        describe('when the event is valid', function() {
          beforeEach(function() {
            evt.origin = client._origin;
            evt.source = client._source;
          });

          it("passes the message to the client", function() {
            window.addEventListener.callArgWith(1, evt);
            expect(trigger).to.have.been.calledWithExactly('hello', message);
          });

          describe('when the message is a stringified JSON', function() {
            it("passes the parsed message to the client", function() {
              evt.data = JSON.stringify(evt.data);
              window.addEventListener.callArgWith(1, evt);
              expect(trigger).to.have.been.calledWithExactly('hello', message);
            });
          });

          describe('when the message is not from zaf', function() {
            it("does not pass the message to the client", function() {
              evt.data.key = 'hello';
              window.addEventListener.callArgWith(1, evt);
              expect(trigger).to.not.have.been.called;
            });
          });
        });

        describe('when the event is not valid', function() {
          it("does not pass the message to the client", function() {
            evt.origin = 'https://foo.com';
            window.addEventListener.callArgWith(1, evt);
            expect(trigger).to.not.have.been.called;
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
