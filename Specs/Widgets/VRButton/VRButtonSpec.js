/*global defineSuite*/
defineSuite([
        'Widgets/VRButton/VRButton'
    ], function(
        VRButton) {
    'use strict';

    it('constructor sets default values', function() {
        var vrButton = new VRButton(document.body, {});
        expect(vrButton.container).toBe(document.body);
        expect(vrButton.viewModel.vrElement).toBe(document.body);
        expect(vrButton.isDestroyed()).toEqual(false);
        vrButton.destroy();
        expect(vrButton.isDestroyed()).toEqual(true);
    });

    it('constructor sets expected values', function() {
        var testElement = document.createElement('span');
        var vrButton = new VRButton(document.body, {}, testElement);
        expect(vrButton.container).toBe(document.body);
        expect(vrButton.viewModel.vrElement).toBe(testElement);
        vrButton.destroy();
    });

    it('constructor works with string id container', function() {
        var testElement = document.createElement('span');
        testElement.id = 'testElement';
        document.body.appendChild(testElement);
        var vrButton = new VRButton('testElement', {});
        expect(vrButton.container).toBe(testElement);
        document.body.removeChild(testElement);
        vrButton.destroy();
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new VRButton(undefined, {});
        }).toThrowDeveloperError();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new VRButton('testElement', {});
        }).toThrowDeveloperError();
    });

    it('throws if scene is undefined', function() {
        expect(function() {
            return new VRButton(document.body, undefined);
        }).toThrowDeveloperError();
    });
});