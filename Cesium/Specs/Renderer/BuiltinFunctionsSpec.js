(function() {
    "use strict";
    /*global Cesium, describe, it, expect, beforeEach, afterEach, Uint16Array, Float32Array, ArrayBuffer*/
    
    describe("Builtin Functions", function () {
        var context;
        
        beforeEach(function () {
            context = Cesium.Specs.createContext();
        });
    
        afterEach(function () {
            Cesium.Specs.destroyContext(context);
        });
        
        var verifyDraw = function(fs) {
            var vs = "attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
            var sp = context.createShaderProgram(vs, fs);

            var va = context.createVertexArray();
            va.addAttribute({
                index                  : sp.getVertexAttributes().position.index,
                vertexBuffer           : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), Cesium.BufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            });
            
            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);
            
            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS, 
                shaderProgram : sp, 
                vertexArray   : va
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
            
            sp = sp.destroy();
            va = va.destroy();
        };
    
        it("has agi_tranpose (2x2)", function () {
            var fs = 
                "void main() { " +
                "mat2 m = mat2(1.0, 2.0, 3.0, 4.0); " +
                "mat2 mt = mat2(1.0, 3.0, 2.0, 4.0); " +
                "gl_FragColor = vec4(agi_transpose(m) == mt); }";
                            
            verifyDraw(fs);
        });
            
        it("has agi_tranpose (3x3)", function () {
            var fs = 
                "void main() { " +
                "mat3 m = mat3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0); " +
                "mat3 mt = mat3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0); " +
                "gl_FragColor = vec4(agi_transpose(m) == mt); }";
                            
            verifyDraw(fs);
        });
        
        it("has agi_tranpose (4x4)", function () {
            var fs = 
                "void main() { " +
                "mat4 m = mat4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);" +
                "mat4 mt = mat4(1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0);" +
                "gl_FragColor = vec4(agi_transpose(m) == mt); }";
                            
            verifyDraw(fs);
        });
    });
}());