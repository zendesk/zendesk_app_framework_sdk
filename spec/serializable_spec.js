describe('Serializable', function() {

  var Serializable = require('serializable'),
      source,
      subject;

  function createSubject(src) {
    subject = new Serializable(src);
    return subject;
  }

  it('copies properties from the source object to itself', function() {
    source = {
      foo: 'bar',
      bar: 2
    };
    createSubject(source);
    Object.keys(source).forEach(function(key) {
      expect(subject[key]).to.equal(source[key]);
      expect(subject).to.have.ownProperty(key);
    });
  });

  describe('#toString', function() {

    var jsonString;

    beforeEach(function() {
      source = {
        fooBar: 'quux',
        baz:    function() {}
      };
      jsonString = createSubject(source).toString();
    });

    it('returns a valid JSON String representation of itself', function() {
      expect(jsonString).to.match(/^{.*}$/);
      expect(function() {
        JSON.parse(jsonString);
      }).to.not.throw();
    });

    it('ignores Function properties when serializing', function() {
      expect(JSON.parse(jsonString)).to.not.have.ownProperty('baz');
    });

    it('ignores properties not defined directly on the source object', function() {
      source = Object.create({ foo: 2 });
      jsonString = createSubject(source).toString();
      expect(jsonString).to.not.match(/"foo":/);
    });

  });

});
