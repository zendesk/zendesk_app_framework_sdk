describe('Utils', function() {

  var Promise = window.Promise || require('../vendor/native-promise-only'),
      Utils = require('utils'),
      params;

  describe('.queryParameters', function() {

    it('returns a key -> value hash for query parameters', function() {
      [
        { queryStr: 'foo=0&bar=1&baz',      tests: { foo: '0', bar: '1', baz: '' } },
        { queryStr: 'foo=http://foo.com',   tests: { foo: 'http://foo.com' } },
        { queryStr: 'fooBar=A2&fooBar=A3',  tests: { fooBar: 'A3' } },
        { queryStr: 'fooBar=A2&',           tests: { fooBar: 'A2' } }
      ].forEach(function(testCase) {
        params = Utils.queryParameters(testCase.queryStr);
        Object.keys(testCase.tests).forEach(function(key) {
          expect(params[key]).to.equal(testCase.tests[key]);
        });
      });
    });

  });

  describe('.when', function() {

    it('should return a promise when called', function() {
      expect(Utils.when()).to.be.a.promise;
    });

    it('should resolve the promise when called with no arguments', function(done) {
      expect(Utils.when()).to.eventually.be.fulfilled.and.notify(done);
    });

    describe('with primitive values passed in', function() {

      it('should resolve the promise if the values are truthy, and not a string', function(done) {
        expect(Utils.when([1, 2, true])).to.eventually.be.fulfilled.and.notify(done);
      });

      it('should reject the promise if any of the values are falsy, including a string', function(done) {
        expect(Utils.when([1, 2, 'a'])).to.eventually.be.rejected.and.notify(done);
      });

      it('should reject the promise if any of the values are falsy, other than a string', function(done) {
        expect(Utils.when([1, 2, false])).to.eventually.be.rejected.and.notify(done);
      });

      it('should reject the promise with a string value, when present', function(done) {
        expect(Utils.when(['a'])).to.eventually.be.rejectedWith('a').and.notify(done);
      });

      it('should reject the promise with the first string value, when multiple are present', function(done) {
        expect(Utils.when(['a', 'b'])).to.eventually.be.rejectedWith('a').and.notify(done);
      });

    });

    describe('with one or more functions passed in', function() {
      it('should reject when any of the functions returns false', function(done) {
        expect(Utils.when([
          function() { return false; },
          function() { return true; }
        ])).to.eventually.be.rejected.and.notify(done);
      });

      it('should reject with a string, when any of the functions returns a string', function(done) {
        expect(Utils.when([
          function() { return 'Awful mistake'; },
          function() { return true; }
        ])).to.eventually.be.rejectedWith('Awful mistake').and.notify(done);
      });

      it('should resolve if all of the functions return true', function(done) {
        expect(Utils.when([
          function() { return true; },
          function() { return true; }
        ])).to.eventually.be.fulfilled.and.notify(done);
      });
    });

    describe('with one or more promises passed in', function() {
      var allDone;
      beforeEach(function() {
        allDone = false;
      });

      it('should resolve only when all promises have resolved', function(done) {
        Utils.when([
          new Promise(function(res) { setTimeout(res, 10); }),
          new Promise(function(res) { setTimeout(function() {
            allDone = true;
            res();
          }, 20); })
        ]).then(function() {
          expect(allDone).to.be.true;
          done();
        });
      });

      it('should resolve with the data for all of the promises', function(done) {
        Utils.when([
          new Promise(function(res) { setTimeout(function() { res('a'); }, 10); }),
          new Promise(function(res) { setTimeout(function() { res(42); }, 20); })
        ]).then(function(data) {
          expect(data).to.eql(['a', 42]);
          done();
        });
      });

      it('should reject when the first promise rejects', function(done) {
        Utils.when([
          new Promise(function(_, rej) { rej(); }),
          new Promise(function(res) { setTimeout(function() {
            allDone = true;
            res();
          }, 100); })
        ]).catch(function() {
          expect(allDone).to.be.false;
          done();
        });
      });

      it('should reject with the value the first promise rejects with', function(done) {
        Utils.when([
          new Promise(function(_, rej) {
            rej('boo');
          }),
          new Promise(function(_, rej) {
            rej('boo 2');
          })
        ]).catch(function(msg) {
          expect(msg).to.eql('boo');
          done();
        });
      });

    });

  });

  describe('.isObject', function() {
    it('returns false for null', function() {
      expect(Utils.isObject(null)).to.equal(false);
    });
    it('returns true for objects', function() {
      expect(Utils.isObject({})).to.equal(true);
    });
    it('returns false for strings', function() {
      expect(Utils.isObject('a')).to.equal(false);
    });
    it('returns true for arrays', function() {
      expect(Utils.isObject(['a'])).to.equal(true);
    });
  });
});
