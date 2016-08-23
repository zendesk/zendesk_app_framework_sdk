describe('Client', function() {

  var Client  = require('client'),
      Promise = window.Promise || require('../vendor/native-promise-only'),
      sandbox = sinon.sandbox.create(),
      origin  = 'https://foo.zendesk.com',
      appGuid = 'ABC123',
      version = require('version'),
      subject,
      source,
      callback;

  beforeEach(function() {
    sandbox.stub(window, 'addEventListener');
    source = { postMessage: sandbox.stub() };
    subject = new Client({ origin: origin, appGuid: appGuid, source: source });
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

    it('defaults to the window.top source', function (){
      var client = new Client({ origin: origin, appGuid: appGuid });
      expect(client).to.have.property('_source', window.top);
    });

    it('posts an "iframe.handshake" message when initialised', function() {
      var data = {
        key: "iframe.handshake",
        message: { version: version },
        appGuid: appGuid,
        instanceGuid: appGuid
      };

      expect(source.postMessage).to.have.been.calledWithMatch(JSON.stringify(data));
    });

    describe('with a parent client', function() {
      var childClient;

      beforeEach(function() {
        subject.ready = true;
        source.postMessage.reset();
        window.addEventListener.reset();
        childClient = new Client({ parent: subject });
      });

      it('sets origin and appGuid from parent', function() {
        expect(childClient._origin).to.equal(origin);
        expect(childClient._appGuid).to.equal(appGuid);
      });

      it('does not post a handshake', function() {
        expect(source.postMessage).not.to.have.been.called;
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
      var message, evt, handler;

      beforeEach(function() {
        handler = sandbox.stub();
        message = { awesome: true };

        evt = {
          data: {
            key: 'zaf.hello',
            message: message
          }
        };

        subject.on('hello', handler);
      });

      describe('when the event is valid', function() {
        beforeEach(function() {
          evt.origin = subject._origin;
          evt.source = subject._source;
        });

        it("passes the message to the client", function() {
          window.addEventListener.callArgWith(1, evt);
          expect(handler).to.have.been.calledWithExactly(message);
        });

        describe('when the message is a stringified JSON', function() {
          it("passes the parsed message to the client", function() {
            evt.data = JSON.stringify(evt.data);
            window.addEventListener.callArgWith(1, evt);
            expect(handler).to.have.been.calledWithExactly(message);
          });
        });

        describe('when the message is not from zaf', function() {
          it("does not pass the message to the client", function() {
            evt.data.key = 'hello';
            window.addEventListener.callArgWith(1, evt);
            expect(handler).to.not.have.been.called;
          });
        });
      });

      describe('when the event is not valid', function() {
        it("does not pass the message to the client", function() {
          evt.origin = 'https://foo.com';
          window.addEventListener.callArgWith(1, evt);
          expect(handler).to.not.have.been.called;
        });
      });
    });

    describe('#postMessage', function() {

      it('waits until the client is ready to post messages', function() {
        subject.postMessage('foo');
        expect(source.postMessage).to.not.have.been.calledWithMatch('{"key":"foo","appGuid":"ABC123","instanceGuid":"ABC123"}');
        subject.trigger('app.registered', { context: {}, metadata: {} });
        expect(source.postMessage).to.have.been.calledWithMatch('{"key":"foo","appGuid":"ABC123","instanceGuid":"ABC123"}');
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

      it('notifies the framework of the handler registration', function() {
        sandbox.spy(subject, 'postMessage');
        subject.on('foo', callback);
        expect(subject.postMessage).to.have.been.calledWithMatch('iframe.on:foo', { subscriberCount: 1 });
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

      it('notifies the framework of the handler removal', function() {
        sandbox.spy(subject, 'postMessage');
        subject.on('foo', callback);
        subject.off('foo', callback);
        expect(subject.postMessage).to.have.been.calledWithMatch('iframe.off:foo', { subscriberCount: 0 });
      });

      describe('when #off is called before #on', function() {
        beforeEach(function() {
          sandbox.spy(subject, 'postMessage');
          subject.on('foo', function() {});
        });

        it('notifies the framework of the handler removal', function() {
          subject.off('foo', callback);
          expect(subject.postMessage).to.have.been.calledWithMatch('iframe.off:foo', { subscriberCount: 1 });
        });

        it('does not remove other handlers', function() {
          subject.off('foo', callback);
          expect(subject._messageHandlers.foo.length).to.equal(1);
        });
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

      it('notifies the framework', function() {
        sandbox.spy(subject, 'postMessage');
        subject.trigger('foo', data);
        expect(subject.postMessage).to.have.been.calledWith('iframe.trigger:foo', data);
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
    var requestsCount = 1;

    afterEach(function() {
      promise && promise.catch(function() {});
      requestsCount++;
    });

    describe('#get', function() {
      it('takes an argument and returns a promise with data', function(done) {
        promise = subject.get('ticket.subject');

        expect(promise).to.eventually.become({ errors: {}, 'ticket.subject': 'test' }).and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: {}, 'ticket.subject': 'test' } }
        });
      });

      it('throws an error when the handler throws it', function(done) {
        promise = subject.get('ticket.err');

        expect(promise).to.be.rejectedWith(Error, 'ticket.err unavailable').and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: { 'ticket.err': { message: 'ticket.err unavailable' } } } }
        });
      });

      it('accepts an array with multiple paths', function(done) {
        promise = subject.get(['ticket.subject', 'ticket.requester']);

        expect(promise).to.eventually.become({
          'ticket.subject': 'test',
          'ticket.requester': 'test'
        }).and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: {
            'ticket.subject': 'test',
            'ticket.requester': 'test'
          }}
        });
      });

      it('resolves with errors when bulk requesting', function(done) {
        var promise = subject.get(['ticket.subj']);

        expect(promise).to.become({ errors: { 'ticket.subj': { message: 'No such Api' } } }).and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: { 'ticket.subj': { message: 'No such Api' } } } }
        });
      });

      it("doesn't accepts multiple arguments", function() {
        requestsCount--;
        expect(function() {
          subject.get('ticket.subject', 'ticket.requester');
        }).to.throw(Error);
      });

      it('rejects the promise after 5 seconds', function(done) {
        var clock = sinon.useFakeTimers();
        promise = subject.get('ticket.subject');
        clock.tick(5000);
        clock.restore();
        expect(promise).to.be.rejectedWith(Error, 'Invocation request timeout').and.notify(done);
      });

      it('returns an error when not passing in strings', function() {
        requestsCount--;
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
      it('takes two arguments and returns a promise with data', function(done) {
        promise = subject.set('ticket.subject', 'value');

        expect(promise).to.eventually.become({ errors: {}, 'ticket.subject': 'value' }).and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: {}, 'ticket.subject': 'value' } }
        });
      });

      it('throws an error when not including a value', function() {
        requestsCount--;
        expect(function() {
          subject.set('ticket.subject');
        }).to.throw(Error);
      });

      it('rejects the promise when single request and handler throws an error', function(done) {
        promise = subject.set('ticket.foo', 'bar');

        expect(promise).to.be.rejectedWith(Error, 'ticket.foo unavailable').and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: { 'ticket.foo': { message: 'ticket.foo unavailable' } } } }
        });
      });

      it('accepts an object with multiple paths', function(done) {
        promise = subject.set({
          'ticket.subject': 'value',
          'ticket.description': 'value'
        });

        expect(promise).to.eventually.become({
          'ticket.subject': 'value',
          'ticket.requester': 'value'
        }).and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: {
            'ticket.subject': 'value',
            'ticket.requester': 'value'
          }}
        });
      });

      it('resolves with errors when bulk requesting', function(done) {
        var promise = subject.set({ 'ticket.foo': 'bar' });

        expect(promise).to.become({ errors: { 'ticket.foo': { message: 'No such Api' } } }).and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: { 'ticket.foo': { message: 'No such Api' } } } }
        });
      });

      it('rejects the promise after 5 seconds', function(done) {
        var clock = sinon.useFakeTimers();
        promise = subject.set('ticket.subject', 'test');
        clock.tick(5000);
        clock.restore();
        expect(promise).to.be.rejectedWith(Error, 'Invocation request timeout').and.notify(done);
      });

      it('throws on invalid input', function() {
        requestsCount--;
        expect(function() {
          subject.set(123);
        }).to.throw(Error);

        expect(function() {
          subject.set('test');
        }).to.throw(Error);

        expect(function() {
          subject.set(['foo', 'bar']);
        }).to.throw(Error);
      });
    });

    describe('#invoke', function() {
      it('takes multiple arguments and returns a promise with data', function(done) {
        // in reality appendText doesn't return anything
        promise = subject.invoke('ticket.appendText', 'foobar');

        expect(promise).to.eventually.become({ errors: {}, 'ticket.appendText': true }).and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: {}, 'ticket.appendText': true } }
        });
      });

      it('rejects the promise when single request and handler throws an error', function(done) {
        promise = subject.invoke('ticket.foo', 'bar');

        expect(promise).to.be.rejectedWith(Error, 'ticket.foo unavailable').and.notify(done);

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: { 'ticket.foo': { message: 'ticket.foo unavailable' } } } }
        });
      });

      it('throws an error when invoked with an object', function() {
        expect(function() {
          subject.invoke({
            'iframe.resize': [1]
          });
        }).to.throw(Error, "Invoke with an object isn't supported.");
      });

      it('rejects the promise after 5 seconds', function(done) {
        var clock = sinon.useFakeTimers();
        promise = subject.invoke('ticket.subject', 'test');
        clock.tick(5000);
        clock.restore();
        expect(promise).to.be.rejectedWith(Error, 'Invocation request timeout').and.notify(done);
      });
    });

    describe('#context', function() {
      it('resolves with the cached context if ready', function() {
        subject.ready = true;
        subject._context = { location: 'top_bar' };
        promise = subject.context();
        return expect(promise).to.eventually.eq(subject._context);
      });

      it('waits for the app to be registered before resolving', function() {
        var context = { location: 'top_bar' };
        promise = subject.context();
        subject.trigger('app.registered', { metadata: {}, context: context });
        return expect(promise).to.eventually.eq(context);
      });
    });

    describe('#instance', function() {
      var context = { location: 'top_bar' };

      beforeEach(function() {
        subject.ready = true;
        sandbox.stub(subject, 'get');
        subject.get.withArgs('instances.def-321').returns(
          Promise.resolve({ 'instances.def-321': context })
        );
      });

      it('requests instance context and caches it in the returned client', function() {
        promise = subject.instance('def-321');
        expect(subject.get).to.have.been.calledWith('instances.def-321');
        return Promise.all([
          expect(promise).to.eventually.be.an.instanceof(Client),
          expect(promise).to.eventually.have.property('_context').that.equals(context),
          expect(promise).to.eventually.have.property('_instanceGuid').that.equals('def-321')
        ]);
      });

      it('returns the same client when requested multiple times', function() {
        return Promise.all([
          subject.instance('def-321'),
          subject.instance('def-321')
        ]).then(function(promises) {
          expect(promises[0]).to.equal(promises[1]);
        });
      });

      describe('with the returned client', function() {
        var childClient;

        beforeEach(function(done) {
          subject.instance('def-321').then(function(client) {
            childClient = client;
            source.postMessage.reset();
          }).then(done);
        });

        it('should be ready', function() {
          expect(childClient).to.have.property('ready', true);
        });

        it('defaults to inheriting the source from the parent', function() {
          expect(childClient).to.have.property('_source', subject._source);
        });

        describe('#context', function() {
          it('delegates to instances api', function() {
            sandbox.stub(childClient, 'get').withArgs('instances.def-321').returns(
              Promise.resolve({ 'instances.def-321': context })
            );
            promise = childClient.context();
            expect(childClient.get).to.have.been.calledWith('instances.def-321');
            return expect(promise).to.eventually.equal(context);
          });
        });

        describe('#postMessage', function() {
          it('includes the instanceGuid in the message', function() {
            childClient.postMessage('foo.bar', { bar: 'foo' });
            expect(source.postMessage).to.have.been.called;
            var lastCall = JSON.parse(source.postMessage.lastCall.args[0]);
            expect(lastCall.key).to.equal('foo.bar');
            expect(lastCall.message).to.deep.equal({ bar: 'foo' });
            expect(lastCall.appGuid).to.equal('ABC123');
            expect(lastCall.instanceGuid).to.equal('def-321');
          });
        });

        describe('#get', function() {
          it('makes a call with the instanceGuid set', function() {
            promise = childClient.get('foo.bar');
            var lastCall = JSON.parse(source.postMessage.lastCall.args[0]);
            expect(lastCall.request).to.equal('get');
            expect(lastCall.params).to.deep.equal(['foo.bar']);
            expect(lastCall.appGuid).to.equal('ABC123');
            expect(lastCall.instanceGuid).to.equal('def-321');
          });
        });

        describe('#set', function() {
          it('makes a call with the instanceGuid set', function() {
            promise = childClient.set('foo.bar', 'baz');
            var lastCall = JSON.parse(source.postMessage.lastCall.args[0]);
            expect(lastCall.request).to.equal('set');
            expect(lastCall.params).to.deep.equal({'foo.bar': 'baz'});
            expect(lastCall.appGuid).to.equal('ABC123');
            expect(lastCall.instanceGuid).to.equal('def-321');
          });
        });

        describe('#invoke', function() {
          it('makes a call with the instanceGuid set', function() {
            promise = childClient.invoke('popover', 'hide');
            var lastCall = JSON.parse(source.postMessage.lastCall.args[0]);
            expect(lastCall.request).to.equal('invoke');
            expect(lastCall.params).to.deep.equal({'popover': ['hide']});
            expect(lastCall.appGuid).to.equal('ABC123');
            expect(lastCall.instanceGuid).to.equal('def-321');
          });
        });
      });
    });
  });
});
