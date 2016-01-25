describe('Bridge', function() {
  var sandbox   = sinon.sandbox.create(),
      Bridge    = require('bridge'),
      Client    = require('client');

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
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#new', function() {
    var subject;

    it('adds a listener for the postMessage API', function() {
      subject = new Bridge('https://foo.zendesk.com');
      testInit();
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
        client = new Client('https://foo.zendesk.com', 'A2');
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

});
