/*global define*/
define([
         'Scene/Polygon',
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/sceneState',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Matrix4',
         'Core/Math'
     ], function(
         Polygon,
         createContext,
         destroyContext,
         sceneState,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         Matrix4,
         CesiumMath) {
    "use strict";
    /*global expect*/

    //createContext and destroyContext happen in the spec file.
    function renderMaterial(material, context) {
        var polygon = new Polygon();
        var camera = {
            eye : new Cartesian3(1.02, 0.0, 0.0),
            target : Cartesian3.ZERO,
            up : Cartesian3.UNIT_Z
        };
        var us = context.getUniformState();
        us.setView(Matrix4.fromCamera({
            eye : camera.eye,
            target : camera.target,
            up : camera.up
        }));
        //us.setView(Matrix4.createLookAt(camera.eye, camera.target, camera.up));
        us.setProjection(Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), 1.0, 0.01, 10.0));

        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        polygon.ellipsoid = ellipsoid;
        polygon.granularity = CesiumMath.toRadians(20.0);
        polygon.setPositions([
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, -50.0, 0.0)),
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, -50.0, 0.0)),
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(50.0, 50.0, 0.0)),
                              ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-50.0, 50.0, 0.0))
                             ]);
        polygon.material = material;

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polygon.update(context, sceneState);
        polygon.render(context, us);
        var pixel = context.readPixels();

        polygon = polygon && polygon.destroy();
        return pixel;
    }

    return renderMaterial;
});