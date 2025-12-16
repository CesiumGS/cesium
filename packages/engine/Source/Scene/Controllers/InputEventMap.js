import Event from "../../Core/Event.js";
import defined from "../../Core/defined.js";

export const KeyboardEventModifiers = Object.freeze({
    ANY: -1,
    NONE: 0,
    SHIFT: 1 << 0,
    CTRL: 1 << 1,
    ALT: 1 << 2,
    META: 1 << 3
});

class KeyboardInputEvent {
    constructor(key, modifiers = KeyboardEventModifiers.ANY) {
        this.key = key.toUpperCase();
        this.modifiers = modifiers;
    }

    static getMapKeyFromEvent({ key, shiftKey = false, ctrlKey = false, altKey = false, metaKey = false }) {
        key = key.toUpperCase();
        let modifiers = KeyboardEventModifiers.NONE;
        
        if (shiftKey) {
            modifiers |= KeyboardEventModifiers.SHIFT;
        }

        if (ctrlKey) {
            modifiers |= KeyboardEventModifiers.CTRL;
        }

        if (altKey) {
            modifiers |= KeyboardEventModifiers.ALT;
        }

        if (metaKey) {
            modifiers |= KeyboardEventModifiers.META;
        }

        return `${key}+${modifiers}`;
    }

    get mapKey() {
        if (this.modifiers === KeyboardEventModifiers.ANY) {
            return this.key;
        }

        return `${this.key}+${this.modifiers}`;
    }
}

export default class InputEventMap {
    constructor() {
        this._bindings = new Map();
        this._bindingAdded = new Event();
        this._bindingRemoved = new Event();
    }

    bindingAdded() {
        return this._bindingAdded;
    }
    
    bindingRemoved() {
        return this._bindingRemoved;
    }

    addKeyBinding(eventName, inputEvent, modifiers) {
        if (typeof inputEvent === "string") {
            inputEvent = new KeyboardInputEvent(inputEvent, modifiers);
        }

        this._bindings.set(inputEvent.mapKey, eventName);
        this._bindingAdded.raiseEvent(this, eventName, inputEvent);
    }

    getKeyboardInputEvent(event) {
        const modified = this._bindings.get(KeyboardInputEvent.getMapKeyFromEvent(event));
        if (defined(modified)) {
            return modified;
        }

        const key = event.key.toUpperCase();
        return this._bindings.get(key);
    }
}