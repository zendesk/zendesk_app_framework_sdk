function Tracker(client) {
  this.startTime = Date.now();
  this.client = client;
  this.MIN_HOVER_TIME = 200; //milliseconds

  return this;
}

Tracker.prototype = {
  handleMouseOver: function() {
    this.startTime = Date.now();
  },

  handleMouseOut: function() {
    var overFor = Date.now() - this.startTime;
    if(overFor >= this.MIN_HOVER_TIME) {
      this.client.invoke('track', { type: 'hover', value: overFor });
    }
  },

  handleClick: function() {
    this.client.invoke('track', { type: 'click' });
  },

  setup: function() {
    window.addEventListener('click', this.handleClick.bind(this));
    window.addEventListener('mouseover', this.handleMouseOut.bind(this));
    window.addEventListener('mouseout', this.handleMouseOver.bind(this));
  }
};

module.exports = { Tracker: Tracker };
