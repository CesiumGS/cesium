define([
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/PrimitiveType',
        '../Core/ComponentDatatype',
        '../Core/GeometryAttribute',
        '../Core/Geometry',
        '../Core/BoundingRectangle',
        './Texture',
        './Framebuffer',
        './VertexArray',
        './DrawCommand',
        './RenderState',
        './ShaderProgram',
        './Sampler',
        './TextureMinificationFilter',
        './TextureMagnificationFilter'
    ], function(
        defined,
        DeveloperError,
        PrimitiveType,
        ComponentDatatype,
        GeometryAttribute,
        Geometry,
        BoundingRectangle,
        Texture,
        Framebuffer,
        VertexArray,
        DrawCommand,
        RenderState,
        ShaderProgram,
        Sampler,
        TextureMinificationFilter,
        TextureMagnificationFilter) {
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
     * @param {Context} context The rendering context.
     * @returns {Texture} A texture containing all the packed convolutions. 
     *
     */

    function packOctahedralMap(cubeMaps, context) { 
        //>>includeStart('debug', pragmas.debug);
        if (!defined(context)) {
            throw new DeveloperError('context is required.');
        }
        //>>includeEnd('debug');

        var vertexArray = makeOctahedronVertexArray(context);
        var shaderProgram = ShaderProgram.fromCache({
            context : context, 
            vertexShaderSource : getOctahedralProjectionVS(), 
            fragmentShaderSource : getOctahedralProjectionFS(), 
            attributeLocations : {
                    position : 0,
                    cubeMapCoordinates : 1
                }
            });

        // We only need up to 6 mip levels to avoid artifacts. 
        var length = Math.min(cubeMaps.length,6); 
        var command; 
        var uniformMap = {};

        // First we project each cubemap onto a flat octahedron, and write that to a texture.
        for (var i = 0; i < length; ++i) {
            var factor = (1/Math.pow(2,i));
            var size = cubeMaps[i]._size * 2;

            var mipTexture = new Texture({
                context : context, 
                width : size, 
                height : size,
                pixelDataType : cubeMaps[i]._pixelDatatype,
                pixelFormat : cubeMaps[i]._pixelFormat
            });

            var mipFramebuffer = new Framebuffer({
                context : context, 
                colorTextures : [mipTexture],
                destroyAttachments : false
            });

            command = new DrawCommand({
                vertexArray : vertexArray,
                primitiveType : PrimitiveType.TRIANGLES,
                renderState : RenderState.fromCache({
                    viewport : new BoundingRectangle(0, 0, size, size)
                }),
                shaderProgram : shaderProgram,
                uniformMap : {
                    cubeMap : function() {
                        return cubeMaps[i];
                    }
                },
                framebuffer : mipFramebuffer
            });

            command.execute(context);

            mipFramebuffer.destroy();

            uniformMap['texture' + i] = (function(capturedTexture){
                return function(){
                    return capturedTexture
                }
            })(mipTexture);   
            
            
        }

        var originalSize = cubeMaps[0]._size * 2;

        var texture = new Texture({
            context : context, 
            width : originalSize * 1.5 + 2, // We add a 1 pixel border to avoid linear sampling artifacts.
            height : originalSize,
            pixelDataType : cubeMaps[0]._pixelDatatype,
            pixelFormat : cubeMaps[0]._pixelFormat
        });

        var framebuffer = new Framebuffer({
            context : context, 
            colorTextures : [texture],
            destroyAttachments : false
        });

        // Now render all those textures onto an atlas.
        var fs = `
            varying vec2 v_textureCoordinates;
            uniform sampler2D texture0; 
            uniform sampler2D texture1;
            uniform sampler2D texture2;
            uniform sampler2D texture3;
            uniform sampler2D texture4;
            uniform sampler2D texture5; 

            void main()
            {
                vec2 uv = v_textureCoordinates;
                vec2 textureSize = vec2(${originalSize * 1.5 + 2}.0, ${originalSize}.0);
                vec2 pixel = 1.0 / textureSize;
                
                float mipLevel = 0.0;

                if (uv.x - pixel.x > (textureSize.y / textureSize.x)) {
                    mipLevel = 1.0;
                    if (uv.y - pixel.y > 1.0 - (1.0/pow(2.0, mipLevel)) ) {
                        mipLevel = 2.0;
                        if (uv.y - pixel.y * 3.0 > 1.0 - (1.0/pow(2.0, mipLevel)) ) {
                            mipLevel = 3.0;
                            if (uv.y - pixel.y * 5.0 > 1.0 - (1.0/pow(2.0, mipLevel)) ) {
                                mipLevel = 4.0;
                                if (uv.y - pixel.y * 7.0 > 1.0 - (1.0/pow(2.0, mipLevel)) ) {
                                    mipLevel = 5.0;
                                }
                            }
                        }
                    }
                }

                if (mipLevel > 0.0) {
                    float scale = pow(2.0, mipLevel);

                    uv.y -= (pixel.y * (mipLevel-1.0) * 2.0);
                    uv.x *= ((textureSize.x - 2.0) / textureSize.y);

                    uv.x -= 1.0 + pixel.x;
                    uv.y -= (1.0 - (1.0/pow(2.0, mipLevel-1.0)));
                    uv *= scale;

                } else {
                    uv.x *= (textureSize.x / textureSize.y);
                }

                if(mipLevel == 0.0) {
                    gl_FragColor = texture2D(texture0, uv);
                }

                if(mipLevel == 1.0) {
                    gl_FragColor = texture2D(texture1, uv);
                }

                if(mipLevel == 2.0) {
                    gl_FragColor = texture2D(texture2, uv);
                }

                if(mipLevel == 3.0) {
                    gl_FragColor = texture2D(texture3, uv);
                }

                if(mipLevel == 4.0) {
                    gl_FragColor = texture2D(texture4, uv);
                }

                if(mipLevel == 5.0) {
                    gl_FragColor = texture2D(texture5, uv);
                }

                
            }
            `;

        command = context.createViewportQuadCommand(fs, {
            framebuffer : framebuffer,
            renderState : RenderState.fromCache({
                viewport : new BoundingRectangle(0.0, 0.0, originalSize * 1.5 + 2, originalSize)
            }),
            uniformMap : uniformMap
        });

        command.execute(context);

        return texture;
    }

    function makeOctahedronVertexArray(context) {
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
                         1.0, -1.0, // bottom right
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

        var vertexArray = VertexArray.fromGeometry({
            context : context,
            geometry : geometry,
            attributeLocations : {
                position : 0,
                cubeMapCoordinates : 1
            },
            interleave : false
        });

        return vertexArray;
    }

    function getOctahedralProjectionVS() {
        return `
    attribute vec4 position;
    attribute vec3 cubeMapCoordinates;

    varying vec3 v_cubeMapCoordinates;

    void main() 
    {
        gl_Position = position;
        v_cubeMapCoordinates = cubeMapCoordinates;
    }
    `;
    }

    function getOctahedralProjectionFS() {
        return `
    varying vec3 v_cubeMapCoordinates;
    uniform samplerCube cubeMap;

    void main()
        {
            
            gl_FragColor = textureCube(cubeMap, v_cubeMapCoordinates);
        }
    `;
    }

    return packOctahedralMap;
});