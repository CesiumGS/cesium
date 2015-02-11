/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/clone',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/FeatureDetection',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/GeometryAttributes',
        '../Core/GeometryInstance',
        '../Core/GeometryInstanceAttribute',
        '../Core/isArray',
        '../Core/Matrix4',
        '../Core/subdivideArray',
        '../Core/TaskProcessor',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/ShaderSource',
        '../ThirdParty/when',
        './CullFace',
        './Pass',
        './PrimitivePipeline',
        './PrimitiveState',
        './SceneMode'
    ], function(
        BoundingSphere,
        clone,
        combine,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        GeometryInstanceAttribute,
        isArray,
        Matrix4,
        subdivideArray,
        TaskProcessor,
        BufferUsage,
        DrawCommand,
        ShaderSource,
        when,
        CullFace,
        Pass,
        PrimitivePipeline,
        PrimitiveState,
        SceneMode) {
    "use strict";

    /**
     * A primitive represents geometry in the {@link Scene}.  The geometry can be from a single {@link GeometryInstance}
     * as shown in example 1 below, or from an array of instances, even if the geometry is from different
     * geometry types, e.g., an {@link RectangleGeometry} and an {@link EllipsoidGeometry} as shown in Code Example 2.
     * <p>
     * A primitive combines geometry instances with an {@link Appearance} that describes the full shading, including
     * {@link Material} and {@link RenderState}.  Roughly, the geometry instance defines the structure and placement,
     * and the appearance defines the visual characteristics.  Decoupling geometry and appearance allows us to mix
     * and match most of them and add a new geometry or appearance independently of each other.
     * </p>
     * <p>
     * Combining multiple instances into one primitive is called batching, and significantly improves performance for static data.
     * Instances can be individually picked; {@link Scene#pick} returns their {@link GeometryInstance#id}.  Using
     * per-instance appearances like {@link PerInstanceColorAppearance}, each instance can also have a unique color.
     * </p>
     * <p>
     * {@link Geometry} can either be created and batched on a web worker or the main thread. The first two examples
     * show geometry that will be created on a web worker by using the descriptions of the geometry. The third example
     * shows how to create the geometry on the main thread by explicitly calling the <code>createGeometry</code> method.
     * </p>
     *
     * @alias Primitive
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Array|GeometryInstance} [options.geometryInstances] The geometry instances - or a single geometry instance - to render.
     * @param {Appearance} [options.appearance] The appearance used to render the primitive.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the primitive (all geometry instances) from model to world coordinates.
     * @param {Boolean} [options.vertexCacheOptimize=false] When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
     * @param {Boolean} [options.interleave=false] When <code>true</code>, geometry vertex attributes are interleaved, which can slightly improve rendering performance but increases load time.
     * @param {Boolean} [options.compressVertices=true] When <code>true</code>, the geometry vertices are compressed, which will save memory.
     * @param {Boolean} [options.releaseGeometryInstances=true] When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
     * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
     * @param {Boolean} [options.cull=true] When <code>true</code>, the renderer frustum culls and horizon culls the primitive's commands based on their bounding volume.  Set this to <code>false</code> for a small performance gain if you are manually culling the primitive.
     * @param {Boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
     *
     * @see GeometryInstance
     * @see Appearance
     *
     * @example
     * // 1. Draw a translucent ellipse on the surface with a checkerboard pattern
     * var instance = new Cesium.GeometryInstance({
     *   geometry : new Cesium.EllipseGeometry({
     *       center : Cesium.Cartesian3.fromDegrees(-100.0, 20.0),
     *       semiMinorAxis : 500000.0,
     *       semiMajorAxis : 1000000.0,
     *       rotation : Cesium.Math.PI_OVER_FOUR,
     *       vertexFormat : Cesium.VertexFormat.POSITION_AND_ST
     *   }),
     *   id : 'object returned when this instance is picked and to get/set per-instance attributes'
     * });
     * scene.primitives.add(new Cesium.Primitive({
     *   geometryInstances : instance,
     *   appearance : new Cesium.EllipsoidSurfaceAppearance({
     *     material : Cesium.Material.fromType('Checkerboard')
     *   })
     * }));
     *
     * @example
     * // 2. Draw different instances each with a unique color
     * var rectangleInstance = new Cesium.GeometryInstance({
     *   geometry : new Cesium.RectangleGeometry({
     *     rectangle : Cesium.Rectangle.fromDegrees(-140.0, 30.0, -100.0, 40.0),
     *     vertexFormat : Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
     *   }),
     *   id : 'rectangle',
     *   attributes : {
     *     color : new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5)
     *   }
     * });
     * var ellipsoidInstance = new Cesium.GeometryInstance({
     *   geometry : new Cesium.EllipsoidGeometry({
     *     radii : new Cesium.Cartesian3(500000.0, 500000.0, 1000000.0),
     *     vertexFormat : Cesium.VertexFormat.POSITION_AND_NORMAL
     *   }),
     *   modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
     *     Cesium.Cartesian3.fromDegrees(-95.59777, 40.03883)), new Cesium.Cartesian3(0.0, 0.0, 500000.0), new Cesium.Matrix4()),
     *   id : 'ellipsoid',
     *   attributes : {
     *     color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.AQUA)
     *   }
     * });
     * scene.primitives.add(new Cesium.Primitive({
     *   geometryInstances : [rectangleInstance, ellipsoidInstance],
     *   appearance : new Cesium.PerInstanceColorAppearance()
     * }));
     *
     * @example
     * // 3. Create the geometry on the main thread.
     * scene.primitives.add(new Cesium.Primitive({
     *   geometryInstances : new Cesium.GeometryInstance({
     *       geometry : Cesium.EllipsoidGeometry.createGeometry(new Cesium.EllipsoidGeometry({
     *         radii : new Cesium.Cartesian3(500000.0, 500000.0, 1000000.0),
     *         vertexFormat : Cesium.VertexFormat.POSITION_AND_NORMAL
     *       })),
     *       modelMatrix : Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
     *         Cesium.Cartesian3.fromDegrees(-95.59777, 40.03883)), new Cesium.Cartesian3(0.0, 0.0, 500000.0), new Cesium.Matrix4()),
     *       id : 'ellipsoid',
     *       attributes : {
     *         color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.AQUA)
     *       }
     *   }),
     *   appearance : new Cesium.PerInstanceColorAppearance()
     * }));
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
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * <p>
         * If the model matrix is changed after creation, it only affects primitives with one instance and only in 3D mode.
         * </p>
         *
         * @type Matrix4
         *
         * @default Matrix4.IDENTITY
         *
         * @example
         * var origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
         * p.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this._modelMatrix = new Matrix4();

        /**
         * Determines if the primitive will be shown.  This affects all geometry
         * instances in the primitive.
         *
         * @type Boolean
         *
         * @default true
         */
        this.show = defaultValue(options.show, true);

        this._vertexCacheOptimize = defaultValue(options.vertexCacheOptimize, false);
        this._interleave = defaultValue(options.interleave, false);
        this._releaseGeometryInstances = defaultValue(options.releaseGeometryInstances, true);
        this._allowPicking = defaultValue(options.allowPicking, true);
        this._asynchronous = defaultValue(options.asynchronous, true);
        this._compressVertices = defaultValue(options.compressVertices, true);

        /**
         * When <code>true</code>, the renderer frustum culls and horizon culls the primitive's commands
         * based on their bounding volume.  Set this to <code>false</code> for a small performance gain
         * if you are manually culling the primitive.
         *
         * @type {Boolean}
         *
         * @default true
         */
        this.cull = defaultValue(options.cull, true);

        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * Draws the bounding sphere for each draw command in the primitive.
         * </p>
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        this._translucent = undefined;

        this._state = PrimitiveState.READY;
        this._geometries = [];
        this._vaAttributes = undefined;
        this._error = undefined;
        this._numberOfInstances = 0;
        this._validModelMatrix = false;

        this._boundingSpheres = [];
        this._boundingSphereWC = [];
        this._boundingSphereCV = [];
        this._boundingSphere2D = [];
        this._boundingSphereMorph = [];
        this._perInstanceAttributeLocations = undefined;
        this._perInstanceAttributeCache = [];
        this._instanceIds = [];
        this._lastPerInstanceAttributeIndex = 0;
        this._dirtyAttributes = [];

        this._va = [];
        this._attributeLocations = undefined;
        this._primitiveType = undefined;

        this._frontFaceRS = undefined;
        this._backFaceRS = undefined;
        this._sp = undefined;

        this._pickRS = undefined;
        this._pickSP = undefined;
        this._pickIds = [];

        this._colorCommands = [];
        this._pickCommands = [];

        this._createGeometryResults = undefined;
        this._ready = false;
        this._readyPromise = when.defer();
    };

    defineProperties(Primitive.prototype, {
        /**
         * When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
         *
         * @memberof Primitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        vertexCacheOptimize : {
            get : function() {
                return this._vertexCacheOptimize;
            }
        },

        /**
         * Determines if geometry vertex attributes are interleaved, which can slightly improve rendering performance.
         *
         * @memberof Primitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        interleave : {
            get : function() {
                return this._interleave;
            }
        },

        /**
         * When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
         *
         * @memberof Primitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        releaseGeometryInstances : {
            get : function() {
                return this._releaseGeometryInstances;
            }
        },

        /**
         * When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.         *
         *
         * @memberof Primitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        allowPicking : {
            get : function() {
                return this._allowPicking;
            }
        },

        /**
         * Determines if the geometry instances will be created and batched on a web worker.
         *
         * @memberof Primitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        asynchronous : {
            get : function() {
                return this._asynchronous;
            }
        },

        /**
         * When <code>true</code>, geometry vertices are compressed, which will save memory.
         *
         * @memberof Primitive.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        compressVertices : {
            get : function() {
                return this._compressVertices;
            }
        },

        /**
         * Determines if the primitive is complete and ready to render.  If this property is
         * true, the primitive will be rendered the next time that {@link Primitive#update}
         * is called.
         *
         * @memberof Primitive.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets a promise that resolves when the primitive is ready to render.
         * @memberof Primitive.prototype
         * @type {Promise}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        }
    });

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
            if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                newAttributes[property] = cloneAttribute(attributes[property]);
            }
        }

        var indices;
        if (defined(geometry.indices)) {
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

    function cloneInstance(instance, geometry) {
        var attributes = instance.attributes;
        var newAttributes = {};
        for (var property in attributes) {
            if (attributes.hasOwnProperty(property)) {
                newAttributes[property] = cloneGeometryInstanceAttribute(attributes[property]);
            }
        }

        return new GeometryInstance({
            geometry : geometry,
            modelMatrix : Matrix4.clone(instance.modelMatrix),
            attributes : newAttributes,
            pickPrimitive : instance.pickPrimitive,
            id : instance.id
        });
    }

    var positionRegex = /attribute\s+vec(?:3|4)\s+(.*)3DHigh;/g;

    function createColumbusViewShader(primitive, vertexShaderSource, scene3DOnly) {
        var match;

        var forwardDecl = '';
        var attributes = '';
        var computeFunctions = '';

        while ((match = positionRegex.exec(vertexShaderSource)) !== null) {
            var name = match[1];

            var functionName = 'vec4 czm_compute' + name[0].toUpperCase() + name.substr(1) + '()';

            // Don't forward-declare czm_computePosition because computePosition.glsl already does.
            if (functionName !== 'vec4 czm_computePosition()') {
                forwardDecl += functionName + ';\n';
            }

            if (!scene3DOnly) {
                attributes +=
                    'attribute vec3 ' + name + '2DHigh;\n' +
                    'attribute vec3 ' + name + '2DLow;\n';

                computeFunctions +=
                    functionName + '\n' +
                    '{\n' +
                    '    vec4 p;\n' +
                    '    if (czm_morphTime == 1.0)\n' +
                    '    {\n' +
                    '        p = czm_translateRelativeToEye(' + name + '3DHigh, ' + name + '3DLow);\n' +
                    '    }\n' +
                    '    else if (czm_morphTime == 0.0)\n' +
                    '    {\n' +
                    '        p = czm_translateRelativeToEye(' + name + '2DHigh.zxy, ' + name + '2DLow.zxy);\n' +
                    '    }\n' +
                    '    else\n' +
                    '    {\n' +
                    '        p = czm_columbusViewMorph(\n' +
                    '                czm_translateRelativeToEye(' + name + '2DHigh.zxy, ' + name + '2DLow.zxy),\n' +
                    '                czm_translateRelativeToEye(' + name + '3DHigh, ' + name + '3DLow),\n' +
                    '                czm_morphTime);\n' +
                    '    }\n' +
                    '    return p;\n' +
                    '}\n\n';
            } else {
                computeFunctions +=
                    functionName + '\n' +
                    '{\n' +
                    '    return czm_translateRelativeToEye(' + name + '3DHigh, ' + name + '3DLow);\n' +
                    '}\n\n';
            }
        }

        return [forwardDecl, attributes, vertexShaderSource, computeFunctions].join('\n');
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
        if (!defined(primitive._attributeLocations.show)) {
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

    function modifyForEncodedNormals(primitive, vertexShaderSource) {
        if (!primitive.compressVertices) {
            return vertexShaderSource;
        }

        var containsNormal = vertexShaderSource.search(/attribute\s+vec3\s+normal;/g) !== -1;
        var containsSt = vertexShaderSource.search(/attribute\s+vec2\s+st;/g) !== -1;
        if (!containsNormal && !containsSt) {
            return vertexShaderSource;
        }

        var containsTangent = vertexShaderSource.search(/attribute\s+vec3\s+tangent;/g) !== -1;
        var containsBinormal = vertexShaderSource.search(/attribute\s+vec3\s+binormal;/g) !== -1;

        var numComponents = containsSt && containsNormal ? 2.0 : 1.0;
        numComponents += containsTangent || containsBinormal ? 1 : 0;

        var type = (numComponents > 1) ? 'vec' + numComponents : 'float';

        var attributeName = 'compressedAttributes';
        var attributeDecl = 'attribute ' + type + ' ' + attributeName + ';';

        var globalDecl = '';
        var decode = '';

        if (containsSt) {
            globalDecl += 'vec2 st;\n';
            var stComponent = numComponents > 1 ? attributeName + '.x' : attributeName;
            decode += '    st = czm_decompressTextureCoordinates(' + stComponent + ');\n';
        }

        if (containsNormal && containsTangent && containsBinormal) {
            globalDecl +=
                'vec3 normal;\n' +
                'vec3 tangent;\n' +
                'vec3 binormal;\n';
            decode += '    czm_octDecode(' + attributeName + '.' + (containsSt ? 'yz' : 'xy') + ', normal, tangent, binormal);\n';
        } else {
            if (containsNormal) {
                globalDecl += 'vec3 normal;\n';
                decode += '    normal = czm_octDecode(' + attributeName + (numComponents > 1 ? '.' + (containsSt ? 'y' : 'x') : '') + ');\n';
            }

            if (containsTangent) {
                globalDecl += 'vec3 tangent;\n';
                decode += '    tangent = czm_octDecode(' + attributeName + '.' + (containsSt && containsNormal ? 'z' : 'y') + ');\n';
            }

            if (containsBinormal) {
                globalDecl += 'vec3 binormal;\n';
                decode += '    binormal = czm_octDecode(' + attributeName + '.' + (containsSt && containsNormal ? 'z' : 'y') + ');\n';
            }
        }

        var modifiedVS = vertexShaderSource;
        modifiedVS = modifiedVS.replace(/attribute\s+vec3\s+normal;/g, '');
        modifiedVS = modifiedVS.replace(/attribute\s+vec2\s+st;/g, '');
        modifiedVS = modifiedVS.replace(/attribute\s+vec3\s+tangent;/g, '');
        modifiedVS = modifiedVS.replace(/attribute\s+vec3\s+binormal;/g, '');
        modifiedVS = modifiedVS.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_non_compressed_main()');
        var compressedMain =
            'void main() \n' +
            '{ \n' +
            decode +
            '    czm_non_compressed_main(); \n' +
            '}';

        return [attributeDecl, globalDecl, modifiedVS, compressedMain].join('\n');
    }

    function validateShaderMatching(shaderProgram, attributeLocations) {
        // For a VAO and shader program to be compatible, the VAO must have
        // all active attribute in the shader program.  The VAO may have
        // extra attributes with the only concern being a potential
        // performance hit due to extra memory bandwidth and cache pollution.
        // The shader source could have extra attributes that are not used,
        // but there is no guarantee they will be optimized out.
        //
        // Here, we validate that the VAO has all attributes required
        // to match the shader program.
        var shaderAttributes = shaderProgram.vertexAttributes;

        //>>includeStart('debug', pragmas.debug);
        for (var name in shaderAttributes) {
            if (shaderAttributes.hasOwnProperty(name)) {
                if (!defined(attributeLocations[name])) {
                    throw new DeveloperError('Appearance/Geometry mismatch.  The appearance requires vertex shader attribute input \'' + name +
                        '\', which was not computed as part of the Geometry.  Use the appearance\'s vertexFormat property when constructing the geometry.');
                }
            }
        }
        //>>includeEnd('debug');
    }

    function createPickIds(context, primitive, instances) {
        var pickColors = [];
        var length = instances.length;

        for (var i = 0; i < length; ++i) {
            var pickObject = {
                primitive : defaultValue(instances[i].pickPrimitive, primitive)
            };

            if (defined(instances[i].id)) {
                pickObject.id = instances[i].id;
            }

            var pickId = context.createPickId(pickObject);
            primitive._pickIds.push(pickId);
            pickColors.push(pickId.color);
        }

        return pickColors;
    }

    function getUniformFunction(uniforms, name) {
        return function() {
            return uniforms[name];
        };
    }

    var numberOfCreationWorkers = Math.max(FeatureDetection.hardwareConcurrency - 1, 1);
    var createGeometryTaskProcessors;
    var combineGeometryTaskProcessor = new TaskProcessor('combineGeometry', Number.POSITIVE_INFINITY);

    /**
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * get the draw commands needed to render this primitive.
     * <p>
     * Do not call this function directly.  This is documented just to
     * list the exceptions that may be propagated when the scene is rendered:
     * </p>
     *
     * @exception {DeveloperError} All instance geometries must have the same primitiveType.
     * @exception {DeveloperError} Appearance and material have a uniform with the same name.
     */
    Primitive.prototype.update = function(context, frameState, commandList) {
        if (((!defined(this.geometryInstances)) && (this._va.length === 0)) ||
            (defined(this.geometryInstances) && isArray(this.geometryInstances) && this.geometryInstances.length === 0) ||
            (!defined(this.appearance)) ||
            (frameState.mode !== SceneMode.SCENE3D && frameState.scene3DOnly) ||
            (!frameState.passes.render && !frameState.passes.pick)) {
            return;
        }

        if (defined(this._error)) {
            throw this._error;
        }

        if (this._state === PrimitiveState.FAILED) {
            return;
        }

        var projection = frameState.mapProjection;
        var colorCommand;
        var pickCommand;
        var geometry;
        var attributes;
        var attribute;
        var length;
        var i;
        var j;
        var index;
        var promise;
        var instance;
        var instances;
        var clonedInstances;
        var geometries;
        var allowPicking = this.allowPicking;
        var instanceIds = this._instanceIds;
        var scene3DOnly = frameState.scene3DOnly;
        var that = this;

        if (this._state !== PrimitiveState.COMPLETE && this._state !== PrimitiveState.COMBINED) {
            if (this.asynchronous) {
                if (this._state === PrimitiveState.READY) {
                    instances = (isArray(this.geometryInstances)) ? this.geometryInstances : [this.geometryInstances];
                    this._numberOfInstances = length = instances.length;

                    var promises = [];
                    var subTasks = [];
                    for (i = 0; i < length; ++i) {
                        geometry = instances[i].geometry;
                        instanceIds.push(instances[i].id);

                        //>>includeStart('debug', pragmas.debug);
                        if (!defined(geometry._workerName)) {
                            throw new DeveloperError('_workerName must be defined for asynchronous geometry.');
                        }
                        //>>includeEnd('debug');

                        subTasks.push({
                            moduleName : geometry._workerName,
                            geometry : geometry
                        });
                    }

                    if (!defined(createGeometryTaskProcessors)) {
                        createGeometryTaskProcessors = new Array(numberOfCreationWorkers);
                        for (i = 0; i < numberOfCreationWorkers; i++) {
                            createGeometryTaskProcessors[i] = new TaskProcessor('createGeometry', Number.POSITIVE_INFINITY);
                        }
                    }

                    var subTask;
                    subTasks = subdivideArray(subTasks, numberOfCreationWorkers);

                    for (i = 0; i < subTasks.length; i++) {
                        var packedLength = 0;
                        var workerSubTasks = subTasks[i];
                        var workerSubTasksLength = workerSubTasks.length;
                        for (j = 0; j < workerSubTasksLength; ++j) {
                            subTask = workerSubTasks[j];
                            geometry = subTask.geometry;
                            if (defined(geometry.constructor.pack)) {
                                subTask.offset = packedLength;
                                packedLength += defaultValue(geometry.constructor.packedLength, geometry.packedLength);
                            }
                        }

                        var subTaskTransferableObjects;

                        if (packedLength > 0) {
                            var array = new Float64Array(packedLength);
                            subTaskTransferableObjects = [array.buffer];

                            for (j = 0; j < workerSubTasksLength; ++j) {
                                subTask = workerSubTasks[j];
                                geometry = subTask.geometry;
                                if (defined(geometry.constructor.pack)) {
                                    geometry.constructor.pack(geometry, array, subTask.offset);
                                    subTask.geometry = array;
                                }
                            }
                        }

                        promises.push(createGeometryTaskProcessors[i].scheduleTask({
                            subTasks : subTasks[i]
                        }, subTaskTransferableObjects));
                    }

                    this._state = PrimitiveState.CREATING;

                    when.all(promises, function(results) {
                        that._createGeometryResults = results;
                        that._state = PrimitiveState.CREATED;
                    }).otherwise(function(error) {
                        setReady(that, frameState, PrimitiveState.FAILED, error);
                    });
                } else if (this._state === PrimitiveState.CREATED) {
                    var transferableObjects = [];
                    instances = (isArray(this.geometryInstances)) ? this.geometryInstances : [this.geometryInstances];

                    promise = combineGeometryTaskProcessor.scheduleTask(PrimitivePipeline.packCombineGeometryParameters({
                        createGeometryResults : this._createGeometryResults,
                        instances : instances,
                        pickIds : allowPicking ? createPickIds(context, this, instances) : undefined,
                        ellipsoid : projection.ellipsoid,
                        projection : projection,
                        elementIndexUintSupported : context.elementIndexUint,
                        scene3DOnly : scene3DOnly,
                        allowPicking : allowPicking,
                        vertexCacheOptimize : this.vertexCacheOptimize,
                        compressVertices : this.compressVertices,
                        modelMatrix : this.modelMatrix
                    }, transferableObjects), transferableObjects);

                    this._createGeometryResults = undefined;
                    this._state = PrimitiveState.COMBINING;

                    when(promise, function(packedResult) {
                        var result = PrimitivePipeline.unpackCombineGeometryResults(packedResult);
                        that._geometries = result.geometries;
                        that._attributeLocations = result.attributeLocations;
                        that._vaAttributes = result.vaAttributes;
                        that._perInstanceAttributeLocations = result.perInstanceAttributeLocations;
                        that.modelMatrix = Matrix4.clone(result.modelMatrix, that.modelMatrix);
                        that._validModelMatrix = !Matrix4.equals(that.modelMatrix, Matrix4.IDENTITY);

                        var validInstancesIndices = packedResult.validInstancesIndices;
                        var invalidInstancesIndices = packedResult.invalidInstancesIndices;
                        var instanceIds = that._instanceIds;
                        var reorderedInstanceIds = new Array(instanceIds.length);

                        var validLength = validInstancesIndices.length;
                        for (var i = 0; i < validLength; ++i) {
                            reorderedInstanceIds[i] = instanceIds[validInstancesIndices[i]];
                        }

                        var invalidLength = invalidInstancesIndices.length;
                        for (var j = 0; j < invalidLength; ++j) {
                            reorderedInstanceIds[validLength + j] = instanceIds[invalidInstancesIndices[j]];
                        }

                        that._instanceIds = reorderedInstanceIds;

                        that._state = defined(that._geometries) ? PrimitiveState.COMBINED : PrimitiveState.FAILED;
                    }).otherwise(function(error) {
                        setReady(that, frameState, PrimitiveState.FAILED, error);
                    });
                }
            } else {
                instances = (isArray(this.geometryInstances)) ? this.geometryInstances : [this.geometryInstances];
                this._numberOfInstances = length = instances.length;

                geometries = new Array(length);
                clonedInstances = new Array(length);

                var invalidInstances = [];

                var geometryIndex = 0;
                for (i = 0; i < length; i++) {
                    instance = instances[i];
                    geometry = instance.geometry;

                    var createdGeometry;
                    if (defined(geometry.attributes) && defined(geometry.primitiveType)) {
                        createdGeometry = cloneGeometry(geometry);
                    } else {
                        createdGeometry = geometry.constructor.createGeometry(geometry);
                    }

                    if (defined(createdGeometry)) {
                        geometries[geometryIndex] = createdGeometry;
                        clonedInstances[geometryIndex++] = cloneInstance(instance, createdGeometry);
                        instanceIds.push(instance.id);
                    } else {
                        invalidInstances.push(instance);
                    }
                }

                geometries.length = geometryIndex;
                clonedInstances.length = geometryIndex;

                var result = PrimitivePipeline.combineGeometry({
                    instances : clonedInstances,
                    invalidInstances : invalidInstances,
                    pickIds : allowPicking ? createPickIds(context, this, clonedInstances) : undefined,
                    ellipsoid : projection.ellipsoid,
                    projection : projection,
                    elementIndexUintSupported : context.elementIndexUint,
                    scene3DOnly : scene3DOnly,
                    allowPicking : allowPicking,
                    vertexCacheOptimize : this.vertexCacheOptimize,
                    compressVertices : this.compressVertices,
                    modelMatrix : this.modelMatrix
                });

                this._geometries = result.geometries;
                this._attributeLocations = result.attributeLocations;
                this._vaAttributes = result.vaAttributes;
                this._perInstanceAttributeLocations = result.vaAttributeLocations;
                this.modelMatrix = Matrix4.clone(result.modelMatrix, this.modelMatrix);
                this._validModelMatrix = !Matrix4.equals(this.modelMatrix, Matrix4.IDENTITY);

                for (i = 0; i < invalidInstances.length; ++i) {
                    instance = invalidInstances[i];
                    instanceIds.push(instance.id);
                }

                if (defined(this._geometries)) {
                    this._state = PrimitiveState.COMBINED;
                } else {
                    setReady(this, frameState, PrimitiveState.FAILED, undefined);
                }
            }
        }

        var attributeLocations = this._attributeLocations;

        if (this._state === PrimitiveState.COMBINED) {
            geometries = this._geometries;
            var vaAttributes = this._vaAttributes;

            var va = [];
            length = geometries.length;
            for (i = 0; i < length; ++i) {
                geometry = geometries[i];

                attributes = vaAttributes[i];
                var vaLength = attributes.length;
                for (j = 0; j < vaLength; ++j) {
                    attribute = attributes[j];
                    attribute.vertexBuffer = context.createVertexBuffer(attribute.values, BufferUsage.DYNAMIC_DRAW);
                    delete attribute.values;
                }

                va.push(context.createVertexArrayFromGeometry({
                    geometry : geometry,
                    attributeLocations : attributeLocations,
                    bufferUsage : BufferUsage.STATIC_DRAW,
                    interleave : this._interleave,
                    vertexArrayAttributes : attributes
                }));

                this._boundingSpheres.push(BoundingSphere.clone(geometry.boundingSphere));
                this._boundingSphereWC.push(new BoundingSphere());

                if (!scene3DOnly) {
                    var center = geometry.boundingSphereCV.center;
                    var x = center.x;
                    var y = center.y;
                    var z = center.z;
                    center.x = z;
                    center.y = x;
                    center.z = y;

                    this._boundingSphereCV.push(BoundingSphere.clone(geometry.boundingSphereCV));
                    this._boundingSphere2D.push(new BoundingSphere());
                    this._boundingSphereMorph.push(new BoundingSphere());
                }
            }

            this._va = va;
            this._primitiveType = geometries[0].primitiveType;

            if (this.releaseGeometryInstances) {
                this.geometryInstances = undefined;
            }

            this._geometries = undefined;
            setReady(this, frameState, PrimitiveState.COMPLETE, undefined);
        }

        if (!this.show || this._state !== PrimitiveState.COMPLETE) {
            return;
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

        var translucent = this._appearance.isTranslucent();
        if (this._translucent !== translucent) {
            this._translucent = translucent;
            createRS = true;
        }

        if (defined(this._material)) {
            this._material.update(context);
        }

        var twoPasses = appearance.closed && translucent;

        if (createRS) {
            var renderState = appearance.getRenderState();
            var rs;

            if (twoPasses) {
                rs = clone(renderState, false);
                rs.cull = {
                    enabled : true,
                    face : CullFace.BACK
                };
                this._frontFaceRS = context.createRenderState(rs);

                rs.cull.face = CullFace.FRONT;
                this._backFaceRS = context.createRenderState(rs);
            } else {
                this._frontFaceRS = context.createRenderState(renderState);
                this._backFaceRS = this._frontFaceRS;
            }

            if (allowPicking) {
                if (twoPasses) {
                    rs = clone(renderState, false);
                    rs.cull = {
                        enabled : false
                    };
                    this._pickRS = context.createRenderState(rs);
                } else {
                    this._pickRS = this._frontFaceRS;
                }
            } else {
                rs = clone(renderState, false);
                rs.colorMask = {
                    red : false,
                    green : false,
                    blue : false,
                    alpha : false
                };

                if (twoPasses) {
                    rs.cull = {
                        enabled : false
                    };
                    this._pickRS = context.createRenderState(rs);
                } else {
                    this._pickRS = context.createRenderState(rs);
                }
            }
        }

        if (createSP) {
            var vs = createColumbusViewShader(this, appearance.vertexShaderSource, scene3DOnly);
            vs = appendShow(this, vs);
            vs = modifyForEncodedNormals(this, vs);
            var fs = appearance.getFragmentShaderSource();

            this._sp = context.replaceShaderProgram(this._sp, vs, fs, attributeLocations);
            validateShaderMatching(this._sp, attributeLocations);

            if (allowPicking) {
                var pickFS = new ShaderSource({
                    sources : [fs],
                    pickColorQualifier : 'varying'
                });
                this._pickSP = context.replaceShaderProgram(this._pickSP, createPickVertexShaderSource(vs), pickFS, attributeLocations);
            } else {
                this._pickSP = context.createShaderProgram(vs, fs, attributeLocations);
            }

            validateShaderMatching(this._pickSP, attributeLocations);
        }

        var colorCommands = this._colorCommands;
        var pickCommands = this._pickCommands;

        if (createRS || createSP) {
            // Create uniform map by combining uniforms from the appearance and material if either have uniforms.
            var materialUniformMap = defined(material) ? material._uniforms : undefined;
            var appearanceUniformMap = {};
            var appearanceUniforms = appearance.uniforms;
            if (defined(appearanceUniforms)) {
                // Convert to uniform map of functions for the renderer
                for (var name in appearanceUniforms) {
                    if (appearanceUniforms.hasOwnProperty(name)) {
                        if (defined(materialUniformMap) && defined(materialUniformMap[name])) {
                            // Later, we could rename uniforms behind-the-scenes if needed.
                            throw new DeveloperError('Appearance and material have a uniform with the same name: ' + name);
                        }

                        appearanceUniformMap[name] = getUniformFunction(appearanceUniforms, name);
                    }
                }
            }
            var uniforms = combine(appearanceUniformMap, materialUniformMap);

            var pass = translucent ? Pass.TRANSLUCENT : Pass.OPAQUE;

            colorCommands.length = this._va.length * (twoPasses ? 2 : 1);
            pickCommands.length = this._va.length;

            length = colorCommands.length;
            var m = 0;
            var vaIndex = 0;
            for (i = 0; i < length; ++i) {
                if (twoPasses) {
                    colorCommand = colorCommands[i];
                    if (!defined(colorCommand)) {
                        colorCommand = colorCommands[i] = new DrawCommand({
                            owner : this,
                            primitiveType : this._primitiveType
                        });
                    }
                    colorCommand.vertexArray = this._va[vaIndex];
                    colorCommand.renderState = this._backFaceRS;
                    colorCommand.shaderProgram = this._sp;
                    colorCommand.uniformMap = uniforms;
                    colorCommand.pass = pass;

                    ++i;
                }

                colorCommand = colorCommands[i];
                if (!defined(colorCommand)) {
                    colorCommand = colorCommands[i] = new DrawCommand({
                        owner : this,
                        primitiveType : this._primitiveType
                    });
                }
                colorCommand.vertexArray = this._va[vaIndex];
                colorCommand.renderState = this._frontFaceRS;
                colorCommand.shaderProgram = this._sp;
                colorCommand.uniformMap = uniforms;
                colorCommand.pass = pass;

                pickCommand = pickCommands[m];
                if (!defined(pickCommand)) {
                    pickCommand = pickCommands[m] = new DrawCommand({
                        owner : this,
                        primitiveType : this._primitiveType
                    });
                }
                pickCommand.vertexArray = this._va[vaIndex];
                pickCommand.renderState = this._pickRS;
                pickCommand.shaderProgram = this._pickSP;
                pickCommand.uniformMap = uniforms;
                pickCommand.pass = pass;
                ++m;

                ++vaIndex;
            }
        }

        // Update per-instance attributes
        if (this._dirtyAttributes.length > 0) {
            attributes = this._dirtyAttributes;
            length = attributes.length;
            for (i = 0; i < length; ++i) {
                attribute = attributes[i];
                var value = attribute.value;
                var indices = attribute.indices;
                var indicesLength = indices.length;
                for (j = 0; j < indicesLength; ++j) {
                    index = indices[j];
                    var offset = index.offset;
                    var count = index.count;

                    var vaAttribute = index.attribute;
                    var componentDatatype = vaAttribute.componentDatatype;
                    var componentsPerAttribute = vaAttribute.componentsPerAttribute;

                    var typedArray = ComponentDatatype.createTypedArray(componentDatatype, count * componentsPerAttribute);
                    for (var k = 0; k < count; ++k) {
                        typedArray.set(value, k * componentsPerAttribute);
                    }

                    var offsetInBytes = offset * componentsPerAttribute * ComponentDatatype.getSizeInBytes(componentDatatype);
                    vaAttribute.vertexBuffer.copyFromArrayView(typedArray, offsetInBytes);
                }
                attribute.dirty = false;
            }

            attributes.length = 0;
        }

        var modelMatrix;
        if ((this._numberOfInstances > 1 && !this._validModelMatrix) || frameState.mode !== SceneMode.SCENE3D) {
            modelMatrix = Matrix4.IDENTITY;
        } else {
            modelMatrix = this.modelMatrix;
        }

        if (!Matrix4.equals(modelMatrix, this._modelMatrix)) {
            Matrix4.clone(modelMatrix, this._modelMatrix);
            length = this._boundingSpheres.length;
            for (i = 0; i < length; ++i) {
                var boundingSphere = this._boundingSpheres[i];
                if (defined(boundingSphere)) {
                    this._boundingSphereWC[i] = BoundingSphere.transform(boundingSphere, modelMatrix, this._boundingSphereWC[i]);
                    if (!scene3DOnly) {
                        this._boundingSphere2D[i] = BoundingSphere.clone(this._boundingSphereCV[i], this._boundingSphere2D[i]);
                        this._boundingSphere2D[i].center.x = 0.0;
                        this._boundingSphereMorph[i] = BoundingSphere.union(this._boundingSphereWC[i], this._boundingSphereCV[i]);
                    }
                }
            }
        }

        var boundingSpheres;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingSpheres = this._boundingSphereWC;
        } else if (frameState.mode === SceneMode.COLUMBUS_VIEW) {
            boundingSpheres = this._boundingSphereCV;
        } else if (frameState.mode === SceneMode.SCENE2D && defined(this._boundingSphere2D)) {
            boundingSpheres = this._boundingSphere2D;
        } else if (defined(this._boundingSphereMorph)) {
            boundingSpheres = this._boundingSphereMorph;
        }

        var passes = frameState.passes;
        if (passes.render) {
            length = colorCommands.length;
            for (i = 0; i < length; ++i) {
                var sphereIndex = twoPasses ? Math.floor(i / 2) : i;
                colorCommands[i].modelMatrix = modelMatrix;
                colorCommands[i].boundingVolume = boundingSpheres[sphereIndex];
                colorCommands[i].cull = this.cull;
                colorCommands[i].debugShowBoundingVolume = this.debugShowBoundingVolume;

                commandList.push(colorCommands[i]);
            }
        }

        if (passes.pick) {
            length = pickCommands.length;
            for (i = 0; i < length; ++i) {
                pickCommands[i].modelMatrix = modelMatrix;
                pickCommands[i].boundingVolume = boundingSpheres[i];
                pickCommands[i].cull = this.cull;

                commandList.push(pickCommands[i]);
            }
        }
    };

    function createGetFunction(name, perInstanceAttributes) {
        var attribute = perInstanceAttributes[name];
        return function() {
            if (defined(attribute) && defined(attribute.value)) {
                return perInstanceAttributes[name].value;
            }
            return attribute;
        };
    }

    function createSetFunction(name, perInstanceAttributes, dirtyList) {
        return function (value) {
            //>>includeStart('debug', pragmas.debug);
            if (!defined(value) || !defined(value.length) || value.length < 1 || value.length > 4) {
                throw new DeveloperError('value must be and array with length between 1 and 4.');
            }
            //>>includeEnd('debug');

            var attribute = perInstanceAttributes[name];
            attribute.value = value;
            if (!attribute.dirty && attribute.valid) {
                dirtyList.push(attribute);
                attribute.dirty = true;
            }
        };
    }

    /**
     * Returns the modifiable per-instance attributes for a {@link GeometryInstance}.
     *
     * @param {Object} id The id of the {@link GeometryInstance}.
     * @returns {Object} The typed array in the attribute's format or undefined if the is no instance with id.
     *
     * @exception {DeveloperError} must call update before calling getGeometryInstanceAttributes.
     *
     * @example
     * var attributes = primitive.getGeometryInstanceAttributes('an id');
     * attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.AQUA);
     * attributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(true);
     */
    Primitive.prototype.getGeometryInstanceAttributes = function(id) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(id)) {
            throw new DeveloperError('id is required');
        }
        if (!defined(this._perInstanceAttributeLocations)) {
            throw new DeveloperError('must call update before calling getGeometryInstanceAttributes');
        }
        //>>includeEnd('debug');

        var index = -1;
        var lastIndex = this._lastPerInstanceAttributeIndex;
        var ids = this._instanceIds;
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
        var attributes = this._perInstanceAttributeCache[index];
        if (defined(attributes)) {
            return attributes;
        }

        var perInstanceAttributes = this._perInstanceAttributeLocations[index];
        attributes = {};
        var properties = {};
        var hasProperties = false;

        for (var name in perInstanceAttributes) {
            if (perInstanceAttributes.hasOwnProperty(name)) {
                hasProperties = true;
                properties[name] = {
                    get : createGetFunction(name, perInstanceAttributes)
                };

                if (name !== 'boundingSphere' && name !== 'boundingSphereCV') {
                    properties[name].set = createSetFunction(name, perInstanceAttributes, this._dirtyAttributes);
                }
            }
        }

        if (hasProperties) {
            defineProperties(attributes, properties);
        }

        this._lastPerInstanceAttributeIndex = index;
        this._perInstanceAttributeCache[index] = attributes;
        return attributes;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <p>
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * </p>
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
     * @returns {undefined}
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

        this._sp = this._sp && this._sp.destroy();
        this._pickSP = this._pickSP && this._pickSP.destroy();

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

    function setReady(primitive, frameState, state, error) {
        primitive._error = error;
        primitive._state = state;
        frameState.afterRender.push(function() {
            primitive._ready = primitive._state === PrimitiveState.COMPLETE || primitive._state === PrimitiveState.FAILED;
            if (!defined(error)) {
                primitive._readyPromise.resolve(primitive);
            } else {
                primitive._readyPromise.reject(error);
            }
        });
    }

    return Primitive;
});
