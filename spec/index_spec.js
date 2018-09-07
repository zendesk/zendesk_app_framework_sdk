/* eslint-env mocha */
/* global expect */
import ZAFClient from '../lib/index'
import sinon from 'sinon'

describe('ZAFClient', function () {
  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

  describe('.init', function () {
    describe('given origin and app_guid are missing', function () {
      it("won't create a Client instance", function () {
        expect(ZAFClient.init()).to.equal(false)
      })
    })
  })
})
