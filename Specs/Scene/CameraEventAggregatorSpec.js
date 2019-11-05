import { Cartesian2 } from '../../Source/Cesium.js';
import { combine } from '../../Source/Cesium.js';
import { FeatureDetection } from '../../Source/Cesium.js';
import { KeyboardEventModifier } from '../../Source/Cesium.js';
import { CameraEventAggregator } from '../../Source/Cesium.js';
import { CameraEventType } from '../../Source/Cesium.js';
import createCanvas from '../createCanvas.js';
import DomEventSimulator from '../DomEventSimulator.js';

describe('Scene/CameraEventAggregator', function() {

    var usePointerEvents;
    var canvas;
    var handler;
    var handler2;

    beforeAll(function() {
        usePointerEvents = FeatureDetection.supportsPointerEvents();
        canvas = createCanvas(1024, 768);
    });

    afterAll(function() {
        document.body.removeChild(canvas);
    });

    beforeEach(function() {
        handler = new CameraEventAggregator(canvas);
    });

    afterEach(function() {
        handler = handler && !handler.isDestroyed() && handler.destroy();
        handler2 = handler2 && !handler2.isDestroyed() && handler2.destroy();
    });

    var MouseButtons = {
        LEFT : 0,
        MIDDLE : 1,
        RIGHT : 2
    };

    function simulateMouseDown(options) {
        if (usePointerEvents) {
            DomEventSimulator.firePointerDown(canvas, combine(options, {
                pointerType : 'mouse'
            }));
        } else {
            DomEventSimulator.fireMouseDown(canvas, options);
        }
    }

    function simulateMouseUp(options) {
        if (usePointerEvents) {
            DomEventSimulator.firePointerUp(canvas, combine(options, {
                pointerType : 'mouse'
            }));
        } else {
            DomEventSimulator.fireMouseUp(canvas, options);
        }
    }

    function simulateMouseMove(options) {
        if (usePointerEvents) {
            DomEventSimulator.firePointerMove(canvas, combine(options, {
                pointerType : 'mouse'
            }));
        } else {
            DomEventSimulator.fireMouseMove(canvas, options);
        }
    }

    function moveMouse(button, startPosition, endPosition, shiftKey) {
        var canvasRect = canvas.getBoundingClientRect();

        var options = {
            button : button,
            clientX : startPosition.x + canvasRect.left,
            clientY : startPosition.y + canvasRect.top,
            shiftKey : shiftKey
        };
        simulateMouseDown(options);
        options.clientX = endPosition.x + canvasRect.left;
        options.clientY = endPosition.y + canvasRect.top;
        simulateMouseMove(options);
        simulateMouseUp(options);
    }

    it('throws without a canvas', function() {
        expect(function() {
            handler2 = new CameraEventAggregator();
        }).toThrowDeveloperError();
    });

    it('getMovement throws without a type', function() {
        expect(function() {
            handler.getMovement();
        }).toThrowDeveloperError();
    });

    it('isMoving throws without a type', function() {
        expect(function() {
            handler.isMoving();
        }).toThrowDeveloperError();
    });

    it('isButtonDown throws without a type', function() {
        expect(function() {
            handler.isButtonDown();
        }).toThrowDeveloperError();
    });

    it('getButtonPressTime throws without a type', function() {
        expect(function() {
            handler.getButtonPressTime();
        }).toThrowDeveloperError();
    });

    it('getButtonReleaseTime throws without a type', function() {
        expect(function() {
            handler.getButtonReleaseTime();
        }).toThrowDeveloperError();
    });

    it('getMovement', function() {
        var startPosition = Cartesian2.ZERO;
        var endPosition = Cartesian2.UNIT_X;

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        var movement = handler.getMovement(CameraEventType.LEFT_DRAG);
        expect(movement).toBeDefined();
        expect(movement.startPosition).toEqual(startPosition);
        expect(movement.endPosition).toEqual(endPosition);

        moveMouse(MouseButtons.RIGHT, startPosition, endPosition, true);
        movement = handler.getMovement(CameraEventType.RIGHT_DRAG, KeyboardEventModifier.SHIFT);
        expect(movement).toBeDefined();
        expect(movement.startPosition).toEqual(startPosition);
        expect(movement.endPosition).toEqual(endPosition);
    });

    it('getLastMovement', function() {
        expect(handler.getLastMovement(CameraEventType.LEFT_DRAG)).toBeUndefined();
        var startPosition = Cartesian2.ZERO;
        var endPosition = Cartesian2.UNIT_X;
        var endPosition2 = Cartesian2.UNIT_Y;

        var canvasRect = canvas.getBoundingClientRect();

        var options = {
            button : MouseButtons.LEFT,
            clientX : startPosition.x + canvasRect.left,
            clientY : startPosition.y + canvasRect.top
        };
        simulateMouseDown(options);
        options.clientX = endPosition.x + canvasRect.left;
        options.clientY = endPosition.y + canvasRect.top;
        simulateMouseMove(options);
        handler.reset();
        options.clientX = endPosition2.x + canvasRect.left;
        options.clientY = endPosition2.y + canvasRect.top;
        simulateMouseMove(options);

        var movement = handler.getLastMovement(CameraEventType.LEFT_DRAG);
        expect(movement).toBeDefined();
        expect(movement.startPosition).toEqual(startPosition);
        expect(movement.endPosition).toEqual(endPosition);
    });

    it('isMoving', function() {
        expect(handler.isMoving(CameraEventType.LEFT_DRAG)).toEqual(false);
        var startPosition = Cartesian2.ZERO;
        var endPosition = Cartesian2.UNIT_X;

        moveMouse(MouseButtons.LEFT, startPosition, endPosition);
        expect(handler.isMoving(CameraEventType.LEFT_DRAG)).toEqual(true);
        handler.reset();
        expect(handler.isMoving(CameraEventType.LEFT_DRAG)).toEqual(false);
    });

    it('isButtonDown', function() {
        expect(handler.isButtonDown(CameraEventType.LEFT_DRAG)).toEqual(false);

        var options = {
            button : MouseButtons.LEFT,
            clientX : 0,
            clientY : 0
        };
        simulateMouseDown(options);

        expect(handler.isButtonDown(CameraEventType.LEFT_DRAG)).toEqual(true);
        simulateMouseUp(options);
        expect(handler.isButtonDown(CameraEventType.LEFT_DRAG)).toEqual(false);
    });

    it('anyButtonDown', function() {
        expect(handler.anyButtonDown).toEqual(false);

        var options = {
            button : MouseButtons.LEFT,
            clientX : 0,
            clientY : 0
        };
        simulateMouseDown(options);
        expect(handler.anyButtonDown).toEqual(true);

        options.button = MouseButtons.RIGHT;
        simulateMouseDown(options);
        expect(handler.anyButtonDown).toEqual(true);

        simulateMouseUp(options);

        options.button = MouseButtons.LEFT;
        simulateMouseUp(options);

        expect(handler.anyButtonDown).toEqual(false);
    });

    it('cancels anyButtonDown on any button up', function() {
        expect(handler.anyButtonDown).toEqual(false);

        var options = {
            button : MouseButtons.LEFT,
            clientX : 0,
            clientY : 0
        };
        simulateMouseDown(options);

        options.button = MouseButtons.RIGHT;
        simulateMouseDown(options);

        simulateMouseUp(options);

        expect(handler.anyButtonDown).toEqual(false);
    });

    it('getButtonPressTime', function() {
        expect(handler.getButtonPressTime(CameraEventType.LEFT_DRAG)).toBeUndefined();

        var options = {
            button : MouseButtons.LEFT,
            clientX : 0,
            clientY : 0
        };
        var before = new Date();
        simulateMouseDown(options);
        var after = new Date();

        var downTime = handler.getButtonPressTime(CameraEventType.LEFT_DRAG);
        expect(downTime).toBeDefined();
        expect(downTime.getTime()).toBeGreaterThanOrEqualTo(before.getTime());
        expect(downTime.getTime()).toBeLessThanOrEqualTo(after.getTime());
    });

    it('getButtonReleaseTime', function() {
        expect(handler.getButtonReleaseTime(CameraEventType.LEFT_DRAG)).toBeUndefined();

        var options = {
            button : MouseButtons.LEFT,
            clientX : 0,
            clientY : 0
        };
        simulateMouseDown(options);
        var before = new Date();
        simulateMouseUp(options);
        var after = new Date();

        var upTime = handler.getButtonReleaseTime(CameraEventType.LEFT_DRAG);
        expect(upTime).toBeDefined();
        expect(upTime.getTime()).toBeGreaterThanOrEqualTo(before.getTime());
        expect(upTime.getTime()).toBeLessThanOrEqualTo(after.getTime());
    });

    it('aggregates events', function() {
        var startPosition = Cartesian2.ZERO;
        var endPosition = Cartesian2.UNIT_X;
        var endPosition2 = Cartesian2.UNIT_Y;

        var canvasRect = canvas.getBoundingClientRect();

        var options = {
            button : MouseButtons.LEFT,
            clientX : startPosition.x + canvasRect.left,
            clientY : startPosition.y + canvasRect.top
        };
        simulateMouseDown(options);
        options.clientX = endPosition.x + canvasRect.left;
        options.clientY = endPosition.y + canvasRect.top;
        simulateMouseMove(options);
        options.clientX = endPosition2.x + canvasRect.left;
        options.clientY = endPosition2.y + canvasRect.top;
        simulateMouseMove(options);

        var movement = handler.getMovement(CameraEventType.LEFT_DRAG);
        expect(movement).toBeDefined();
        expect(movement.startPosition).toEqual(startPosition);
        expect(movement.endPosition).toEqual(endPosition2);
    });

    it('isDestroyed', function() {
        expect(handler.isDestroyed()).toEqual(false);
        handler.destroy();
        expect(handler.isDestroyed()).toEqual(true);
    });
});
