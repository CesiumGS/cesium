/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Core/BoundingRectangle',
        'Core/Cartesian2',
        'Core/Math',
        'Core/ComponentDatatype',
        'Core/Extent',
        'Core/PrimitiveType',
        'Core/requestAnimationFrame',
        'Renderer/BufferUsage',
        'Renderer/DrawCommand',
        'Renderer/PixelDatatype',
        'Renderer/PixelFormat',
        'Renderer/RenderbufferFormat',
        'Scene/Polygon',
        'Scene/CesiumTerrainProvider',
        'Shaders/PostProcessFilters/AdditiveBlend',
        'Shaders/PostProcessFilters/BrightPass',
        'Shaders/PostProcessFilters/GaussianBlur1D',
        'Shaders/PostProcessFilters/PassThrough',
        'Shaders/ViewportQuadVS',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Dojo/CesiumViewerWidget'
    ], function(
        win,
        domClass,
        ioQuery,
        parser,
        ready,
        BoundingRectangle,
        Cartesian2,
        CesiumMath,
        ComponentDatatype,
        Extent,
        PrimitiveType,
        requestAnimationFrame,
        BufferUsage,
        DrawCommand,
        PixelDatatype,
        PixelFormat,
        RenderbufferFormat,
        Polygon,
        CesiumTerrainProvider,
        AdditiveBlend,
        BrightPass,
        GaussianBlur1D,
        PassThrough,
        ViewportQuadVS,
        checkForChromeFrame,
        CesiumViewerWidget) {
    "use strict";
    /*global console*/

    var attributeIndices = {
        position : 0,
        textureCoordinates : 1
    };

    function getVertexArray(context) {
        // Per-context cache for viewport quads
        var vertexArray = context.cache.viewportQuad_vertexArray;

        if (typeof vertexArray !== 'undefined') {
            return vertexArray;
        }

        var mesh = {
            attributes : {
                position : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                       -1.0, -1.0,
                        1.0, -1.0,
                        1.0,  1.0,
                       -1.0,  1.0
                    ]
                },

                textureCoordinates : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0
                    ]
                }
            }
        };

        vertexArray = context.createVertexArrayFromMesh({
            mesh : mesh,
            attributeIndices : attributeIndices,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        context.cache.viewportQuad_vertexArray = vertexArray;
        return vertexArray;
    }

    var downScaleCommand;
    var brightCommand;
    var blurXCommand;
    var blurYCommand;
    var additiveBlendCommand;

    function filterSetup(scene) {
        var context = scene.getContext();
        var canvas = context.getCanvas();
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        // Set up draw framebuffer
        var drawTexture = context.createTexture2D({
            width : width,
            height : height
        });

        var depthTexture;
        var depthRenderbuffer;

        if (context.getDepthTexture()) {
            depthTexture = context.createTexture2D({
                width : width,
                height : height,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });
        } else {
            depthRenderbuffer = context.createRenderbuffer({
                format : RenderbufferFormat.DEPTH_COMPONENT16
            });
        }

        var drawFramebuffer = context.createFramebuffer({
            colorTexture : drawTexture,
            depthTexture : depthTexture,
            depthRenderbuffer : depthRenderbuffer
        });

        scene.framebuffer = drawFramebuffer;

        // Set up down-scale command
        var downScaleWidth = Math.pow(2.0, Math.ceil(Math.log(width) / Math.log(2)) - 2.0);
        var downScaleHeight = Math.pow(2.0, Math.ceil(Math.log(height) / Math.log(2)) - 2.0);
        var downScaleSize = Math.max(downScaleWidth, downScaleHeight);

        var downScaleTexture = context.createTexture2D({
            width : downScaleSize,
            height : downScaleSize
        });

        var downScaleFramebuffer = context.createFramebuffer({
            colorTexture : downScaleTexture
        });

        downScaleCommand = new DrawCommand();
        downScaleCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        downScaleCommand.vertexArray = getVertexArray(context);
        downScaleCommand.renderState = context.createRenderState({
            viewport : new BoundingRectangle(0.0, 0.0, downScaleSize, downScaleSize)
        });
        downScaleCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, PassThrough, attributeIndices);
        downScaleCommand.uniformMap = {
            u_texture : function() {
                return drawTexture;
            }
        };
        downScaleCommand.framebuffer = downScaleFramebuffer;

        // Set up bright pass command

        var brightTexture = context.createTexture2D({
            width : downScaleSize,
            height : downScaleSize
        });

        var brightFramebuffer = context.createFramebuffer({
            colorTexture : brightTexture
        });

        brightCommand = new DrawCommand();
        brightCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        brightCommand.vertexArray = getVertexArray(context);
        brightCommand.renderState = context.createRenderState({
            viewport : new BoundingRectangle(0.0, 0.0, downScaleSize, downScaleSize)
        });
        brightCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, BrightPass, attributeIndices);
        brightCommand.uniformMap = {
            u_texture : function() {
                return downScaleTexture;
            },
            u_avgLuminance : function() {
                return 0.5;
            },
            u_threshold : function() {
                return 0.25;
            },
            u_offset : function() {
                return 0.1;
            }
        };
        brightCommand.framebuffer = brightFramebuffer;

        // blur params
        var radius = 16.0;
        var delta = 1.0;
        var sigma = 2.0;

        // Set up blur in x direction
        var blurXTexture = context.createTexture2D({
            width : downScaleSize,
            height : downScaleSize
        });

        var blurXFramebuffer = context.createFramebuffer({
            colorTexture : blurXTexture
        });

        blurXCommand = new DrawCommand();
        blurXCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        blurXCommand.vertexArray = getVertexArray(context);
        blurXCommand.renderState = context.createRenderState({
            viewport : new BoundingRectangle(0.0, 0.0, downScaleSize, downScaleSize)
        });
        blurXCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, GaussianBlur1D, attributeIndices);
        blurXCommand.uniformMap = {
            u_texture : function() {
                return brightTexture;
            },
            u_step : function() {
                return new Cartesian2(1.0 / downScaleSize, 1.0 / downScaleSize);
            },
            radius : function() {
                return radius;
            },
            delta : function() {
                return delta;
            },
            sigma : function() {
                return sigma;
            },
            direction : function() {
                return 0.0;
            }
        };
        blurXCommand.framebuffer = blurXFramebuffer;

        // Set up blur in y direction
        var blurYTexture = context.createTexture2D({
            width : downScaleSize,
            height : downScaleSize
        });

        var blurYFramebuffer = context.createFramebuffer({
            colorTexture : blurYTexture
        });

        blurYCommand = new DrawCommand();
        blurYCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        blurYCommand.vertexArray = getVertexArray(context);
        blurYCommand.renderState = context.createRenderState({
            viewport : new BoundingRectangle(0.0, 0.0, downScaleSize, downScaleSize)
        });
        blurYCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, GaussianBlur1D, attributeIndices);
        blurYCommand.uniformMap = {
            u_texture : function() {
                return brightTexture;
            },
            u_step : function() {
                return new Cartesian2(1.0 / downScaleSize, 1.0 / downScaleSize);
            },
            radius : function() {
                return radius;
            },
            delta : function() {
                return delta;
            },
            sigma : function() {
                return sigma;
            },
            direction : function() {
                return 1.0;
            }
        };
        blurYCommand.framebuffer = blurYFramebuffer;

        // Set up additive blend command
        additiveBlendCommand = new DrawCommand();
        additiveBlendCommand.primitiveType = PrimitiveType.TRIANGLE_FAN;
        additiveBlendCommand.vertexArray = getVertexArray(context);
        additiveBlendCommand.renderState = context.createRenderState();
        additiveBlendCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, AdditiveBlend, attributeIndices);
        additiveBlendCommand.uniformMap = {
            u_texture0 : function() {
                return drawTexture;
            },
            u_texture1 : function() {
                return blurYTexture;
            }
        };
    }

    ready(function() {
        parser.parse();

        checkForChromeFrame();

        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

        var widget = new CesiumViewerWidget({
            endUserOptions : endUserOptions,
            enableDragDrop : true
        });
        widget.placeAt('cesiumContainer');
        widget.autoStartRenderLoop = false;
        widget.startup();
        widget.fullscreen.viewModel.fullscreenElement(document.body);

// TODO: remove before pull request
        widget.centralBody.terrainProvider = new CesiumTerrainProvider({
            url : 'http://cesium.agi.com/smallterrain'
        });

        var scene = widget.scene;

        var polygon = new Polygon();
        polygon.configureExtent(
            new Extent(
                CesiumMath.toRadians(-140.0),
                CesiumMath.toRadians(0.0),
                CesiumMath.toRadians(-100.0),
                CesiumMath.toRadians(20.0)));
        scene.getPrimitives().add(polygon);

        var context = scene.getContext();
        context.setValidateFramebuffer(true);
        var frames = 0;

        function updateAndRender() {
            if (frames === 50) {
                filterSetup(scene);
            }

            widget.initializeFrame();
            widget.render(widget.update());

            if (typeof downScaleCommand !== 'undefined') {
                downScaleCommand.execute(context);
                brightCommand.execute(context);
                blurXCommand.execute(context);
                blurYCommand.execute(context);
                additiveBlendCommand.execute(context);
            }

            ++frames;
            requestAnimationFrame(updateAndRender);
        }
        requestAnimationFrame(updateAndRender);

        domClass.remove(win.body(), 'loading');
    });
});