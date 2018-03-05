function setup(client) {
  window.addEventListener('click', function() {
    client.invoke('track', { type: 'click' });
  });
}

module.exports = { setup: setup };
