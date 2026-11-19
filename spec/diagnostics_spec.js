/* eslint-env mocha */
/* global expect */
import sinon from 'sinon'
import Client from '../lib/client'
import Tracker from '../lib/tracker'
import Diagnostics, { MAX_EVENTS, MAX_DURATION_MS } from '../lib/diagnostics'

const start = (extra = {}) => Object.assign({ schemaVersion: '1.0', captureId: 'capture', maxEvents: 100, maxDurationMs: 10000 }, extra)

describe('cooperative diagnostics', () => {
  let sandbox, clock, client, diagnostics
  beforeEach(() => {
    sandbox = sinon.createSandbox()
    clock = sandbox.useFakeTimers()
    client = { ready: true, on: sandbox.spy(), postMessage: sandbox.spy() }
    diagnostics = new Diagnostics(client)
  })
  afterEach(() => {
    diagnostics.stop()
    sandbox.restore()
  })

  it('is inert with an old host and before registration; never queues observations', () => {
    expect(diagnostics.emit('app.ready')).to.equal(false)
    client.ready = false
    diagnostics.start(start())
    expect(diagnostics.active).to.equal(null)
    expect(client.postMessage.called).to.equal(false)
  })

  it('emits the exact redacted wire payload and rejects malformed known fields', () => {
    diagnostics.start(start())
    client.postMessage.resetHistory()
    expect(diagnostics.emit('app.operation', { durationMs: 3, outcome: 'success', userId: 'secret', attributes: { count: 2, operation: 'get', userId: 'secret', url: 'secret' } })).to.equal(true)
    expect(client.postMessage.firstCall.args).to.eql(['diagnostics.instrument', { schemaVersion: '1.0', captureId: 'capture', name: 'app.operation', durationMs: 3, outcome: 'success', attributes: { count: 2, operation: 'get' } }])
    const invalid = [null, [], 'text', { durationMs: NaN }, { durationMs: Infinity }, { durationMs: -1 }, { durationMs: 1e10 }, { outcome: 'oops' }, { attributes: null }, { attributes: { count: '1' } }, { attributes: { hidden: 1 } }, { attributes: { operation: 'secret' } }, { attributes: { initiatorType: 'secret' } }]
    invalid.forEach(options => expect(diagnostics.emit('app.ready', options)).to.equal(false))
    expect(diagnostics.emit('custom.secret')).to.equal(false)
    expect(client.postMessage.callCount).to.equal(1)
  })

  it('rejects malformed starts and bounds host limits', () => {
    ;[null, [], {}, start({ captureId: '' }), start({ captureId: 'x'.repeat(129) }), start({ schemaVersion: '2' }), start({ maxEvents: 0 }), start({ maxDurationMs: NaN })].forEach(data => {
      diagnostics.start(data)
      expect(diagnostics.active).to.equal(null)
    })
    diagnostics.start(start({ maxEvents: 10000, maxDurationMs: 100000 }))
    expect(diagnostics.active.remaining).to.be.at.most(MAX_EVENTS)
    clock.tick(MAX_DURATION_MS)
    expect(diagnostics.active).to.equal(null)
  })

  it('does not extend duplicate starts, replaces different captures and cleans up on stop', () => {
    const remove = sandbox.spy(window, 'removeEventListener')
    diagnostics.start(start())
    const first = diagnostics.active
    clock.tick(500)
    diagnostics.start(start())
    expect(diagnostics.active).to.equal(first)
    diagnostics.start(start({ captureId: 'replacement' }))
    expect(diagnostics.active).not.to.equal(first)
    diagnostics.stop()
    diagnostics.stop()
    expect(remove.calledWith('error')).to.equal(true)
    expect(remove.calledWith('unhandledrejection')).to.equal(true)
    expect(remove.calledWith('pagehide')).to.equal(true)
    expect(Object.keys(clock.timers || {}).length).to.equal(0)
  })

  it('caps error/click storms with periodic counts and stops at the event limit', () => {
    const add = sandbox.spy(window, 'addEventListener')
    diagnostics.start(start({ maxEvents: 4 }))
    client.postMessage.resetHistory()
    for (let i = 0; i < 1000; i++) {
      add.args.find(args => args[0] === 'error')[1]()
      document.dispatchEvent(new window.Event('click'))
    }
    expect(client.postMessage.callCount).to.equal(0)
    clock.tick(1000)
    expect(client.postMessage.callCount).to.be.at.most(2)
    expect(client.postMessage.firstCall.args[1].attributes.count).to.equal(1000)
    for (let i = 0; i < 10; i++) diagnostics.emit('app.ready')
    expect(diagnostics.active).to.equal(null)
    expect(client.postMessage.callCount).to.be.at.most(4)
    expect(Object.keys(clock.timers || {}).length).to.equal(0)
  })

  it('bounds resources per second and omits URLs', () => {
    diagnostics.start(start())
    client.postMessage.resetHistory()
    for (let i = 0; i < 1000; i++) diagnostics.resource({ duration: 5, name: 'secret', initiatorType: 'fetch', transferSize: 42 })
    expect(client.postMessage.callCount).to.be.at.most(20)
    expect(JSON.stringify(client.postMessage.args)).not.to.contain('secret')
  })

  it('feature-detects observers and disconnects supported observers', () => {
    const observers = []
    function Observer (callback) {
      this.callback = callback
      this.observe = sandbox.spy()
      this.disconnect = sandbox.spy()
      observers.push(this)
    }
    Observer.supportedEntryTypes = ['longtask', 'long-animation-frame', 'resource']
    sandbox.stub(window, 'PerformanceObserver').value(Observer)
    diagnostics.start(start())
    expect(observers.length).to.equal(3)
    observers[0].callback({ getEntries: () => [{ duration: 50 }] })
    diagnostics.stop()
    observers.forEach(observer => expect(observer.disconnect.calledOnce).to.equal(true))
    const previous = client.postMessage.callCount
    observers[0].callback({ getEntries: () => [{ duration: 50 }] })
    expect(client.postMessage.callCount).to.equal(previous)
    window.PerformanceObserver = undefined
    diagnostics.start(start({ captureId: 'fallback' }))
    expect(diagnostics.active).not.to.equal(null)
  })

  it('does not attach observations outside captures and tolerates unsupported entry types', () => {
    const add = sandbox.spy(window, 'addEventListener')
    sandbox.stub(window, 'PerformanceObserver').value({ supportedEntryTypes: [] })
    expect(add.called).to.equal(false)
    diagnostics.start(start())
    expect(add.calledWith('error')).to.equal(true)
  })

  it('counts unhandled rejections without reading reasons and cleans up on pagehide', () => {
    const add = sandbox.spy(window, 'addEventListener')
    diagnostics.start(start())
    client.postMessage.resetHistory()
    const rejection = add.args.find(args => args[0] === 'unhandledrejection')[1]
    rejection({ get reason () { throw new Error('must not read private reason') } })
    clock.tick(1000)
    expect(client.postMessage.firstCall.args[1]).to.eql({ name: 'iframe.unhandledrejection', schemaVersion: '1.0', captureId: 'capture', attributes: { count: 1 } })
    add.args.find(args => args[0] === 'pagehide')[1]()
    expect(diagnostics.active).to.equal(null)
    expect(Object.keys(clock.timers || {}).length).to.equal(0)
  })

  it('classifies success, errors and timeout without changing the result', () => {
    diagnostics.start(start())
    client.postMessage.resetHistory()
    diagnostics.roundtrip('get')({}, false, false)
    diagnostics.roundtrip('set')({ errors: {} }, false, false)
    diagnostics.roundtrip('invoke')({}, true, true)
    expect(client.postMessage.args.map(args => args[1].outcome)).to.eql(['success', 'success', 'timeout'])
  })

  it('ignores observer failures and spends budget even when transport fails', () => {
    function Observer () {}
    Observer.supportedEntryTypes = ['resource']
    Observer.prototype.observe = () => { throw new Error('unsupported') }
    Observer.prototype.disconnect = sandbox.spy()
    sandbox.stub(window, 'PerformanceObserver').value(Observer)
    diagnostics.start(start({ maxEvents: 1 }))
    client.postMessage = () => { throw new Error('transport') }
    expect(diagnostics.emit('app.ready')).to.equal(false)
    expect(diagnostics.active).to.equal(null)
    expect(Observer.prototype.disconnect.calledOnce).to.equal(true)
    diagnostics.start(start({ maxEvents: 1 }))
    expect(diagnostics.active).to.equal(null)
  })

  it('keeps independent clients and in-flight spans scoped to the original capture', () => {
    const other = new Diagnostics({ ready: true, on: () => {}, postMessage: sandbox.spy() })
    diagnostics.start(start())
    const finish = diagnostics.roundtrip('get')
    diagnostics.start(start({ captureId: 'next' }))
    client.postMessage.resetHistory()
    finish({}, false, false)
    expect(client.postMessage.called).to.equal(false)
    expect(other.active).to.equal(null)
    other.stop()
  })
})

