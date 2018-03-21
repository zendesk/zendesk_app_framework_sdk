var MIN_HOVER_TIME = 200;

function setupMouseHover(client) {
  var overStart = Date.now();

  window.addEventListener('mouseover', function() {
    overStart = Date.now();
  });

  window.addEventListener('mouseout', function() {
    var overFor = Date.now() - overStart;
    if(overFor >= MIN_HOVER_TIME) {
      client.invoke('track', { type: 'hover',  hoverLength: overFor });
    }
  });
}

function setupClick(client) {
  window.addEventListener('click', function() {
    client.invoke('track', { type: 'click' });
  });
}

function setup(client) {
  setupClick(client);
  setupMouseHover(client);
}

module.exports = { setup: setup };
