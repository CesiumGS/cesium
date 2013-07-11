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
        '../Core/GeometryAttributes',
        '../Core/GeometryInstance',
        '../Core/GeometryInstanceAttribute',
        '../Core/ComponentDatatype',
        '../Core/Cartesian3',
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
        GeometryAttributes,
        GeometryInstance,
        GeometryInstanceAttribute,
        ComponentDatatype,
        Cartesian3,
        BufferUsage,
        VertexLayout,
        CommandLists,
        DrawCommand,
        createPickFragmentShaderSource,
        SceneMode) {
    "use strict";

    /**
     * A primitive represents geometry in the {@link Scene}.  The geometry can be from a single {@link GeometryInstance}
     * as shown in example 1 below, or from an array of instances, even if the geometry is from different
     * geometry types, e.g., an {@link ExtentGeometry} and an {@link EllipsoidGeometry} as shown in Code Example 2.
     * <p>
     * A primitive combines geometry instances with an {@link Appearance} that describes the full shading, including
     * {@link Material} and {@link RenderState}.  Roughly, the geometry instance defines the structure and placement,
     * and the appearance defines the visual characteristics.  Decoupling geometry and appearance allows us to mix
     * and match most of them and add a new geometry or appearance independently of each other.
     * </p>
     * <p>
     * Combining multiple instances into one primitive is called batching, and significantly improves performance for static data.
     * Instances can be individually picked; {@link Context#pick} returns their {@link GeometryInstance#id}.  Using
     * per-instance appearances like {@link PerInstanceColorAppearance}, each instance can also have a unique color.
     * </p>
     *
     * @alias Primitive
     * @constructor
     *
     * @param {Array|GeometryInstance} [options.geometryInstances=undefined] The geometry instances - or a single geometry instance - to render.
     * @param {Appearance} [options.appearance=undefined] The appearance used to render the primitive.
     * @param {Boolean} [options.vertexCacheOptimize=true] When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
     * @param {Boolean} [options.releaseGeometryInstances=true] When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
     * @param {Boolean} [options.allow3DOnly=false] When <code>true</code>, each geometry instance will only be rendered in 3D.
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
     *   id : 'extent',
     *   attribute : {
     *     color : new ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5)
     *   }
     * });
     * var ellipsoidInstance = new GeometryInstance({
     *   geometry : new EllipsoidGeometry({
     *     vertexFormat : VertexFormat.POSITION_AND_NORMAL,
     *     radii : new Cartesian3(500000.0, 500000.0, 1000000.0)
     *   }),
     *   modelMatrix : Matrix4.multiplyByTranslation(Transforms.eastNorthUpToFixedFrame(
     *     ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-95.59777, 40.03883))), new Cartesian3(0.0, 0.0, 500000.0)),
     *   id : 'ellipsoid',
     *   attribute : {
     *     color : ColorGeometryInstanceAttribute.fromColor(Color.AQUA)
     *   }
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
         * be <code>undefined</code> if <code>options.releaseGeometryInstances</code>
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
         * The {@link Appearance} used to shade this primitive.  Each geometry
         * instance is shaded with the same appearance.  Some appearances, like
         * {@link PerInstanceColorAppearance} allow giving each instance unique
         * properties.
         *
         * @type Appearance
         *
         * @default undefined
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
        this._releaseGeometryInstances = defaultValue(options.releaseGeometryInstances, true);
        // When true, geometry is transformed to world coordinates even if there is a single
        // geometry or all geometries are in the same reference frame.
        this._allow3DOnly = defaultValue(options.allow3DOnly, false);
        this._boundingSphere = undefined;
        this._boundingSphere2D = undefined;
        this._perInstanceAttributes = {};
        this._lastPerInstanceAttributeIndex = 0;

        this._va = [];
        this._attributeIndices = undefined;

        this._rs = undefined;
        this._sp = undefined;

        this._pickSP = undefined;
        this._pickIds = [];

        this._commandLists = new CommandLists();
    };

    function cloneAttribute(attribute) {
        return new GeometryAttribute({
            componentDatatype : attribute.componentDatatype,
            componentsPerAttribute : attribute.componentsPerAttribute,
            normalize : attribute.normalize,
            values : new attribute.values.constructor(attribute.values)
        });
    }

    function cloneGeometry(geometry) {
        var attributes = geometry.attributes;
        var newAttributes = new GeometryAttributes();
        for (var property in attributes) {
            if (attributes.hasOwnProperty(property) && typeof attributes[property] !== 'undefined') {
                newAttributes[property] = cloneAttribute(attributes[property]);
            }
        }

        var indices;
        if (typeof geometry.indices !== 'undefined') {
            var sourceValues = geometry.indices;
            indices = new sourceValues.constructor(sourceValues);
        }

        return new Geometry({
            attributes : newAttributes,
            indices : indices,
            primitiveType : geometry.primitiveType,
            boundingSphere : BoundingSphere.clone(geometry.boundingSphere)
        });
    }

    function cloneGeometryInstanceAttribute(attribute) {
        return new GeometryInstanceAttribute({
            componentDatatype : attribute.componentDatatype,
            componentsPerAttribute : attribute.componentsPerAttribute,
            normalize : attribute.normalize,
            value : new attribute.value.constructor(attribute.value)
        });
    }

    function cloneInstance(instance) {
        var attributes = instance.attributes;
        var newAttributes = {};
        for (var property in attributes) {
            if (attributes.hasOwnProperty(property)) {
                newAttributes[property] = cloneGeometryInstanceAttribute(attributes[property]);
            }
        }

        return new GeometryInstance({
            geometry : cloneGeometry(instance.geometry),
            modelMatrix : Matrix4.clone(instance.modelMatrix),
            id : instance.id, // Shallow copy
            attributes : newAttributes
        });
    }

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
        var toWorld = !primitive._allow3DOnly;
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

    function getCommonPerInstanceAttributeNames(instances) {
        var length = instances.length;

        var attributesInAllInstances = [];
        var attributes0 = instances[0].attributes;
        var name;

        for (name in attributes0) {
            if (attributes0.hasOwnProperty(name)) {
                var attribute = attributes0[name];
                var inAllInstances = true;

                // Does this same attribute exist in all instances?
                for (var i = 1; i < length; ++i) {
                    var otherAttribute = instances[i].attributes[name];

                    if ((typeof otherAttribute === 'undefined') ||
                        (attribute.componentDatatype !== otherAttribute.componentDatatype) ||
                        (attribute.componentsPerAttribute !== otherAttribute.componentsPerAttribute) ||
                        (attribute.normalize !== otherAttribute.normalize)) {

                        inAllInstances = false;
                        break;
                    }
                }

                if (inAllInstances) {
                    attributesInAllInstances.push(name);
                }
            }
        }

        return attributesInAllInstances;
    }

    function addPerInstanceAttributes(primitive, instances, names) {
        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var instanceAttributes = instance.attributes;
            var geometry = instance.geometry;
            var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

            var namesLength = names.length;
            for (var j = 0; j < namesLength; ++j) {
                var name = names[j];
                var attribute = instanceAttributes[name];
                var componentDatatype = attribute.componentDatatype;
                var value = attribute.value;
                var componentsPerAttribute = value.length;

                var buffer = componentDatatype.createTypedArray(numberOfVertices * componentsPerAttribute);
                for (var k = 0; k < numberOfVertices; ++k) {
                    buffer.set(value, k * componentsPerAttribute);
                }

                geometry.attributes[name] = new GeometryAttribute({
                    componentDatatype : componentDatatype,
                    componentsPerAttribute : componentsPerAttribute,
                    normalize : attribute.normalize,
                    values : buffer
                });
            }
        }
    }

    // PERFORMANCE_IDEA:  Move pipeline to a web-worker.
    function geometryPipeline(primitive, instances, context, projection) {
        var length = instances.length;
        var primitiveType = instances[0].geometry.primitiveType;
        for (var i = 1; i < length; ++i) {
            if (instances[i].geometry.primitiveType !== primitiveType) {
                throw new DeveloperError('All instance geometries must have the same primitiveType.');
            }
        }

        // Unify to world coordinates before combining.
        transformToWorldCoordinates(primitive, instances);

        // Clip to IDL
        if (!primitive._allow3DOnly) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.wrapLongitude(instances[i].geometry);
            }
        }

        // Add pickColor attribute for picking individual instances
        addPickColorAttribute(primitive, instances, context);

        // add attributes to the geometry for each per-instance attribute
        var perInstanceAttributeNames = getCommonPerInstanceAttributeNames(instances);
        addPerInstanceAttributes(primitive, instances, perInstanceAttributeNames);

        // Optimize for vertex shader caches
        if (primitive._vertexCacheOptimize) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.reorderForPostVertexCache(instances[i].geometry);
                GeometryPipeline.reorderForPreVertexCache(instances[i].geometry);
            }
        }

        // Combine into single geometry for better rendering performance.
        var geometry = GeometryPipeline.combine(instances);

        // Split positions for GPU RTE
        if (!primitive._allow3DOnly) {
            // Compute 2D positions
            GeometryPipeline.projectTo2D(geometry, projection);

            GeometryPipeline.encodeAttribute(geometry, 'position3D', 'position3DHigh', 'position3DLow');
            GeometryPipeline.encodeAttribute(geometry, 'position2D', 'position2DHigh', 'position2DLow');
        } else {
            GeometryPipeline.encodeAttribute(geometry, 'position', 'position3DHigh', 'position3DLow');
        }

        if (!context.getElementIndexUint()) {
            // Break into multiple geometries to fit within unsigned short indices if needed
            return GeometryPipeline.fitToUnsignedShortIndices(geometry);
        }

        // Unsigned int indices are supported.  No need to break into multiple geometries.
        return [geometry];
    }

    function createPerInstanceVAAttributes(context, geometry, attributeIndices, names) {
        var vaAttributes = [];

        var bufferUsage = BufferUsage.DYNAMIC_DRAW;
        var attributes = geometry.attributes;

        var length = names.length;
        for (var i = 0; i < length; ++i) {
            var name = names[i];
            var attribute = attributes[name];

            var componentDatatype = attribute.componentDatatype;
            if (componentDatatype === ComponentDatatype.DOUBLE) {
                componentDatatype = ComponentDatatype.FLOAT;
            }

            var vertexBuffer = context.createVertexBuffer(componentDatatype.createTypedArray(attribute.values), bufferUsage);
            vaAttributes.push({
                index : attributeIndices[name],
                vertexBuffer : vertexBuffer,
                componentDatatype : componentDatatype,
                componentsPerAttribute : attribute.componentsPerAttribute,
                normalize : attribute.normalize
            });

            delete attributes[name];
        }

        return vaAttributes;
    }

    function computePerInstanceAttributeIndices(instances, vertexArrays, attributeIndices) {
        var ids = [];
        var indices = [];

        var names = getCommonPerInstanceAttributeNames(instances);
        var length = instances.length;
        var offsets = {};
        var vaIndices = {};

        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var numberOfVertices = Geometry.computeNumberOfVertices(instance.geometry);

            var namesLength = names.length;
            for (var j = 0; j < namesLength; ++j) {
                var name = names[j];
                var index = attributeIndices[name];

                var tempVertexCount = numberOfVertices;
                while (tempVertexCount > 0) {
                    var vaIndex = defaultValue(vaIndices[name], 0);
                    var va = vertexArrays[vaIndex];
                    var vaLength = va.getNumberOfAttributes();

                    var attribute;
                    for (var k = 0; k < vaLength; ++k) {
                        attribute = va.getAttribute(k);
                        if (attribute.index === index) {
                            break;
                        }
                    }

                    if (typeof ids[i] === 'undefined') {
                        ids[i] = instance.id;
                    }

                    if (typeof indices[i] === 'undefined') {
                        indices[i] = {};
                    }

                    if (typeof indices[i][name] === 'undefined') {
                        indices[i][name] = {
                            dirty : false,
                            value : instance.attributes[name].value,
                            indices : []
                        };
                    }

                    var size = attribute.vertexBuffer.getSizeInBytes() / attribute.componentDatatype.sizeInBytes;
                    size /= attribute.componentsPerAttribute;
                    var offset = defaultValue(offsets[name], 0);

                    var count;
                    if (offset + tempVertexCount < size) {
                        count = tempVertexCount;
                        indices[i][name].indices.push({
                            attribute : attribute,
                            offset : offset,
                            count : count
                        });
                        offsets[name] = offset + tempVertexCount;
                    } else {
                        count = size - offset;
                        indices[i][name].indices.push({
                            attribute : attribute,
                            offset : offset,
                            count : count
                        });
                        offsets[name] = 0;
                        vaIndices[name] = vaIndex + 1;
                    }

                    tempVertexCount -= count;
                }
            }
        }

        return {
            ids : ids,
            indices : indices
        };
    }

    function createColumbusViewShader(primitive, vertexShaderSource) {
        var attributes;
        if (!primitive._allow3DOnly) {
            attributes =
                'attribute vec3 position2DHigh;\n' +
                'attribute vec3 position2DLow;\n';
        } else {
            attributes = '';
        }

        var computePosition =
            '\nvec4 czm_computePosition()\n' +
            '{\n';
        if (!primitive._allow3DOnly) {
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

        return attributes + vertexShaderSource + computePosition;
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

    function appendShow(primitive, vertexShaderSource) {
        if (typeof primitive._attributeIndices.show === 'undefined') {
            return vertexShaderSource;
        }

        var renamedVS = vertexShaderSource.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_non_show_main()');
        var showMain =
            'attribute float show;\n' +
            'void main() \n' +
            '{ \n' +
            '    czm_non_show_main(); \n' +
            '    gl_Position *= show; \n' +
            '}';

        return renamedVS + '\n' + showMain;
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
            (frameState.mode !== SceneMode.SCENE3D && this._allow3DOnly) ||
            (!frameState.passes.color && !frameState.passes.pick)) {
            return;
        }

        var colorCommands = this._commandLists.colorList;
        var pickCommands = this._commandLists.pickList;
        var colorCommand;
        var pickCommand;
        var length;
        var i;

        if (this._va.length === 0) {
            var projection = frameState.scene2D.projection;

            var instances = (Array.isArray(this.geometryInstances)) ? this.geometryInstances : [this.geometryInstances];
            // Copy instances first since most pipeline operations modify the geometry and instance in-place.
            length = instances.length;
            var insts = new Array(length);
            for (i = 0; i < length; ++i) {
                insts[i] = cloneInstance(instances[i]);
            }
            var geometries = geometryPipeline(this, insts, context, projection);

            this._attributeIndices = GeometryPipeline.createAttributeIndices(geometries[0]);

            this._boundingSphere = geometries[0].boundingSphere;
            if (!this._allow3DOnly && typeof this._boundingSphere !== 'undefined') {
                this._boundingSphere2D = BoundingSphere.projectTo2D(this._boundingSphere, projection);
            }

            var geometry;
            var perInstanceAttributeNames = getCommonPerInstanceAttributeNames(insts);

            var va = [];
            length = geometries.length;
            for (i = 0; i < length; ++i) {
                geometry = geometries[i];
                var vaAttributes = createPerInstanceVAAttributes(context, geometry, this._attributeIndices, perInstanceAttributeNames);
                va.push(context.createVertexArrayFromGeometry({
                    geometry : geometry,
                    attributeIndices : this._attributeIndices,
                    bufferUsage : BufferUsage.STATIC_DRAW,
                    vertexLayout : VertexLayout.INTERLEAVED,
                    vertexArrayAttributes : vaAttributes
                }));
            }

            this._va = va;
            this._perInstanceAttributes = computePerInstanceAttributeIndices(insts, va, this._attributeIndices);

            for (i = 0; i < length; ++i) {
                geometry = geometries[i];

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

            if (this._releaseGeometryInstances) {
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
            vs = appendShow(this, vs);
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

        // Update per-instance attributes
        if (this._perInstanceAttributes._dirty) {
            var perInstanceIndices = this._perInstanceAttributes.indices;
            length = perInstanceIndices.length;
            for (i = 0; i < length; ++i) {
                var perInstanceAttributes = perInstanceIndices[i];
                for (var name in perInstanceAttributes) {
                    if (perInstanceAttributes.hasOwnProperty(name)) {
                        var attribute = perInstanceAttributes[name];
                        if (attribute.dirty) {
                            var value = attribute.value;
                            var indices = attribute.indices;
                            var indicesLength = indices.length;
                            for (var j = 0; j < indicesLength; ++j) {
                                var index = indices[j];
                                var offset = index.offset;
                                var count = index.count;

                                var vaAttribute = index.attribute;
                                var componentDatatype = vaAttribute.componentDatatype;
                                var componentsPerAttribute = vaAttribute.componentsPerAttribute;

                                var typedArray = componentDatatype.createTypedArray(count * componentsPerAttribute);
                                for (var k = 0; k < count; ++k) {
                                    typedArray.set(value, k * componentsPerAttribute);
                                }

                                var offsetInBytes = offset * componentsPerAttribute * componentDatatype.sizeInBytes;
                                vaAttribute.vertexBuffer.copyFromArrayView(typedArray, offsetInBytes);
                            }

                            attribute.dirty = false;
                        }
                    }
                }
            }

            this._perInstanceAttributes._dirty = false;
        }

        var boundingSphere;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingSphere = this._boundingSphere;
        } else if (frameState.mode === SceneMode.COLUMBUS_VIEW) {
            boundingSphere = this._boundingSphere2D;
        } else if (frameState.mode === SceneMode.SCENE2D && typeof this._boundingSphere2D !== 'undefined') {
            boundingSphere = BoundingSphere.clone(this._boundingSphere2D);
            boundingSphere.center.x = 0.0;
        } else if (typeof this._boundingSphere !== 'undefined' && typeof this._boundingSphere2D !== 'undefined') {
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

    function createGetFunction(name, perInstanceAttributes) {
        return function() {
            return perInstanceAttributes[name].value;
        };
    }

    function createSetFunction(name, perInstanceAttributes, container) {
        return function (value) {
            if (typeof value === 'undefined' || typeof value.length === 'undefined' || value.length < 1 || value.length > 4) {
                throw new DeveloperError('value must be and array with length between 1 and 4.');
            }

            perInstanceAttributes[name].value = value;
            perInstanceAttributes[name].dirty = true;
            container._dirty = true;
        };
    }

    /**
     * Returns the modifiable per-instance attributes for a {@link GeometryInstance}.
     *
     * @param {Object} id The id of the {@link GeometryInstance}.
     *
     * @returns {Object} The typed array in the attribute's format or undefined if the is no instance with id.
     *
     * @exception {DeveloperError} id is required.
     * @exception {DeveloperError} must call update before calling getGeometryInstanceAttributes.
     *
     * @example
     * var attributes = primitive.getGeometryInstanceAttributes('an id');
     * attributes.color = ColorGeometryInstanceAttribute.toValue(Color.AQUA);
     * attributes.show = ShowGeometryInstanceAttribute.toValue(true);
     */
    Primitive.prototype.getGeometryInstanceAttributes = function(id) {
        if (typeof id === 'undefined') {
            throw new DeveloperError('id is required');
        }

        if (typeof this._perInstanceAttributes === 'undefined') {
            throw new DeveloperError('must call update before calling getGeometryInstanceAttributes');
        }

        var index = -1;
        var lastIndex = this._lastPerInstanceAttributeIndex;
        var ids = this._perInstanceAttributes.ids;
        var length = ids.length;
        for (var i = 0; i < length; ++i) {
            var curIndex = (lastIndex + i) % length;
            if (id === ids[curIndex]) {
                index = curIndex;
                break;
            }
        }

        if (index === -1) {
            return undefined;
        }

        var perInstanceAttributes = this._perInstanceAttributes.indices[index];
        var attributes = {};

        for (var name in perInstanceAttributes) {
            if (perInstanceAttributes.hasOwnProperty(name)) {
                Object.defineProperty(attributes, name, {
                    get : createGetFunction(name, perInstanceAttributes, this._perInstanceAttributes),
                    set : createSetFunction(name, perInstanceAttributes, this._perInstanceAttributes)
                });
            }
        }

        this._lastPerInstanceAttributeIndex = index;

        return attributes;
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
