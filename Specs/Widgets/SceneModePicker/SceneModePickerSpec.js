import { FeatureDetection } from '../../../Source/Cesium.js';
import createScene from '../../createScene.js';
import DomEventSimulator from '../../DomEventSimulator.js';
import { SceneModePicker } from '../../../Source/Cesium.js';

describe('Widgets/SceneModePicker/SceneModePicker', function() {

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

        var widget = new SceneModePicker('testContainer', scene);
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

            var widget = new SceneModePicker('testContainer', scene);

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

    if (FeatureDetection.supportsPointerEvents()) {
        addCloseOnInputSpec('pointerDown', DomEventSimulator.firePointerDown);
    } else {
        addCloseOnInputSpec('mousedown', DomEventSimulator.fireMouseDown);
        addCloseOnInputSpec('touchstart', DomEventSimulator.fireTouchStart);
    }

    it('constructor throws with no transitioner', function() {
        expect(function() {
            return new SceneModePicker(document.body, undefined);
        }).toThrowDeveloperError();
    });

    it('constructor throws with no element', function() {
        expect(function() {
            return new SceneModePicker(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('constructor throws with string element that does not exist', function() {
        expect(function() {
            return new SceneModePicker('does not exist', scene);
        }).toThrowDeveloperError();
    });
}, 'WebGL');
