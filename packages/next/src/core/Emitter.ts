type Listener<T> = (payload: T) => void;

/** A small typed event emitter. `on` returns an unsubscribe function. */
export class Emitter<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(
    name: K,
    listener: Listener<Events[K]>,
  ): () => void {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(listener as Listener<never>);
    return () => set.delete(listener as Listener<never>);
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    const set = this.listeners.get(name);
    if (!set) {
      return;
    }
    for (const listener of set) {
      (listener as Listener<Events[K]>)(payload);
    }
  }
}
