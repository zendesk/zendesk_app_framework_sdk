/* eslint-env mocha */
/* global expect */
import ZAFClient from '../lib/index'
import sinon from 'sinon'

describe('ZAFClient', () => {
  const sandbox = sinon.createSandbox()

  afterEach(() => {
    sandbox.restore()
  })

  describe('.init', () => {
    describe('given origin and app_guid are missing', () => {
      it("won't create a Client instance", () => {
        expect(ZAFClient.init()).to.equal(false)
      })
    })
  })
})
