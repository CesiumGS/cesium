define([
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/GeometryAttribute',
        '../Core/Geometry',
        '../Core/PrimitiveType',
        '../Renderer/ComputeCommand',
        '../Renderer/ShaderProgram',
        '../Renderer/Texture',
        '../Renderer/VertexArray',
        '../Shaders/OctahedralProjectionAtlasFS',
        '../Shaders/OctahedralProjectionFS',
        '../Shaders/OctahedralProjectionVS'
    ], function(
        ComponentDatatype,
        defined,
        defineProperties,
        destroyObject,
        GeometryAttribute,
        Geometry,
        PrimitiveType,
        ComputeCommand,
        ShaderProgram,
        Texture,
        VertexArray,
        OctahedralProjectionAtlasFS,
        OctahedralProjectionFS,
        OctahedralProjectionVS) {
    'use strict';

    /**
     * A function to project an environment cube map onto a flat octahedron.
     *
     * The goal is to pack all convolutions. When EXT_texture_lod is available,
     * they are stored as mip levels. When the extension is not supported, we
     * pack them into a 2D texture atlas.
     *
     * Octahedral projection is a way of putting the cube maps onto a 2D texture
     * with minimal distortion and easy look up.
     * See Chapter 16 of WebGL Insights "HDR Image-Based Lighting on the Web" by Jeff Russell
     * and "Octahedron Environment Maps" for reference.
     *
     * @param {CubeMap[]} cubeMaps An array of {@link CubeMap}s to pack.
     */
    function OctahedralProjectedCubeMap(cubeMaps) {
        this._cubeMaps = cubeMaps;

        this._texture = undefined;
        this._mipTextures = undefined;
        this._va = undefined;
        this._sp = undefined;

        this._maximumMipmapLevel = undefined;
    }

    defineProperties(OctahedralProjectedCubeMap.prototype, {
        /**
         * A texture containing all the packed convolutions.
         * @memberof {OctahedralProjectedCubeMap.prototype}
         * @type {Texture}
         */
        texture : {
            get : function() {
                return this._texture;
            }
        },
        maximumMipmapLevel : {
            get : function() {
                return this._maximumMipmapLevel;
            }
        }
    });

    function createVertexArray(context) {
        var topLeft = 0;
        var left = 1;
        var top = 2;
        var center = 3;
        var right = 4;
        var topRight = 5;
        var bottom = 6;
        var bottomLeft = 7;
        var bottomRight = 8;
        // These vertices are based on figure 1 from "Octahedron Environment Maps".
        var v1 = { x: 1, y: 0, z: 0 };
        var v2 = { x: 0, y: 0, z: -1 };
        var v3 = { x: -1, y: 0, z: 0 };
        var v4 = { x: 0, y: 0, z: 1 };
        var v5 = { x: 0, y: 1, z: 0 };
        var v6 = { x: 0, y: -1, z: 0 };

        var geometry = new Geometry({
            attributes: {
                position: new GeometryAttribute({
                    componentDatatype: ComponentDatatype.FLOAT,
                    componentsPerAttribute: 2,
                    values: [
                        -1.0,  1.0, // top left
                        -1.0,  0.0, // left
                        0.0,  1.0, // top
                        0.0,  0.0, // center
                        1.0,  0.0, // right
                        1.0,  1.0, // top right
                        0.0, -1.0, // bottom
                        -1.0, -1.0, // bottom left
                        1.0, -1.0  // bottom right
                    ]
                }),

                cubeMapCoordinates: new GeometryAttribute({
                    componentDatatype: ComponentDatatype.FLOAT,
                    componentsPerAttribute: 3,
                    values: [
                        v5.x, v5.y, v5.z, // top left
                        v3.x, v3.y, v3.z, // left
                        v2.x, v2.y, v2.z, // top
                        v6.x, v6.y, v6.z, // center
                        v1.x, v1.y, v1.z, // right
                        v5.x, v5.y, v5.z, // top right
                        v4.x, v4.y, v4.z, // bottom
                        v5.x, v5.y, v5.z, // bottom left
                        v5.x, v5.y, v5.z  // bottom right
                    ]
                })
            },

            indices: new Uint16Array([
                topLeft, left, top,
                top, center, left,
                bottomLeft, bottom, left,
                center, bottom, left,
                top, topRight, right,
                center, right, top,
                right, bottomRight, bottom,
                center, right, bottom
            ]),
            primitiveType: PrimitiveType.TRIANGLES
        });

        return VertexArray.fromGeometry({
            context : context,
            geometry : geometry,
            attributeLocations : {
                position : 0,
                cubeMapCoordinates : 1
            },
            interleave : false
        });
    }

    function createUniformTexture(texture) {
        return function() {
            return texture;
        };
    }

    function cleanupResources(map) {
        map._va = map._va && map._va.destroy();
        map._sp = map._sp && map._sp.destroy();

        var mipTextures = map._mipTextures;
        if (defined(mipTextures)) {
            var length = mipTextures.length;
            for (var i = 0; i < length; ++i) {
                mipTextures[i].destroy();
            }
        }
    }

    OctahedralProjectedCubeMap.prototype.update = function(frameState) {
        if (defined(this._va)) {
            cleanupResources(this);
        }
        if (defined(this._texture)) {
            return;
        }

        var context = frameState.context;
        var cubeMaps = this._cubeMaps;

        this._va = createVertexArray(context);
        this._sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : OctahedralProjectionVS,
            fragmentShaderSource : OctahedralProjectionFS,
            attributeLocations : {
                position : 0,
                cubeMapCoordinates : 1
            }
        });

        // We only need up to 6 mip levels to avoid artifacts.
        var length = this._maximumMipmapLevel = Math.min(cubeMaps.length, 6);
        var mipTextures = this._mipTextures = new Array(length);
        var originalSize = cubeMaps[0].width * 2.0;
        var uniformMap = {
            originalSize : function() {
                return originalSize;
            }
        };

        // First we project each cubemap onto a flat octahedron, and write that to a texture.
        for (var i = 0; i < length; ++i) {
            var size = cubeMaps[i].width * 2;

            var mipTexture = mipTextures[i] = new Texture({
                context : context,
                width : size,
                height : size,
                pixelDataType : cubeMaps[i].pixelDatatype,
                pixelFormat : cubeMaps[i].pixelFormat
            });

            var command = new ComputeCommand({
                vertexArray : this._va,
                shaderProgram : this._sp,
                uniformMap : {
                    cubeMap : createUniformTexture(cubeMaps[i])
                },
                outputTexture : mipTexture,
                persists : true,
                owner : this
            });
            frameState.commandList.push(command);

            uniformMap['texture' + i] = createUniformTexture(mipTexture);
        }

        this._texture = new Texture({
            context : context,
            width : originalSize * 1.5 + 2.0, // We add a 1 pixel border to avoid linear sampling artifacts.
            height : originalSize,
            pixelDataType : cubeMaps[0].pixelDatatype,
            pixelFormat : cubeMaps[0].pixelFormat
        });

        var atlasCommand = new ComputeCommand({
            fragmentShaderSource : OctahedralProjectionAtlasFS,
            uniformMap : uniformMap,
            outputTexture : this._texture,
            persists : false,
            owner : this
        });
        frameState.commandList.push(atlasCommand);
    };

    OctahedralProjectedCubeMap.prototype.isDestroyed = function() {
        return false;
    };

    OctahedralProjectedCubeMap.prototype.destroy = function() {
        cleanupResources(this);
        this._texture = this._texture && this._texture.destroy();
        return destroyObject(this);
    };

    return OctahedralProjectedCubeMap;
});
