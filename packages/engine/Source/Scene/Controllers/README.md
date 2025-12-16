# Controllers

## Interfaces

- `Controller` interface
  - `get enabled(): boolean`
  - `set enabled(value: boolean)`
  - `connectedCallback(element: HTMLElement)` - Invoked when the controller is added to the DOM. Implement `connectedCallback()` to set up any DOM event listeners.
  - `disconnectedCallback(element: HTMLElement)` - Invoked when the controller is removed from the DOM. Implement `disconnectedCallback()` to tear down any DOM event listeners.
  - `update(scene: Scene, time: JulianDate)` - Invoked once per frame. Implement `update` to modify the camera or other parts of the scene. See [Update/Render Cycle Events](https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/#updaterender-cycle-events) for background.
  - `firstUpdate(scene: Scene, time: JulianDate)` - Invoked when the controller is being updated the first time, immediately before `update()` is called. Implement `firstUpdate()` to perform one-time work after the relevant scene has begun it's render loop. Some examples might include initializing simulation time values or adding a primitive to the scene.
- `Viewer` and `CesiumWidget`
  - `get controllerHost(): ControllerHost`
  - `addController(controller: Controller)`
  - `removeController(controller: Controller)`
- `ControllerHost`
  - `registerController(controller: Controller, element: HTMLElement)`
  - `unregisterController(controller: Controller, element: HTMLElement)`

## Example

```js
const keyboardController = new FirstPersonKeyboardController();

// In addition to existing inputs, add IJKL keys
const inputEvents = keyboardController.inputEvents;
inputEvents.addKeyBinding(keyboardController.FORWARD, "I");
inputEvents.addKeyBinding(keyboardController.BACKWARD, "K");
inputEvents.addKeyBinding(keyboardController.LEFT, "J");
inputEvents.addKeyBinding(keyboardController.RIGHT, "L");

// Add to viewer/widget container directly for easy use
viewer.addController(keyboardController);

// OR: Add to the scene with a specific element
scene.controllerHost.registerController(keyboardController, document.getElementById("my-element"));
```

## TODO

- `InputBinding`
  - `input: ScreenSpaceEventType|KeyCode`
  - `modifiers: KeyboardEventModifier[]`
- `InputMapEvent`
  - `bindings: InputBindings[]`

