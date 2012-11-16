/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/BoxTessellator',
        '../Core/Cartesian3',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/JulianDate',
        '../Core/Matrix4',
        '../Core/MeshFilters',
        '../Core/PrimitiveType',
        '../Core/TimeStandard',
        '../Core/Transforms',
        '../Renderer/BufferUsage',
        '../Renderer/CommandLists',
        '../Renderer/CullFace',
        '../Renderer/DrawCommand',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Scene/SceneMode',
        '../Shaders/SkyBoxVS',
        '../Shaders/SkyBoxFS'
    ], function(
        BoundingSphere,
        BoxTessellator,
        Cartesian3,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        JulianDate,
        Matrix4,
        MeshFilters,
        PrimitiveType,
        TimeStandard,
        Transforms,
        BufferUsage,
        CommandLists,
        CullFace,
        DrawCommand,
        PixelDatatype,
        PixelFormat,
        SceneMode,
        SkyBoxVS,
        SkyBoxFS) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias SkyBox
     * @constructor
     */
    var SkyBox = function(source) {
        var command = new DrawCommand();
        command.primitiveType = PrimitiveType.TRIANGLES;
        command.boundingVolume = new BoundingSphere();

        var commandLists = new CommandLists();
        commandLists.colorList.push(command);

        this._command = command;
        this._commandLists = commandLists;
        this._cubeMap = undefined;

        if(Array.isArray(source) && source.length === 6) {
            this._source = source;
        }
        else {
            throw new DeveloperError('source must have 6 images.');
        }

        var that = this;
        command.uniformMap = {
            u_cubeMap: function() {
                return that._cubeMap;
            }
        };
    };

    /**
     * @private
     */
    SkyBox.prototype.update = function(context, frameState, commandList) {
        // TODO: Only supports 3D, add Columbus view support.
        if (frameState.mode !== SceneMode.SCENE3D) {
            return;
        }

        // The sky box is only rendered during the color pass
        if (!frameState.passes.color) {
            return;
        }

        var command = this._command;

        if (typeof command.vertexArray === 'undefined') {
            var that = this;

            // Setup Cubemap
            var facesLoaded = 0;
            var images = new Array(6);
            var setupTextures = function(index) {
                var img = new Image();
                img.onload =
                    function() {
                        images[index] = img;
                        if( ++facesLoaded === 6 ) {
                            that._cubeMap = that._cubeMap && that._cubeMap.destroy();
                            that._cubeMap = context.createCubeMap({
                                source: {
                                    positiveX: images[0],
                                    negativeX: images[1],
                                    positiveY: images[2],
                                    negativeY: images[3],
                                    positiveZ: images[4],
                                    negativeZ: images[5]
                                },
                                width: images[0].width,
                                height: images[0].height,
                                pixelFormat: PixelFormat.RGBA,
                                pixelDatatype: PixelDatatype.UNSIGNED_BYTE
                             });
                        }
                    };
                img.onerror = function() {
                    that._exception = 'Could not load image: ' + that._source[index] + '.';
                };
                img.src = that._source[index];
            };

            for(var i=0;i<6;++i) {
                setupTextures(i);
            }

            // TODO: Determine size of box based on the size of the scene.
            var dimensions = new Cartesian3(100000000.0, 100000000.0, 100000000.0);
            var maximumCorner = dimensions.multiplyByScalar(0.5);
            var minimumCorner = maximumCorner.negate();
            BoundingSphere.fromPoints([minimumCorner, maximumCorner], command.boundingVolume);

            var mesh = BoxTessellator.compute({
                            minimumCorner: minimumCorner,
                            maximumCorner: maximumCorner
                        });
            var attributeIndices = MeshFilters.createAttributeIndices(mesh);

            command.vertexArray = context.createVertexArrayFromMesh({
                mesh: mesh,
                attributeIndices: attributeIndices,
                bufferUsage: BufferUsage.STATIC_DRAW
            });

            command.shaderProgram = context.getShaderCache().getShaderProgram(SkyBoxVS, SkyBoxFS, attributeIndices);
            command.renderState = context.createRenderState({
                depthTest : {
                    enabled : true
                },
                depthMask : false,
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                }
            });
        }

        if (typeof this._cubeMap !== 'undefined') {
            // TODO: Use scene time
            var time = JulianDate.fromDate(new Date(), TimeStandard.UTC);
            this._command.modelMatrix = Matrix4.fromRotationTranslation(Transforms.computeTemeToPseudoFixedMatrix(time), Cartesian3.ZERO);

            commandList.push(this._commandLists);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof SkyBox
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see SkyBox#destroy
     */
    SkyBox.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof SkyBox
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see SkyBox#isDestroyed
     *
     * @example
     * skyBox = skyBox && skyBox.destroy();
     */
    SkyBox.prototype.destroy = function() {
        var command = this._command;
        command.vertexArray = command.vertexArray && command.vertexArray.destroy();
        command.shaderProgram = command.shaderProgram && command.shaderProgram.release();
        return destroyObject(this);
    };

    return SkyBox;
});