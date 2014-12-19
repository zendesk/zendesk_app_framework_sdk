describe('Utils', function() {

  var Utils = require('utils'),
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

});
