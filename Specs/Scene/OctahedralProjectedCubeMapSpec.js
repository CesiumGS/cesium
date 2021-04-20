import { Cartesian3, defined } from '../../Source/Cesium.js';
import { ComputeEngine } from '../../Source/Cesium.js';
import { Pass } from '../../Source/Cesium.js';
import { OctahedralProjectedCubeMap } from '../../Source/Cesium.js';
import createContext from '../createContext.js';
import createFrameState from '../createFrameState.js';
import pollToPromise from '../pollToPromise.js';

describe('Scene/OctahedralProjectedCubeMap', function() {

    var context;
    var computeEngine;
    var octahedralMap;

    var environmentMapUrl = './Data/EnvironmentMap/kiara_6_afternoon_2k_ibl.ktx';
    var fsOctahedralMap =
        'uniform sampler2D projectedMap;' +
        'uniform vec2 textureSize;' +
        'uniform vec3 direction;' +
        'uniform float lod;' +
        'uniform float maxLod;' +
        'void main() {' +
        '   vec3 color = czm_sampleOctahedralProjection(projectedMap, textureSize, direction, lod, maxLod);' +
        '   gl_FragColor = vec4(color, 1.0);' +
        '}';

    var fsCubeMap =
        'uniform samplerCube cubeMap;' +
        'uniform vec3 direction;' +
        'void main() {' +
        '   vec4 rgbm = textureCube(cubeMap, direction);' +
        '   float m = rgbm.a * 16.0;' +
        '   vec3 r = rgbm.rgb * m;' +
        '   gl_FragColor = vec4(r * r, 1.0);' +
        '}';

    beforeAll(function() {
        context = createContext();
        computeEngine = new ComputeEngine(context);
    });

    afterAll(function() {
        context.destroyForSpecs();
        computeEngine.destroy();
    });

    afterEach(function() {
        octahedralMap = octahedralMap && octahedralMap.destroy();
        context.textureCache.destroyReleasedTextures();
    });

    function executeCommands(frameState) {
        var length = frameState.commandList.length;
        for (var i = 0; i < length; ++i) {
            var command = frameState.commandList[i];
            if (command.pass === Pass.COMPUTE) {
                command.execute(computeEngine);
            } else {
                command.execute(context);
            }
        }
        frameState.commandList.length = 0;
    }

    function sampleOctahedralMap(octahedralMap, direction, lod, callback) {
        expect({
            context : context,
            fragmentShader : fsOctahedralMap,
            uniformMap : {
                projectedMap : function() {
                    return octahedralMap.texture;
                },
                textureSize : function() {
                    return octahedralMap.texture.dimensions;
                },
                direction : function() {
                    return direction;
                },
                lod : function() {
                    return lod;
                },
                maxLod : function() {
                    return octahedralMap.maximumMipmapLevel;
                }
            }
        }).contextToRenderAndCall(callback);
    }

    function sampleCubeMap(cubeMap, direction, callback) {
        expect({
            context : context,
            fragmentShader : fsCubeMap,
            uniformMap : {
                cubeMap : function() {
                    return cubeMap;
                },
                direction : function() {
                    return direction;
                }
            }
        }).contextToRenderAndCall(callback);
    }

    function expectCubeMapAndOctahedralMapEqual(octahedralMap, direction, lod) {
        return sampleCubeMap(octahedralMap._cubeMaps[lod], direction, function(cubeMapColor) {
            var directionFlipY = direction.clone();
            directionFlipY.y *= -1;

            sampleOctahedralMap(octahedralMap, directionFlipY, lod, function(octahedralMapColor) {
                return expect(cubeMapColor).toEqualEpsilon(octahedralMapColor, 5);
            });
        });
    }

    it('creates a packed texture with the right dimensions', function() {
        if (!OctahedralProjectedCubeMap.isSupported(context)) {
            return;
        }

        octahedralMap = new OctahedralProjectedCubeMap(environmentMapUrl);
        var frameState = createFrameState(context);

        return pollToPromise(function() {
            octahedralMap.update(frameState);
            return octahedralMap.ready;
        }).then(function() {
            expect(octahedralMap.texture.width).toEqual(770);
            expect(octahedralMap.texture.height).toEqual(512);
            expect(octahedralMap.maximumMipmapLevel).toEqual(5);
        });
    });

    it('correctly projects the given cube map and all mip levels', function() {
        if (!OctahedralProjectedCubeMap.isSupported(context)) {
            return;
        }

        octahedralMap = new OctahedralProjectedCubeMap(environmentMapUrl);
        var frameState = createFrameState(context);

        return pollToPromise(function() {
            // We manually call update and execute the commands
            // because calling scene.renderForSpecs does not
            // actually execute these commands, and we need
            // to get the output of the texture.
            octahedralMap.update(frameState);
            executeCommands(frameState);

            return octahedralMap.ready;
        }).then(function() {
            var directions = {
                positiveX : new Cartesian3(1, 0, 0),
                negativeX : new Cartesian3(-1, 0, 0),
                positiveY : new Cartesian3(0, 1, 0),
                negativeY : new Cartesian3(0, -1, 0),
                positiveZ : new Cartesian3(0, 0, 1),
                negativeZ : new Cartesian3(0, 0, -1)
            };

            for (var mipLevel = 0; mipLevel < octahedralMap.maximumMipmapLevel; mipLevel++) {
               for (var key in directions) {
                    if (directions.hasOwnProperty(key)) {
                        var direction = directions[key];

                        expectCubeMapAndOctahedralMapEqual(octahedralMap, direction, mipLevel);
                    }
                }
            }
        });
    });

    it('caches projected textures', function() {
        if (!OctahedralProjectedCubeMap.isSupported(context)) {
            return;
        }

        var projection = new OctahedralProjectedCubeMap(environmentMapUrl);
        var frameState = createFrameState(context);

        return pollToPromise(function() {
            projection.update(frameState);
            return projection.ready;
        }).then(function() {
            var projection2 = new OctahedralProjectedCubeMap(environmentMapUrl);
            projection2.update(frameState);
            expect(projection2.ready).toEqual(true);
            expect(projection.texture).toEqual(projection2.texture);
            projection2.destroy();
        }).always(function() {
            projection.destroy();
        });
    });

    it('rejects when environment map fails to load.', function() {
        if (!OctahedralProjectedCubeMap.isSupported(context)) {
            return;
        }

        var projection = new OctahedralProjectedCubeMap('http://invalid.url');
        var frameState = createFrameState(context);
        var error;

        projection.readyPromise
            .then(function() {
                fail('Should not resolve.');
            })
            .otherwise(function(e) {
                error = e;
                expect(error).toBeDefined();
                expect(projection.ready).toEqual(false);
            });

        return pollToPromise(function() {
            projection.update(frameState);
            return defined(error);
        });
    });
}, 'WebGL');
