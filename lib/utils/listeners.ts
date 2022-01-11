export type ListenerFunction = (...args: unknown[]) => void;

interface Listener {
  fn: ListenerFunction;
  count: number;
}

class Listeners {
  private listeners: Listener[];

  constructor() {
    this.listeners = [];
  }

  add(listener: ListenerFunction): () => void {
    const find = (listener: ListenerFunction) =>
      this.listeners.findIndex((item) => item.fn === listener);

    const index = find(listener);
    if (index === -1) {
      this.listeners.push({ fn: listener, count: 1 });
    } else {
      const listener = this.listeners[index];
      listener && listener.count++;
    }

    return () => {
      const index = find(listener);

      if (index !== -1) {
        const listener = this.listeners[index];
        listener && listener.count--;
        if (listener && listener.count === 0) {
          this.listeners.splice(index, 1);
        }
      }
    };
  }

  call(...args: unknown[]): void {
    this.listeners.forEach((listener) => listener.fn(...args));
  }
}

export default Listeners;
