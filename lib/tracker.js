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
      this.client.invoke('track', { type: 'hover', value: overFor })
    }
  }

  handleClick () {
    this.client.invoke('track', { type: 'click' })
  }

  setup () {
    const $html = document.querySelector('html')
    $html.addEventListener('click', this.handleClick.bind(this))
    $html.addEventListener('mouseleave', this.handleMouseLeave.bind(this))
    $html.addEventListener('mouseenter', this.handleMouseEnter.bind(this))
  }
}
