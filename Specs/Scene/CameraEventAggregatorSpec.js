/*global defineSuite*/
defineSuite([
        'Scene/CameraEventAggregator',
        'Core/Cartesian2',
        'Core/KeyboardEventModifier',
        'Scene/CameraEventType',
        'Specs/MockCanvas'
    ], function(
        CameraEventAggregator,
        Cartesian2,
        KeyboardEventModifier,
        CameraEventType,
        MockCanvas) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var canvas;
    var handler;
    var handler2;

    var MouseButtons = MockCanvas.MouseButtons;

    beforeEach(function() {
        // create a mock canvas object to add events to so they are callable.
        canvas = new MockCanvas();
        handler = new CameraEventAggregator(canvas);
    });

    afterEach(function() {
        handler = handler && !handler.isDestroyed() && handler.destroy();
        handler2 = handler2 && !handler2.isDestroyed() && handler2.destroy();
    });

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

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        var movement = handler.getMovement(CameraEventType.LEFT_DRAG);
        expect(movement).toBeDefined();
        expect(movement.startPosition).toEqual(startPosition);
        expect(movement.endPosition).toEqual(endPosition);

        MockCanvas.moveMouse(canvas, MouseButtons.RIGHT, startPosition, endPosition, true);
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

        var args = {
            button : MouseButtons.LEFT,
            clientX : startPosition.x,
            clientY : startPosition.y
        };
        canvas.fireEvents('mousedown', args);
        args.clientX = endPosition.x;
        args.clientY = endPosition.y;
        canvas.fireEvents('mousemove', args);
        handler.reset();
        args.clientX = endPosition2.x;
        args.clientY = endPosition2.y;
        canvas.fireEvents('mousemove', args);

        var movement = handler.getLastMovement(CameraEventType.LEFT_DRAG);
        expect(movement).toBeDefined();
        expect(movement.startPosition).toEqual(startPosition);
        expect(movement.endPosition).toEqual(endPosition);
    });

    it('isMoving', function() {
        expect(handler.isMoving(CameraEventType.LEFT_DRAG)).toEqual(false);
        var startPosition = Cartesian2.ZERO;
        var endPosition = Cartesian2.UNIT_X;

        MockCanvas.moveMouse(canvas, MouseButtons.LEFT, startPosition, endPosition);
        expect(handler.isMoving(CameraEventType.LEFT_DRAG)).toEqual(true);
        handler.reset();
        expect(handler.isMoving(CameraEventType.LEFT_DRAG)).toEqual(false);
    });

    it('isButtonDown', function() {
        expect(handler.isButtonDown(CameraEventType.LEFT_DRAG)).toEqual(false);

        var args = {
            button : MouseButtons.LEFT,
            clientX : 0,
            clientY : 0
        };
        canvas.fireEvents('mousedown', args);

        expect(handler.isButtonDown(CameraEventType.LEFT_DRAG)).toEqual(true);
        canvas.fireEvents('mouseup', args);
        expect(handler.isButtonDown(CameraEventType.LEFT_DRAG)).toEqual(false);
    });

    it('anyButtonDown', function() {
        expect(handler.anyButtonDown).toEqual(false);

        var args = {
            button : MouseButtons.LEFT,
            clientX : 0,
            clientY : 0
        };
        canvas.fireEvents('mousedown', args);
        expect(handler.anyButtonDown).toEqual(true);

        args.button = MouseButtons.RIGHT;
        canvas.fireEvents('mousedown', args);
        expect(handler.anyButtonDown).toEqual(true);

        canvas.fireEvents('mouseup', args);
        expect(handler.anyButtonDown).toEqual(true);

        args.button = MouseButtons.LEFT;
        canvas.fireEvents('mouseup', args);
        expect(handler.anyButtonDown).toEqual(false);
    });

    it('getButtonPressTime', function() {
        expect(handler.getButtonPressTime(CameraEventType.LEFT_DRAG)).toBeUndefined();

        var args = {
            button : MouseButtons.LEFT,
            clientX : 0,
            clientY : 0
        };
        var before = new Date();
        canvas.fireEvents('mousedown', args);
        var after = new Date();

        var downTime = handler.getButtonPressTime(CameraEventType.LEFT_DRAG);
        expect(downTime).toBeDefined();
        expect(downTime.getTime()).toBeGreaterThanOrEqualTo(before.getTime());
        expect(downTime.getTime()).toBeLessThanOrEqualTo(after.getTime());
    });

    it('getButtonReleaseTime', function() {
        expect(handler.getButtonReleaseTime(CameraEventType.LEFT_DRAG)).toBeUndefined();

        var args = {
            button : MouseButtons.LEFT,
            clientX : 0,
            clientY : 0
        };
        canvas.fireEvents('mousedown', args);
        var before = new Date();
        canvas.fireEvents('mouseup', args);
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

        var args = {
            button : MouseButtons.LEFT,
            clientX : startPosition.x,
            clientY : startPosition.y
        };
        canvas.fireEvents('mousedown', args);
        args.clientX = endPosition.x;
        args.clientY = endPosition.y;
        canvas.fireEvents('mousemove', args);
        args.clientX = endPosition2.x;
        args.clientY = endPosition2.y;
        canvas.fireEvents('mousemove', args);

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