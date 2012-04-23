(function() {
    "use strict";
    /*global Cesium, document, Float32Array, describe, it, expect, beforeEach*/

    Cesium.Specs = {

        createContext : function() {
            var canvas = document.createElement("canvas");
            canvas.id = "glCanvas";
            canvas.setAttribute("width", "1");
            canvas.setAttribute("clientWidth", "1");
            canvas.setAttribute("height", "1");
            canvas.setAttribute("clientHeight", "1");
            canvas.innerHTML = "To view this web page, upgrade your browser; it does not support the HTML5 canvas element.";
            document.body.appendChild(canvas);

            var context = new Cesium.Context(canvas, {alpha: true});
            context.setValidateShaderProgram(true);
            context.setValidateFramebuffer(true);
            context.setLogShaderCompilation(true);
            context.setThrowOnWebGLError(true);
            return context;
        },

        destroyContext : function(context) {
            if (context) {
                document.body.removeChild(context.getCanvas());
                context = context.destroy();
            }
        },

        renderFragment : function(context, fs) {
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

            sp = sp.destroy();
            va = va.destroy();

            return context.readPixels();
        },

        pick : function(context, primitives, x, y) {
            var pickFramebuffer = context.createPickFramebuffer();
            var fb = pickFramebuffer.begin();

            primitives.updateForPick(context);
            primitives.renderForPick(context, fb);

            var primitive = pickFramebuffer.end({ x : x, y : y });
            pickFramebuffer.destroy();

            return primitive;
        },

        // Mock scene-state for testing.
        sceneState : {
            mode : Cesium.SceneMode.SCENE3D,
            scene2D : {
                projection : new Cesium.EquidistantCylindricalProjection(Cesium.Ellipsoid.getWgs84())
            }
        }
    };

    beforeEach(function() {
      this.addMatchers({
        toEqualProperties: function(value) {
            for(var key in value) {
                if (value.hasOwnProperty(key)) {
                    if (this.actual[key] !== value[key]) {
                        return false;
                    }
                }
            }

            return true;
        },

        toEqualEpsilon: function(value, epsilon) {
            return Math.abs(this.actual - value) <= epsilon;
        },

        toBeGreaterThanOrEqualTo: function(value, epsilon) {
            return this.actual >= value;
        },

        toBeLessThanOrEqualTo: function(value, epsilon) {
            return this.actual <= value;
        },

        toBeIn: function(values) {
            var actual = this.actual;

            for (var i = 0; i < values.length; ++i) {
                if (actual === values[i]) {
                    return true;
                }
            }

            return false;
        },

        toEqualArray: function(value) {
            var actual = this.actual;

            if (actual.length !== value.length) {
                return false;
            }

            for (var i = 0; i < actual.length; ++i) {

                if (actual[i].equals)
                {
                    if (!actual[i].equals(value[i])) {
                        return false;
                    }
                }
                else {
                    if (actual[i] !== value[i]) {
                        return false;
                    }
                }
            }

            return true;
        },

        toEqualArrayEpsilon: function(value, epsilon) {
            var actual = this.actual;

            if (actual.length !== value.length) {
                return false;
            }

            for (var i = 0; i < actual.length; ++i) {

                if (actual[i].equalsEpsilon)
                {
                    if (!actual[i].equalsEpsilon(value[i], epsilon)) {
                        return false;
                    }
                }
                else {
                    if (Math.abs(actual[i] - value[i]) > epsilon) {
                        return false;
                    }
                }
            }

            return true;
        }
      });
    });

    describe("shallowEquals", function () {
        it("shallowEquals left is undefined", function () {
            expect(Cesium.shallowEquals(undefined, { a : 0 })).toEqual(false);
        });

        it("shallowEquals right is undefined", function () {
            expect(Cesium.shallowEquals({ a : 0 }, undefined)).toEqual(false);
        });

        it("shallowEquals left and right are falsey", function () {
            expect(Cesium.shallowEquals(undefined, null)).toEqual(false);
        });

        it("shallowEquals left and right are undefined", function () {
            expect(Cesium.shallowEquals(undefined, undefined)).toEqual(true);
        });

        it("shallowEquals left and right are equal", function () {
            expect(Cesium.shallowEquals({a : 0, b : 1 }, {a : 0, b : 1 })).toEqual(true);
        });

        it("shallowEquals left and right are not equal", function () {
            expect(Cesium.shallowEquals({a : 0, b : 1 }, {a : 0, b : 2 })).toEqual(false);
        });
    });

}());
