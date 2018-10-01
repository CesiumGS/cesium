defineSuite([
        'Scene/PolylineCollection',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/DistanceDisplayCondition',
        'Core/HeadingPitchRange',
        'Core/Math',
        'Core/Matrix4',
        'Scene/Camera',
        'Scene/Material',
        'Scene/SceneMode',
        'Specs/createScene'
    ], function(
        PolylineCollection,
        BoundingSphere,
        Cartesian3,
        Color,
        DistanceDisplayCondition,
        HeadingPitchRange,
        CesiumMath,
        Matrix4,
        Camera,
        Material,
        SceneMode,
        createScene) {
    'use strict';

    var scene;
    var polylines;

    beforeAll(function() {
        scene = createScene();
        scene.primitives.destroyPrimitives = false;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        polylines = new PolylineCollection();
        scene.mode = SceneMode.SCENE3D;
        scene.camera = new Camera(scene);
    });

    afterEach(function() {
        scene.primitives.removeAll();
        if (!polylines.isDestroyed()) {
            polylines.removeAll();
            polylines.destroy();
        }
    });

    it('default constructs a polyline', function() {
        var p = polylines.add();
        expect(p.show).toEqual(true);
        expect(p.positions.length).toEqual(0);
        expect(p.width).toEqual(1.0);
        expect(p.material.uniforms.color).toEqual(new Color(1.0, 1.0, 1.0, 1.0));
        expect(p.id).not.toBeDefined();
        expect(p.loop).toEqual(false);
    });

    it('explicitly constructs a polyline', function() {
        var material = Material.fromType(Material.PolylineOutlineType);
        var p = polylines.add({
            show : false,
            positions : [new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(4.0, 5.0, 6.0), new Cartesian3(7.0, 8.0, 9.0)],
            loop : true,
            width : 2,
            material : material,
            id : 'id'
        });

        expect(p.show).toEqual(false);
        expect(p.positions[0]).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(p.positions[1]).toEqual(new Cartesian3(4.0, 5.0, 6.0));
        expect(p.positions[2]).toEqual(new Cartesian3(7.0, 8.0, 9.0));
        expect(p.positions.length).toEqual(3);
        expect(p.loop).toEqual(true);
        expect(p.width).toEqual(2);
        expect(p.material.uniforms.color).toEqual(material.uniforms.color);
        expect(p.material.uniforms.outlineColor).toEqual(material.uniforms.outlineColor);
        expect(p.material.uniforms.outlineWidth).toEqual(material.uniforms.outlineWidth);
        expect(p.id).toEqual('id');
    });

    it('sets polyline properties', function() {
        var material = Material.fromType(Material.PolylineOutlineType);
        var p = polylines.add();
        p.show = false;
        p.positions = [new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(4.0, 5.0, 6.0), new Cartesian3(7.0, 8.0, 9.0)];
        p.loop = true;
        p.width = 2;
        p.material = material;

        expect(p.show).toEqual(false);
        expect(p.positions[0]).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(p.positions[1]).toEqual(new Cartesian3(4.0, 5.0, 6.0));
        expect(p.positions[2]).toEqual(new Cartesian3(7.0, 8.0, 9.0));
        expect(p.positions.length).toEqual(3);
        expect(p.loop).toEqual(true);
        expect(p.width).toEqual(2);
        expect(p.material.uniforms.color).toEqual(material.uniforms.color);
        expect(p.material.uniforms.outlineColor).toEqual(material.uniforms.outlineColor);
        expect(p.material.uniforms.outlineWidth).toEqual(material.uniforms.outlineWidth);
    });

    it('constructor sets loop only when number of positions is greater than 2', function() {
        var p = polylines.add({
            positions : [new Cartesian3(0.0, 1.0, 2.0), new Cartesian3(3.0, 4.0, 5.0)],
            loop : true
        });

        expect(p.positions.length).toEqual(2);
    });

    it('sets loop only when number of positions is greater than 2', function() {
        var p = polylines.add({
            positions : [new Cartesian3(0.0, 1.0, 2.0), new Cartesian3(3.0, 4.0, 5.0)]
        });
        p.loop = true;

        expect(p.positions.length).toEqual(2);
    });

    it('sets removed polyline properties', function() {
        var p = polylines.add();
        polylines.remove(p);
        p.show = false;
        expect(p.show).toEqual(false);
    });

    it('has zero polylines when constructed', function() {
        expect(polylines.length).toEqual(0);
    });

    it('adds a polyline', function() {
        var p = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });

        expect(polylines.length).toEqual(1);
        expect(polylines.get(0) === p).toEqual(true);
    });

    it('removes the first polyline', function() {
        var one = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        var two = polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });

        expect(polylines.length).toEqual(2);

        expect(polylines.remove(one)).toEqual(true);

        expect(polylines.length).toEqual(1);
        expect(polylines.get(0) === two).toEqual(true);
    });

    it('removes the last polyline', function() {
        var one = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        var two = polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });

        expect(polylines.length).toEqual(2);

        expect(polylines.remove(two)).toEqual(true);

        expect(polylines.length).toEqual(1);
        expect(polylines.get(0) === one).toEqual(true);
    });

    it('removes the same polyline twice', function() {
        var p = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        expect(polylines.length).toEqual(1);

        expect(polylines.remove(p)).toEqual(true);
        expect(polylines.length).toEqual(0);

        expect(polylines.remove(p)).toEqual(false);
        expect(polylines.length).toEqual(0);
    });

    it('returns false when removing undefined', function() {
        polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            }, {
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        expect(polylines.length).toEqual(1);

        expect(polylines.remove(undefined)).toEqual(false);
        expect(polylines.length).toEqual(1);
    });

    it('adds and removes polylines', function() {
        var one = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        var two = polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        expect(polylines.length).toEqual(2);
        expect(polylines.get(0) === one).toEqual(true);
        expect(polylines.get(1) === two).toEqual(true);

        expect(polylines.remove(two)).toEqual(true);
        var three = polylines.add({
            positions : [{
                x : 7.0,
                y : 8.0,
                z : 9.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        expect(polylines.length).toEqual(2);
        expect(polylines.get(0) === one).toEqual(true);
        expect(polylines.get(1) === three).toEqual(true);
    });

    it('removes all polylines', function() {
        polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        expect(polylines.length).toEqual(2);

        polylines.removeAll();
        expect(polylines.length).toEqual(0);
    });

    it('removes a polyline from the updated list when removed', function() {
        var firstPolyline = polylines.add();
        var secondPolyline = polylines.add();

        firstPolyline.width = 4;
        secondPolyline.width = 5;

        expect(polylines._polylinesToUpdate.length).toEqual(2);

        polylines.remove(secondPolyline);

        expect(polylines._polylinesToUpdate.length).toEqual(1);
    });

    it('can check if it contains a polyline', function() {
        var polyline = polylines.add();

        expect(polylines.contains(polyline)).toEqual(true);
    });

    it('returns false when checking if it contains a polyline it does not contain', function() {
        var polyline = polylines.add();
        polylines.remove(polyline);

        expect(polylines.contains(polyline)).toEqual(false);
    });

    it('does not contain undefined', function() {
        expect(polylines.contains(undefined)).toEqual(false);
    });

    it('does not contain random other objects', function() {
        expect(polylines.contains({})).toEqual(false);
        expect(polylines.contains(new Cartesian3())).toEqual(false);
    });

    it('does not render when constructed', function() {
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('renders polylines. one polyline with no positions', function() {
        var positions = [];
        for (var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1000000,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1000000,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        polylines.add();
        polylines.add({
            positions: positions
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('does not crash if polyline has one position', function() {
        polylines.add({
            positions : [{
                x : 1647745.6656519484,
                y : 4949018.87918947,
                z : 3661524.164064342
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('renders polylines with duplicate positions at construction', function() {
        polylines.add({
            positions : [
                         new Cartesian3(0.0, -1000000.0, 0.0),
                         new Cartesian3(0.0, 1000000.0, 0.0),
                         new Cartesian3(0.0, 1000000.0, 0.0),
                         new Cartesian3(0.0, 2000000.0, 0.0)
            ]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders polylines with duplicate positions after setting positions', function() {
        var p = polylines.add();
        p.positions = [
                       new Cartesian3(0.0, -1000000.0, 0.0),
                       new Cartesian3(0.0, 1000000.0, 0.0),
                       new Cartesian3(0.0, 1000000.0, 0.0),
                       new Cartesian3(0.0, 2000000.0, 0.0)
        ];

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('A polyline that used to cross the IDL but now does not, triggers vertex creation (This code used to crash)', function() {

        //Need to be in 2D or CV
        scene.mode = SceneMode.SCENE2D;

        //These positions cross the IDL
        var positions = [];
        positions.push({
            x : 12163600,
            y : -47362500,
            z : 40812700
        });
        positions.push({
            x : -50442500,
            y : 83936900,
            z : 37992500
        });

        //Create a line
        var line = polylines.add({
            positions : positions
        });

        //Render it
        scene.primitives.add(polylines);
        scene.render();

        //We need to set positions and render it again
        //in order for BufferUsage.STREAM_DRAW to be
        //triggered, which ends up rebuilding vertex arrays.
        line.positions = positions;
        scene.render();

        //Now set the second position which results in a line that does not cross the IDL
        positions[1] = {
            x : 19616100,
            y : -46499100,
            z : 38870500
        };
        line.positions = positions;

        //Render the new line.  The fact that the new position no longer crosses the IDL
        //is what triggers the vertex array creation.  If the vertex array were not
        //recreaated, an exception would be thrown do to positions having less data then expected.
        scene.render();
    });

    it('renders 64K vertices of same polyline', function() {
        var positions = [];
        for ( var i = 0; i < CesiumMath.SIXTY_FOUR_KILOBYTES / 2; ++i) {
            positions.push({
                x : 0,
                y : -1000000,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1000000,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('creates two vertex arrays and renders', function() {
        var positions = [];
        for ( var i = 0; i < CesiumMath.SIXTY_FOUR_KILOBYTES / 2; ++i) {
            positions.push({
                x : 0,
                y : -1000000,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1000000,
                z : 0
            });
        }

        var p1 = polylines.add({
            positions : positions
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        p1.show = false;
        expect(scene).toRender([0, 0, 0, 255]);

        polylines.add({
            positions : positions
        });

        expect(scene).notToRender([0, 0, 0, 255]);

    });

    it('renders more than 64K vertices of same polyline', function() {
        var positions = [];
        for ( var i = 0; i < CesiumMath.SIXTY_FOUR_KILOBYTES; ++i) {
            positions.push({
                x : 0,
                y : -1000000,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1000000,
                z : 0
            });
        }
        positions.push({
            x : 0,
            y : -1000000,
            z : 0
        });
        positions.push({
            x : 0,
            y : 1000000,
            z : 0
        });

        polylines.add({
            positions : positions
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders a polyline with no positions', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1000000,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1000000,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        polylines.add({
            positions : []
        });

        scene.primitives.removeAll();
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders an updated polyline with no positions using set positions', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1000000,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1000000,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        var p2 = polylines.add({
            positions : []
        });

        expect(scene).notToRender([0, 0, 0, 255]);

        //recreates vertex array because buffer usage changed
        p2.positions = [];
        expect(scene).notToRender([0, 0, 0, 255]);

        //should call PolylineCollection.writePositionsUpdate
        p2.positions = [];
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders an updated polyline with no positions using show', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1000000,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1000000,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        var p2 = polylines.add({
            positions : []
        });
        expect(scene).notToRender([0, 0, 0, 255]);

        //recreates vertex array because buffer usage changed
        p2.show = false;
        expect(scene).notToRender([0, 0, 0, 255]);

        //should call PolylineCollection.writeMiscUpdate
        p2.show = true;
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders an updated polyline with no positions using material', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1000000,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1000000,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        var p2 = polylines.add({
            positions : []
        });

        expect(scene).notToRender([0, 0, 0, 255]);

        //recreates vertex array because buffer usage changed
        p2.material = Material.fromType(Material.PolylineOutlineType);

        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('changes buffer usage after 100 iterations of not changing', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1000000,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1000000,
                z : 0
            });
        }

        var p = polylines.add({
            positions : positions
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        // changes buffer usage, recreates vertex arrays
        p.positions = positions;
        for(var j = 0; j < 101; ++j){
            scene.render();
        }
        expect(scene).notToRender([0, 0, 0, 255]);

    });

    it('renders more than 64K vertices of different polylines', function() {
        var positions = [];
        for ( var i = 0; i < CesiumMath.SIXTY_FOUR_KILOBYTES; ++i) {
            positions.push({
                x : -1000000,
                y : -1000000,
                z : 0
            });
            positions.push({
                x : -1000000,
                y : 1000000,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        polylines.add({
           positions : [{
                x : 0,
                y : -1000000,
                z : 0
            },{
                x : 0,
                y : 1000000,
                z : 0
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        polylines.debugShowBoundingVolume = true;
        var material = Material.fromType('Color');
        material.uniforms.color = new Color(1.0, 1.0, 1.0, 0.0);
        var p = polylines.add({
            positions : [{
                x : 1.0,
                y : -1000.0,
                z : 1.0
            },{
                x : 1.0,
                y : 1000.00,
                z : 1.0
            }],
            material : material
        });
        var bounds = BoundingSphere.fromPoints(p.positions);
        scene.camera.viewBoundingSphere(bounds);
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('does not render', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
        p.show = false;

        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('modifies and removes a polyline, then renders', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        polylines.remove(p);

        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('renders a green polyline', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('adds and renders a polyline', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        polylines.add({
            positions : [{
                x : 500000.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 500000.0,
                y : 1000000.0,
                z : 0.0
            }]
        });

        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('removes and renders a polyline', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });
        var bluePolyline = polylines.add({
            positions : [{
                x : 500000.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 500000.0,
                y : 1000000.0,
                z : 0.0
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        polylines.remove(bluePolyline);

        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('removes all polylines and renders', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        polylines.removeAll();

        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('removes all polylines, adds a polyline, and renders', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        polylines.removeAll();

        expect(scene).toRender([0, 0, 0, 255]);

        polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });

        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders using polyline positions property', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        p.positions = [{
            x : 0.0,
            y : -1000000.0,
            z : -2000000.0
        }, {
            x : 0.0,
            y : 1000000.0,
            z : -2000000.0
        }]; // Behind viewer
        expect(scene).toRender([0, 0, 0, 255]);

        p.positions = [{
            x : 0.0,
            y : -1000000.0,
            z : 0.0
        }, {
            x : 0.0,
            y : 1000000.0,
            z : 0.0
        }]; // Back in front of viewer
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders and updates one polyline from many polylines using show property', function() {
        var positions = [{
            x : 0.0,
            y : -1000000.0,
            z : -2000000.0
        }, {
            x : 0.0,
            y : 1000000.0,
            z : -2000000.0
        }];
        polylines.add({
            positions : positions,
            width : 2
        });

        polylines.add({
            positions : positions,
            width : 2
        });

        polylines.add({
            positions : positions,
            width : 2
        });

        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }],
            width : 2
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        p.show = false;
        expect(scene).toRender([0, 0, 0, 255]);

        p.show = true;
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders using polyline show property', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }],
            show:true
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        p.show = false;
        expect(scene).toRender([0, 0, 0, 255]);

        p.show = true;
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders four polylines with different widths', function() {
        var positions = [];
        for(var i = 0; i < 200; ++i){
            positions.push({
                x : -1000000.0,
                y : 1000000.0,
                z : 0.0
            },{
                x : -1000000.0,
                y : -1000000.0,
                z : 0.0
            });
        }
        polylines.add({
            positions : positions,
            width : 3
        });
        polylines.add({
            positions : positions,
            width : 1
        });
        polylines.add({
            positions : positions,
            width : 2
        });
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            width : 7
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('renders three polylines with different widths and updates one', function() {
        var positions = [];
        for(var i = 0; i < 200; ++i){
            positions.push({
                x : -1000000.0,
                y : 1000000.0,
                z : 0.0
            },{
                x : -1000000.0,
                y : -1000000.0,
                z : 0.0
            });
        }
        polylines.add({
            positions : positions,
            width : 3
        });
        polylines.add({
            positions : positions,
            width : 4
        });
        var p2 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }],
            width : 7
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        p2.material = Material.fromType(Material.PolylineOutlineType);
        expect(scene).notToRender([0, 0, 0, 255]);

        p2.material = Material.fromType(Material.ColorType);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('does not render with width 0.0', function() {
        var line = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }],
            width : 7
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        line.width = 0.0;
        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('renders with a distance display condition', function() {
        var near = 100.0;
        var far = 10000.0;

        var line = polylines.add({
            positions : [{
                x : 10.0,
                y : -10.0,
                z : 0.0
            }, {
                x : 10.0,
                y : 10.0,
                z : 0.0
            }],
            width : 7,
            distanceDisplayCondition : new DistanceDisplayCondition(near, far)
        });

        scene.primitives.add(polylines);
        scene.renderForSpecs();

        var boundingSphere = line._boundingVolumeWC;
        var center = boundingSphere.center;
        var radius = boundingSphere.radius;

        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + near - 10.0));
        expect(scene).toRender([0, 0, 0, 255]);

        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + near + 1.0));
        expect(scene).notToRender([0, 0, 0, 255]);

        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + far + 10.0));
        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('renders with a distance display condition after creation', function() {
        var near = 100.0;
        var far = 10000.0;

        var line = polylines.add({
            positions : [{
                x : 10.0,
                y : -10.0,
                z : 0.0
            }, {
                x : 10.0,
                y : 10.0,
                z : 0.0
            }],
            width : 7
        });

        scene.primitives.add(polylines);
        scene.renderForSpecs();

        line.distanceDisplayCondition = new DistanceDisplayCondition(near, far);

        var boundingSphere = line._boundingVolumeWC;
        var center = boundingSphere.center;
        var radius = boundingSphere.radius;

        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + near - 10.0));
        expect(scene).toRender([0, 0, 0, 255]);

        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + near + 1.0));
        expect(scene).notToRender([0, 0, 0, 255]);

        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + far + 10.0));
        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('changes polyline position size recreates vertex arrays', function() {
        var positions = [];
        for(var i = 0; i < 20; ++i){
            positions.push({
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            },{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            });
        }
        var p = polylines.add({
            positions : positions
        });

        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        p.positions = positions;
        expect(scene).notToRender([0, 0, 0, 255]);

        positions.push({
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            });

        p.positions = positions;
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('changes polyline width property', function() {
        var p1 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });
        var p2 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });
        expect(scene).toRender([0, 0, 0, 255]);

        scene.primitives.add(polylines);
        expect(scene).notToRender([0, 0, 0, 255]);

        p1.width = 2;
        expect(scene).notToRender([0, 0, 0, 255]);

        p2.width = 2;
        expect(scene).notToRender([0, 0, 0, 255]);

        p1.width = 1;
        expect(scene).notToRender([0, 0, 0, 255]);

    });

    it('renders with model matrix', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : 0.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        expect(scene).toRender([0, 0, 0, 255]);
        scene.primitives.add(polylines);
        expect(scene).toRender([0, 0, 0, 255]);
        polylines.modelMatrix = Matrix4.fromUniformScale(1000000.0, polylines.modelMatrix);
        expect(scene).notToRender([0, 0, 0, 255]);
    });

    it('is picked', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }],
            id : 'id'
        });

        scene.primitives.add(polylines);
        expect(scene).toPickAndCall(function(result) {
            expect(result.primitive).toEqual(p);
            expect(result.id).toEqual('id');
        });
    });

    it('can change pick id', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }],
            id : 'id'
        });

        scene.primitives.add(polylines);
        expect(scene).toPickAndCall(function(result) {
            expect(result.primitive).toEqual(p);
            expect(result.id).toEqual('id');
        });

        p.id = 'id2';

        expect(scene).toPickAndCall(function(result) {
            expect(result.primitive).toEqual(p);
            expect(result.id).toEqual('id2');
        });
    });

    it('is not picked (show === false)', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }],
            show : false
        });
        scene.primitives.add(polylines);

        expect(scene).notToPick();
    });

    it('is not picked (alpha === 0.0)', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1000000.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1000000.0,
                z : 0.0
            }]
        });
        p.material.uniforms.color.alpha = 0.0;
        scene.primitives.add(polylines);

        expect(scene).notToPick();
    });

    it('does not equal undefined', function() {
        var polyline = polylines.add();
        expect(polyline).not.toEqual(undefined);
    });

    it('throws when accessing without an index', function() {
        expect(function() {
            polylines.get();
        }).toThrowDeveloperError();
    });

    it('computes bounding sphere in 3D', function() {
        var one = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        var two = polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        var three = polylines.add({
            positions : [{
                x : 7.0,
                y : 8.0,
                z : 9.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });

        scene.primitives.add(polylines);
        scene.render();
        var boundingVolume = scene.frameState.commandList[0].boundingVolume;

        expect(one._boundingVolume).toEqual(BoundingSphere.fromPoints(one.positions));
        expect(two._boundingVolume).toEqual(BoundingSphere.fromPoints(two.positions));
        expect(three._boundingVolume).toEqual(BoundingSphere.fromPoints(three.positions));
        expect(boundingVolume).toEqual(BoundingSphere.union(BoundingSphere.union(one._boundingVolume, two._boundingVolume), three._boundingVolume));
    });

    function testBoundingSphere() {
        var projection = scene.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = polylines.add({
            positions : Cartesian3.fromDegreesArray([
                -50.0, -50.0,
                50.0, -50.0
            ])
        });
        var two = polylines.add({
            positions : Cartesian3.fromDegreesArray([
                50.0, 50.0,
                -50.0, 50.0
            ])
        });

        scene.primitives.add(polylines);
        scene.render();
        var boundingVolume = scene.frameState.commandList[0].boundingVolume;

        var positions = one.positions;
        var projectedPositions = [];
        var i;
        for (i = 0; i < positions.length; ++i) {
            projectedPositions.push(projection.project(ellipsoid.cartesianToCartographic(positions[i])));
        }
        var bs = BoundingSphere.fromPoints(projectedPositions);
        bs.center = new Cartesian3(bs.center.z, bs.center.x, bs.center.y);
        expect(one._boundingVolume2D.center).toEqualEpsilon(bs.center, CesiumMath.EPSILON8);
        expect(one._boundingVolume2D.radius).toEqualEpsilon(bs.radius, CesiumMath.EPSILON12);

        positions = two.positions;
        projectedPositions = [];
        for (i = 0; i < positions.length; ++i) {
            projectedPositions.push(projection.project(ellipsoid.cartesianToCartographic(positions[i])));
        }
        bs = BoundingSphere.fromPoints(projectedPositions);
        bs.center = new Cartesian3(bs.center.z, bs.center.x, bs.center.y);
        expect(two._boundingVolume2D.center).toEqualEpsilon(bs.center, CesiumMath.EPSILON8);
        expect(two._boundingVolume2D.radius).toEqualEpsilon(bs.radius, CesiumMath.EPSILON12);

        var expected = BoundingSphere.union(one._boundingVolume2D, two._boundingVolume2D);
        expect(boundingVolume.center).toEqualEpsilon(expected.center, CesiumMath.EPSILON8);
        expect(boundingVolume.radius).toEqualEpsilon(expected.radius, CesiumMath.EPSILON8);
    }

    it('computes bounding sphere in Columbus view', function() {
        scene.mode = SceneMode.COLUMBUS_VIEW;
        testBoundingSphere();
    });

    it('computes bounding sphere in 2D', function() {
        scene.mode = SceneMode.SCENE2D;
        testBoundingSphere();
    });

    it('computes optimized bounding volumes per material', function() {
        var one = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        one.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var two = polylines.add({
            positions : [{
                x : 2.0,
                y : 3.0,
                z : 4.0
            },{
                x : 4.0,
                y : 5.0,
                z : 6.0
            }]
        });
        two.material.uniforms.color = new Color(0.0, 1.0, 0.0, 1.0);

        scene.primitives.add(polylines);
        scene.render();

        expect(scene.frameState.commandList[0].boundingVolume).toEqual(one._boundingVolume);
        expect(scene.frameState.commandList[1].boundingVolume).toEqual(two._boundingVolume);
    });

    it('isDestroyed', function() {
        expect(polylines.isDestroyed()).toEqual(false);
        polylines.destroy();
        expect(polylines.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
