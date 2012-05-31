/*global defineSuite*/
defineSuite([
         'Core/ExtentTessellator',
         'Core/Math'
     ], function(
         ExtentTessellator,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it("compute throws exception with invalid extent 0", function() {
        expect(function() {
            return ExtentTessellator.compute();
        }).toThrow();
    });

    it("compute throws exception with invalid extent 1", function() {
        expect(function() {
            return ExtentTessellator.compute({
                extent : {
                    north : CesiumMath.PI_OVER_TWO + 1,
                    south : -CesiumMath.PI_OVER_TWO,
                    west : -CesiumMath.PI,
                    east : CesiumMath.PI
                }
            });
        }).toThrow();
    });

    it("compute throws exception with invalid extent 2", function() {
        expect(function() {
            return ExtentTessellator.compute({
                extent : {
                    north : CesiumMath.PI_OVER_TWO,
                    south : -CesiumMath.PI_OVER_TWO - 1,
                    west : -CesiumMath.PI,
                    east : CesiumMath.PI
                }
            });
        }).toThrow();
    });

    it("compute throws exception with invalid extent 3", function() {
        expect(function() {
            return ExtentTessellator.compute({
                extent : {
                    south : CesiumMath.PI_OVER_TWO,
                    north : -CesiumMath.PI_OVER_TWO,
                    west : -CesiumMath.PI,
                    east : CesiumMath.PI
                }
            });
        }).toThrow();
    });

    it("compute 0", function() {
        var m = ExtentTessellator.compute({
            extent : {
                north : 1.0,
                south : -1.0,
                west : -2.0,
                east : 0.0
            },
            granularity : 1.0
        });
        expect(m.attributes.position.values.length).toEqual(9 * 3);
        expect(typeof m.attributes.textureCoordinates === "undefined").toEqual(true);
        expect(m.indexLists[0].values.length).toEqual(8 * 3);
    });

    it("compute 1", function() {
        var m = ExtentTessellator.compute({
            extent : {
                north : 1.0,
                south : -1.0,
                west : -2.0,
                east : 0.0
            },
            granularity : 1.0,
            generateTextureCoords : true
        });
        expect(m.attributes.position.values.length).toEqual(9 * 3);
        expect(m.attributes.textureCoordinates.values.length).toEqual(9 * 2);
        expect(m.indexLists[0].values.length).toEqual(8 * 3);
    });

    it("computeBuffers throws exception with invalid extent 0", function() {
        expect(function() {
            return ExtentTessellator.computeBuffers();
        }).toThrow();
    });

    it("computeBuffers throws exception with invalid extent 1", function() {
        expect(function() {
            return ExtentTessellator.computeBuffers({
                extent : {
                    north : CesiumMath.PI_OVER_TWO + 1,
                    south : -CesiumMath.PI_OVER_TWO,
                    west : -CesiumMath.PI,
                    east : CesiumMath.PI
                }
            });
        }).toThrow();
    });

    it("computeBuffers throws exception with invalid extent 2", function() {
        expect(function() {
            return ExtentTessellator.computeBuffers({
                extent : {
                    north : CesiumMath.PI_OVER_TWO,
                    south : -CesiumMath.PI_OVER_TWO - 1,
                    west : -CesiumMath.PI,
                    east : CesiumMath.PI
                }
            });
        }).toThrow();
    });

    it("computeBuffers throws exception with invalid extent 3", function() {
        expect(function() {
            return ExtentTessellator.computeBuffers({
                extent : {
                    south : CesiumMath.PI_OVER_TWO,
                    north : -CesiumMath.PI_OVER_TWO,
                    west : -CesiumMath.PI,
                    east : CesiumMath.PI
                }
            });
        }).toThrow();
    });

    it("computeBuffers 0", function() {
        var buffers = ExtentTessellator.computeBuffers({
            extent : {
                north : 1.0,
                south : -1.0,
                west : -2.0,
                east : 0.0
            },
            granularity : 1.0
        });

        expect(buffers.positions.length).toEqual(9 * 3);
        expect(buffers.indices.length).toEqual(8 * 3);
    });

    it("computeBuffers 1", function() {
        var buffers = ExtentTessellator.computeBuffers({
            extent : {
                north : 1.0,
                south : -1.0,
                west : -2.0,
                east : 0.0
            },
            granularity : 1.0,
            generateTextureCoords : true
        });

        expect(buffers.positions.length).toEqual(9 * 3);
        expect(buffers.textureCoords.length).toEqual(9 * 2);
        expect(buffers.indices.length).toEqual(8 * 3);
    });

    it("computeBuffers 2", function() {
        var buffers = ExtentTessellator.computeBuffers({
            extent : {
                north : 1.0,
                south : -1.0,
                west : -2.0,
                east : 0.0
            },
            granularity : 1.0,
            generateTextureCoords : true,
            interleave : true
        });

        expect(buffers.vertices.length).toEqual(9 * 3 + 9 * 2);
        expect(buffers.indices.length).toEqual(8 * 3);
    });
});
