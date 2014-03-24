var Serializable = function(obj) {
  Object.keys(obj).forEach(function(key) {
    this[key] = obj[key];
  }, this);
};

Serializable.prototype.toString = function() { return JSON.stringify(this); };

module.exports = Serializable;
