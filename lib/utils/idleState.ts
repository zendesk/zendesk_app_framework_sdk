import Observers, { ListenerFunction } from './listeners';
export const STATE_ACTIVE = 'active';
export const STATE_IDLE = 'idle';

const USER_EVENTS = ['mousemove', 'keydown', 'wheel', 'mousedown', 'touchstart', 'touchmove'];
// list of user events to ignore when window hasn't focus as string, i.e. 'mousemove touchmove'
const IGNORED_USER_EVENTS = 'mousemove';

class IdleState {
  refcount?: number;
  timer?: number | null;
  hasFocus?: boolean;
  userEventListenerAdded?: boolean;
  observers?: Observers;

  constructor() {
    this.hasFocus = true;
    this.userEventListenerAdded = false;
    this.observers = new Observers();

    this.refcount = 1;

    // Bind callbacks
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleFocusChange = this.handleFocusChange.bind(this);
    this.handleUserEvent = this.handleUserEvent.bind(this);


    // Install listeners and timer
    document.addEventListener('visibilitychange', this.handleVisibilityChange, true);

    // Because Safari dispatches focus events before visibilitychange, we need to register focus/blurr listener here
    // and not inside handleVisibilityChange with the other event listeners
    window.addEventListener('focus', this.handleFocusChange, true);
    window.addEventListener('blur', this.handleFocusChange, true);

    this.handleVisibilityChange();
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
      delete this.observers;
    }
  }

  markActive(): void{
    this.observers && this.observers.call(null)
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
