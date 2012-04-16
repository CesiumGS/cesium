( function() {
    "use strict";
    /*global Cesium, describe, it, expect, beforeEach*/
    
    var Cartesian3 = Cesium.Cartesian3;
    var Cartesian4 = Cesium.Cartesian4;
    var Frustum = Cesium.PerspectiveFrustum;
    var Matrix4 = Cesium.Matrix4;
    
    describe("PerspectiveFrustum", function() {
        var frustum, planes;
        
        beforeEach(function () {
            frustum = new Frustum();
            frustum.near = 1.0;
            frustum.far = 2.0;
            frustum.fovy = (Math.PI) / 3;
            frustum.aspectRatio = 1.0;
            
            planes = frustum.getPlanes(
                new Cartesian3(),
                Cartesian3.getUnitZ().negate(),
                Cartesian3.getUnitY());
        });
        
        it("out of range fov causes an exception", function() {            
            frustum.fovy = -1.0;
            expect(function() { frustum.getProjectionMatrix(); }).toThrow();
            
            frustum.fovy = Cesium.Math.TWO_PI;
            expect(function() { frustum.getProjectionMatrix(); }).toThrow();
        });
        
        it("negative aspect ratio throws an exception", function() {
            frustum.aspectRatio = -1.0;
            expect(function() { frustum.getProjectionMatrix(); }).toThrow();
        });
        
        it("out of range near plane throws an exception", function() {
            frustum.near = -1.0;            
            expect(function() { frustum.getProjectionMatrix(); }).toThrow();
            frustum.far = 3.0;
            expect(function() { frustum.getProjectionMatrix(); }).toThrow();
        });
        
        it("negative far plane throws an exception", function() {
            frustum.far = -1.0;            
            expect(function() { frustum.getProjectionMatrix(); }).toThrow();
        });
        
        it("getPlanes with no position throws an exception", function () {
            expect(function () {
                frustum.getPlanes();
            }).toThrow();
        });
        
        it("getPlanes with no direction throws an exception", function () {
            expect(function () {
                frustum.getPlanes(new Cartesian3());
            }).toThrow();
        });
        
        it("getPlanes with no up throws an exception", function () {
            expect(function () {
                frustum.getPlanes(new Cartesian3(), new Cartesian3());
            }).toThrow();
        });
        
        it("get frustum left plane", function() {
            var leftPlane = planes[0];
            var expectedResult = new Cartesian4(Math.sqrt(3) / 2, 0, -0.5, 0);
            expect(leftPlane.equalsEpsilon(expectedResult, Cesium.Math.EPSILON4)).toBeTruthy();
        });
        
        it("get frustum right plane", function() {
            var rightPlane = planes[1];
            var expectedResult = new Cartesian4(-Math.sqrt(3) / 2, 0, -0.5, 0);
            expect(rightPlane.equalsEpsilon(expectedResult, Cesium.Math.EPSILON4)).toBeTruthy();
        });
        
        it("get frustum bottom plane", function() {
            var bottomPlane = planes[2];
            var expectedResult = new Cartesian4(0, Math.sqrt(3) / 2, -0.5, 0);
            expect(bottomPlane.equalsEpsilon(expectedResult, Cesium.Math.EPSILON4)).toBeTruthy();
        });
        
        it("get frustum top plane", function() {
            var topPlane = planes[3];
            var expectedResult = new Cartesian4(0, -Math.sqrt(3) / 2, -0.5, 0);
            expect(topPlane.equalsEpsilon(expectedResult, Cesium.Math.EPSILON4)).toBeTruthy();
        });
        
        it("get frustum near plane", function() {
            var nearPlane = planes[4];
            var expectedResult = new Cartesian4(0, 0, -1, -1);
            expect(nearPlane.equalsEpsilon(expectedResult, Cesium.Math.EPSILON4)).toBeTruthy();
        });
        
        it("get frustum far plane", function() {
            var farPlane = planes[5];
            var expectedResult = new Cartesian4(0, 0, 1, 2);
            expect(farPlane.equalsEpsilon(expectedResult, Cesium.Math.EPSILON4)).toBeTruthy();
        });
        
        it("get perspective projection matrix", function() {
            var projectionMatrix = frustum.getProjectionMatrix();
            var expected = Matrix4.createPerspectiveFieldOfView(frustum.fovy, frustum.aspectRatio, frustum.near, frustum.far);
            expect(projectionMatrix.equalsEpsilon(expected, Math.EPSILON6)).toBeTruthy();
        });
        
        it("get infinite perspective matrix", function () {
            var top = frustum.near * Math.tan(0.5 * frustum.fovy);
            var bottom = -top;
            var right = frustum.aspectRatio * top;
            var left = -right;
            var near = frustum.near;
            
            var expected = Matrix4.createInfinitePerspectiveOffCenter(left, right, bottom, top, near);
            expect(expected.equals(frustum.getInfiniteProjectionMatrix())).toBeTruthy();
        });
    });
}());