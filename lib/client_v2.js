import Client from './client'

const _cache = {}
export const tools = {
  unqiue: function (obj) {
    return Object.keys(obj).map((key) => {
      const value = obj[key]
      return (typeof value === 'object') ? tools.unqiue(value) : `${key}:${value}`
    }).join(' ')
  },

  cache: function (key, value) {
    if (value === undefined) {
      return _cache[key]
    } else {
      _cache[key] = value
      return value
    }
  }
}

export default class ClientV2 extends Client {
  get (stringOrArray) {
    if (typeof stringOrArray !== 'string' && !Array.isArray(stringOrArray)) {
      throw new Error('Type for get not supported, get expects String or Array of Strings')
    }

    return super.get(stringOrArray).then((data) => {
      let error, str, arr

      if (typeof stringOrArray === 'string') {
        str = stringOrArray
      } else {
        arr = stringOrArray
      }

      if (str) {
        if (data[str]) {
          return data[str]
        } else if (data.errors[str]) {
          error = new Error(data.errors[str].message)
          return error
        }
      } else {
        return arr.reduce((returnValue, key) => {
          if (data[key]) {
            returnValue.push(data[key])
          } else if (data.errors[key]) {
            error = new Error(data.errors[key].message)
            returnValue.push(error)
          } else {
            returnValue.push(undefined)
          }
          return returnValue
        }, [])
      }
    })
  }

  request (obj) {
    const isCached = !!obj.cachable
    delete obj.cachable
    const cacheName = tools.unqiue(obj)

    if (isCached) return tools.cache(cacheName) || tools.cache(cacheName, super.request(obj))
    else return super.request(obj)
  }
}
