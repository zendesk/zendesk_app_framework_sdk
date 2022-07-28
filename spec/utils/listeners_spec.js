/* eslint-env mocha */
/* global expect Promise */
import Listeners from '../../lib/utils/listeners'
import sinon from 'sinon'

describe('Listeners', () => {
  let fn1, fn2, listeners

  beforeEach(() => {
    fn1 = sinon.spy()
    fn2 = sinon.spy()
    listeners = new Listeners()
  })

  it('calls added listeners with arguments', () => {
    listeners.add(fn1)
    listeners.add(fn2)

    listeners.call('hello', 123)
    expect(fn1).to.have.been.calledWith('hello', 123)
    expect(fn2).to.have.been.calledWith('hello', 123)
  })

  it('does not call removed listeners', () => {
    const removeListener1 = listeners.add(fn1)

    listeners.add(fn2)
    removeListener1()
    listeners.call()
    expect(fn1).to.have.callCount(0)
    expect(fn2).to.have.callCount(1)
  })

  it('only call listener once when added multiple time', () => {
    const removeListener1 = listeners.add(fn1)
    expect(typeof removeListener1).to.equal('function')

    const removeListener2 = listeners.add(fn1)
    expect(typeof removeListener2).to.equal('function')

    listeners.call()
    expect(fn1).to.have.callCount(1)
  })

  it('removing duplicated listeners still calls the listener once until all listeners have been removed', () => {
    const removeListener1 = listeners.add(fn1)
    const removeListener2 = listeners.add(fn1)
    const removeListener3 = listeners.add(fn1)
    // listeners -> [{ fn: fn1, count: 3 }]

    listeners.call()
    expect(fn1).to.have.callCount(1)

    removeListener3()
    // listeners -> [{ fn: fn1, count: 2 }]
    listeners.call()
    expect(fn1).to.have.callCount(2)

    removeListener1()
    // listeners -> [{ fn: fn1, count: 1 }]
    listeners.call()
    expect(fn1).to.have.callCount(3)

    removeListener2()
    // listeners -> []
    listeners.call()
    expect(fn1).to.have.callCount(3)
  })
})