describe('diagnostics client wire integration', () => {
  let sandbox, client, receive, source
  const origin = 'http://localhost:9876'
  function event (key, message, overrides = {}) {
    receive(Object.assign({ origin, source, data: { key: 'zaf.' + key, message } }, overrides))
  }
  function observations () {
    return source.postMessage.args.map(args => JSON.parse(args[0])).filter(msg => msg.key === 'diagnostics.instrument')
  }
  beforeEach(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(Tracker.prototype, 'setup')
    const add = sandbox.stub(window, 'addEventListener')
    source = { postMessage: sandbox.spy() }
    client = new Client({ origin, source, appGuid: 'app' })
    receive = add.args.find(args => args[0] === 'message')[1]
    client.ready = true
  })
  afterEach(() => {
    client._diagnostics.stop()
    Object.keys(client._instanceClients).forEach(key => client._instanceClients[key]._diagnostics.stop())
    sandbox.restore()
  })

  it('validates origin/source and event prefix before accepting controls; stop must match', () => {
    event('diagnostics.start', start(), { origin: 'https://foreign.example' })
    event('diagnostics.start', start(), { source: {} })
    receive({ origin, source, data: { key: 'diagnostics.start', message: start() } })
    expect(client.instrument('app.ready')).to.equal(false)
    event('diagnostics.start', start())
    expect(client.instrument('app.ready')).to.equal(true)
    event('diagnostics.stop', { schemaVersion: '1.0', captureId: 'wrong' })
    expect(client.instrument('app.ready')).to.equal(true)
    event('diagnostics.stop', { schemaVersion: '1.0', captureId: 'capture' })
    expect(client.instrument('app.ready')).to.equal(false)
    const msg = observations().find(msg => msg.message.name === 'app.ready')
    expect(msg.appGuid).to.equal('app')
    expect(msg.instanceGuid).to.equal('app')
    expect(msg.message.name).to.equal('app.ready')
  })

  it('routes controls to the intended instance client only', () => {
    const other = client.instance('other')
    receive({ origin, source, data: { key: 'zaf.diagnostics.start', instanceGuid: 'other', message: start() } })
    expect(client.instrument('app.ready')).to.equal(false)
    expect(other.instrument('app.ready')).to.equal(true)
    expect(observations()[0].instanceGuid).to.equal('other')
  })

  ;['get', 'set', 'invoke'].forEach(operation => {
    it('preserves ' + operation + ' results and records resolved per-path errors', () => {
      event('diagnostics.start', start())
      const promise = operation === 'get' ? client.get(['ticket']) : operation === 'set' ? client.set({ ticket: 'x' }) : client.invoke({ ticket: [] })
      const request = source.postMessage.args.map(args => JSON.parse(args[0])).find(msg => msg.request === operation)
      const result = { errors: { ticket: { name: 'Error', message: 'private' } } }
      receive({ origin, source, data: { id: request.id, result } })
      return promise.then(value => {
        expect(value).to.equal(result)
        const span = observations().find(msg => msg.message.name === 'sdk.roundtrip').message
        expect(span.outcome).to.equal('error')
        expect(span.attributes).to.eql({ operation })
        expect(JSON.stringify(span)).not.to.contain('private')
      })
    })
  })

  it('does not instrument ordinary API calls on a legacy host', () => {
    const promise = client.get('ticket')
    const request = source.postMessage.args.map(args => JSON.parse(args[0])).find(msg => msg.request === 'get')
    receive({ origin, source, data: { id: request.id, result: { ticket: 1 } } })
    return promise.then(result => {
      expect(result).to.eql({ ticket: 1 })
      expect(observations()).to.eql([])
    })
  })

  it('preserves singular per-path rejection and success behavior', () => {
    event('diagnostics.start', start())
    const promise = client.get('ticket')
    const request = source.postMessage.args.map(args => JSON.parse(args[0])).find(msg => msg.request === 'get')
    receive({ origin, source, data: { id: request.id, result: { errors: { ticket: { name: 'Error', message: 'private' } } } } })
    return promise.then(() => { throw new Error('expected rejection') }, error => {
      expect(error.message).to.equal('private')
      expect(observations().find(msg => msg.message.name === 'sdk.roundtrip').message.outcome).to.equal('error')
      source.postMessage.resetHistory()
      const success = client.get('ticket')
      const next = source.postMessage.args.map(args => JSON.parse(args[0])).find(msg => msg.request === 'get')
      receive({ origin, source, data: { id: next.id, result: { ticket: 1 } } })
      return success.then(result => {
        expect(result).to.eql({ ticket: 1 })
        expect(observations().find(msg => msg.message.name === 'sdk.roundtrip').message.outcome).to.equal('success')
      })
    })
  })

  it('preserves rejection semantics and records host rejection', () => {
    event('diagnostics.start', start())
    const promise = client.get('ticket')
    const request = source.postMessage.args.map(args => JSON.parse(args[0])).find(msg => msg.request === 'get')
    receive({ origin, source, data: { id: request.id, error: { name: 'Error', message: 'private' } } })
    return promise.then(() => { throw new Error('expected rejection') }, error => {
      expect(error.message).to.equal('private')
      expect(observations().find(msg => msg.message.name === 'sdk.roundtrip').message.outcome).to.equal('error')
    })
  })
})
