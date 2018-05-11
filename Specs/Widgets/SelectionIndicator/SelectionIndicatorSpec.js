defineSuite([
        'Widgets/SelectionIndicator/SelectionIndicator',
        'Specs/createScene'
    ], function(
        SelectionIndicator,
        createScene) {
    'use strict';

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('constructor sets expected values', function() {
        var selectionIndicator = new SelectionIndicator(document.body, scene);
        expect(selectionIndicator.container).toBe(document.body);
        expect(selectionIndicator.viewModel.scene).toBe(scene);
        expect(selectionIndicator.isDestroyed()).toEqual(false);
        selectionIndicator.destroy();
        expect(selectionIndicator.isDestroyed()).toEqual(true);
    });

    it('constructor works with string id container', function() {
        var testElement = document.createElement('span');
        testElement.id = 'testElement';
        document.body.appendChild(testElement);
        var selectionIndicator = new SelectionIndicator('testElement', scene);
        expect(selectionIndicator.container).toBe(testElement);
        document.body.removeChild(testElement);
        selectionIndicator.destroy();
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new SelectionIndicator(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new SelectionIndicator('testElement', scene);
        }).toThrowDeveloperError();
    });
}, 'WebGL');
