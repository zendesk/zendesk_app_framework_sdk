/* eslint-env mocha */
/* global expect */
import ZAFClient from '../lib/index'
import Client from '../lib/client'
import sinon from 'sinon'

describe('ZAFClient', () => {
  const sandbox = sinon.createSandbox()

  afterEach(() => {
    sandbox.restore()
  })

  describe('.init', () => {
    describe('given origin and app_guid exist', () => {
      describe('when a callback is passed', () => {
        const callback = function () { return 'abcxyz' }
        callback.bind = function () { return callback }

        beforeEach(() => {
          sandbox.spy(Client.prototype, 'on')
          ZAFClient.init(callback, { hash: 'origin=https://subdomain.zendesk.com&app_guid=A2' })
        })

        it('binds the callback to app.registered', () => {
          const callbackMatcher = sinon.match((cb) => {
            // performs an identity check, meaning that bind must be stubbed to return the same method
            return cb === callback
          }, 'wrong callback')
          expect(Client.prototype.on).to.have.been.calledWith('app.registered', callbackMatcher)
        })
      })
    })

    describe('given origin and app_guid are missing', () => {
      it("won't create a Client instance", () => {
        expect(ZAFClient.init()).to.equal(false)
      })
    })
  })
})
