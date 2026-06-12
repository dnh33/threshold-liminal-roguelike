export type EventCallback<T = any> = (data: T) => void;

export class EventEmitter {
  private events: Map<string, Set<EventCallback>> = new Map();

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off<T = any>(event: string, callback: EventCallback<T>): void {
    this.events.get(event)?.delete(callback);
  }

  emit<T = any>(event: string, data?: T): void {
    this.events.get(event)?.forEach(callback => {
      try {
        callback(data as T);
      } catch (e) {
        console.error(`Error in event handler for ${event}:`, e);
      }
    });
  }

  once<T = any>(event: string, callback: EventCallback<T>): void {
    const wrapper = (data: T) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}