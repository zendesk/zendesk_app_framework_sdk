describe('Utils', function() {

  var Utils = require('utils');

  describe('.location', function() {

    it('returns the value of window.location', function() {
      expect(Utils.location()).to.equal(window.location);
    });

  });

});
