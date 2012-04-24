(function() {
    "use strict";
    /*global Cesium, describe, it, expect, beforeEach, afterEach*/
    
    describe("Polygon", function () {
    
        var context;
        var polygon;
        var us;
                
        beforeEach(function () {
            context = Cesium.Specs.createContext();
            polygon = new Cesium.Polygon();
            
            var camera = {
                eye    : new Cesium.Cartesian3(1.02, 0.0, 0.0),
                target : Cesium.Cartesian3.getZero(),
                up     : Cesium.Cartesian3.getUnitZ()
            };
            us = context.getUniformState();
            us.setView(Cesium.Matrix4.createLookAt(camera.eye, camera.target, camera.up));
            us.setProjection(Cesium.Matrix4.createPerspectiveFieldOfView(Cesium.Math.toRadians(60.0), 1.0, 0.01, 10.0));        
        });
    
        afterEach(function () {
            polygon = polygon && polygon.destroy();
            us = null;
            
            Cesium.Specs.destroyContext(context);
        });
        
        it("gets default show", function() {
            expect(polygon.show).toBeTruthy();
        });
        
        it("sets positions", function() {
            var positions = [
                new Cesium.Cartesian3(1.0, 2.0, 3.0),
                new Cesium.Cartesian3(4.0, 5.0, 6.0),
                new Cesium.Cartesian3(7.0, 8.0, 9.0)
            ];
            
            expect(polygon.getPositions()).toBeNull();
            
            polygon.setPositions(positions);
            expect(polygon.getPositions()).toEqualArray(positions);
        });
        
        it("gets the default color", function() {
            expect(polygon.material.color).toEqualProperties({
                red   : 1.0,
                green : 1.0,
                blue  : 0.0,
                alpha : 0.5             
            });
        });
        
        it("gets default buffer usage", function() {
            expect(polygon.bufferUsage).toEqual(Cesium.BufferUsage.STATIC_DRAW);
        });
        
        it("has a default ellipsoid", function() {
            expect(polygon.ellipsoid).toEqual(Cesium.Ellipsoid.getWgs84());
        });        
        
        it("gets the default granularity", function() {
            expect(polygon.granularity).toEqual(Cesium.Math.toRadians(1.0));
        });         
        
        it("renders", function () {
            // This test fails in Chrome if a breakpoint is set inside this function.  Strange.
            
            var ellipsoid = Cesium.Ellipsoid.getUnitSphere();
            polygon.ellipsoid = ellipsoid;
            polygon.granularity = Cesium.Math.toRadians(20.0);
            polygon.setPositions([
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3(-50.0, -50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3( 50.0, -50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3( 50.0,  50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3(-50.0,  50.0, 0.0)))
            ]);
            polygon.material.color = { red : 1.0, green : 0.0, blue : 0.0, alpha : 1.0 };
                
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            polygon.update(context, Cesium.Specs.sceneState);
            polygon.render(context, us);
            expect(context.readPixels()).not.toEqualArray([0, 0, 0, 0]);            
        });        
        
        it("doesn't renders", function () {
            var ellipsoid = Cesium.Ellipsoid.getUnitSphere();
            polygon.ellipsoid = ellipsoid;
            polygon.granularity = Cesium.Math.toRadians(20.0);
            polygon.setPositions([
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3(-50.0, -50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3( 50.0, -50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3( 50.0,  50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3(-50.0,  50.0, 0.0)))
            ]);
            polygon.material.color = { red : 1.0, green : 0.0, blue : 0.0, alpha : 1.0 };
            polygon.show = false;
                
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            polygon.update(context, Cesium.Specs.sceneState);
            polygon.render(context, us);
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);            
        });        
        
        it("is picked", function () {
            var ellipsoid = Cesium.Ellipsoid.getUnitSphere();
            polygon.ellipsoid = ellipsoid;
            polygon.granularity = Cesium.Math.toRadians(20.0);
            polygon.setPositions([
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3(-50.0,  50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3( 50.0,  50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3( 50.0, -50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3(-50.0, -50.0, 0.0)))
            ]);

            polygon.update(context, Cesium.Specs.sceneState);

            var pickedObject = Cesium.Specs.pick(context, polygon, 0, 0);                        
            expect(pickedObject).toEqual(polygon);
        });        
        
        it("is not picked", function () {
            var ellipsoid = Cesium.Ellipsoid.getUnitSphere();
            polygon.ellipsoid = ellipsoid;
            polygon.granularity = Cesium.Math.toRadians(20.0);
            polygon.setPositions([
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3(-50.0, -50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3( 50.0, -50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3( 50.0,  50.0, 0.0))),
                ellipsoid.toCartesian(Cesium.Math.cartographic3ToRadians(new Cesium.Cartographic3(-50.0,  50.0, 0.0)))
            ]);
            polygon.show = false;

            polygon.update(context, Cesium.Specs.sceneState);

            var pickedObject = Cesium.Specs.pick(context, polygon, 0, 0);                        
            expect(pickedObject).not.toBeDefined();
        });  
    });
}());