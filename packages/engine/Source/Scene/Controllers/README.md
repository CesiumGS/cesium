# Controllers

## `Controller` interface and lifecycle

- `get enabled(): boolean`
- `set enabled(value: boolean)`
- `connectedCallback(element: HTMLElement)` - Invoked when the controller is added to the DOM. Implement `connectedCallback()` to set up any DOM event listeners.
- `disconnectedCallback(element: HTMLElement)` - Invoked when the controller is removed from the DOM. Implement `disconnectedCallback()` to tear down any DOM event listeners.
- `update(scene: Scene, time: JulianDate)` - Invoked once per frame. Implement `update` to modify the camera or other parts of the scene. See [Update/Render Cycle Events](https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/#updaterender-cycle-events) for background.
- `firstUpdate(scene: Scene, time: JulianDate)` - Invoked when the controller is being updated the first time, immediately before `update()` is called. Implement `firstUpdate()` to perform one-time work after the relevant scene has begun it's render loop. Some examples might include initializing simulation time values or adding a primitive to the scene.

## Integrating controllers with Cesium `Viewer` or `CesiumWidget`

Each `Viewer` or `CesiumWidget` instance has a `controllerHost` property, an instance of `ControllerHost` (discussed below). The `controllerHost` is responsible for managing the controllers attached to that particular viewer/widget. In most cases you won’t interact with `controllerHost` directly – instead, the `Viewer` and `CesiumWidget` provide convenience methods to add or remove controllers.

### Adding a controller

You can register a controller with a viewer by calling `viewer.addController(controller)`. Similarly, `cesiumWidget.addController(controller)` works for a `CesiumWidget`. Under the hood, this will add the controller to the internal `ControllerHost` and call `controller.connectedCallback()` with the parent `container` HTML element.

```js
const keyboardController = new FirstPersonKeyboardController();

// Add to conroller directly to the `cesiumContainer` element used by the Viewer
const viewer = new Cesium.Viewer("cesiumContainer");
viewer.addController(keyboardController);
```

### ControllerHost

- `registerController(controller: Controller, element: HTMLElement)` - Typically, the element passed is the viewer’s container or canvas element (so that the controller can bind events to that element).
- `unregisterController(controller: Controller, element: HTMLElement)`

```js
const keyboardController = new FirstPersonKeyboardController();

// Add the controller to the scene using a specific element
scene.controllerHost.registerController(keyboardController, document.getElementById("my-element"));
```

## Example: Use a first person camera controller

```js
// Create WASD or arrow key camera move controls
const keyboardController = new FirstPersonKeyboardController();

// In addition to existing inputs, add IJKL key bindings
const inputEvents = keyboardController.inputEvents;
inputEvents.addKeyBinding(keyboardController.FORWARD, "I");
inputEvents.addKeyBinding(keyboardController.BACKWARD, "K");
inputEvents.addKeyBinding(keyboardController.LEFT, "J");
inputEvents.addKeyBinding(keyboardController.RIGHT, "L");

// Create mouse camera look controller
const lookController = new ScreenspaceCameraLookController();

// Adjust look speed
lookController.lookSpeed = 100.0;

// Add to conroller directly to the `cesiumContainer` element used by the Viewer
const viewer = new Cesium.Viewer("cesiumContainer");
viewer.addController(keyboardController);
viewer.addController(lookController);
```

## TODO

- `InputBinding`
  - `input: ScreenSpaceEventType|KeyCode`
  - `modifiers: KeyboardEventModifier[]`
- `InputMapEvent`
  - `bindings: InputBindings[]`