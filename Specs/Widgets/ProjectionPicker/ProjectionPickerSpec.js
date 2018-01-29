defineSuite([
        'Widgets/ProjectionPicker/ProjectionPicker',
        'Core/FeatureDetection',
        'Specs/createScene',
        'Specs/DomEventSimulator'
    ], function(
        ProjectionPicker,
        FeatureDetection,
        createScene,
        DomEventSimulator) {
    'use strict';

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('can create and destroy', function() {
        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new ProjectionPicker('testContainer', scene);
        expect(widget.container.id).toBe(container.id);
        expect(widget.isDestroyed()).toEqual(false);

        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);

        document.body.removeChild(container);
    });

    function addCloseOnInputSpec(name, func) {
        it(name + ' event closes dropdown if target is not inside container', function() {
            var container = document.createElement('span');
            container.id = 'testContainer';
            document.body.appendChild(container);

            var widget = new ProjectionPicker('testContainer', scene);

            widget.viewModel.dropDownVisible = true;
            func(document.body);
            expect(widget.viewModel.dropDownVisible).toEqual(false);

            widget.viewModel.dropDownVisible = true;
            func(container.firstChild);
            expect(widget.viewModel.dropDownVisible).toEqual(true);

            widget.destroy();
            document.body.removeChild(container);
        });
    }

    function addDisabledDuringFlightSpec(name, func) {
        it(name + ' event does nothing during camera flight', function() {
            var container = document.createElement('span');
            container.id = 'testContainer';
            document.body.appendChild(container);

            var widget = new ProjectionPicker('testContainer', scene);

            scene.camera.flyHome(100.0);

            func(container.firstChild);
            expect(widget.viewModel.dropDownVisible).toEqual(false);

            scene.camera.cancelFlight();

            widget.destroy();
            document.body.removeChild(container);
        });
    }

    function addDisabledIn2DSpec(name, func) {
        it(name + ' event does nothing in 2D', function() {
            var container = document.createElement('span');
            container.id = 'testContainer';
            document.body.appendChild(container);

            var widget = new ProjectionPicker('testContainer', scene);

            scene.morphTo2D(0.0);

            func(container.firstChild);
            expect(widget.viewModel.dropDownVisible).toEqual(false);

            widget.destroy();
            document.body.removeChild(container);
        });
    }

    if (FeatureDetection.supportsPointerEvents()) {
        addCloseOnInputSpec('pointerDown', DomEventSimulator.firePointerDown);
        addDisabledDuringFlightSpec('pointerDown', DomEventSimulator.firePointerDown);
        addDisabledIn2DSpec('pointerDown', DomEventSimulator.firePointerDown);
    } else {
        addCloseOnInputSpec('mousedown', DomEventSimulator.fireMouseDown);
        addCloseOnInputSpec('touchstart', DomEventSimulator.fireTouchStart);
        addDisabledDuringFlightSpec('mousedown', DomEventSimulator.fireMouseDown);
        addDisabledDuringFlightSpec('touchstart', DomEventSimulator.fireTouchStart);
        addDisabledIn2DSpec('mousedown', DomEventSimulator.fireMouseDown);
        addDisabledIn2DSpec('touchstart', DomEventSimulator.fireTouchStart);
    }

    it('constructor throws with no scene', function() {
        expect(function() {
            return new ProjectionPicker(document.body, undefined);
        }).toThrowDeveloperError();
    });

    it('constructor throws with no element', function() {
        expect(function() {
            return new ProjectionPicker(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('constructor throws with string element that does not exist', function() {
        expect(function() {
            return new ProjectionPicker('does not exist', scene);
        }).toThrowDeveloperError();
    });
}, 'WebGL');
