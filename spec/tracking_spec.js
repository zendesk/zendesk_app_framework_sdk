describe('App Tracking', function() {
  var tracking = require('tracking'),
      Tracker  = tracking.Tracker,
      sandbox  = sinon.sandbox.create(),
      client   = { invoke: function() {} },
      tracker  = null;

  beforeEach(function() {
    sandbox.stub(client, 'invoke');
    tracker = new Tracker(client);
  });

  afterEach(function() {
    sandbox.restore();
  });

  context('when the mouseout event is triggered', function() {
    var clock;

    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      clock.restore();
    });

    function causeMouseEvents(time) {
      tracker.handleMouseOver();
      clock.tick(time);
      tracker.handleMouseOut();
    }

    context('when < 200ms between mouseover and mouseout', function() {
      it('does not invoke the track callback', function() {
        causeMouseEvents(150);
        sinon.assert.notCalled(client.invoke);
      });
    });

    context('when >= 200ms between mouseover and mouseout', function() {
      it('invokes the track callback at 200', function() {
        causeMouseEvents(200);
        sinon.assert.calledOnce(client.invoke);
      });

      it('invokes the track callback at > 200', function() {
        causeMouseEvents(300);
        sinon.assert.calledOnce(client.invoke);
      });
    });
  });
});
