/*global defineSuite*/
defineSuite([
        'Widgets/CesiumInspector/CesiumInspector',
        'Core/Ellipsoid',
        'Scene/Globe',
        'Specs/createScene'
    ], function(
        CesiumInspector,
        Ellipsoid,
        Globe,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;
    beforeAll(function() {
        scene = createScene();
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var globe = new Globe(ellipsoid);
        scene.globe = globe;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('can create and destroy', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new CesiumInspector('testContainer', scene);
        expect(widget.container).toBe(container);
        expect(widget.viewModel.scene).toBe(scene);
        expect(widget.isDestroyed()).toEqual(false);
        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);

        document.body.removeChild(container);
    });

    it('constructor throws with no element', function() {
        expect(function() {
            return new CesiumInspector();
        }).toThrowDeveloperError();
    });

    it('constructor throws with string element that does not exist', function() {
        expect(function() {
            return new CesiumInspector('does not exist', scene);
        }).toThrowDeveloperError();
    });

    it('constructor throws with no scene', function() {
        expect(function() {
            return new CesiumInspector(document.body);
        }).toThrowDeveloperError();
    });
});