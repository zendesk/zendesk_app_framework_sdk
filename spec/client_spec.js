/* eslint-env mocha */
/* global expect Promise */
import Client, * as clientUtils from '../lib/client'
import Tracker from '../lib/tracker'
import version from 'version'
import sinon from 'sinon'

describe('#collateActions', () => {
  it('should combine action names and arguments into readable strings', () => {
    expect(clientUtils.collateActions('get', ['ticket', 'currentUser']))
      .to.eql(['get-ticket', 'get-currentUser'])
    expect(clientUtils.collateActions('set', ['ticket.assignee']))
      .to.eql(['set-ticket.assignee'])
  })
})

describe('#stripActionArgs', () => {
  it('should replace a single argument following a colon', () => {
    const action = 'get-ticket.customfield:custom_field_24378895'
    expect(clientUtils.stripActionArgs(action)).to.equal('get-ticket.customfield:arg')
  })

  it('should replace multiple comma delimited arguments following a colon', () => {
    const action = 'get-currentuser.customfield:partner,manager'
    expect(clientUtils.stripActionArgs(action)).to.equal('get-currentuser.customfield:arg')
  })

  it('should retain trailing field modifiers', () => {
    const action = 'invoke-ticketfields:custom_field_24049313.hide'
    expect(clientUtils.stripActionArgs(action)).to.equal('invoke-ticketfields:arg.hide')
  })

  it('should replace arguments containing escaped file extensions', () => {
    const action = 'get-asseturl:logo\\.png'
    expect(clientUtils.stripActionArgs(action)).to.equal('get-asseturl:arg')
  })

  it('should leave actions not containing arguments unchanged', () => {
    const action = 'get-comment.attachments'
    expect(clientUtils.stripActionArgs(action)).to.equal(action)
  })
})

describe('#timeMsToSecondsRange', () => {
  describe('should return an appropriate range in seconds as a string', () => {
    it('when given a time value in ms lower than the default upper limit', () => {
      expect(clientUtils.timeMsToSecondsRange(12345)).to.equal('10-20')
    })

    it('when given a time value in ms higher than the default upper limit', () => {
      expect(clientUtils.timeMsToSecondsRange(345678)).to.equal('300-')
    })

    it('when given a time value in ms higher than the custom upper limit', () => {
      expect(clientUtils.timeMsToSecondsRange(345678, 400000)).to.equal('340-350')
    })
  })
})

describe('#trackSDKRequestTimeout', () => {
  const client = { postMessage: sinon.spy() }
  const actions = ['get-asseturl:logo\\.png', 'get-currentUser']
  const requestResponseTime = 12345
  const expectedPostMessageOptions = {
    data: 1,
    event_name: 'sdk_request_timeout',
    event_type: 'increment',
    tags: ['action:get-asseturl:arg', 'action:get-currentUser', 'request_response_time:10-20']
  }

  it('should have the client fire a tracking postmessage with the correct tags', () => {
    clientUtils.trackSDKRequestTimeout(client, actions, requestResponseTime)
    expect(client.postMessage).to.have.been.calledWith('__track__', expectedPostMessageOptions)
  })
})

