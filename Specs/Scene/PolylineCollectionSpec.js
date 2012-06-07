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
    /*global it,expect,beforeEach,afterEach*/

    var context;
    var polylineCollection;
    var us;

    beforeEach(function() {
        context = createContext();
        polylineCollection = new PolylineCollection();

        var camera = {
            eye : new Cartesian3(-1.0, 0.0, 0.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        };
        us = context.getUniformState();
        us.setView(Matrix4.createLookAt(camera.eye, camera.target, camera.up));
        us.setProjection(Matrix4.createPerspectiveFieldOfView(CesiumMath.toRadians(60.0), 1.0, 0.01, 10.0));
    });

    afterEach(function() {
        us = null;
        destroyContext(context);
    });

    it("added", function(){
        polylineCollection.add({positions:[new Cartesian3(0, 0, 1), new Cartesian3(1,0,0)]});
    });

});