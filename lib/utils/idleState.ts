import Observers, { ListenerFunction } from './listeners';

/*
  IdleState let you know if the application is active or idle. The application is considered idle if not user
  interactions have been detected for a specific amount of time (timeout). To use IdleState, you first create an
  IdleState instance, then you can either get the current state from the instance or add an observer to be called each
  time the state changes.

  When creating an instance, you can provide a timeout, by default timeout of 3 minutes is used. When done with the
  IdleState instance, you must call the delete method to release it.

  If several consumers create an idleState with the same timeout, only one instance is created. The instance is shared
  between the consumers.

  Syntax:
    new IdleState();
    new IdleState(timeout);

    timeout: timeout in milliseconds, default is 3 minutes.

  Properties:
    IdleState.state:
      current state as string, either 'active' or 'idle', read only.

  Methods:
    IdleState.addObserver(observer):
      Add an observer to be called when the idle state changes. The observer receives the new state as parameter. You
      can several observers.
      Returns a function to be called to remove the observer.

    IdleState.delete():
      Release the IdleState instance. As the same instance can be shared with multiple consumers, it's important to call
      delete() when done with it. But first, you should remove any observer you have added, else they will still be
      called until all consumers have released the instance.

  Usage:
    import IdleState from 'utils/IdleState';

    // Create an instance with a timeout of 2 minutes
    const idleState = new IdleState(2 * 60 * 1000);

    // Add an observer
    const removeObserver = idleState.addObserver(state => {
      if (state === 'active') {
        // ... application is now active
      } else if (state === 'idle') {
        // ... application is now idle
      }
    });

    // Read the current state
    const currentState = idleState.state;

    // When done, release the instance, but first remove the observer
    removeObserver();
    idleState.delete();
*/

import { isTest } from './environment';
export const STATE_ACTIVE = 'active';
export const STATE_IDLE = 'idle';

const USER_EVENTS = ['mousemove', 'keydown', 'wheel', 'mousedown', 'touchstart', 'touchmove'];
// list of user events to ignore when window hasn't focus as string, i.e. 'mousemove touchmove'
const IGNORED_USER_EVENTS = 'mousemove';

interface IdleStateCache {
  [key: number]: IdleState;
}

const _idleStateObjects: IdleStateCache = {};

const stateProperty = Symbol('state');

const setState = (idleState: IdleState, state: 'active' | 'idle') => {
  if (idleState[stateProperty] !== state) {
    idleState[stateProperty] = state;
    idleState.observers && idleState.observers.call(state);
  }
};
class IdleState {
  refcount?: number;
  timeout?: number;
  [stateProperty]: 'active' | 'idle';
  hasActiveEvent?: boolean;
  timer?: number | null;
  hasFocus?: boolean;
  userEventListenerAdded?: boolean;
  observers?: Observers;
  setState?: (state: 'active' | 'idle') => void;

  constructor(timeout) {
    // if we already have an IdleState for the specified timeout, let's return it
    const idleState = _idleStateObjects[timeout];

    if (idleState) {
      idleState.refcount && idleState.refcount++;
      return idleState;
    }

    this.timeout = timeout;
    this[stateProperty] = STATE_ACTIVE;
    this.hasActiveEvent = true;
    this.timer = null;
    this.hasFocus = true;
    this.userEventListenerAdded = false;
    this.observers = new Observers();

    this.refcount = 1;

    // Bind callbacks
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleFocusChange = this.handleFocusChange.bind(this);
    this.handleUserEvent = this.handleUserEvent.bind(this);
    this.handleTimer = this.handleTimer.bind(this);

    // Install listeners and timer
    document.addEventListener('visibilitychange', this.handleVisibilityChange, true);

    // Because Safari dispatches focus events before visibilitychange, we need to register focus/blurr listener here
    // and not inside handleVisibilityChange with the other event listeners
    window.addEventListener('focus', this.handleFocusChange, true);
    window.addEventListener('blur', this.handleFocusChange, true);

    this.handleVisibilityChange();
    this.resetTimer();

    // Add access to setState for testing
    if (isTest) {
      this.setState = (state) => {
        setState(this, state);
      };
    }

    // Let's cache the idleState
    _idleStateObjects[timeout] = this;
  }

  delete(): void {
    if (this.refcount !== undefined && --this.refcount === 0) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange, true);
      window.removeEventListener('focus', this.handleFocusChange, true);
      window.removeEventListener('blur', this.handleFocusChange, true);

      if (this.userEventListenerAdded) {
        USER_EVENTS.forEach((type) =>
          document.removeEventListener(type, this.handleUserEvent, true)
        );
      }

      this.clearTimer();
      delete this.observers;
      this.timeout !== undefined && delete _idleStateObjects[this.timeout];
    }
  }

  get state(): 'active' | 'idle' {
    return this[stateProperty];
  }

  clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  resetTimer(): void {
    this.clearTimer();
    this.timer = window.setTimeout(this.handleTimer, this.timeout);
  }

  handleTimer(): void {
    this.resetTimer();

    if (this.hasActiveEvent) {
      // we had user events during last timeout cycle,
      // do not set state to idle yet
      this.hasActiveEvent = false;
    } else {
      // we did not have user event during last timeout cycle,
      // set state to idle now
      setState(this, STATE_IDLE);
    }
  }

  markActive(): void {
    this.hasActiveEvent = true;
    setState(this, STATE_ACTIVE);
  }

  handleUserEvent(event: Event): void {
    if (!this.hasFocus && IGNORED_USER_EVENTS.includes(event.type)) return;

    this.markActive();
  }

  handleFocusChange(event: Event): void {
    // we only care about focus/blur event related to the window itself
    if (event.target !== window) return;

    this.hasFocus = event.type === 'focus';
    if (this.hasFocus) {
      this.markActive();
    }
  }

  handleVisibilityChange(): void {
    if (document.hidden) {
      if (this.userEventListenerAdded) {
        USER_EVENTS.forEach((type) =>
          document.removeEventListener(type, this.handleUserEvent, true)
        );
        this.userEventListenerAdded = false;
      }
    } else if (!this.userEventListenerAdded) {
      USER_EVENTS.forEach((type) => document.addEventListener(type, this.handleUserEvent, true));
      this.userEventListenerAdded = true;
    }
  }

  addObserver(observer: ListenerFunction): (() => void) | undefined {
    return this.observers && this.observers.add(observer);
  }
}

export default IdleState;
