/* eslint-env mocha */
import Tracker from '../lib/tracker'
import sinon from 'sinon'

describe('App Tracking', () => {
  const sandbox = sinon.createSandbox()
  const client = { invoke: () => {} }
  let tracker = null

  beforeEach(() => {
    sandbox.stub(client, 'invoke')
    tracker = new Tracker(client)
    tracker.setup()
  })

  afterEach(() => {
    sandbox.restore()
  })

  context('when the mouseout event is triggered', () => {
    let clock

    beforeEach(() => {
      clock = sinon.useFakeTimers()
    })

    afterEach(() => {
      clock.restore()
    })

    function causeMouseEvents (time) {
      tracker.handleMouseEnter()
      clock.tick(time)
      tracker.handleMouseLeave()
    }

    context('when < 200ms between mouseover and mouseout', () => {
      it('does not invoke the track callback', () => {
        causeMouseEvents(150)
        sinon.assert.notCalled(client.invoke)
      })
    })

    context('when >= 200ms between mouseover and mouseout', () => {
      it('invokes the track callback at 200', () => {
        causeMouseEvents(200)
        sinon.assert.calledOnce(client.invoke)
      })

      it('invokes the track callback at > 200', () => {
        causeMouseEvents(300)
        sinon.assert.calledOnce(client.invoke)
      })
    })
  })
})
