describe('App Tracking', function() {
  var tracking = require('tracking'),
      sandbox  = sinon.sandbox.create(),
      client = { invoke: function() {} },
      eventListener;

  beforeEach(function() {
    sandbox.stub(client, 'invoke');
    eventListener = sinon.spy(window, 'addEventListener');
    tracking.setup(client);
  });

  afterEach(function() {
    window.addEventListener.restore();
    sandbox.restore();
  });

  function findEvent(event) {
    for(var i = 0; i < eventListener.args.length; i++) {
      if(eventListener.args[i][0] === event) {
        return eventListener.args[i];
      }
    }
  }

  describe('for click events', function() {
    it('attaches the click event listener', function() {
      var clickEvent = findEvent('click');

      expect(clickEvent).not.to.be.undefined;
      expect(clickEvent[0]).to.equal('click');
      expect(clickEvent[1]).to.be.a.function;
    });
  });

  describe('for mouseover events', function() {
    it('attaches the mouseover event listener', function() {
      var mouseoverEvent = findEvent('mouseover');

      expect(mouseoverEvent).not.to.be.undefined;
      expect(mouseoverEvent[0]).to.equal('mouseover');
      expect(mouseoverEvent[1]).to.be.a.function;
    });

    it('attaches the mousout event listener', function() {
      var mouseoutEvent = findEvent('mouseout');
      
      expect(mouseoutEvent).not.to.be.undefined;
      expect(mouseoutEvent[0]).to.equal('mouseout');
      expect(mouseoutEvent[1]).to.be.a.function;
    });

    context('when the mouseout event is triggered', function() {
      var mouseoverCallback, mouseoutCallback, clock;

      function causeMouseEvents(time) {
        mouseoverCallback();
        clock.tick(time);
        mouseoutCallback();
      }

      beforeEach(function() {
        clock = sinon.useFakeTimers();
        mouseoverCallback = findEvent('mouseover')[1];
        mouseoutCallback = findEvent('mouseout')[1];
      });

      afterEach(function() {
        clock.restore();
      });

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
});