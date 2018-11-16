var Promise = window.Promise || require('native-promise-only')

function isObject (obj) {
  return (obj !== null && typeof obj === 'object')
}

function decode (s) {
  return decodeURIComponent((s || '').replace(/\+/g, ' '))
}

function queryParameters (queryString) {
  queryString = queryString || ''

  var result = {}
  var keyValuePairs
  var keyAndValue
  var key
  var value

  if (queryString.search(/\?|#/) === 0) {
    queryString = queryString.slice(1)
  }

  if (queryString.length === 0) { return result }

  keyValuePairs = queryString.split('&')

  for (var i = 0; i < keyValuePairs.length; i++) {
    keyAndValue = keyValuePairs[i].split('=')
    key = decode(keyAndValue[0])
    value = decode(keyAndValue[1]) || ''
    result[key] = value
  }

  return result
}

function isPromise (obj) {
  return obj instanceof Promise ||
    (!!obj && obj.then && typeof obj.then === 'function')
}

function shouldReject (val) {
  return val === false ||
    val instanceof Error ||
    typeof val === 'string'
}

function isString (key) {
  return typeof key === 'string'
}

// When receives a list of things to wrap as Promises.
// it will then wait for:
//  a) all to settle
//  b) first to reject
//  c) first to settle with a falsy value
// c) is sub-optimal, since it has a specific narrow use-case
// for save hooks
function when (items) {
  items = items || []
  var resolveAll
  var rejectAll
  var allResolvedPromise = new Promise(function (resolve, reject) {
    resolveAll = resolve
    rejectAll = reject
  })
  var remaining = 0
  var settledWith = []
  var itemsCopy = Array.isArray(items)
    ? items.slice()
    : [items]
  var resolveWith = function (data, index) {
    settledWith[index] = data

    if (--remaining <= 0) {
      resolveAll(settledWith)
    }
  }

  remaining = itemsCopy.length

  if (remaining <= 0) {
    resolveAll()
    return allResolvedPromise
  }

  itemsCopy.forEach(function (item, index) {
    var promise

    if (isPromise(item)) {
      promise = item
    } else if (typeof item === 'function') {
      var res
      try {
        res = item()
        if (isPromise(res)) {
          promise = res
        } else if (shouldReject(res)) {
          promise = Promise.reject(res)
        } else {
          promise = Promise.resolve(res)
        }
      } catch (err) {
        promise = Promise.reject(err)
      }
    } else {
      promise = new Promise(function (resolve, reject) {
        shouldReject(item)
          ? reject(item)
          : resolve(item)
      })
    }
    promise.then(
      function (data) {
        resolveWith(data, index)
      }
    ).catch(rejectAll.bind(rejectAll))
  })

  return allResolvedPromise
}

module.exports = {
  queryParameters: queryParameters,
  when: when,
  isString: isString,
  isObject: isObject
}
