describe('Client', function() {

  var Client  = require('client'),
      Promise = window.Promise || require('../vendor/native-promise-only'),
      sandbox = sinon.sandbox.create(),
      origin  = 'https://foo.zendesk.com',
      appGuid = 'ABC123',
      version = require('version'),
      subject,
      callback;

  beforeEach(function() {
    sandbox.stub(window, 'addEventListener');
    sandbox.stub(window.top, 'postMessage');
    subject = new Client({ origin: origin, appGuid: appGuid });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('initialisation', function() {
    it('can be instantiated', function() {
      expect(subject).to.exist;
    });

    it('adds a listener for the message event', function() {
      expect(window.addEventListener).to.have.been.calledWith('message');
    });

    it('posts an "iframe.handshake" message when initialised', function() {
      var data = {
        key: "iframe.handshake",
        message: { version: version },
        appGuid: appGuid,
        instanceGuid: appGuid
      };

      expect(window.top.postMessage).to.have.been.calledWithMatch(JSON.stringify(data));
    });

    describe('with a parent client', function() {
      var childClient;

      beforeEach(function() {
        subject.ready = true;
        window.top.postMessage.reset();
        window.addEventListener.reset();
        childClient = new Client({ parent: subject });
      });

      it('sets origin and appGuid from parent', function() {
        expect(childClient._origin).to.equal(origin);
        expect(childClient._appGuid).to.equal(appGuid);
      });

      it('does not post a handshake', function() {
        expect(window.top.postMessage).not.to.have.been.called;
      });

      it('does not add a listener for the message event', function() {
        expect(window.addEventListener).not.to.have.been.calledWith('message');
      });

      it('inherits the ready state of the parent', function() {
        expect(childClient.ready).to.equal(true);
      });
    });
  });

  describe('events', function() {

    beforeEach(function() {
      callback = sandbox.spy();
    });

    describe('when a message is received', function() {
      var message, evt, trigger;

      beforeEach(function() {
        message = { awesome: true };

        evt = {
          data: {
            key: 'zaf.hello',
            message: message
          }
        };

        trigger = sandbox.stub(subject, 'trigger');
      });

      describe('when the event is valid', function() {
        beforeEach(function() {
          evt.origin = subject._origin;
          evt.source = subject._source;
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

    describe('#postMessage', function() {

      it('waits until the client is ready to post messages', function() {
        subject.postMessage('foo');
        expect(window.top.postMessage).to.not.have.been.calledWithMatch('{"key":"foo","appGuid":"ABC123","instanceGuid":"ABC123"}');
        subject.trigger('app.registered', { context: {}, metadata: {} });
        expect(window.top.postMessage).to.have.been.calledWithMatch('{"key":"foo","appGuid":"ABC123","instanceGuid":"ABC123"}');
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
      var promise, doneHandler, failHandler,
          requestsCount = 1;

      beforeEach(function() {
        sandbox.spy(subject, 'postMessage');
        doneHandler = sandbox.spy();
        failHandler = sandbox.spy();

        promise = subject.request('/api/v2/tickets.json').then(doneHandler, failHandler);
      });

      afterEach(function() {
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

        it('resolves when the request succeeds', function(done) {
          subject.trigger('request:' + requestsCount + '.done', response);
          promise.then(function() {
            expect(doneHandler).to.have.been.calledWith(response.responseArgs[0]);
            done();
          });
        });

        it('rejects when the request fails', function(done) {
          subject.trigger('request:' + requestsCount + '.fail', response);
          promise.then(function() {
            expect(failHandler).to.have.been.calledWith(response.responseArgs[0]);
            done();
          });
        });
      });
    });
  });

  describe('v2 methods', function() {
    var promise;

    describe('#get', function() {
      var requestsCount = 1;

      afterEach(function() {
        promise.catch(function() {});
        requestsCount++;
      });

      it('returns a promise', function() {
        promise = subject.get('ticket.subject');

        expect(promise).to.be.a.promise;
      });

      it('accepts an array with multiple paths', function() {
        promise = subject.get(['ticket.subject', 'ticket.requester']);

        expect(promise).to.be.a.promise;
      });

      it('accepts multiple arguments', function() {
        promise = subject.get('ticket.subject', 'ticket.requester');

        expect(promise).to.be.a.promise;
      });

      it('rejects the promise after 5 seconds', function(done) {
        var clock = sinon.useFakeTimers();
        promise = subject.get('ticket.subject');
        clock.tick(5000);
        clock.restore();
        expect(promise).to.be.rejectedWith(Error, 'Invocation request timeout').and.notify(done);
      });

      it('resolves the promise when the expected message is received', function(done) {
        promise = subject.get('ticket.subject');

        expect(promise).to.eventually.become({a: 'b'}).and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: {a: 'b'} }
        });
      });

      it('returns an error when not passing in strings', function() {
        expect(function() {
          subject.get(123);
        }).to.throw(Error);

        expect(function() {
          subject.get({
            'ticket.subject': true
          });
        }).to.throw(Error);
      });
    });

    describe('#set', function() {
      afterEach(function() {
        promise.catch(function() {});
      });

      it('returns a promise', function() {
        promise = subject.set('ticket.subject', 'value');

        expect(promise).to.be.a.promise;
      });

      it('accepts an object', function() {
        promise = subject.set({
          'ticket.subject': 'value',
          'ticket.description': 'value'
        });

        expect(promise).to.be.a.promise;
      });


      it('throws when not 2 strings or an object', function() {
        expect(function() {
          subject.set('test');
        }).to.throw(Error);

        expect(function() {
          subject.set(['foo', 'bar']);
        }).to.throw(Error);
      });
    });

    describe('#invoke', function() {
      afterEach(function() {
        promise.catch(function() {});
      });

      it('returns a promise', function() {
        promise = subject.invoke('iframe.resize');

        expect(promise).to.be.a.promise;
      });

      it('throw when called with an object', function() {
        expect(function() {
          subject.invoke({
            'iframe.resize': [1]
          });
        }).to.throw(Error);
      });
    });

    describe('#instance', function() {
      var context = { location: 'top_bar' };

      beforeEach(function() {
        sandbox.stub(subject, 'get');
        subject.get.withArgs('instances.abc-123').returns(
          Promise.resolve({ 'instances.abc-123': context })
        );
      });

      it('requests instance context and caches it in the returned client', function() {
        promise = subject.instance('abc-123');
        expect(subject.get).to.have.been.calledWith('instances.abc-123');
        return Promise.all([
          expect(promise).to.eventually.be.an.instanceof(Client),
          expect(promise).to.eventually.have.property('_context').that.equals(context)
        ]);
      });
    });
  });
});
