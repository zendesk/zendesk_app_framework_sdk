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
    val instanceof Error ||
    typeof val === 'string';
}

// When receives a list of things to wrap as Promises.
// it will then wait for:
//  a) all to settle
//  b) first to reject
//  c) first to settle with a falsy value
// c) is sub-optimal, since it has a specific narrow use-case
// for save hooks
function when(items) {
  items = items || [];
  var resolveAll, rejectAll,
      allResolvedPromise = new Promise(function(resolve, reject) {
        resolveAll = resolve;
        rejectAll = reject;
      });

  var remaining = 0,
      settledWith = [],
      itemsCopy = Array.isArray(items) ?
        items.slice() :
        [items];

  var resolveWith = function(data, index) {
    settledWith[index] = data;

    if (--remaining <= 0) {
      resolveAll(settledWith);
    }
  };

  remaining = itemsCopy.length;

  if (remaining <= 0) {
    resolveAll();
    return allResolvedPromise;
  }

  itemsCopy.forEach(function(item, index) {
    var promise;
    if (isPromise(item)) {
      promise = item;
    } else if (typeof item === 'function') {
      var res;
      try {
        res = item();
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
        isFalsy(item) ?
          reject(item) :
          resolve(item);
      });
    }
    promise.then(
      function(data) {
        resolveWith(data, index);
      }
    ).catch(rejectAll.bind(rejectAll));
  });

  return allResolvedPromise;
}

module.exports = {
  queryParameters: queryParameters,
  when: when
};
