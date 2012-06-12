/*global defineSuite*/
defineSuite([
         'Scene/CameraEventHandler',
         'Scene/CameraEventType',
         'Core/MouseEventType'
     ], function(
         CameraEventHandler,
         CameraEventType,
         MouseEventType) {
    "use strict";
    /*global document,describe,it,expect,beforeEach,afterEach*/

    var handler;
    var handler2;

    beforeEach(function() {
        handler = new CameraEventHandler(document, CameraEventType.LEFT_DRAG);
    });

    afterEach(function() {
        handler = handler && !handler.isDestroyed() && handler.destroy();
        handler2 = handler2 && !handler2.isDestroyed() && handler2.destroy();
    });

    it('throws without a canvas', function() {
        expect(function() {
            handler2 = new CameraEventHandler();
        }).toThrow();
    });

    it('throws without a moveType', function() {
        expect(function() {
            handler2 = new CameraEventHandler(document);
        }).toThrow();
    });

    it('throws if the event type is not of CameraEventType', function() {
        expect(function() {
            handler2 = new CameraEventHandler(document, MouseEventType.LEFT_CLICK);
        }).toThrow();
    });

    it('can be constructed using the middle drag event type', function() {
        expect(function(){
            handler2 = new CameraEventHandler(document, CameraEventType.MIDDLE_DRAG);
        }).not.toThrow();
    });

    it('getMovement', function() {
        expect(handler.getMovement()).toBeFalsy();
    });

    it('isMoving', function() {
        expect(handler.isMoving()).toEqual(false);
    });

    it('isButtonDown', function() {
        expect(handler.isButtonDown()).toEqual(false);
    });

    it('getButtonPressTime', function() {
        expect(handler.getButtonPressTime()).toEqual(null);
    });

    it('getButtonReleaseTime', function() {
        expect(handler.getButtonReleaseTime()).toEqual(null);
    });

    it('isDestroyed', function() {
        expect(handler.isDestroyed()).toEqual(false);
        handler.destroy();
        expect(handler.isDestroyed()).toEqual(true);
    });
});