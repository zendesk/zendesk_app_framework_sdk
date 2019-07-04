export function stripActionArgs (action) {
  // Capture:
  // 1. single or multiple comma-delimited arguments following an initial colon, and
  // 2. non-whitelisted, unescaped words following a period (i.e. file extensions in the case of assetURL calls)
  const ACTION_ARGS = /:\w+(,?\w+)*((\.(show|hide|enable|disable))|(\\?\.\w*))?/g
  // Return :arg.field_modifier, where field modifier is (optionally) one of 'show', 'hide', 'enable' or 'disable'
  return action.replace(ACTION_ARGS, ':arg$3')
}

export function timeMsToSecondsRange (value, upperLimit = PROMISE_TIMEOUT_LONG) {
  if (value >= upperLimit) return `${upperLimit / 1000}-`
  const lowerRangeBound = value - (value % 10000)
  return `${lowerRangeBound / 1000}-${(lowerRangeBound + 10000) / 1000}`
}

export function collateActions (name, params) { return params.map(action => `${name}-${action}`) }

export default class Tracker {
  constructor (client) {
    this.startTime = Date.now()
    this.client = client
    this.MIN_HOVER_TIME = 200 // milliseconds
  }

  handleMouseEnter () {
    this.startTime = Date.now()
  }

  handleMouseLeave () {
    const overFor = Date.now() - this.startTime
    if (overFor >= this.MIN_HOVER_TIME) {
      this.client.postMessage('__track__', {
        event_name: 'app_interaction',
        event_type: 'hover',
        event_value: overFor
      })
    }
  }

  handleClick () {
    this.client.postMessage('__track__', {
      event_name: 'app_interaction',
      event_type: 'click'
    })
  }

  trackAppInteractions () {
    const $html = document.querySelector('html')
    $html.addEventListener('click', this.handleClick.bind(this))
    $html.addEventListener('mouseleave', this.handleMouseLeave.bind(this))
    $html.addEventListener('mouseenter', this.handleMouseEnter.bind(this))
  }

  trackSDKRequestTimeout (client, actions, requestResponseTime) {
    const actionsTags = actions.map(action => `action:${stripActionArgs(action)}`)
    const responseTimeTag = `request_response_time:${timeMsToSecondsRange(requestResponseTime)}`
    this.client.postMessage('__track__', {
      event_name: 'sdk_request_timeout',
      event_type: 'increment',
      event_value: 1,
      tags: actionsTags.concat(responseTimeTag)
    })
  }
}
