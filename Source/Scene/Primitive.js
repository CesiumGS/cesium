/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Matrix4',
        '../Core/Color',
        '../Core/GeometryPipeline',
        '../Core/PrimitiveType',
        '../Core/BoundingSphere',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/ComponentDatatype',
        '../Renderer/BufferUsage',
        '../Renderer/VertexLayout',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        '../Renderer/createPickFragmentShaderSource',
        './SceneMode'
    ], function(
        clone,
        defaultValue,
        DeveloperError,
        destroyObject,
        Matrix4,
        Color,
        GeometryPipeline,
        PrimitiveType,
        BoundingSphere,
        Geometry,
        GeometryAttribute,
        ComponentDatatype,
        BufferUsage,
        VertexLayout,
        CommandLists,
        DrawCommand,
        createPickFragmentShaderSource,
        SceneMode) {
    "use strict";

    /**
     * A primitive represents geometry in the {@link Scene}.  The geometry can be from a single {@link GeometryInstance}
     * as shown in Code Example 1 below, or from an array of instances, even if the geometry is from different
     * geometry types, e.g., an {@link ExtentGeometry} and an {@link EllipsoidGeometry} as shown in Code Example 2.
     * <p>
     * A primitive combines geometry instances with an {@link Appearance} that describes the full shading, including
     * {@link Material} and {@link Renderstate}.  Roughly, the geometry instance defines the structure and placement,
     * and the appearance defines the visual characteristics.  Decoupling geometry and appearance allows us to mix
     * and max most of them, and to easily add new geometry types and appearances.
     * </p>
     * <p>
     * Combing multiple instances in one primitive is called batching, and significantly improves performance for static data.
     * Instances can be individually picked; {@link Context#pick} returns their {@link GeometryInstance#id}.  Using
     * per-instance appearances like {@link PerInstanceColorAppearance}, each instance can also have a unique color.
     * </p>
     *
     * @alias Primitive
     * @constructor
     *
     * @param {Array} [options.geometryInstances=undefined] The geometry instances - or a single geometry instance - to render.
     * @param {Appearance} [options.appearance=undefined] The appearance used to render the primitive.
     * @param {Boolean} [options.vertexCacheOptimize=true] When <code>true</code>, geometry vertices are optimized for the pre- and post-vertex-shader caches.
     * @param {Boolean} [options.releaseGeometries=true] When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
     * @param {Boolean} [options.transformToWorldCoordinates=true] When <code>true</code>, each geometry instance is transform to world coordinates even if they are already in the same coordinate system.
     * @param {Boolean} [options.allowColumbusView=true] When <code>true</code>, each geometry instance is prepared for rendering in Columbus view and 2D.
     *
     * @example
     * // 1. Draw a translucent ellipse on the surface with a checkerboard pattern
     * var instance = new GeometryInstance({
     *   geometry : new EllipseGeometry({
     *       vertexFormat : VertexFormat.POSITION_AND_ST,
     *       ellipsoid : ellipsoid,
     *       center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-100, 20)),
     *       semiMinorAxis : 500000.0,
     *       semiMajorAxis : 1000000.0,
     *       bearing : CesiumMath.PI_OVER_FOUR
     *   }),
     *   id : 'object returned when this instance is picked and to get/set per-instance attributes'
     * });
     * var primitive = new Primitive({
     *   geometryInstances : instance,
     *   appearance : new EllipsoidSurfaceAppearance({
     *     material : Material.fromType(scene.getContext(), 'Checkerboard')
     *   })
     * });
     * scene.getPrimitives().add(primitive);
     *
     * // 2. Draw different instances each with a unique color
     * var extentInstance = new GeometryInstance({
     *   geometry : new ExtentGeometry({
     *     vertexFormat : VertexFormat.POSITION_AND_NORMAL,
     *     extent : new Extent(
     *       CesiumMath.toRadians(-140.0),
     *       CesiumMath.toRadians(30.0),
     *       CesiumMath.toRadians(-100.0),
     *       CesiumMath.toRadians(40.0))
     *     }),
     *   id : 'object returned when this instance is picked and to get/set per-instance attributes',
     *   color : new Color(0.0, 1.0, 1.0, 0.5) // TODO: make attribute
     * });
     * var ellipsoidInstance = new GeometryInstance({
     *   geometry : new EllipsoidGeometry({
     *     vertexFormat : VertexFormat.POSITION_AND_NORMAL,
     *     ellipsoid : new Ellipsoid(500000.0, 500000.0, 1000000.0)
     *   }),
     *   modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
     *     ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-95.59777, 40.03883))), new Cartesian3(0.0, 0.0, 500000.0)),
     *   id : 'object returned when this instance is picked and to get/set per-instance attributes',
     *   color : new Color(1.0, 0.0, 1.0, 0.5) // TODO: make attribute
     * });
     * var primitive = new Primitive({
     *   geometryInstances : [extentInstance, ellipsoidInstance],
     *   appearance : new PerInstanceColorAppearance()
     * });
     * scene.getPrimitives().add(primitive);
     *
     * @see GeometryInstance
     * @see Appearance
     */
    var Primitive = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The geometry instances rendered with this primitive.  This may
         * be <code>undefined</code> if <code>options.releaseGeometries</code>
         * is <code>true</code> when the primitive is constructed.
         * <p>
         * Changing this property after the primitive is rendered has no effect.
         * </p>
         *
         * @type Array
         *
         * @default undefined
         */
        this.geometryInstances = options.geometryInstances;

        /**
         * DOC_TBA
         */
        this.appearance = options.appearance;
        this._appearance = undefined;
        this._material = undefined;

        /**
         * The 4x4 transformation matrix that transforms the primitive (all geometry instances) from model to world coordinates.
         * When this is the identity matrix, the primitive is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.  This matrix is available to GLSL vertex and fragment
         * shaders via {@link czm_model} and derived uniforms.
         *
         * @type Matrix4
         *
         * @default Matrix4.IDENTITY
         *
         * @example
         * var origin = ellipsoid.cartographicToCartesian(
         *   Cartographic.fromDegrees(-95.0, 40.0, 200000.0));
         * p.modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);
         *
         * @see czm_model
         */
        this.modelMatrix = Matrix4.IDENTITY.clone();

        /**
         * Determines if the primitive will be shown.  This affects all geometry
         * instances in the primitive.
         *
         * @type Boolean
         *
         * @default true
         */
        this.show = true;

        this._vertexCacheOptimize = defaultValue(options.vertexCacheOptimize, true);
        this._releaseGeometries = defaultValue(options.releaseGeometries, true);
        // When true, geometry is transformed to world coordinates even if there is a single
        // geometry or all geometries are in the same reference frame.
        this._transformToWorldCoordinates = defaultValue(options.transformToWorldCoordinates, true);
        this._allowColumbusView = defaultValue(options.allowColumbusView, true);
        this._boundingSphere = undefined;
        this._boundingSphere2D = undefined;

        this._va = [];
        this._attributeIndices = undefined;

        this._rs = undefined;
        this._sp = undefined;

        this._pickSP = undefined;
        this._pickIds = [];

        this._commandLists = new CommandLists();
    };

    function addPickColorAttribute(primitive, instances, context) {
        var length = instances.length;

        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var geometry = instance.geometry;
            var attributes = geometry.attributes;
            var positionAttr = attributes.position;
            var numberOfComponents = 4 * (positionAttr.values.length / positionAttr.componentsPerAttribute);

            attributes.pickColor = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                normalize : true,
                values : new Uint8Array(numberOfComponents)
            });

            var pickId = context.createPickId(defaultValue(instance.id, primitive));
            primitive._pickIds.push(pickId);

            var pickColor = pickId.color;
            var red = Color.floatToByte(pickColor.red);
            var green = Color.floatToByte(pickColor.green);
            var blue = Color.floatToByte(pickColor.blue);
            var alpha = Color.floatToByte(pickColor.alpha);
            var values = attributes.pickColor.values;

            for (var j = 0; j < numberOfComponents; j += 4) {
                values[j] = red;
                values[j + 1] = green;
                values[j + 2] = blue;
                values[j + 3] = alpha;
            }
        }
    }

    function transformToWorldCoordinates(primitive, instances) {
        var toWorld = primitive._transformToWorldCoordinates || primitive._allowColumbusView;
        var length = instances.length;
        var i;

        if (!toWorld && (length > 1)) {
            var modelMatrix = instances[0].modelMatrix;

            for (i = 1; i < length; ++i) {
                if (!Matrix4.equals(modelMatrix, instances[i].modelMatrix)) {
                    toWorld = true;
                    break;
                }
            }
        }

        if (toWorld) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.transformToWorldCoordinates(instances[i]);
            }
        } else {
            // Leave geometry in local coordinate system; auto update model-matrix.
            Matrix4.clone(instances[0].modelMatrix, primitive.modelMatrix);
        }
    }

    var indexFunctions = [
        function(geometry) { return geometry; },
        GeometryPipeline.indexLines,
        GeometryPipeline.indexLineLoop,
        GeometryPipeline.indexLineStrip,
        GeometryPipeline.indexTriangles,
        GeometryPipeline.indexTriangleStrip,
        GeometryPipeline.indexTriangleFan
    ];

    function wrapLongitude(primitive, instances) {
        if (!primitive._allowColumbusView) {
            return;
        }

        var length = instances.length;
        var primitiveType = instances[0].geometry.primitiveType;

        for (var i = 1; i < length; ++i) {
            if (instances[i].geometry.primitiveType !== primitiveType) {
                throw new DeveloperError('All instance geometries must have the same primitiveType.');
            }
        }

        var indexFunction = indexFunctions[primitiveType.value];
        for (var j = 0; j < length; ++j) {
            var geometry = instances[j].geometry;
            indexFunction(geometry);
            GeometryPipeline.wrapLongitude(geometry);
        }
    }

    function encodePositions(primitive, geometry) {
        if (primitive._allowColumbusView) {
            // Compute 2D positions
            GeometryPipeline.projectTo2D(geometry);

            // Find bounding sphere
            primitive._boundingSphere2D = BoundingSphere.fromVertices(geometry.attributes.position2D.values);
            var center = primitive._boundingSphere2D.center;
            var x = center.x;
            var y = center.y;
            var z = center.z;
            center.x = z;
            center.y = x;
            center.z = y;

            GeometryPipeline.encodeAttribute(geometry, 'position3D', 'position3DHigh', 'position3DLow');
            GeometryPipeline.encodeAttribute(geometry, 'position2D', 'position2DHigh', 'position2DLow');
        } else {
            GeometryPipeline.encodeAttribute(geometry, 'position', 'position3DHigh', 'position3DLow');
        }
    }

    // PERFORMANCE_IDEA:  Move pipeline to a web-worker.
    function geometryPipeline(primitive, instances, context) {
        // Copy instances first since most pipeline operations modify the geometry and instance in-place.
        var length = instances.length;
        var insts = new Array(length);
        for (var i = 0; i < length; ++i) {
            insts[i] = instances[i].clone();
        }

        // Unify to world coordinates before combining.  If there is only one geometry or all
        // geometries are in the same (non-world) coordinate system, only combine if the user requested it.
        transformToWorldCoordinates(primitive, insts);

        // Clip to IDL
        wrapLongitude(primitive, insts);

        // Add pickColor attribute for picking individual instances
        addPickColorAttribute(primitive, insts, context);

        // Optimize for vertex shader caches
        if (primitive._vertexCacheOptimize) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.reorderForPostVertexCache(insts[i].geometry);
                GeometryPipeline.reorderForPreVertexCache(insts[i].geometry);
            }
        }

        // Combine into single geometry for better rendering performance.
        var geometry = GeometryPipeline.combine(insts);
        primitive._boundingSphere = geometry.boundingSphere;

        // Split positions for GPU RTE
        encodePositions(primitive, geometry);

        if (!context.getElementIndexUint()) {
            // Break into multiple geometries to fit within unsigned short indices if needed
            return GeometryPipeline.fitToUnsignedShortIndices(geometry);
        }

        // Unsigned int indices are supported.  No need to break into multiple geometries.
        return [geometry];
    }

    function createColumbusViewShader(primitive, vertexShaderSource) {
        var attributes;
        if (primitive._allowColumbusView) {
            attributes =
                'attribute vec3 position2DHigh;\n' +
                'attribute vec3 position2DLow;';
        } else {
            attributes = '';
        }

        var computePosition =
            'vec4 czm_computePosition()\n' +
            '{\n';
        if (primitive._allowColumbusView) {
            computePosition +=
                '    vec4 p;\n' +
                '    if (czm_morphTime == 1.0)\n' +
                '    {\n' +
                '        p = czm_translateRelativeToEye(position3DHigh, position3DLow);\n' +
                '    }\n' +
                '    else if (czm_morphTime == 0.0)\n' +
                '    {\n' +
                '        p = czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy);\n' +
                '    }\n' +
                '    else\n' +
                '    {\n' +
                '        p = czm_columbusViewMorph(\n' +
                '                czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy),\n' +
                '                czm_translateRelativeToEye(position3DHigh, position3DLow),\n' +
                '                czm_morphTime);\n' +
                '    }\n' +
                '    return p;\n';
        } else {
            computePosition += '    return czm_translateRelativeToEye(position3DHigh, position3DLow);\n';
        }
        computePosition += '}\n\n';


        var position3DLow = 'position3DLow;';
        var positionLowIndex = vertexShaderSource.indexOf(position3DLow);
        positionLowIndex += position3DLow.length;

        var main = vertexShaderSource.match(/void\s+main\s*\(\s*(?:void)?\s*\)/);
        var mainIndex = vertexShaderSource.indexOf(main[0]);

        var shaderSource =
            vertexShaderSource.substring(0, positionLowIndex) + '\n' +
            attributes +
            vertexShaderSource.substring(positionLowIndex, mainIndex) +
            computePosition +
            vertexShaderSource.substring(mainIndex);
        return shaderSource;
    }

    function createPickVertexShaderSource(vertexShaderSource) {
        var renamedVS = vertexShaderSource.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_old_main()');
        var pickMain =
            'attribute vec4 pickColor; \n' +
            'varying vec4 czm_pickColor; \n' +
            'void main() \n' +
            '{ \n' +
            '    czm_old_main(); \n' +
            '    czm_pickColor = pickColor; \n' +
            '}';

        return renamedVS + '\n' + pickMain;
    }

    function validateShaderMatching(shaderProgram, attributeIndices) {
        // For a VAO and shader program to be compatible, the VAO must have
        // all active attribute in the shader program.  The VAO may have
        // extra attributes with the only concern being a potential
        // performance hit due to extra memory bandwidth and cache pollution.
        // The shader source could have extra attributes that are not used,
        // but there is no guarantee they will be optimized out.
        //
        // Here, we validate that the VAO has all attributes required
        // to match the shader program.
        var shaderAttributes = shaderProgram.getVertexAttributes();

        for (var name in shaderAttributes) {
            if (shaderAttributes.hasOwnProperty(name)) {
                if (typeof attributeIndices[name] === 'undefined') {
                    throw new DeveloperError('Appearance/Geometry mismatch.  The appearance requires vertex shader attribute input \'' + name +
                        '\', which was not computed as part of the Geometry.  Use the appearance\'s vertexFormat property when constructing the geometry.');
                }
            }
        }

    }

    /**
     * @private
     */
    Primitive.prototype.update = function(context, frameState, commandList) {
        if (!this.show ||
            ((typeof this.geometryInstances === 'undefined') && (this._va.length === 0)) ||
            (typeof this.appearance === 'undefined') ||
            (frameState.mode !== SceneMode.SCENE3D && !this._allowColumbusView)) {
            return;
        }

        if (!frameState.passes.color && !frameState.passes.pick) {
            return;
        }

        var colorCommands = this._commandLists.colorList;
        var pickCommands = this._commandLists.pickList;
        var colorCommand;
        var pickCommand;
        var length;
        var i;

        if (this._va.length === 0) {
            var instances = (this.geometryInstances instanceof Array) ? this.geometryInstances : [this.geometryInstances];
            var geometries = geometryPipeline(this, instances, context);
            this._attributeIndices = GeometryPipeline.createAttributeIndices(geometries[0]);

            var va = [];
            for (i = 0; i < length; ++i) {
                va.push(context.createVertexArrayFromGeometry({
                    geometry : geometries[i],
                    attributeIndices : this._attributeIndices,
                    bufferUsage : BufferUsage.STATIC_DRAW,
                    vertexLayout : VertexLayout.INTERLEAVED
                }));
            }

            this._va = va;

            for (i = 0; i < length; ++i) {
                var geometry = geometries[i];

                // renderState, shaderProgram, and uniformMap for commands are set below.

                colorCommand = new DrawCommand();
                colorCommand.primitiveType = geometry.primitiveType;
                colorCommand.vertexArray = this._va[i];
                colorCommands.push(colorCommand);

                pickCommand = new DrawCommand();
                pickCommand.primitiveType = geometry.primitiveType;
                pickCommand.vertexArray = this._va[i];
                pickCommands.push(pickCommand);
            }

            if (this._releaseGeometries) {
                this.geometryInstances = undefined;
            }
        }

        // Create or recreate render state and shader program if appearance/material changed
        var appearance = this.appearance;
        var material = appearance.material;
        var createRS = false;
        var createSP = false;

        if (this._appearance !== appearance) {

            this._appearance = appearance;
            this._material = material;
            createRS = true;
            createSP = true;
        } else if (this._material !== material ) {
            this._material = material;
            createSP = true;
        }

        if (createRS) {
            this._rs = context.createRenderState(appearance.renderState);
        }

        if (createSP) {
            var shaderCache = context.getShaderCache();
            var vs = createColumbusViewShader(this, appearance.vertexShaderSource);
            var fs = appearance.getFragmentShaderSource();

            this._sp = shaderCache.replaceShaderProgram(this._sp, vs, fs, this._attributeIndices);
            this._pickSP = shaderCache.replaceShaderProgram(this._pickSP,
                createPickVertexShaderSource(vs),
                createPickFragmentShaderSource(fs, 'varying'),
                this._attributeIndices);

            validateShaderMatching(this._sp, this._attributeIndices);
            validateShaderMatching(this._pickSP, this._attributeIndices);
        }

        if (createRS || createSP) {
            var uniforms = (typeof material !== 'undefined') ? material._uniforms : undefined;

            length = colorCommands.length;
            for (i = 0; i < length; ++i) {

                colorCommand = colorCommands[i];
                colorCommand.renderState = this._rs;
                colorCommand.shaderProgram = this._sp;
                colorCommand.uniformMap = uniforms;

                pickCommand = pickCommands[i];
                pickCommand.renderState = this._rs;
                pickCommand.shaderProgram = this._pickSP;
                pickCommand.uniformMap = uniforms;
            }
        }

        var boundingSphere;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingSphere = this._boundingSphere;
        } else if (frameState.mode === SceneMode.COLUMBUS_VIEW) {
            boundingSphere = this._boundingSphere2D;
        } else if (frameState.mode === SceneMode.SCENE2D && this._boundingSphere2D !== 'undefined') {
            boundingSphere = BoundingSphere.clone(this._boundingSphere2D);
            boundingSphere.center.x = 0.0;
        } else if (typeof this._boundingSphere !== 'undefined' && this._boundingSphere2D !== 'undefined') {
            boundingSphere = BoundingSphere.union(this._boundingSphere, this._boundingSphere2D);
        }

        // modelMatrix can change from frame to frame
        length = colorCommands.length;
        for (i = 0; i < length; ++i) {
            colorCommands[i].modelMatrix = this.modelMatrix;
            pickCommands[i].modelMatrix = this.modelMatrix;

            colorCommands[i].boundingVolume = boundingSphere;
            pickCommands[i].boundingVolume = boundingSphere;
        }

        commandList.push(this._commandLists);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <p>
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * </p>
     *
     * @memberof Primitive
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Primitive#destroy
     */
    Primitive.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <p>
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * </p>
     *
     * @memberof Primitive
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Primitive#isDestroyed
     *
     * @example
     * e = e && e.destroy();
     */
    Primitive.prototype.destroy = function() {
        var length;
        var i;

        this._sp = this._sp && this._sp.release();
        this._pickSP = this._pickSP && this._pickSP.release();

        var va = this._va;
        length = va.length;
        for (i = 0; i < length; ++i) {
            va[i].destroy();
        }
        this._va = undefined;

        var pickIds = this._pickIds;
        length = pickIds.length;
        for (i = 0; i < length; ++i) {
            pickIds[i].destroy();
        }
        this._pickIds = undefined;

        return destroyObject(this);
    };

    return Primitive;
});
