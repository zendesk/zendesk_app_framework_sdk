function Tracker(client) {
  this.startTime = Date.now();
  this.client = client;
  this.MIN_HOVER_TIME = 200; //milliseconds

  return this;
}

Tracker.prototype = {
  handleMouseEnter: function() {
    this.startTime = Date.now();
  },

  handleMouseLeave: function() {
    var overFor = Date.now() - this.startTime;
    if(overFor >= this.MIN_HOVER_TIME) {
      this.client.invoke('track', { type: 'hover', value: overFor });
    }
  },

  handleClick: function() {
    this.client.invoke('track', { type: 'click' });
  },

  setup: function() {
    var $html = document.querySelector('html');
    $html.addEventListener('click', this.handleClick.bind(this));
    $html.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    $html.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
  }
};

module.exports = { Tracker: Tracker };
