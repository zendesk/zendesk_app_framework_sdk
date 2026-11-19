// Experimental cooperative diagnostics. No collection or buffering before host opt-in.
const NAMES = ['app.ready', 'app.operation', 'sdk.roundtrip', 'iframe.error', 'iframe.unhandledrejection', 'iframe.resource', 'iframe.click', 'iframe.longtask', 'iframe.long-animation-frame']
const OUTCOMES = ['success', 'error', 'timeout', 'cancelled', 'unknown']
const NUMBERS = ['count', 'durationMs', 'transferSize', 'encodedBodySize', 'decodedBodySize']
const OPERATIONS = ['get', 'set', 'invoke', 'request']
const INITIATORS = ['fetch', 'xmlhttprequest', 'script', 'css', 'img', 'other']
export const MAX_EVENTS = 500
export const MAX_DURATION_MS = 60000
const MAX_NUMBER = 1000000000

function numeric (value) {
  return typeof value === 'number' && isFinite(value) && value >= 0 && value <= MAX_NUMBER
}

function object (value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function control (data) {
  return object(data) && data.schemaVersion === '1.0' && typeof data.captureId === 'string' && data.captureId.length > 0 && data.captureId.length <= 128
}

// Unknown keys are dropped; invalid known values reject the observation.
function payload (name, options) {
  if (NAMES.indexOf(name) === -1 || !object(options)) return null
  const result = { name }
  if (options.durationMs !== undefined) {
    if (!numeric(options.durationMs)) return null
    result.durationMs = options.durationMs
  }
  if (options.outcome !== undefined) {
    if (OUTCOMES.indexOf(options.outcome) === -1) return null
    result.outcome = options.outcome
  }
  if (options.attributes !== undefined) {
    if (!object(options.attributes)) return null
    const attrs = {}
    for (const key of NUMBERS) {
      if (options.attributes[key] !== undefined) {
        if (!numeric(options.attributes[key])) return null
        attrs[key] = options.attributes[key]
      }
    }
    if (options.attributes.hidden !== undefined) {
      if (typeof options.attributes.hidden !== 'boolean') return null
      attrs.hidden = options.attributes.hidden
    }
    for (const pair of [['operation', OPERATIONS], ['initiatorType', INITIATORS]]) {
      const value = options.attributes[pair[0]]
      if (value !== undefined) {
        if (pair[1].indexOf(value) === -1) return null
        attrs[pair[0]] = value
      }
    }
    result.attributes = attrs
  }
  return result
}

export default class Diagnostics {
  constructor (client) {
    this.client = client
    this.active = null
    client.on('diagnostics.start', data => this.start(data))
    client.on('diagnostics.stop', data => {
      if (control(data) && this.active && data.captureId === this.active.captureId) this.stop()
    })
  }

  start (data) {
    if (!this.client.ready || !control(data) || !numeric(data.maxEvents) || data.maxEvents < 1 || !numeric(data.maxDurationMs) || data.maxDurationMs < 1) return
    // Duplicate start cannot extend a capture's deadline or replenish its budget.
    if (this.lastCaptureId === data.captureId) return
    this.lastCaptureId = data.captureId
    this.stop()
    const duration = Math.min(data.maxDurationMs, MAX_DURATION_MS)
    const state = this.active = {
      captureId: data.captureId,
      remaining: Math.min(Math.floor(data.maxEvents), MAX_EVENTS),
      deadline: Date.now() + duration,
      cleanup: [],
      counts: Object.create(null),
      resources: 0
    }
    state.cleanup.push(() => clearTimeout(state.timeout), () => clearInterval(state.interval))
    state.timeout = setTimeout(() => this.stop(), duration)
    state.interval = setInterval(() => {
      state.resources = 0
      const counts = state.counts
      state.counts = Object.create(null)
      Object.keys(counts).forEach(name => this.emit(name, { attributes: { count: counts[name] } }))
    }, 1000)
    const listen = (target, name, handler) => {
      target.addEventListener(name, handler, true)
      state.cleanup.push(() => target.removeEventListener(name, handler, true))
    }
    const count = name => { state.counts[name] = Math.min((state.counts[name] || 0) + 1, MAX_NUMBER) }
    listen(window, 'error', () => count('iframe.error'))
    listen(window, 'unhandledrejection', () => count('iframe.unhandledrejection'))
    listen(document, 'click', () => count('iframe.click'))
    listen(window, 'pagehide', () => this.stop())
    const perf = window.performance
    try {
      const entries = perf && perf.getEntriesByType && perf.getEntriesByType('navigation')
      if (entries && entries[0]) this.resource(entries[0])
    } catch (e) { /* Navigation Timing is optional. */ }
    const Observer = window.PerformanceObserver
    const supported = Observer && Observer.supportedEntryTypes
    if (!supported) return
    ;['resource', 'longtask', 'long-animation-frame'].forEach(type => {
      if (!this.active || supported.indexOf(type) === -1) return
      let observer
      try {
        observer = new Observer(list => {
          if (this.active !== state) return
          const entries = list.getEntries()
          for (let i = 0; i < entries.length && i < 20 && this.active === state; i++) {
            if (type === 'resource') this.resource(entries[i])
            else this.emit('iframe.' + type, { durationMs: entries[i].duration })
          }
        })
        observer.observe({ type, buffered: false })
        state.cleanup.push(() => observer.disconnect())
      } catch (e) {
        if (observer) observer.disconnect()
      }
    })
  }

  resource (entry) {
    const state = this.active
    if (!state || state.resources++ >= 20) return
    const attributes = { initiatorType: INITIATORS.indexOf(entry.initiatorType) === -1 ? 'other' : entry.initiatorType }
    ;['transferSize', 'encodedBodySize', 'decodedBodySize'].forEach(key => {
      if (numeric(entry[key])) attributes[key] = entry[key]
    })
    this.emit('iframe.resource', { durationMs: entry.duration, attributes })
  }

  stop () {
    const state = this.active
    this.active = null
    if (state) state.cleanup.forEach(cleanup => cleanup())
  }

  emit (name, options = {}) {
    const state = this.active
    if (!state || !this.client.ready || state.remaining <= 0) return false
    if (Date.now() >= state.deadline) {
      this.stop()
      return false
    }
    try {
      const event = payload(name, options)
      if (!event) return false
      const exhausted = --state.remaining <= 0
      try {
        event.schemaVersion = '1.0'
        event.captureId = state.captureId
        this.client.postMessage('diagnostics.instrument', event)
      } finally {
        if (exhausted && this.active === state) this.stop()
      }
      return true
    } catch (e) {
      // Diagnostics must never change app API/promise behavior.
      return false
    }
  }

  roundtrip (operation) {
    const state = this.active
    if (!state || !this.client.ready) return () => {}
    const start = window.performance.now()
    return (result, rejected, timedOut) => {
      if (this.active !== state) return
      const errors = result && result.errors
      this.emit('sdk.roundtrip', {
        durationMs: Math.max(0, window.performance.now() - start),
        outcome: timedOut ? 'timeout' : rejected || (errors && Object.keys(errors).length > 0) ? 'error' : 'success',
        attributes: { operation }
      })
    }
  }
}
