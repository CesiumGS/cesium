/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicBillboardVisualizer',
             'Specs/createScene',
             'Specs/destroyScene',
             'Specs/MockProperty',
             'DynamicScene/DynamicBillboard',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian2',
             'Core/Cartesian3',
             'Core/Color',
             'Scene/Scene',
             'Scene/BillboardCollection',
             'Scene/HorizontalOrigin',
             'Scene/VerticalOrigin'
            ], function(
              DynamicBillboardVisualizer,
              createScene,
              destroyScene,
              MockProperty,
              DynamicBillboard,
              DynamicObjectCollection,
              DynamicObject,
              JulianDate,
              Cartesian2,
              Cartesian3,
              Color,
              Scene,
              BillboardCollection,
              HorizontalOrigin,
              VerticalOrigin) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var visualizer;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    afterEach(function() {
        visualizer = visualizer && visualizer.destroy();
    });

    it('constructor throws if no scene is passed.', function() {
        expect(function() {
            return new DynamicBillboardVisualizer();
        }).toThrow();
    });

    it('constructor sets expected parameters and adds collection to scene.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicBillboardVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection instanceof BillboardCollection).toEqual(true);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicBillboardVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrow();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new DynamicBillboardVisualizer(scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new DynamicBillboardVisualizer(scene);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no billboard does not create a billboard.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicBillboardVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        visualizer.update(new JulianDate());
        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);
    });

    it('object with no position does not create a billboard.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicBillboardVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var billboard = testObject.billboard = new DynamicBillboard();
        billboard.show = new MockProperty(true);
        billboard.image = new MockProperty('Data/Images/Blue.png');

        visualizer.update(new JulianDate());
        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);
    });

    it('object with no image does not create a billboard.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicBillboardVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        var billboard = testObject.billboard = new DynamicBillboard();
        billboard.show = new MockProperty(true);

        visualizer.update(new JulianDate());
        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);
    });

    it('A DynamicBillboard causes a Billboard to be created and updated.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicBillboardVisualizer(scene, dynamicObjectCollection);

        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var billboard = testObject.billboard = new DynamicBillboard();
        var bb;

        runs(function() {
            testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
            billboard.show = new MockProperty(true);
            billboard.color = new MockProperty(new Color(0.5, 0.5, 0.5, 0.5));
            billboard.image = new MockProperty('Data/Images/Blue.png');
            billboard.eyeOffset = new MockProperty(new Cartesian3(1.0, 2.0, 3.0));
            billboard.scale = new MockProperty(12.5);
            billboard.rotation = new MockProperty(1.5);
            billboard.alignedAxis = new MockProperty(Cartesian3.UNIT_Z);
            billboard.horizontalOrigin = new MockProperty(HorizontalOrigin.RIGHT);
            billboard.verticalOrigin = new MockProperty(VerticalOrigin.TOP);
            billboard.pixelOffset = new MockProperty(new Cartesian2(3, 2));

            visualizer.update(time);

            expect(billboardCollection.getLength()).toEqual(1);

            bb = billboardCollection.get(0);

            waitsFor(function() {
                visualizer.update(time);
                if (bb.getShow()) {
                    expect(bb.getPosition()).toEqual(testObject.position.getValueCartesian(time));
                    expect(bb.getColor()).toEqual(testObject.billboard.color.getValue(time));
                    expect(bb.getEyeOffset()).toEqual(testObject.billboard.eyeOffset.getValue(time));
                    expect(bb.getScale()).toEqual(testObject.billboard.scale.getValue(time));
                    expect(bb.getRotation()).toEqual(testObject.billboard.rotation.getValue(time));
                    expect(bb.getAlignedAxis()).toEqual(testObject.billboard.alignedAxis.getValue(time));
                    expect(bb.getHorizontalOrigin()).toEqual(testObject.billboard.horizontalOrigin.getValue(time));
                    expect(bb.getVerticalOrigin()).toEqual(testObject.billboard.verticalOrigin.getValue(time));
                    expect(bb.getPixelOffset()).toEqual(testObject.billboard.pixelOffset.getValue(time));
                }
                return bb.getShow(); //true once the image is loaded.
            });
        });

        runs(function() {
            testObject.position = new MockProperty(new Cartesian3(5678, 1234, 1293434));
            billboard.show = new MockProperty(true);
            billboard.color = new MockProperty(new Color(0.15, 0.25, 0.35, 0.45));
            billboard.image = new MockProperty('Data/Images/Green.png');
            billboard.eyeOffset = new MockProperty(new Cartesian3(2.0, 3.0, 1.0));
            billboard.scale = new MockProperty(2.5);
            billboard.rotation = new MockProperty(2.9);
            billboard.alignedAxis = new MockProperty(Cartesian3.UNIT_Y);
            billboard.horizontalOrigin = new MockProperty(HorizontalOrigin.LEFT);
            billboard.verticalOrigin = new MockProperty(VerticalOrigin.BOTTOM);
            billboard.pixelOffset = new MockProperty(new Cartesian2(2, 3));

            waitsFor(function() {
                visualizer.update(time);
                var imageReady = bb.getImageIndex() === 1; //true once the green image is loaded
                if (imageReady) {
                    expect(bb.getPosition()).toEqual(testObject.position.getValueCartesian(time));
                    expect(bb.getColor()).toEqual(testObject.billboard.color.getValue(time));
                    expect(bb.getEyeOffset()).toEqual(testObject.billboard.eyeOffset.getValue(time));
                    expect(bb.getScale()).toEqual(testObject.billboard.scale.getValue(time));
                    expect(bb.getRotation()).toEqual(testObject.billboard.rotation.getValue(time));
                    expect(bb.getAlignedAxis()).toEqual(testObject.billboard.alignedAxis.getValue(time));
                    expect(bb.getHorizontalOrigin()).toEqual(testObject.billboard.horizontalOrigin.getValue(time));
                    expect(bb.getVerticalOrigin()).toEqual(testObject.billboard.verticalOrigin.getValue(time));
                    expect(bb.getPixelOffset()).toEqual(testObject.billboard.pixelOffset.getValue(time));
                }
                return imageReady;
            });
        });

        runs(function() {
            billboard.show = new MockProperty(false);

            waitsFor(function() {
                visualizer.update(time);
                return !bb.getShow();
            });
        });
    });

    it('clear hides billboards.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicBillboardVisualizer(scene, dynamicObjectCollection);

        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var billboard = testObject.billboard = new DynamicBillboard();

        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        billboard.show = new MockProperty(true);
        billboard.image = new MockProperty('Data/Images/Blue.png');
        visualizer.update(time);
        expect(billboardCollection.getLength()).toEqual(1);
        var bb = billboardCollection.get(0);

        waitsFor(function() {
            visualizer.update(time);
            if (bb.getShow()) {
                //Clearing won't actually remove the billboard because of the
                //internal cache used by the visualizer, instead it just hides it.
                dynamicObjectCollection.clear();
                expect(bb.getShow()).toEqual(false);
                return true;
            }
            return false;
        });
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicBillboardVisualizer(scene, dynamicObjectCollection);

        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var billboard = testObject.billboard = new DynamicBillboard();

        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        billboard.show = new MockProperty(true);
        billboard.image = new MockProperty('Data/Images/Blue.png');
        visualizer.update(time);
        expect(billboardCollection.getLength()).toEqual(1);
        var bb = billboardCollection.get(0);
        expect(bb.dynamicObject).toEqual(testObject);
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.billboard = new DynamicBillboard();
        testObject.billboard.show = new MockProperty(true);
        testObject.billboard.image = new MockProperty('Data/Images/Blue.png');

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.position = new MockProperty(new Cartesian3(5678, 9101112, 1234));
        testObject2.billboard = new DynamicBillboard();
        testObject2.billboard.show = new MockProperty(true);
        testObject2.billboard.image = new MockProperty('Data/Images/Green.png');

        visualizer = new DynamicBillboardVisualizer(scene, dynamicObjectCollection);

        var time = new JulianDate();
        var billboardCollection = scene.getPrimitives().get(0);

        visualizer.update(time);
        expect(billboardCollection.getLength()).toEqual(1);
        var bb = billboardCollection.get(0);
        expect(bb.dynamicObject).toEqual(testObject);

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(time);
        expect(billboardCollection.getLength()).toEqual(1);
        bb = billboardCollection.get(0);
        expect(bb.dynamicObject).toEqual(testObject2);
    });
}, 'WebGL');
