describe('Client', function() {

  var Client  = require('client'),
      sandbox = sinon.sandbox.create(),
      origin  = 'https://foo.zendesk.com',
      appGuid = 'ABC123',
      version = require('version'),
      postMessage,
      subject,
      callback;

  beforeEach(function() {
    sandbox.stub(window.top, 'postMessage');
    subject = new Client(origin, appGuid);
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('can be instantiated', function() {
    expect(subject).to.exist;
  });

  it('posts an "iframe.handshake" message when initialised', function() {
    var data = {
      key: "iframe.handshake",
      message: { version: version },
      appGuid: appGuid
    };

    expect(window.top.postMessage).to.have.been.calledWithMatch(JSON.stringify(data));
  });

  describe('events', function() {

    beforeEach(function() {
      callback = sandbox.spy();
    });

    describe('#postMessage', function() {

      it('waits until the client is ready to post messages', function() {
        subject.postMessage('foo');
        expect(window.top.postMessage).to.not.have.been.calledWithMatch('{"key":"foo","appGuid":"ABC123"}');
        subject.trigger('app.registered');
        expect(window.top.postMessage).to.have.been.calledWithMatch('{"key":"foo","appGuid":"ABC123"}');
      });

    });

    describe('#on', function() {

      it('registers a handler for a given event', function() {
        subject.on('foo', callback);
        expect(subject._messageHandlers.foo).to.exist;
      });

      it('registers multiple handlers for the same event', function() {
        subject.on('foo', callback);
        subject.on('foo', callback);
        expect(subject._messageHandlers.foo.length).to.equal(2);
      });

      it('only registers when handler is a function', function() {
        subject.on('foo', 2);
        expect(subject._messageHandlers.foo).to.not.exist;
      });

    });

    describe('#off', function() {

      it('removes a previously registered handler', function() {
        subject.on('foo', callback);
        expect(subject._messageHandlers.foo.length).to.equal(1);
        subject.off('foo', callback);
        expect(subject._messageHandlers.foo.length).to.equal(0);
      });

      it('returns the handler that was removed', function() {
        subject.on('foo', callback);
        expect(subject.off('foo', callback)).to.equal(callback);
      });

      it('returns false if no handler was found', function() {
        expect(subject.off('foo', callback)).to.be.false;
      });

    });

    describe('#has', function() {

      it('returns true if the given handler is registered for the given event', function() {
        subject.on('foo', callback);
        expect(subject.has('foo', callback)).to.be.true;
      });

      it('returns false if the given handler is not registered for the given event', function() {
        expect(subject.has('foo', callback)).to.be.false;
      });

      it("returns false if the given event isn't registered", function() {
        expect(subject.has('bar')).to.be.false;
      });

    });

    describe('#trigger', function() {

      var data = {
        bar: 2
      };

      it('returns false if no event handler is registered for the given event', function() {
        expect(subject.trigger('foo')).to.be.false;
      });

      it('fires registered event handlers with any data provided', function() {
        subject.on('foo', callback);
        subject.on('foo', callback);
        subject.trigger('foo', data);
        expect(callback).to.have.been.calledWith(data);
        expect(callback).to.have.been.calledTwice;
      });

    });

    describe('#request', function() {
      var promise, doneHandler, failHandler, requestsCount = 0;

      beforeEach(function() {
        sandbox.spy(subject, 'postMessage');
        doneHandler = sandbox.spy();
        failHandler = sandbox.spy();

        promise = subject.request('/api/v2/tickets.json').then(doneHandler, failHandler);
        requestsCount++;
      });

      it('asks ZAF to make a request', function() {
        expect(subject.postMessage).to.have.been.calledWithMatch(/request:\d+/, { url: '/api/v2/tickets.json' });
      });

      it('returns a promise', function() {
        expect(promise).to.respondTo('then');
      });

      describe('promise', function() {
        var response = { responseArgs: [ {} ] };

        it('resolves when the request succeeds', function() {
          subject.trigger('request:' + (requestsCount - 1) + '.done', response);
          return promise.then(function() {
            expect(doneHandler).to.have.been.calledWith(response.responseArgs[0]);
          });
        });

        it('rejects when the request fails', function() {
          subject.trigger('request:' + (requestsCount - 1) + '.fail', response);
          return promise.then(function() {
            expect(failHandler).to.have.been.calledWith(response.responseArgs[0]);
          });
        });

      });

    });

  });

});
