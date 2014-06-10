/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicObjectView',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/JulianDate',
        'DynamicScene/ConstantPositionProperty',
        'DynamicScene/DynamicObject',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        DynamicObjectView,
        Cartesian3,
        Ellipsoid,
        JulianDate,
        ConstantPositionProperty,
        DynamicObject,
        createScene,
        destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('default constructor sets expected values', function() {
        var view = new DynamicObjectView();
        expect(view.ellipsoid).toBe(Ellipsoid.WGS84);
        expect(view.dynamicObject).toBeUndefined();
        expect(view.scene).toBeUndefined();
    });

    it('constructor sets expected values', function() {
        var dynamicObject = new DynamicObject();
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var view = new DynamicObjectView(dynamicObject, scene, ellipsoid);
        expect(view.dynamicObject).toBe(dynamicObject);
        expect(view.scene).toBe(scene);
        expect(view.ellipsoid).toBe(Ellipsoid.UNIT_SPHERE);
    });

    it('update throws without time parameter', function() {
        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(Cartesian3.ZERO);
        var view = new DynamicObjectView(dynamicObject, scene);
        expect(function() {
            view.update(undefined);
        }).toThrowDeveloperError();
    });

    it('update throws without dynamicObject property', function() {
        var view = new DynamicObjectView(undefined, scene);
        expect(function() {
            view.update(JulianDate.now());
        }).toThrowDeveloperError();

    });

    it('update throws without scene property', function() {
        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(Cartesian3.ZERO);
        var view = new DynamicObjectView(dynamicObject, undefined);
        expect(function() {
            view.update(JulianDate.now());
        }).toThrowDeveloperError();
    });

    it('update throws without ellipsoid property', function() {
        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(Cartesian3.ZERO);
        var view = new DynamicObjectView(dynamicObject, scene);
        view.ellipsoid = undefined;
        expect(function() {
            view.update(JulianDate.now());
        }).toThrowDeveloperError();
    });

    it('update throws without dynamicObject.position property.', function() {
        var dynamicObject = new DynamicObject();
        var view = new DynamicObjectView(dynamicObject, scene);
        expect(function() {
            view.update(JulianDate.now());
        }).toThrowDeveloperError();
    });
}, 'WebGL');
