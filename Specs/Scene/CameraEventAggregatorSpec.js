/*global defineSuite*/
defineSuite([
         'Scene/CameraEventAggregator',
         'Scene/CameraEventType',
         'Core/ScreenSpaceEventType'
     ], function(
         CameraEventAggregator,
         CameraEventType,
         ScreenSpaceEventType) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var handler;
    var handler2;

    beforeEach(function() {
        handler = new CameraEventAggregator(document, CameraEventType.LEFT_DRAG);
    });

    afterEach(function() {
        handler = handler && !handler.isDestroyed() && handler.destroy();
        handler2 = handler2 && !handler2.isDestroyed() && handler2.destroy();
    });

    it('throws without a canvas', function() {
        expect(function() {
            handler2 = new CameraEventAggregator();
        }).toThrow();
    });

    it('throws without a moveType', function() {
        expect(function() {
            handler2 = new CameraEventAggregator(document);
        }).toThrow();
    });

    it('throws if the event type is not of CameraEventType', function() {
        expect(function() {
            handler2 = new CameraEventAggregator(document, ScreenSpaceEventType.LEFT_CLICK);
        }).toThrow();
    });

    it('can be constructed using the middle drag event type', function() {
        expect(function() {
            handler2 = new CameraEventAggregator(document, CameraEventType.MIDDLE_DRAG);
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
        expect(handler.getButtonPressTime()).toBeUndefined();
    });

    it('getButtonReleaseTime', function() {
        expect(handler.getButtonReleaseTime()).toBeUndefined();
    });

    it('isDestroyed', function() {
        expect(handler.isDestroyed()).toEqual(false);
        handler.destroy();
        expect(handler.isDestroyed()).toEqual(true);
    });
});