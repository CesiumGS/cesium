(function () {
    "use strict";
    /*global Cesium, describe, it, expect, beforeEach*/

    describe("ExtentTessellator", function () {
        var ExtentTessellator = Cesium.ExtentTessellator;

        it("compute throws exception with invalid extent 0", function () {
            expect(function () {
                return ExtentTessellator.compute();
            }).toThrow();
        });

        it("compute throws exception with invalid extent 1", function () {
            expect(function () {
                return ExtentTessellator.compute({
                    extent : {
                        north :  Cesium.Math.PI_OVER_TWO + 1,
                        south : -Cesium.Math.PI_OVER_TWO,
                        west : -Cesium.Math.PI,
                        east :  Cesium.Math.PI
                    }
                });
            }).toThrow();
        });

        it("compute throws exception with invalid extent 2", function () {
            expect(function () {
                return ExtentTessellator.compute({
                    extent : {
                        north :  Cesium.Math.PI_OVER_TWO,
                        south : -Cesium.Math.PI_OVER_TWO - 1,
                        west : -Cesium.Math.PI,
                        east :  Cesium.Math.PI
                    }
                });
            }).toThrow();
        });

        it("compute throws exception with invalid extent 3", function () {
            expect(function () {
                return ExtentTessellator.compute({
                    extent : {
                        north :  Cesium.Math.PI_OVER_TWO,
                        south : -Cesium.Math.PI_OVER_TWO,
                        west : -Cesium.Math.PI - 1,
                        east :  Cesium.Math.PI
                    }
                });
            }).toThrow();
        });

        it("compute throws exception with invalid extent 4", function () {
            expect(function () {
                return ExtentTessellator.compute({
                    extent : {
                        north :  Cesium.Math.PI_OVER_TWO,
                        south : -Cesium.Math.PI_OVER_TWO,
                        west : -Cesium.Math.PI,
                        east :  Cesium.Math.PI + 1
                    }
                });
            }).toThrow();
        });

        it("compute throws exception with invalid extent 5", function () {
            expect(function () {
                return ExtentTessellator.compute({
                    extent : {
                        south :  Cesium.Math.PI_OVER_TWO,
                        north : -Cesium.Math.PI_OVER_TWO,
                        west : -Cesium.Math.PI,
                        east :  Cesium.Math.PI
                    }
                });
            }).toThrow();
        });

        it("compute throws exception with invalid extent 6", function () {
            expect(function () {
                return ExtentTessellator.compute({
                    extent : {
                        north :  Cesium.Math.PI_OVER_TWO,
                        south : -Cesium.Math.PI_OVER_TWO,
                        east : -Cesium.Math.PI,
                        west :  Cesium.Math.PI
                    }
                });
            }).toThrow();
        });

        it("compute 0", function () {
            var m = ExtentTessellator.compute({
                extent : {
                    north :  1.0,
                    south : -1.0,
                    west  : -2.0,
                    east  :  0.0
                },
                granularity : 1.0
            });
            expect(m.attributes.position.values.length).toEqual(9 * 3);
            expect(typeof m.attributes.textureCoordinates === "undefined").toBeTruthy();
            expect(m.indexLists[0].values.length).toEqual(8 * 3);
        });

        it("compute 1", function () {
            var m = ExtentTessellator.compute({
                extent : {
                    north :  1.0,
                    south : -1.0,
                    west  : -2.0,
                    east  :  0.0
                },
                granularity : 1.0,
                generateTextureCoords : true
            });
            expect(m.attributes.position.values.length).toEqual(9 * 3);
            expect(m.attributes.textureCoordinates.values.length).toEqual(9 * 2);
            expect(m.indexLists[0].values.length).toEqual(8 * 3);
        });

        it("computeBuffers throws exception with invalid extent 0", function () {
            expect(function () {
                return ExtentTessellator.computeBuffers();
            }).toThrow();
        });

        it("computeBuffers throws exception with invalid extent 1", function () {
            expect(function () {
                return ExtentTessellator.computeBuffers({
                    extent : {
                        north :  Cesium.Math.PI_OVER_TWO + 1,
                        south : -Cesium.Math.PI_OVER_TWO,
                        west : -Cesium.Math.PI,
                        east :  Cesium.Math.PI
                    }
                });
            }).toThrow();
        });

        it("computeBuffers throws exception with invalid extent 2", function () {
            expect(function () {
                return ExtentTessellator.computeBuffers({
                    extent : {
                        north :  Cesium.Math.PI_OVER_TWO,
                        south : -Cesium.Math.PI_OVER_TWO - 1,
                        west : -Cesium.Math.PI,
                        east :  Cesium.Math.PI
                    }
                });
            }).toThrow();
        });

        it("computeBuffers throws exception with invalid extent 3", function () {
            expect(function () {
                return ExtentTessellator.computeBuffers({
                    extent : {
                        north :  Cesium.Math.PI_OVER_TWO,
                        south : -Cesium.Math.PI_OVER_TWO,
                        west : -Cesium.Math.PI - 1,
                        east :  Cesium.Math.PI
                    }
                });
            }).toThrow();
        });

        it("computeBuffers throws exception with invalid extent 4", function () {
            expect(function () {
                return ExtentTessellator.computeBuffers({
                    extent : {
                        north :  Cesium.Math.PI_OVER_TWO,
                        south : -Cesium.Math.PI_OVER_TWO,
                        west : -Cesium.Math.PI,
                        east :  Cesium.Math.PI + 1
                    }
                });
            }).toThrow();
        });

        it("computeBuffers throws exception with invalid extent 5", function () {
            expect(function () {
                return ExtentTessellator.computeBuffers({
                    extent : {
                        south :  Cesium.Math.PI_OVER_TWO,
                        north : -Cesium.Math.PI_OVER_TWO,
                        west : -Cesium.Math.PI,
                        east :  Cesium.Math.PI
                    }
                });
            }).toThrow();
        });

        it("computeBuffers throws exception with invalid extent 6", function () {
            expect(function () {
                return ExtentTessellator.computeBuffers({
                    extent : {
                        north :  Cesium.Math.PI_OVER_TWO,
                        south : -Cesium.Math.PI_OVER_TWO,
                        east : -Cesium.Math.PI,
                        west :  Cesium.Math.PI
                    }
                });
            }).toThrow();
        });

        it("computeBuffers 0", function () {
            var buffers = ExtentTessellator.computeBuffers({
                extent : {
                    north :  1.0,
                    south : -1.0,
                    west  : -2.0,
                    east  :  0.0
                },
                granularity : 1.0
            });

            expect(buffers.positions.length).toEqual(9 * 3);
            expect(buffers.indices.length).toEqual(8 * 3);
        });

        it("computeBuffers 1", function () {
            var buffers = ExtentTessellator.computeBuffers({
                extent : {
                    north :  1.0,
                    south : -1.0,
                    west  : -2.0,
                    east  :  0.0
                },
                granularity : 1.0,
                generateTextureCoords : true
            });

            expect(buffers.positions.length).toEqual(9 * 3);
            expect(buffers.textureCoords.length).toEqual(9 * 2);
            expect(buffers.indices.length).toEqual(8 * 3);
        });

        it("computeBuffers 2", function () {
            var buffers = ExtentTessellator.computeBuffers({
                extent : {
                    north :  1.0,
                    south : -1.0,
                    west  : -2.0,
                    east  :  0.0
                },
                granularity : 1.0,
                generateTextureCoords : true,
                interleave : true
            });

            expect(buffers.vertices.length).toEqual(9 * 3 + 9 * 2);
            expect(buffers.indices.length).toEqual(8 * 3);
        });
    });
}());
