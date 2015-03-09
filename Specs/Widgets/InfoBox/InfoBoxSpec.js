/*global defineSuite*/
defineSuite([
        'Widgets/InfoBox/InfoBox',
        'Core/defined'
    ], function(
        InfoBox,
        defined) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var testContainer;
    var infoBox;
    beforeEach(function() {
        testContainer = document.createElement('span');
        testContainer.id = 'testContainer';
        document.body.appendChild(testContainer);
    });

    afterEach(function() {
        if (defined(infoBox) && !infoBox.isDestroyed()) {
            infoBox = infoBox.destroy();
        }
        document.body.removeChild(testContainer);
    });

    it('constructor sets expected values', function() {
        infoBox = new InfoBox(testContainer);
        expect(infoBox.container).toBe(testContainer);
        expect(infoBox.viewModel).toBeDefined();
        expect(infoBox.isDestroyed()).toEqual(false);
        infoBox.destroy();
        expect(infoBox.isDestroyed()).toEqual(true);
    });

    it('can set description body', function() {
        var infoBox = new InfoBox(testContainer);
        var node;

        var infoElement = testContainer.firstChild;

        infoBox.viewModel.description = 'Please do not crash';
        waitsFor(function() {
            node = infoBox.frame.contentDocument.body.firstChild;
            return node !== null;
        });

        runs(function() {
            expect(infoElement.style['background-color']).toEqual('');
        });

        waitsFor(function() {
            return node.innerHTML === infoBox.viewModel.description;
        });

        runs(function() {
            infoBox.viewModel.description = '<div style="background-color: rgb(255, 255, 255);">Please do not crash</div>';
            expect(infoElement.style['background-color']).toEqual('rgb(255, 255, 255)');
        });

        waitsFor(function() {
            return node.innerHTML === infoBox.viewModel.description;
        });

        runs(function() {
            expect(infoElement['background-color']).toBeUndefined();
        });
    });

    it('constructor works with string id container', function() {
        infoBox = new InfoBox('testContainer');
        expect(infoBox.container).toBe(testContainer);
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new InfoBox(undefined);
        }).toThrowDeveloperError();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new InfoBox('foo');
        }).toThrowDeveloperError();
    });
});