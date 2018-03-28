function Tracker(client) {
  this.startTime = Date.now();
  this.client = client;
  this.MIN_HOVER_TIME = 200; //milliseconds

  window.addEventListener('click', function() {
    client.invoke('track', { type: 'click' });
  });
  window.addEventListener('mouseover', this.handleMouseOut.bind(this));
  window.addEventListener('mouseout', this.handleMouseOver.bind(this));
  return this;
}

Tracker.prototype = {
  handleMouseOver: function() {
    this.startTime = Date.now();
  },

  handleMouseOut: function() {
    var overFor = Date.now() - this.startTime;
    if(overFor >= this.MIN_HOVER_TIME) {
      this.client.invoke('track', { type: 'hover', hoverLength: overFor });
    }
  }
};

module.exports = { Tracker: Tracker };

// var buildHandleMouseOver = function(overStart) {
//   return function() {
//     overStart.t = Date.now();
//   }
// }

// var buildHandleMouseOut = function(overStart, client) {
//   return function() {
//     var overFor = Date.now() - overStart.t;
//     if(overFor >= MIN_HOVER_TIME) {
//       client.invoke('track', { type: 'hover',  hoverLength: overFor });
//     }
//   }
// }

// function setupMouseHover(client) {
//   var overStart = { t: Date.now() };
//   var handleMouseOver = buildHandleMouseOver(overStart);
//   var handleMouseOut = buildHandleMouseOut(overStart, client);

//   window.addEventListener('mouseover', handleMouseOver);
//   window.addEventListener('mouseout', handleMouseOut);
// }

// function setupClick(client) {
//   window.addEventListener('click', function() {
//     client.invoke('track', { type: 'click' });
//   });
// }

// function setup(client) {
//   setupClick(client);
//   setupMouseHover(client);
// }

// module.exports = { setup: setup, mouseover: buildHandleMouseOver, mouseout: buildHandleMouseOut };
