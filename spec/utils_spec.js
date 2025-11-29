/* eslint-env mocha */
/* global expect Promise */
import * as Utils from '../lib/utils'
import pkgJson from '../package.json'

describe('Utils', () => {
  let params

  describe('.queryParameters', () => {
    it('returns a key -> value hash for query parameters', () => {
      [
        { queryStr: 'foo=0&bar=1&baz', tests: { foo: '0', bar: '1', baz: '' } },
        { queryStr: 'foo=http://foo.com', tests: { foo: 'http://foo.com' } },
        { queryStr: 'fooBar=A2&fooBar=A3', tests: { fooBar: 'A3' } },
        { queryStr: 'fooBar=A2&', tests: { fooBar: 'A2' } },
        { queryStr: '?foo=0&bar=1&baz', tests: { foo: '0', bar: '1', baz: '' } },
        { queryStr: '?foo=http://foo.com', tests: { foo: 'http://foo.com' } },
        { queryStr: '#foo=0&bar=1&baz', tests: { foo: '0', bar: '1', baz: '' } },
        { queryStr: '#foo=http://foo.com', tests: { foo: 'http://foo.com' } }
      ].forEach((testCase) => {
        params = Utils.queryParameters(testCase.queryStr)
        Object.keys(testCase.tests).forEach((key) => {
          expect(params[key]).to.equal(testCase.tests[key])
        })
      })
    })
  })

  describe('.when', () => {
    it('should resolve the promise when called with no arguments', (done) => {
      expect(Utils.when()).to.eventually.be.fulfilled.and.notify(done)
    })

    describe('with primitive values passed in', () => {
      it('should resolve the promise if the values are truthy, and not a string', (done) => {
        expect(Utils.when([1, 2, true])).to.eventually.be.fulfilled.and.notify(done)
      })

      it('should reject the promise if any of the values are falsy, including a string', (done) => {
        expect(Utils.when([1, 2, 'a'])).to.eventually.be.rejected.and.notify(done)
      })

      it('should reject the promise if any of the values are falsy, other than a string', (done) => {
        expect(Utils.when([1, 2, false])).to.eventually.be.rejected.and.notify(done)
      })

      it('should reject the promise with a string value, when present', (done) => {
        expect(Utils.when(['a'])).to.eventually.be.rejectedWith('a').and.notify(done)
      })

      it('should reject the promise with the first string value, when multiple are present', (done) => {
        expect(Utils.when(['a', 'b'])).to.eventually.be.rejectedWith('a').and.notify(done)
      })
    })

    describe('with one or more functions passed in', () => {
      it('should reject when any of the functions returns false', (done) => {
        expect(Utils.when([
          () => { return false },
          () => { return true }
        ])).to.eventually.be.rejected.and.notify(done)
      })

      it('should reject with a string, when any of the functions returns a string', (done) => {
        expect(Utils.when([
          () => { return 'Awful mistake' },
          () => { return true }
        ])).to.eventually.be.rejectedWith('Awful mistake').and.notify(done)
      })

      it('should resolve if all of the functions return true', (done) => {
        expect(Utils.when([
          () => { return true },
          () => { return true }
        ])).to.eventually.be.fulfilled.and.notify(done)
      })
    })

    describe('with one or more promises passed in', () => {
      let allDone
      beforeEach(() => {
        allDone = false
      })

      it('should resolve only when all promises have resolved', (done) => {
        Utils.when([
          new Promise((resolve) => { setTimeout(resolve, 10) }),
          new Promise((resolve) => {
            setTimeout(() => {
              allDone = true
              resolve()
            }, 20)
          })
        ]).then(() => {
          expect(allDone).to.be.true()
          done()
        })
      })

      it('should resolve with the data for all of the promises', (done) => {
        Utils.when([
          new Promise((resolve) => { setTimeout(() => { resolve('a') }, 10) }),
          new Promise((resolve) => { setTimeout(() => { resolve(42) }, 20) })
        ]).then((data) => {
          expect(data).to.eql(['a', 42])
          done()
        })
      })

      it('should reject when the first promise rejects', (done) => {
        Utils.when([
          new Promise((resolve, reject) => { reject(new Error()) }),
          new Promise((resolve) => {
            setTimeout(() => {
              allDone = true
              resolve()
            }, 100)
          })
        ]).catch(() => {
          expect(allDone).to.be.false()
          done()
        })
      })

      it('should reject with the value the first promise rejects with', (done) => {
        Utils.when([
          new Promise((resolve, reject) => {
            reject(new Error('boo'))
          }),
          new Promise((resolve, reject) => {
            reject(new Error('boo 2'))
          })
        ]).catch((err) => {
          expect(err.message).to.eql('boo')
          done()
        })
      })
    })
  })

  describe('.isObject', () => {
    it('returns false for null', () => {
      expect(Utils.isObject(null)).to.equal(false)
    })
    it('returns true for objects', () => {
      expect(Utils.isObject({})).to.equal(true)
    })
    it('returns false for strings', () => {
      expect(Utils.isObject('a')).to.equal(false)
    })
    it('returns true for arrays', () => {
      expect(Utils.isObject(['a'])).to.equal(true)
    })
  })

  describe('.updateUserAgentWithAppId', () => {
    before(() => {
      // Mock pkgJson
      global.pkgJson = { version: '1.0.0' }
    })

    describe('with a valid app id', () => {
      let appId

      beforeEach(() => {
        appId = '1'
      })

      it('should append the app id to the user agent', () => {
        const headers = { 'User-Agent': 'Mozilla/5.0' }
        const updatedHeaders = Utils.updateUserAgentWithAppId(headers, appId)
        const expectedUserAgent = `Mozilla/5.0 zendesk_app_framework_sdk/sdk_version:${pkgJson.version}/app_id:${appId}`
        expect(updatedHeaders['User-Agent']).to.equal(expectedUserAgent)
      })

      it('should handle an undefined headers object', () => {
        const updatedHeaders = Utils.updateUserAgentWithAppId(undefined, appId)
        const expectedUserAgent = `zendesk_app_framework_sdk/sdk_version:${pkgJson.version}/app_id:${appId}`
        expect(updatedHeaders['User-Agent']).to.equal(expectedUserAgent)
      })

      it('should handle a headers object with no User-Agent', () => {
        const headers = {}
        const updatedHeaders = Utils.updateUserAgentWithAppId(headers, appId)
        const expectedUserAgent = `zendesk_app_framework_sdk/sdk_version:${pkgJson.version}/app_id:${appId}`
        expect(updatedHeaders['User-Agent']).to.equal(expectedUserAgent)
      })
    })

    describe('with an undefined app id', () => {
      it('should not append the app id to the user agent', () => {
        const headers = { 'User-Agent': 'Mozilla/5.0' }
        const updatedHeaders = Utils.updateUserAgentWithAppId(headers)
        expect(updatedHeaders['User-Agent']).to.equal('Mozilla/5.0')
      })

      it('should handle an undefined headers object', () => {
        const updatedHeaders = Utils.updateUserAgentWithAppId()
        expect(updatedHeaders).to.be.undefined()
      })

      it('should handle a headers object with no User-Agent', () => {
        const headers = {}
        const updatedHeaders = Utils.updateUserAgentWithAppId(headers)
        expect(updatedHeaders['User-Agent']).to.equal(undefined)
      })
    })
  })
})
