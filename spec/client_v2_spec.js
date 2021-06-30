/* eslint-env mocha */
/* globals assert */
import ClientV2, { tools } from '../lib/client_v2'
import sinon from 'sinon'

describe('ClientV2', () => {
  const sandbox = sinon.createSandbox()
  const origin = 'https://foo.zendesk.com'
  const appGuid = 'ABC123'
  let subject, source

  before(() => {
    sandbox.stub(window, 'addEventListener')
    sandbox.stub(window, 'postMessage')
    source = { postMessage: sandbox.stub() }
    subject = new ClientV2({ origin, appGuid, source })
  })

  after(() => {
    sandbox.restore()
  })

  describe('request', () => {
    let cacheSpy

    before(() => {
      cacheSpy = sandbox.stub(tools, 'cache')
    })

    it('1', () => {
      subject.request({
        url: '/api/v2/tickets',
        cachable: true
      })
      assert(cacheSpy.withArgs('url:/api/v2/tickets').called)
    })

    it('2', () => {
      subject.request({
        type: 'get',
        url: '/api/v2/tickets',
        cachable: true
      })
      assert(cacheSpy.withArgs('type:get url:/api/v2/tickets').called)
    })

    it('3', () => {
      subject.request({
        url: '/api/v2/tickets',
        data: {
          test: true
        },
        cachable: true
      })
      assert(cacheSpy.withArgs('url:/api/v2/tickets test:true').called)
    })

    it('4', () => {
      subject.request({
        url: '/api/v2/tickets',
        data: {
          test: true
        },
        other: function () {},
        cachable: true
      })
      assert(cacheSpy.withArgs('url:/api/v2/tickets test:true other:function () {}').called)
    })
  })
})
