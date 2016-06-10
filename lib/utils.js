var Promise = window.Promise || require('../vendor/native-promise-only');

function decode(s) {
  return decodeURIComponent((s || '').replace( /\+/g, " " ));
}

function queryParameters(queryString) {
  var result = {},
      keyValuePairs,
      keyAndValue,
      key,
      value;

  queryString = queryString ||
    ( document.location.search || '' ).slice(1);

  if (queryString.length === 0) { return result; }

  keyValuePairs = queryString.split('&');

  for (var i = 0; i < keyValuePairs.length; i++) {
    keyAndValue = keyValuePairs[i].split('=');
    key   = decode(keyAndValue[0]);
    value = decode(keyAndValue[1]) || '';
    result[key] = value;
  }

  return result;
}

function isPromise(obj) {
  return obj instanceof Promise ||
    !!obj && obj.then && typeof obj.then === 'function';
}

function isFalsy(val) {
  return !val ||
    val === false ||
    val instanceof Error ||
    typeof val === 'string';
}

// items should be a list
function when(items) {
  var resolveAll, rejectAll,
      allResolvedPromise = new Promise(function(resolve, reject) {
        resolveAll = resolve;
        rejectAll = reject;
      });

  var remaining = 0,
      settledWith = [],
      list = Array.isArray(items) ?
        items.slice() : 
        [items];

  var resolveWith = function(data, index) {
    settledWith[index] = data;

    if (--remaining <= 0) {
      resolveAll(settledWith);
    }
  };

  remaining = list.length;

  list.map(function(listItem, index) {
    var promise;
    if (isPromise(listItem)) {
      console.log('Already a Promise!');
      promise = listItem;
    } else if (typeof listItem === 'function') {
      var res;
      try {
        res = listItem();
        if (isPromise(res)) {
          promise = res;
        } else {
          promise = new Promise(function(resolve) {
            resolve(res);
          });
        }
      } catch(err) {
        promise = new Promise(function(resolve, reject) {
          reject(err);
        });
      }
    } else {
      promise = new Promise(function(resolve, reject) {
        isFalsy(listItem) ?
          reject(listItem) :
          resolve(listItem);
      });
    }
    promise.then(
      function(data) {
        resolveWith(data, index);
      }
    ).catch(rejectAll);
    return promise;
  });

  return allResolvedPromise;
}

module.exports = {
  queryParameters: queryParameters,
  when: when
};
