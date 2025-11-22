import Check from "./Check.js";
import defined from "./defined.js";

/**
 * A function that removes a listener.
 */
type RemoveCallback = () => void;

/**
 * A generic utility class for managing subscribers for a particular event.
 * This class is usually instantiated inside of a container class and
 * exposed as a property for others to subscribe to.
 *
 * @typeParam TCallback - The type of the callback function for event listeners
 *
 * @example
 * MyObject.prototype.myListener = function(arg1, arg2) {
 *     this.myArg1Copy = arg1;
 *     this.myArg2Copy = arg2;
 * }
 *
 * const myObjectInstance = new MyObject();
 * const evt = new Cesium.Event<(arg1: string, arg2: string) => void>();
 * evt.addEventListener(MyObject.prototype.myListener, myObjectInstance);
 * evt.raiseEvent('1', '2');
 * evt.removeEventListener(MyObject.prototype.myListener);
 */
class Event<TCallback extends (...args: any[]) => void = (...args: any[]) => void> {
  private _listeners: Map<TCallback, Set<object | undefined>>;
  private _toRemove: Map<TCallback, Set<object | undefined>>;
  private _toAdd: Map<TCallback, Set<object | undefined>>;
  private _invokingListeners: boolean;
  private _listenerCount: number;

  constructor() {
    this._listeners = new Map();
    this._toRemove = new Map();
    this._toAdd = new Map();
    this._invokingListeners = false;
    this._listenerCount = 0;
  }

  /**
   * The number of listeners currently subscribed to the event.
   */
  get numberOfListeners(): number {
    return this._listenerCount;
  }

  /**
   * Registers a callback function to be executed whenever the event is raised.
   * An optional scope can be provided to serve as the `this` pointer
   * in which the function will execute.
   *
   * @param listener - The function to be executed when the event is raised.
   * @param scope - An optional object scope to serve as the `this`
   *        pointer in which the listener function will execute.
   * @returns A function that will remove this event listener when invoked.
   *
   * @see Event#raiseEvent
   * @see Event#removeEventListener
   */
  addEventListener(listener: TCallback, scope?: object): RemoveCallback {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.func("listener", listener);
    //>>includeEnd('debug');

    const listenerMap = this._invokingListeners
      ? this._toAdd
      : this._listeners;
    const added = this._addEventListenerInternal(listenerMap, listener, scope);
    if (added) {
      this._listenerCount++;
    }

    return () => {
      this.removeEventListener(listener, scope);
    };
  }

  /**
   * Unregisters a previously registered callback.
   *
   * @param listener - The function to be unregistered.
   * @param scope - The scope that was originally passed to addEventListener.
   * @returns `true` if the listener was removed; `false` if the listener and scope are not registered with the event.
   *
   * @see Event#addEventListener
   * @see Event#raiseEvent
   */
  removeEventListener(listener: TCallback, scope?: object): boolean {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.func("listener", listener);
    //>>includeEnd('debug');

    const removedFromListeners = this._removeEventListenerInternal(
      this._listeners,
      listener,
      scope,
    );
    const removedFromToAdd = this._removeEventListenerInternal(
      this._toAdd,
      listener,
      scope,
    );

    const removed = removedFromListeners || removedFromToAdd;
    if (removed) {
      this._listenerCount--;
    }

    return removed;
  }

  /**
   * Raises the event by calling each registered listener with all supplied arguments.
   *
   * @param args - The arguments to pass to each listener function.
   *
   * @see Event#addEventListener
   * @see Event#removeEventListener
   */
  raiseEvent(...args: Parameters<TCallback>): void {
    this._invokingListeners = true;

    for (const [listener, scopes] of this._listeners.entries()) {
      if (!defined(listener)) {
        continue;
      }

      for (const scope of scopes) {
        listener.apply(scope, args);
      }
    }

    this._invokingListeners = false;

    // Actually add items marked for addition
    for (const [listener, scopes] of this._toAdd.entries()) {
      for (const scope of scopes) {
        this._addEventListenerInternal(this._listeners, listener, scope);
      }
    }
    this._toAdd.clear();

    // Actually remove items marked for removal
    for (const [listener, scopes] of this._toRemove.entries()) {
      for (const scope of scopes) {
        this._removeEventListenerInternal(this._listeners, listener, scope);
      }
    }
    this._toRemove.clear();
  }

  /**
   * Internal method to add an event listener to a listener map.
   * @internal
   */
  private _addEventListenerInternal(
    listenerMap: Map<TCallback, Set<object | undefined>>,
    listener: TCallback,
    scope: object | undefined,
  ): boolean {
    if (!listenerMap.has(listener)) {
      listenerMap.set(listener, new Set());
    }
    const scopes = listenerMap.get(listener)!;
    if (!scopes.has(scope)) {
      scopes.add(scope);
      return true;
    }

    return false;
  }

  /**
   * Internal method to remove an event listener from a listener map.
   * @internal
   */
  private _removeEventListenerInternal(
    listenerMap: Map<TCallback, Set<object | undefined>>,
    listener: TCallback,
    scope: object | undefined,
  ): boolean {
    const scopes = listenerMap.get(listener);
    if (!scopes || !scopes.has(scope)) {
      return false;
    }

    if (this._invokingListeners) {
      if (!this._addEventListenerInternal(this._toRemove, listener, scope)) {
        // Already marked for removal
        return false;
      }
    } else {
      scopes.delete(scope);
      if (scopes.size === 0) {
        listenerMap.delete(listener);
      }
    }

    return true;
  }
}

/**
 * A function that removes a listener.
 * @deprecated Use RemoveCallback type instead
 */
namespace Event {
  export type RemoveCallback = () => void;
}

export default Event;
