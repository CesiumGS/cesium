defineSuite([
        'Widgets/InfoBox/InfoBox',
        'Core/defined',
        'Specs/pollToPromise'
    ], function(
        InfoBox,
        defined,
        pollToPromise) {
    'use strict';

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

        var title = infoBox._element.getElementsByClassName("cesium-infoBox-title")[0];
        expect(title.getAttribute("data-bind").split(": titleText")[0]).toEqual("text");
        expect(infoBox.frame.getAttribute("sandbox")).toEqual("allow-same-origin allow-popups allow-forms");

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
        return pollToPromise(function() {
            node = infoBox.frame.contentDocument.body.firstChild;
            return node !== null;
        }).then(function() {
            expect(infoElement.style['background-color']).toEqual('');
            return pollToPromise(function() {
                return node.innerHTML === infoBox.viewModel.description;
            });
        }).then(function() {
            infoBox.viewModel.description = '<div style="background-color: rgb(255, 255, 255);">Please do not crash</div>';
            expect(infoElement.style['background-color']).toEqual('rgb(255, 255, 255)');
            return pollToPromise(function() {
                return node.innerHTML === infoBox.viewModel.description;
            });
        }).then(function() {
            expect(infoElement['background-color']).toBeUndefined();
        });
    });

    it('constructor works with string id container', function() {
        infoBox = new InfoBox('testContainer');
        expect(infoBox.container.id).toBe(testContainer.id);
    });

    it('can set disableSecurity', function() {
        infoBox = new InfoBox(testContainer);

        infoBox.viewModel.securityDisabled = true;
        var title = infoBox._element.getElementsByClassName("cesium-infoBox-title")[0];
        expect(title.getAttribute("data-bind").split(": titleText")[0]).toEqual("html");
        expect(infoBox.frame.getAttribute("sandbox")).toEqual(null);

        infoBox.viewModel.securityDisabled = false;
        title = infoBox._element.getElementsByClassName("cesium-infoBox-title")[0];
        expect(title.getAttribute("data-bind").split(": titleText")[0]).toEqual("text");
        expect(infoBox.frame.getAttribute("sandbox")).toEqual("allow-same-origin allow-popups allow-forms");
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
