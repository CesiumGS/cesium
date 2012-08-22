/*global defineSuite*/
defineSuite([
         'Scene/PolylineCollection',
         'Scene/Polyline',
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/sceneState',
         '../Specs/pick',
         'Core/Cartesian3',
         'Core/Matrix4',
         'Core/Math',
         'Renderer/BufferUsage'
     ], function(
         PolylineCollection,
         Polyline,
         createContext,
         destroyContext,
         sceneState,
         pick,
         Cartesian3,
         Matrix4,
         CesiumMath,
         BufferUsage) {
    "use strict";
    /*global it,expect,beforeEach,afterEach,beforeAll,afterAll*/

    var context;
    var polylines;
    var us;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        polylines = new PolylineCollection();

        var camera = {
            eye : new Cartesian3(-1.0, 0.0, 0.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        };
        us = context.getUniformState();
        us.setView(Matrix4.fromCamera(camera));
        us.setProjection(Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), 1.0, 0.01, 10.0));
    });

    afterEach(function() {
        us = null;
    });

    it("default constructs a polyline", function() {
        var p = polylines.add();
        expect(p.getShow()).toEqual(true);
        expect(p.getPositions().length).toEqual(0);
        expect(p.getColor().red).toEqual(1.0);
        expect(p.getColor().green).toEqual(1.0);
        expect(p.getColor().blue).toEqual(1.0);
        expect(p.getColor().alpha).toEqual(1.0);
        expect(p.getOutlineColor().red).toEqual(1.0);
        expect(p.getOutlineColor().green).toEqual(1.0);
        expect(p.getOutlineColor().blue).toEqual(1.0);
        expect(p.getOutlineColor().alpha).toEqual(1.0);
        expect(p.getWidth()).toEqual(1.0);
        expect(p.getOutlineWidth()).toEqual(0.0);
    });

    it("explicitly constructs a polyline", function() {
        var p = polylines.add({
            show : false,
            positions : [new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(4.0, 5.0, 6.0)],
            width : 2,
            outlineWidth : 5,
            color : {
                red : 1.0,
                green : 2.0,
                blue : 3.0,
                alpha : 4.0
            },
            outlineColor: {
                red : 6.0,
                green : 7.0,
                blue : 8.0,
                alpha : 9.0
            }
        });

        expect(p.getShow()).toEqual(false);
        expect(p.getPositions()[0].equals(new Cartesian3(1.0, 2.0, 3.0))).toEqual(true);
        expect(p.getPositions()[1].equals(new Cartesian3(4.0, 5.0, 6.0))).toEqual(true);
        expect(p.getColor().red).toEqual(1.0);
        expect(p.getColor().green).toEqual(2.0);
        expect(p.getColor().blue).toEqual(3.0);
        expect(p.getColor().alpha).toEqual(4.0);
        expect(p.getWidth()).toEqual(2);
        expect(p.getOutlineWidth()).toEqual(5);
        expect(p.getOutlineColor().red).toEqual(6.0);
        expect(p.getOutlineColor().green).toEqual(7.0);
        expect(p.getOutlineColor().blue).toEqual(8.0);
        expect(p.getOutlineColor().alpha).toEqual(9.0);
    });

    it("set's a polyline's properties", function() {
        var p = polylines.add();
        p.setShow(false);
        p.setPositions([new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(4.0, 5.0, 6.0)]);
        p.setColor({
            red : 1.0,
            green : 2.0,
            blue : 3.0,
            alpha : 4.0
        });
        p.setOutlineColor({
            red : 5.0,
            green : 6.0,
            blue : 7.0,
            alpha : 8.0
        });
        p.setWidth(2);
        p.setOutlineWidth(7);

        expect(p.getShow()).toEqual(false);
        expect(p.getPositions()[0].equals(new Cartesian3(1.0, 2.0, 3.0))).toEqual(true);
        expect(p.getPositions()[1].equals(new Cartesian3(4.0, 5.0, 6.0))).toEqual(true);
        expect(p.getColor().red).toEqual(1.0);
        expect(p.getColor().green).toEqual(2.0);
        expect(p.getColor().blue).toEqual(3.0);
        expect(p.getColor().alpha).toEqual(4.0);
        expect(p.getWidth()).toEqual(2);
        expect(p.getOutlineWidth()).toEqual(7);
        expect(p.getOutlineColor().red).toEqual(5.0);
        expect(p.getOutlineColor().green).toEqual(6.0);
        expect(p.getOutlineColor().blue).toEqual(7.0);
        expect(p.getOutlineColor().alpha).toEqual(8.0);
    });

    it("set's a removed polyline's property", function() {
        var p = polylines.add();
        polylines.remove(p);
        p.setShow(false);
        expect(p.getShow()).toEqual(false);
    });

    it("has zero polylines when constructed", function() {
        expect(polylines.getLength()).toEqual(0);
    });

    it("adds a polyline", function() {
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

        expect(polylines.getLength()).toEqual(1);
        expect(polylines.get(0) === p).toEqual(true);
    });

    it("removes the first polyline", function() {
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

        expect(polylines.getLength()).toEqual(2);

        expect(polylines.remove(one)).toEqual(true);

        expect(polylines.getLength()).toEqual(1);
        expect(polylines.get(0) === two).toEqual(true);
    });

    it("removes the last polyline", function() {
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

        expect(polylines.getLength()).toEqual(2);

        expect(polylines.remove(two)).toEqual(true);

        expect(polylines.getLength()).toEqual(1);
        expect(polylines.get(0) === one).toEqual(true);
    });

    it("removes the same polyline twice", function() {
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
        expect(polylines.getLength()).toEqual(1);

        expect(polylines.remove(p)).toEqual(true);
        expect(polylines.getLength()).toEqual(0);

        expect(polylines.remove(p)).toEqual(false);
        expect(polylines.getLength()).toEqual(0);
    });

    it("removes null", function() {
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
        expect(polylines.getLength()).toEqual(1);

        expect(polylines.remove(null)).toEqual(false);
        expect(polylines.getLength()).toEqual(1);
    });

    it("adds and removes polylines", function() {
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
        expect(polylines.getLength()).toEqual(2);
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
        expect(polylines.getLength()).toEqual(2);
        expect(polylines.get(0) === one).toEqual(true);
        expect(polylines.get(1) === three).toEqual(true);
    });

    it("removes all polylines", function() {
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
        expect(polylines.getLength()).toEqual(2);

        polylines.removeAll();
        expect(polylines.getLength()).toEqual(0);
    });

    it("contains a polyline", function() {
        var p = polylines.add();
        polylines.add(p);

        expect(polylines.contains(p)).toEqual(true);
    });

    it("doesn't contain a polyline", function() {
        var p0 = polylines.add();
        var p1 = polylines.add();

        polylines.add(p0);
        polylines.add(p1);
        polylines.remove(p0);

        expect(polylines.contains(p0)).toEqual(false);
    });

    it("doesn't contain undefined", function() {
        expect(polylines.contains()).toBeFalsy();
    });

    it("doesn't render when constructed", function() {
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('renders polylines. one polyline with no positions', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({x:0, y:-1, z:0});
            positions.push({x:0, y:1, z:0});
        }

        polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        polylines.add();
        polylines.add({
            positions: positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('renders 64K vertexes of same polyline', function() {
        var positions = [];
        for ( var i = 0; i < (64 * 1024) / 2; ++i) {
            positions.push({x:0, y:-1, z:0});
            positions.push({x:0, y:1, z:0});
        }

        polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('creates two vertex arrays and renders', function() {
        var positions = [];
        for ( var i = 0; i < (64 * 1024) / 2; ++i) {
            positions.push({x:0, y:-1, z:0});
            positions.push({x:0, y:1, z:0});
        }

        var p1 = polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p1.setShow(false);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);


        polylines.add({positions:positions,
            color:{red:1, green:1, blue:0, alpha:1}});

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 0, 255]);

    });

    it('renders more than 64K vertexes of same polyline', function() {
        var positions = [];
        for ( var i = 0; i < 64 * 1024; ++i) {
            positions.push({x:0, y:-1, z:0});
            positions.push({x:0, y:1, z:0});
        }
        positions.push({x:0, y:-1, z:0});
        positions.push({x:0, y:1, z:0});

        polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('renders a polyline with no positions', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({x:0, y:-1, z:0});
            positions.push({x:0, y:1, z:0});
        }

        polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        polylines.add({
            positions : [],
            color:{red:0, green:1, blue:0, alpha:1}
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

    });

    it('renders an updated polyline with no positions using setPositions', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({x:0, y:-1, z:0});
            positions.push({x:0, y:1, z:0});
        }

        polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        var p2 = polylines.add({
            positions : [],
            color:{red:0, green:1, blue:0, alpha:1}
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        //recreates vertex array because buffer usage changed
        p2.setPositions([]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        //should call PolylineCollection.writePositionsUpdate
        p2.setPositions([]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

    });

    it('renders an updated polyline with no positions using setShow', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({x:0, y:-1, z:0});
            positions.push({x:0, y:1, z:0});
        }

        polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        var p2 = polylines.add({
            positions : [],
            color:{red:0, green:1, blue:0, alpha:1}
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        //recreates vertex array because buffer usage changed
        p2.setShow(false);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        //should call PolylineCollection.writeShowUpdate
        p2.setShow(true);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

    });

    it('renders an updated polyline with no positions using setColor', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({x:0, y:-1, z:0});
            positions.push({x:0, y:1, z:0});
        }

        polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        var p2 = polylines.add({
            positions : [],
            color:{red:0, green:1, blue:0, alpha:1}
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        //recreates vertex array because buffer usage changed
        p2.setColor({red:1.0, blue:1.0, green:0.1, alpha:1.0});

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        //should call PolylineCollection.writeColorUpdate
        p2.setColor({red:1.0, blue:0.5, green:0.1, alpha:1.0});

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('changes buffer usage after 100 iterations of not changing', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({x:0, y:-1, z:0});
            positions.push({x:0, y:1, z:0});
        }

        var p = polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);


        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);

        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        // changes buffer usage, recreates vertex arrays
        p.setPositions(positions);
        polylines.update(context, sceneState);
        polylines.render(context, us);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        for(var j = 0; j < 101; ++j){
            polylines.update(context, sceneState);
            polylines.render(context, us);
        }
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

    });

    it('renders an updated polyline with no positions using setOutlineColor', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({x:0, y:-1, z:0});
            positions.push({x:0, y:1, z:0});
        }

        polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        var p2 = polylines.add({
            positions : [],
            color:{red:0, green:1, blue:0, alpha:1}
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        //recreates vertex array because buffer usage changed
        p2.setOutlineColor({red:1.0, blue:1.0, green:0.1, alpha:1.0});

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        //should call PolylineCollection.writeColorUpdate
        p2.setOutlineColor({red:1.0, blue:0.5, green:0.1, alpha:1.0});

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('renders more than 64K vertexes of different polylines', function() {
        var positions = [];
        for ( var i = 0; i < 64 * 1024; ++i) {
            positions.push({x:-1, y:-1, z:0});
            positions.push({x:-1, y:1, z:0});
        }

        polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        positions = [];

        positions.push({x:0, y:-1, z:0});
        positions.push({x:0, y:1, z:0});
        polylines.add({
           positions:positions,
           color:{red:0, green:1, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders more than 64K vertexes of different polylines of different widths', function() {
        var positions = [];
        for ( var i = 0; i < 64 * 1024 - 2; ++i) {
            positions.push({x:-1, y:-1, z:0});
            positions.push({x:-1, y:1, z:0});
        }

        polylines.add({
            positions : positions,
            color:{red:1, green:0, blue:0, alpha:1}
        });
        positions = [];

        positions.push({x:0, y:-1, z:0});
        positions.push({x:0, y:1, z:0});
        positions.push({x:0, y:-1, z:0});
        positions.push({x:0, y:1, z:0});
        polylines.add({
           positions:positions,
           width:5,
           color:{red:0, green:1, blue:0, alpha:1}
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('does not render', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
        p.setShow(false);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it("modifies and removes a polyline, then renders", function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        polylines.remove(p);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it("renders a green polyline", function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            color : {
                red : 0.0,
                green : 1.0,
                blue : 0.0,
                alpha : 1.0
            }
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it("adds and renders a polyline", function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            color : {
                red : 0.0,
                green : 1.0,
                blue : 0.0,
                alpha : 1.0
            }
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);

        polylines.add({
            positions : [{
                x : 0.5,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.5,
                y : 1.0,
                z : 0.0
            }],
            color : {
                red : 0.0,
                green : 0.0,
                blue : 1.0,
                alpha : 1.0
            }
        });

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it("removes and renders a polyline", function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });
        var bluePolyline = polylines.add({
            positions : [{
                x : 0.5,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.5,
                y : 1.0,
                z : 0.0
            }],
            color : {
                red : 0.0,
                green : 0.0,
                blue : 1.0,
                alpha : 1.0
            }
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.remove(bluePolyline);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it("removes all polylines and renders", function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.removeAll();
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it("removes all polylines, adds a polyline, and renders", function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            color : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.removeAll();
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            color : {
                red : 0.0,
                green : 0.0,
                blue : 1.0,
                alpha : 1.0
            }
        });

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);
    });

    it('renders using polyline positions property', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.setPositions([{
            x : -2.0,
            y : -1.0,
            z : 0.0
        },
        {
            x : -2.0,
            y : 1.0,
            z : 0.0
        }]); // Behind viewer
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.setPositions([{
            x : 0.0,
            y : -1.0,
            z : 0.0
        },
        {
            x : 0.0,
            y : 1.0,
            z : 0.0
        }]); // Back in front of viewer
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('renders using polyline color property', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.setColor({
            red : 1.0,
            green : 0.0,
            blue : 1.0,
            alpha : 1.0
        });
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 255, 255]);

        // Update a second time since it goes through a different vertex array update path
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.setColor({
            red : 0.0,
            green : 1.0,
            blue : 0.0,
            alpha : 1.0
        });
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('renders using polyline outlineColor property', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            outlineWidth:2
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.setOutlineColor({
            red : 1.0,
            green : 0.0,
            blue : 1.0,
            alpha : 1.0
        });
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        // Update a second time since it goes through a different vertex array update path
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.setOutlineColor({
            red : 0.0,
            green : 1.0,
            blue : 0.0,
            alpha : 1.0
        });
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });


    it('renders and updates one polyline from many polylines using show property', function() {
        var positions = [];
        for(var i = 0; i < 200; i++){
            positions.push({
                x : -1.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : -1.0,
                y : 1.0,
                z : 0.0
            });
        }
        polylines.add({
            positions : positions,
            width:2
        });

        polylines.add({
            positions : positions,
            width:2
        });

        polylines.add({
            positions : positions,
            width:2
        });

        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            width:2,
            color:{red:1.0, green:1.0, blue:0.0, alpha:1.0}
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 0, 255]);


        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.setShow(false);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.setShow(true);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 0, 255]);

    });

    it('renders using polyline show property', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            show:true
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.setShow(false);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // Update a second time since it goes through a different vertex array update path
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.setShow(true);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('renders two polylines with different widths and updates one', function() {
        var positions = [];
        for(var i = 0; i < 200; ++i){
            positions.push({
                x : -1.0,
                y : 1.0,
                z : 0.0
            },{
                x : -1.0,
                y : -1.0,
                z : 0.0
            });
        }
        polylines.add({
            positions : positions,
            color:{
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            },
            width : 3
        });
        var p2 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            color:{
                red : 0.0,
                green : 0.0,
                blue : 1.0,
                alpha : 1.0
            },
            width : 7
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([0, 0, 255, 255]);

        p2.setColor({red:1.0, green:1.0, blue:0.0, alpha:1.0});
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 0, 255]);

        p2.setColor({red:1.0, green:0.0, blue:0.0, alpha:1.0});
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);
    });

    it('changes polyline position size recreates vertex arrays', function() {
        var positions = [];
        for(var i = 0; i < 20; ++i){
            positions.push({
                x : 0.0,
                y : 1.0,
                z : 0.0
            },{
                x : 0.0,
                y : -1.0,
                z : 0.0
            });
        }
        var p = polylines.add({
            positions : positions,
            outlineWidth:2
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        p.setPositions(positions);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        positions.push({
                x : 0.0,
                y : 1.0,
                z : 0.0
            });

        p.setPositions(positions);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('changes polyline width property', function() {
        var p1 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });
        var p2 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        p1.setWidth(2);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        p2.setWidth(2);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        p1.setWidth(1);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

    });

    it('changes polyline outlinewidth property', function() {
        var p1 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });
        var p2 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });
        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        p1.setOutlineWidth(2);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        p2.setOutlineWidth(2);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        p1.setOutlineWidth(1);
        polylines.update(context, sceneState);
        polylines.render(context, us);
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

    });

    it('is picked', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        polylines.update(context, sceneState);

        var pickedObject = pick(context, polylines, 0, 0);
        expect(pickedObject).toEqual(p);
    });

    it('is not picked', function() {
        polylines.add({
            positions : [{
                x : -1.0,
                y : -1.0,
                z : 0.0
            },
            {
                x : -1.0,
                y : 1.0,
                z : 0.0
            }]
        });

        polylines.update(context, sceneState);

        var pickedObject = pick(context, polylines, 0, 0);
        expect(pickedObject).not.toBeDefined();
    });

    it('does not equal null', function() {
        var p = polylines.add({});
        expect(p === null).toBeFalsy();
    });

    it('throws when accessing without an index', function() {
        expect(function() {
            polylines.get();
        }).toThrow();
    });

    it('isDestroyed', function() {
        expect(polylines.isDestroyed()).toEqual(false);
        polylines.destroy();
        expect(polylines.isDestroyed()).toEqual(true);
    });

});