describe('Client', () => {
  const sandbox = sinon.createSandbox()
  const origin = 'http://localhost:9876'
  const appGuid = 'ABC123'
  let subject, source, trackerStub, callback

  beforeEach(() => {
    trackerStub = sandbox.stub(Tracker.prototype, 'setup')
    sandbox.stub(window, 'addEventListener')
    sandbox.stub(window, 'postMessage')
    source = { postMessage: sandbox.stub() }
    subject = new Client({ origin, appGuid, source })
  })

  afterEach(() => {
    sandbox.restore()
  })

  function triggerEvent (client, name, data) {
    const evt = {
      origin: client._origin,
      source: client._source,
      data: {
        key: 'zaf.' + name,
        message: data,
        instanceGuid: client._instanceGuid
      }
    }

    window.addEventListener.callArgWith(1, evt)
  }

  describe('isOriginValid', () => {
    beforeEach(() => {
      sandbox.stub(console, 'error')
    })

    it('instantiates the client when the domain is valid', () => {
      const validDomains = [
        'http://127.0.0.1',
        'http://localhost',
        'http://localhost:1234',
        'https://localhost:1234',
        'https://sub1.zendesk.com',
        'https://sub-1.zendesk.com',
        'https://sub_1.zendesk.com',
        'https://sub1.zd-staging.com',
        'https://sub1.zendesk-staging.com',
        'https://sub1.zd-master.com',
        'https://dashboard.zopim.com',
        'https://hoanglocal.zopim.com:8080',
        'https://dashboard.zopim.org',
        'https://app.futuresimple.com',
        'https://app.idealwith.com',
        'https://app.cloudhatchery.com',
        'https://app.local.futuresimple.com',
        'https://app.local.idealwith.com',
        'https://app.local.cloudhatchery.com',
        'https://app-master.frontends.futuresimple.com',
        'https://app-sandbox.frontends.idealwith.com',
        'https://app-staging.frontends.cloudhatchery.com',
        'https://test-case.ourtesco.com'
      ]

      validDomains.forEach((domain) => {
        const validOriginClient = new Client({
          origin: domain,
          appGuid: 'appGuid',
          source: source
        })

        expect(validOriginClient).to.exist()
      })
    })

    it('clears iframe and appends error msg to body when domain is invalid', () => {
      const invalidDomains = [
        'https://localhost.com',
        'http://fakelocalhost',
        'http://fakelocalhost:1234',
        'https://sub1.fakezendesk.com',
        'https://sub1.fakezd-staging.com',
        'https://sub1.fakezendesk-staging.com',
        'https://sub1.fakezd-master.com',
        'https://dashboard.fakezopim.com',
        'https://dashboard.fakezopim.org',
        'https://app.fakefuturesimple.com'
      ]

      invalidDomains.forEach((domain) => {
        const client = new Client({
          origin: domain,
          appGuid: 'appGuid',
          source: source
        })
        const ACTUAL_ERROR_MSG = document.querySelector('h3').innerText
        const EXPECTED_ERROR_MSG = `Invalid domain ${domain}`

        expect(client).to.be.an('object')
        expect(document.head).to.equal(null)
        expect(ACTUAL_ERROR_MSG).to.equal(EXPECTED_ERROR_MSG)
      })
    })
  })

  describe('initialisation', () => {
    it('can be instantiated', () => {
      expect(subject).to.exist()
    })

    it('adds a listener for the message event', () => {
      expect(window.addEventListener).to.have.been.calledWith('message')
    })

    it('sets up tracking', () => {
      expect(trackerStub).to.have.been.called()
    })

    it('defaults to the window.top source', () => {
      const client = new Client({ origin: origin, appGuid: appGuid })
      expect(client).to.have.property('_source', window.top)
    })

    it('posts an "iframe.handshake" message when initialised', () => {
      const data = {
        key: 'iframe.handshake',
        message: { version: version },
        appGuid: appGuid,
        instanceGuid: appGuid
      }

      expect(source.postMessage).to.have.been.calledWithMatch(JSON.stringify(data))
    })

    it('listens for app.registered to mark the client as ready', () => {
      const data = {
        metadata: {
          appId: 1,
          installationId: 1
        },
        context: {
          product: 'support',
          location: 'ticket_sidebar'
        }
      }

      expect(subject.ready).to.equal(false)
      triggerEvent(subject, 'app.registered', data)
      expect(subject.ready).to.equal(true)
      expect(subject._metadata).to.equal(data.metadata)
      expect(subject._context).to.equal(data.context)
    })

    it('listens for context.updated to update the client context', () => {
      const context = {
        foo: 123
      }

      expect(subject._context).not.to.equal(context)
      triggerEvent(subject, 'context.updated', context)
      expect(subject._context).to.equal(context)
    })

    describe('with a parent client', () => {
      let childClient

      beforeEach(() => {
        subject.ready = true
        source.postMessage.reset()
        window.addEventListener.reset()
        childClient = new Client({ parent: subject })
      })

      it('sets origin and appGuid from parent', () => {
        expect(childClient._origin).to.equal(origin)
        expect(childClient._appGuid).to.equal(appGuid)
      })

      it('does not post a handshake', () => {
        expect(source.postMessage).not.to.have.been.called()
      })

      it('does not add a listener for the message event', () => {
        expect(window.addEventListener).not.to.have.been.calledWith('message')
      })

      it('inherits the ready state of the parent', () => {
        expect(childClient.ready).to.equal(true)
      })
    })
  })

  describe('events', () => {
    beforeEach(() => {
      callback = sandbox.spy()
    })

    describe('when a message is received', () => {
      let message, evt, handler

      beforeEach(() => {
        handler = sandbox.stub()
        message = { awesome: true }

        evt = {
          data: {
            key: 'zaf.hello',
            message: message
          }
        }

        subject.on('hello', handler)
      })

      describe('when the event is valid', () => {
        beforeEach(() => {
          evt.origin = subject._origin
          evt.source = subject._source
        })

        it('passes the message to the client', () => {
          window.addEventListener.callArgWith(1, evt)
          expect(handler).to.have.been.calledWithExactly(message)
        })

        describe('when the message is a stringified JSON', () => {
          it('passes the parsed message to the client', () => {
            evt.data = JSON.stringify(evt.data)
            window.addEventListener.callArgWith(1, evt)
            expect(handler).to.have.been.calledWithExactly(message)
          })
        })

        describe('when the message is not from zaf', () => {
          it('does not pass the message to the client', () => {
            evt.data.key = 'hello'
            window.addEventListener.callArgWith(1, evt)
            expect(handler).to.not.have.been.called()
          })
        })

        describe('when the message is for a hook event', () => {
          beforeEach(() => {
            evt.data.needsReply = true
            subject.ready = true
          })

          it('calls the handler and sends back the response', () => {
            const retval = window.addEventListener.lastCall.args[1].call(subject, evt)
            return retval.then(() => {
              expect(handler).to.have.been.called()
              expect(source.postMessage).to.have.been.calledWith(
                { appGuid: 'ABC123', key: 'iframe.reply:hello' },
                'http://localhost:9876'
              )
            })
          })

          describe('when the handler throws an error', () => {
            beforeEach(() => {
              handler.throwsException()
            })

            it('calls the handler and sends back the error', () => {
              const retval = window.addEventListener.lastCall.args[1].call(subject, evt)
              return retval.then(() => {
                expect(handler).to.have.been.called()
                expect(source.postMessage).to.have.been.calledWith(
                  { appGuid: 'ABC123', error: { msg: 'Error' }, key: 'iframe.reply:hello' },
                  'http://localhost:9876'
                )
              })
            })
          })

          describe('when the handler returns false', () => {
            beforeEach(() => {
              handler.returns(false)
            })

            it('calls the handler and sends back the error', () => {
              const retval = window.addEventListener.lastCall.args[1].call(subject, evt)
              return retval.then(() => {
                expect(handler).to.have.been.called()
                expect(source.postMessage).to.have.been.calledWith(
                  { appGuid: 'ABC123', error: { msg: false }, key: 'iframe.reply:hello' },
                  'http://localhost:9876'
                )
              })
            })
          })

          describe('when the handler returns a string', () => {
            beforeEach(() => {
              handler.returns('Oh no! [object Object]')
            })

            it('calls the handler and sends back the string as an error', () => {
              const retval = window.addEventListener.lastCall.args[1].call(subject, evt)
              return retval.then(() => {
                expect(handler).to.have.been.called()
                expect(source.postMessage).to.have.been.calledWith(
                  { appGuid: 'ABC123', error: { msg: 'Oh no! [object Object]' }, key: 'iframe.reply:hello' },
                  'http://localhost:9876'
                )
              })
            })
          })

          describe('when the handler rejects a promise', () => {
            beforeEach(() => {
              handler.returns(Promise.reject(new Error('The third party API is broken.')))
            })

            it('calls the handler and sends back the rejection value as an error', () => {
              const retval = window.addEventListener.lastCall.args[1].call(subject, evt)
              return retval.then(() => {
                expect(handler).to.have.been.called()
                expect(source.postMessage).to.have.been.calledWith(
                  { appGuid: 'ABC123', error: { msg: 'The third party API is broken.' }, key: 'iframe.reply:hello' },
                  'http://localhost:9876'
                )
              })
            })
          })
        })
      })

      describe('when the event is not valid', () => {
        it('does not pass the message to the client', () => {
          evt.origin = 'https://foo.com'
          window.addEventListener.callArgWith(1, evt)
          expect(handler).to.not.have.been.called()
        })
      })
    })

    describe('#postMessage', () => {
      let oldReady

      beforeEach(() => {
        oldReady = subject.ready
        subject.ready = false
        sandbox.spy(subject, 'on')
      })

      afterEach(() => {
        subject.ready = oldReady
      })

      it('waits until the client is ready to post messages', () => {
        subject.postMessage('foo')
        expect(source.postMessage).to.not.have.been.calledWithMatch('{"key":"foo","appGuid":"ABC123","instanceGuid":"ABC123"}')
        expect(subject.on).to.have.been.calledWithMatch('app.registered')
      })

      it('posts a message when the client is ready', () => {
        subject.ready = true
        subject.postMessage('foo')
        expect(source.postMessage).to.have.been.calledWithMatch('{"key":"foo","appGuid":"ABC123","instanceGuid":"ABC123"}')
      })
    })

    describe('#on', () => {
      it('registers a handler for a given event', () => {
        subject.on('foo', callback)
        expect(subject._messageHandlers.foo).to.exist()
      })

      it('registers multiple handlers for the same event', () => {
        subject.on('foo', callback)
        subject.on('foo', callback)
        expect(subject._messageHandlers.foo.length).to.equal(2)
      })

      it('only registers when handler is a function', () => {
        subject.on('foo', 2)
        expect(subject._messageHandlers.foo).to.not.exist()
      })

      it('notifies the framework of the handler registration', () => {
        sandbox.spy(subject, 'postMessage')
        subject.on('foo', callback)
        expect(subject.postMessage).to.have.been.calledWithMatch('iframe.on:foo', { subscriberCount: 1 })
      })
    })

    describe('#off', () => {
      it('removes a previously registered handler', () => {
        subject.on('foo', callback)
        expect(subject._messageHandlers.foo.length).to.equal(1)
        subject.off('foo', callback)
        expect(subject._messageHandlers.foo.length).to.equal(0)
      })

      it('returns the handler that was removed', () => {
        subject.on('foo', callback)
        expect(subject.off('foo', callback)).to.equal(callback)
      })

      it('returns false if no handler was found', () => {
        expect(subject.off('foo', callback)).to.be.false()
      })

      it('notifies the framework of the handler removal', () => {
        sandbox.spy(subject, 'postMessage')
        subject.on('foo', callback)
        subject.off('foo', callback)
        expect(subject.postMessage).to.have.been.calledWithMatch('iframe.off:foo', { subscriberCount: 0 })
      })

      describe('when #off is called() before #on', () => {
        beforeEach(() => {
          sandbox.spy(subject, 'postMessage')
          subject.on('foo', () => {})
        })

        it('notifies the framework of the handler removal', () => {
          subject.off('foo', callback)
          expect(subject.postMessage).to.have.been.calledWithMatch('iframe.off:foo', { subscriberCount: 1 })
        })

        it('does not remove other handlers', () => {
          subject.off('foo', callback)
          expect(subject._messageHandlers.foo.length).to.equal(1)
        })
      })
    })

    describe('#has', () => {
      it('returns true if the given handler is registered for the given event', () => {
        subject.on('foo', callback)
        expect(subject.has('foo', callback)).to.be.true()
      })

      it('returns false if the given handler is not registered for the given event', () => {
        expect(subject.has('foo', callback)).to.be.false()
      })

      it("returns false if the given event isn't registered", () => {
        expect(subject.has('bar')).to.be.false()
      })
    })

    describe('#trigger', () => {
      const data = {
        bar: 2
      }

      beforeEach(() => {
        sandbox.spy(subject, 'postMessage')
      })

      it('posts a message so the framework can trigger the event on all registered clients', () => {
        subject.trigger('foo', data)
        expect(subject.postMessage).to.have.been.calledWith('iframe.trigger:foo', data)
      })
    })

    describe('#request', () => {
      let requestsCount = 1
      let promise, doneHandler, failHandler

      beforeEach(() => {
        sandbox.spy(subject, 'postMessage')
        doneHandler = sandbox.spy()
        failHandler = sandbox.spy()

        promise = subject.request('/api/v2/tickets.json').then(doneHandler, failHandler)
      })

      afterEach(() => {
        requestsCount++
      })

      it('asks ZAF to make a request', () => {
        expect(subject.postMessage).to.have.been.calledWithMatch(/request:\d+/, { url: '/api/v2/tickets.json' })
      })

      it('returns a promise', () => {
        expect(promise).to.respondTo('then')
      })

      describe('promise', () => {
        const response = { responseArgs: [ {} ] }

        it('resolves when the request succeeds', (done) => {
          triggerEvent(subject, 'request:' + requestsCount + '.done', response)
          promise.then(() => {
            expect(doneHandler).to.have.been.calledWith(response.responseArgs[0])
            done()
          })
        })

        it('rejects when the request fails', (done) => {
          triggerEvent(subject, 'request:' + requestsCount + '.fail', response)
          promise.then(() => {
            expect(failHandler).to.have.been.calledWith(response.responseArgs[0])
            done()
          })
        })
      })
    })
  })

  describe('v2 methods', () => {
    let promise
    let requestsCount = 1

    afterEach(() => {
      promise && promise.catch(() => {})
      requestsCount++
    })

    describe('#get', () => {
      it('takes an argument and returns a promise with data', (done) => {
        promise = subject.get('ticket.subject')

        expect(promise).to.eventually.become({ errors: {}, 'ticket.subject': 'test' }).and.notify(done)

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: {}, 'ticket.subject': 'test' } }
        })
      })

      it('throws an error when the handler throws it', (done) => {
        promise = subject.get('ticket.err')

        expect(promise).to.be.rejectedWith(Error, 'ticket.err unavailable').and.notify(done)

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: { 'ticket.err': { message: 'ticket.err unavailable' } } } }
        })
      })

      it('accepts an array with multiple paths', (done) => {
        promise = subject.get(['ticket.subject', 'ticket.requester'])

        expect(promise).to.eventually.become({
          'ticket.subject': 'test',
          'ticket.requester': 'test'
        }).and.notify(done)

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount,
            result: {
              'ticket.subject': 'test',
              'ticket.requester': 'test'
            }
          }
        })
      })

      it('resolves with errors when bulk requesting', (done) => {
        const promise = subject.get(['ticket.subj'])

        expect(promise).to.become({ errors: { 'ticket.subj': { message: 'No such Api' } } }).and.notify(done)

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: { 'ticket.subj': { message: 'No such Api' } } } }
        })
      })

      it("doesn't accepts multiple arguments", () => {
        requestsCount--
        expect(() => {
          subject.get('ticket.subject', 'ticket.requester')
        }).to.throw(Error)
      })

      it('rejects the promise after the timeout length and tracks the timeout', (done) => {
        const clock = sinon.useFakeTimers()
        sinon.spy(subject, 'postMessage')
        promise = subject.get('ticket.subject')
        clock.tick(clientUtils.PROMISE_TIMEOUT_LONG)
        clock.restore()
        expect(promise).to.be.rejectedWith(Error, 'Invocation request timeout').and.notify(done)
        expect(subject.postMessage).to.have.been.calledWith('__track__')
        subject.postMessage.restore()
      })

      it('returns an error when not passing in strings', () => {
        requestsCount--
        expect(() => {
          subject.get(123)
        }).to.throw(Error)

        expect(() => {
          subject.get({
            'ticket.subject': true
          })
        }).to.throw(Error)
      })
    })

    describe('#set', () => {
      it('takes two arguments and returns a promise with data', (done) => {
        promise = subject.set('ticket.subject', 'value')

        expect(promise).to.eventually.become({ errors: {}, 'ticket.subject': 'value' }).and.notify(done)

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: {}, 'ticket.subject': 'value' } }
        })
      })

      it('throws an error when not including a value', () => {
        requestsCount--
        expect(() => {
          subject.set('ticket.subject')
        }).to.throw(Error)
      })

      it('rejects the promise when single request and handler throws an error', (done) => {
        promise = subject.set('ticket.foo', 'bar')

        expect(promise).to.be.rejectedWith(Error, 'ticket.foo unavailable').and.notify(done)

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: { 'ticket.foo': { message: 'ticket.foo unavailable' } } } }
        })
      })

      it('accepts an object with multiple paths', (done) => {
        promise = subject.set({
          'ticket.subject': 'value',
          'ticket.description': 'value'
        })

        expect(promise).to.eventually.become({
          'ticket.subject': 'value',
          'ticket.requester': 'value'
        }).and.notify(done)

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount,
            result: {
              'ticket.subject': 'value',
              'ticket.requester': 'value'
            } }
        })
      })

      it('resolves with errors when bulk requesting', (done) => {
        const promise = subject.set({ 'ticket.foo': 'bar' })

        expect(promise).to.become({ errors: { 'ticket.foo': { message: 'No such Api' } } }).and.notify(done)

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: { 'ticket.foo': { message: 'No such Api' } } } }
        })
      })

      it('rejects the promise after the timeout length and tracks the timeout', (done) => {
        const clock = sinon.useFakeTimers()
        sinon.spy(subject, 'postMessage')
        promise = subject.set('ticket.subject', 'test')
        clock.tick(clientUtils.PROMISE_TIMEOUT_LONG)
        clock.restore()
        expect(promise).to.be.rejectedWith(Error, 'Invocation request timeout').and.notify(done)
        expect(subject.postMessage).to.have.been.calledWith('__track__')
        subject.postMessage.restore()
      })

      it('throws on invalid input', () => {
        requestsCount--
        expect(() => {
          subject.set(123)
        }).to.throw(Error)

        expect(() => {
          subject.set('test')
        }).to.throw(Error)

        expect(() => {
          subject.set(['foo', 'bar'])
        }).to.throw(Error)
      })
    })

    describe('#invoke', () => {
      it('takes multiple arguments and returns a promise with data', (done) => {
        // in reality appendText doesn't return anything
        promise = subject.invoke('ticket.appendText', 'foobar')

        expect(promise).to.eventually.become({ errors: {}, 'ticket.appendText': true }).and.notify(done)

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: {}, 'ticket.appendText': true } }
        })
      })

      it('rejects the promise when single request and handler throws an error', (done) => {
        promise = subject.invoke('ticket.foo', 'bar')

        expect(promise).to.be.rejectedWith(Error, 'ticket.foo unavailable').and.notify(done)

        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: { 'ticket.foo': { message: 'ticket.foo unavailable' } } } }
        })
      })

      it('throws an error when invoked with an object', () => {
        requestsCount--
        expect(() => {
          subject.invoke({
            'iframe.resize': [1]
          })
        }).to.throw(Error, 'Invoke supports string arguments or an object with array of strings.')
      })

      it('rejects the promise after the timeout length and tracks the timeout', (done) => {
        const clock = sinon.useFakeTimers()
        sinon.spy(subject, 'postMessage')
        promise = subject.invoke('ticket.subject', 'test')
        clock.tick(clientUtils.PROMISE_TIMEOUT_LONG)
        clock.restore()
        expect(promise).to.be.rejectedWith(Error, 'Invocation request timeout').and.notify(done)
        expect(subject.postMessage).to.have.been.calledWith('__track__')
        subject.postMessage.restore()
      })

      it('doesnt reject whitelisted promises after the timeout length', (done) => {
        const clock = sinon.useFakeTimers()
        promise = subject.invoke('instances.create')
        clock.tick(clientUtils.PROMISE_TIMEOUT_LONG + 5000)
        clock.restore()
        expect(promise).to.eventually.become({ errors: {}, 'instances.create': { url: 'http://a.b' } }).and.notify(done)
        window.addEventListener.callArgWith(1, {
          origin: subject._origin,
          source: subject._source,
          data: { id: requestsCount, result: { errors: {}, 'instances.create': { url: 'http://a.b' } } }
        })
      })
    })

    describe('#context', () => {
      const context = { location: 'top_bar' }

      it('resolves with the cached context if ready', () => {
        subject.ready = true
        subject._context = context
        promise = subject.context()
        return expect(promise).to.eventually.eq(context)
      })

      it('waits for the app to be registered before resolving', () => {
        promise = subject.context()
        triggerEvent(subject, 'app.registered', { metadata: {}, context: context })
        return expect(promise).to.eventually.eq(context)
      })
    })

    describe('#instance', () => {
      beforeEach(() => {
        subject.ready = true
      })

      it('throws an Error when an instanceGuid is not passed', () => {
        expect(() => {
          subject.instance()
        }).to.throw(Error)
      })

      it('throws an Error when instanceGuid is not a string', () => {
        expect(() => {
          subject.instance(1234)
        }).to.throw(Error)
      })

      it('returns a client for the instance', () => {
        const instanceClient = subject.instance('def-321')
        expect(instanceClient).to.be.an.instanceof(Client)
        expect(instanceClient).to.have.property('_instanceGuid').that.equals('def-321')
      })

      it('returns the same client when requested multiple times', () => {
        expect(subject.instance('def-321')).to.equal(subject.instance('def-321'))
      })

      it('returns its own client if the instanceGuid is matches its own', () => {
        expect(subject.instance(subject._instanceGuid)).to.equal(subject)
      })

      describe('with the returned client', () => {
        let childClient

        beforeEach(() => {
          childClient = subject.instance('def-321')
          source.postMessage.reset()
        })

        it('should be ready', () => {
          expect(childClient).to.have.property('ready', true)
        })

        it('defaults to inheriting the source from the parent', () => {
          expect(childClient).to.have.property('_source', subject._source)
        })

        describe('#context', () => {
          const context = { location: 'top_bar' }

          it('delegates to instances api', () => {
            sandbox.stub(childClient, 'get').withArgs('instances.def-321').returns(
              Promise.resolve({ 'instances.def-321': context })
            )
            promise = childClient.context()
            expect(childClient.get).to.have.been.calledWith('instances.def-321')
            return expect(promise).to.eventually.equal(context)
          })
        })

        describe('#postMessage', () => {
          it('includes the instanceGuid in the message', () => {
            childClient.postMessage('foo.bar', { bar: 'foo' })
            expect(source.postMessage).to.have.been.called()
            const lastCall = JSON.parse(source.postMessage.lastCall.args[0])
            expect(lastCall.key).to.equal('foo.bar')
            expect(lastCall.message).to.deep.equal({ bar: 'foo' })
            expect(lastCall.appGuid).to.equal('ABC123')
            expect(lastCall.instanceGuid).to.equal('def-321')
          })
        })

        describe('#get', () => {
          it('makes a call with the instanceGuid set', () => {
            promise = childClient.get('foo.bar')
            const lastCall = JSON.parse(source.postMessage.lastCall.args[0])
            expect(lastCall.request).to.equal('get')
            expect(lastCall.params).to.deep.equal(['foo.bar'])
            expect(lastCall.appGuid).to.equal('ABC123')
            expect(lastCall.instanceGuid).to.equal('def-321')
          })
        })

        describe('#set', () => {
          it('makes a call with the instanceGuid set', () => {
            promise = childClient.set('foo.bar', 'baz')
            const lastCall = JSON.parse(source.postMessage.lastCall.args[0])
            expect(lastCall.request).to.equal('set')
            expect(lastCall.params).to.deep.equal({ 'foo.bar': 'baz' })
            expect(lastCall.appGuid).to.equal('ABC123')
            expect(lastCall.instanceGuid).to.equal('def-321')
          })
        })

        describe('#invoke', () => {
          it('makes a call with the instanceGuid set', () => {
            promise = childClient.invoke('popover', 'hide')
            const lastCall = JSON.parse(source.postMessage.lastCall.args[0])
            expect(lastCall.request).to.equal('invoke')
            expect(lastCall.params).to.deep.equal({ popover: ['hide'] })
            expect(lastCall.appGuid).to.equal('ABC123')
            expect(lastCall.instanceGuid).to.equal('def-321')
          })

          it('makes a call with an object', () => {
            promise = childClient.invoke({ popover: ['hide'] })
            const lastCall = JSON.parse(source.postMessage.lastCall.args[0])
            expect(lastCall.request).to.equal('invoke')
            expect(lastCall.params).to.deep.equal({ popover: ['hide'] })
            expect(lastCall.appGuid).to.equal('ABC123')
            expect(lastCall.instanceGuid).to.equal('def-321')
          })

          it('returns an error with incorrect arguments', () => {
            expect(() => {
              promise = childClient.invoke({ popover: 'hide' })
            }).to.throw(Error, 'Invoke supports string arguments or an object with array of strings.')
          })

          it('returns an error with incorrect arguments', () => {
            expect(() => {
              promise = childClient.invoke({ popover: [['hide']] })
            }).to.throw(Error, 'Invoke supports string arguments or an object with array of strings.')
          })

          it('returns an error with incorrect arguments', () => {
            expect(() => {
              promise = childClient.invoke(['popover', ['hide']])
            }).to.throw(Error, 'Invoke supports string arguments or an object with array of strings.')
          })
        })

        describe('when a message is received for a child client', () => {
          let message, handler

          beforeEach(() => {
            handler = sandbox.stub()
            message = { awesome: true }
            childClient.on('hello', handler)
          })

          it('passes the message to the client', () => {
            triggerEvent(childClient, 'hello', message)
            expect(handler).to.have.been.calledWithExactly(message)
          })
        })
      })
    })
  })
})
