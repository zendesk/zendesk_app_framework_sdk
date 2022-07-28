/* eslint-env mocha, browser */
/* global expect Promise */
import IdleState from '../../lib/utils/idleState'
import sinon from 'sinon'

describe('idleState', () => {
  describe('addObserver()', () => {
    it('markActive calls observers 1 time', () => {
      const idleState = new IdleState()
      const listener1 = sinon.spy()

      idleState.addObserver(listener1)
      idleState.markActive()
      expect(listener1).to.have.callCount(1)

      idleState.delete()
    })

    it('does not overwrite old listeners', () => {
      const idleState = new IdleState()
      const listener1 = sinon.spy()
      const listener2 = sinon.spy()

      idleState.addObserver(listener1)
      idleState.addObserver(listener2)
      idleState.markActive()

      expect(listener1).to.have.callCount(1)
      expect(listener2).to.have.callCount(1)

      idleState.delete()
    })
  })

  it('handles user events', () => {
    const events = ['keydown', 'wheel', 'mousedown', 'touchstart', 'touchmove']
    const idleState = new IdleState()
    const listener1 = sinon.spy()

    idleState.addObserver(listener1)

    for (const event of events) {
      listener1.resetHistory()
      document.dispatchEvent(new Event(event))
      expect(listener1).to.have.callCount(1)
    }

    idleState.delete()
  })

  it('handles focus changes', () => {
    const idleState = new IdleState()
    const listener1 = sinon.spy()

    idleState.addObserver(listener1)

    window.dispatchEvent(new Event('blur'))
    expect(listener1).to.have.callCount(0)

    window.dispatchEvent(new Event('focus'))
    expect(listener1).to.have.callCount(1)

    window.dispatchEvent(new Event('blur'))
    document.dispatchEvent(new Event('focus'))
    expect(listener1).to.have.callCount(1)

    idleState.delete()
  })

  it('ignores mousemove event', () => {
    const idleState = new IdleState()
    const listener1 = sinon.spy()

    idleState.addObserver(listener1)

    window.dispatchEvent(new Event('blur'))
    document.dispatchEvent(new Event('mousemove'))
    expect(listener1).to.have.callCount(0)

    idleState.delete()
  })

  it('handles visibility changes', () => {
    const originalDocumentHidden = document.hidden
    const idleState = new IdleState()
    const listener1 = sinon.spy()

    Object.defineProperty(document, 'hidden', {
      writable: true
    })

    idleState.addObserver(listener1)

    document.hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    document.dispatchEvent(new Event('keydown'))
    expect(listener1).to.have.callCount(0)

    document.hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    document.dispatchEvent(new Event('keydown'))
    expect(listener1).to.have.callCount(1)

    Object.defineProperty(document, 'hidden', {
      writable: false,
      value: originalDocumentHidden
    })
  })
})
