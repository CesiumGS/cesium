define([
        '../Core/Check',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/GeometryInstance',
        '../Core/GeometryInstanceAttribute',
        '../Core/GroundPolylineGeometry',
        '../Core/GroundLineGeometry',
        '../Core/isArray',
        '../Shaders/PolylineShadowVolumeVS',
        '../Shaders/PolylineShadowVolumeFS',
        '../Renderer/RenderState',
        './GroundPrimitive',
        './Material',
        './MaterialAppearance',
        './Primitive'
    ], function(
        Check,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        GeometryInstance,
        GeometryInstanceAttribute,
        GroundPolylineGeometry,
        GroundLineGeometry,
        isArray,
        PolylineShadowVolumeVS,
        PolylineShadowVolumeFS,
        RenderState,
        GroundPrimitive,
        Material,
        MaterialAppearance,
        Primitive) {
    'use strict';

    /**
     * A GroundPolylinePrimitive represents a polyline draped over the terrain in the {@link Scene}.
     * <p>
     *
     * Only to be used with GeometryInstances containing GroundPolylineGeometries
     *
     * @param {Object} [options] Object with the following properties:
     * @param {GeometryInstance[]|GeometryInstance} [options.polylineGeometryInstances] GeometryInstances containing GroundPolylineGeometry
     * @param {Material} [options.material] The Material used to render the polyline. Defaults to a white color.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Boolean} [options.releaseGeometryInstances=true] When <code>true</code>, the primitive does not keep a reference to generated geometry or input <code>cartographics</code> to save memory.
     * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
     * @param {Boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready. If false GroundPrimitive.initializeTerrainHeights() must be called first.
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
     * @param {Boolean} [options.debugShowShadowVolume=false] For debugging only. Determines if the shadow volume for each geometry in the primitive is drawn. Must be <code>true</code> on
     *                  creation for the volumes to be created before the geometry is released or options.releaseGeometryInstance must be <code>false</code>.
     *
     */
    function GroundPolylinePrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this.polylineGeometryInstances = options.polylineGeometryInstances;

        var material = options.material;
        if (!defined(material)) {
            material = Material.fromType('Color');
        }

        this._material = material;
        this._appearance = generatePolylineAppearance(material);

        this.show = defaultValue(options.show, true);

        this.releaseGeometryInstances = defaultValue(options.releaseGeometryInstances, true);

        this.asynchronous = defaultValue(options.asynchronous, true);

        /**
         * TODO: other stuff, like debugging thingies
         */

        this._primitiveOptions = {
            geometryInstances : undefined,
            appearance : undefined,
            releaseGeometryInstances : this.releaseGeometryInstances,
            asynchronous : this.asynchronous,
            fragmentLogDepth : true
        };

        this._primitive = undefined;
        this._ready = false;

        this._maxTerrainHeight = GroundPrimitive._defaultMaxTerrainHeight;
        this._minTerrainHeight = GroundPrimitive._defaultMinTerrainHeight;

        // Map for synchronizing geometry instance attributes between polylines and line segments
        this._idsToInstanceIndices = {};
    }

    function getColorRenderState() {
        return {
            depthTest : {
                enabled : false // Helps prevent problems when viewing very closely
            }
        };
    }

    function generatePolylineAppearance(material) {
        return new MaterialAppearance({
            flat : true,
            translucent : true,
            closed : false,
            materialSupport : MaterialAppearance.MaterialSupport.BASIC,
            vertexShaderSource : PolylineShadowVolumeVS,
            fragmentShaderSource : PolylineShadowVolumeFS,
            material : material,
            renderState : RenderState.fromCache(getColorRenderState())
        });
    }

    defineProperties(GroundPolylinePrimitive.prototype, {
        material : {
            get : function() {
                return this._material;
            },
            set : function(value) {
                this._material = value;
                this._appearance = generatePolylineAppearance(value);
            }
        }
    });

    function decompose(geometryInstance, polylineSegmentInstances, idsToInstanceIndices) {
        var groundPolylineGeometry = geometryInstance.geometry;
        // TODO: check and throw using instanceof?

        var commonId = geometryInstance.id;

        var wallVertices = GroundPolylineGeometry.createWallVertices(groundPolylineGeometry, GroundPrimitive._defaultMaxTerrainHeight);
        var rightFacingNormals = wallVertices.rightFacingNormals;
        var bottomPositions = wallVertices.bottomPositions;
        var topPositions = wallVertices.topPositions;

        var totalLength = groundPolylineGeometry.lengthOnEllipsoid;
        var lengthSoFar = 0.0;

        var verticesLength = rightFacingNormals.length;
        var segmentIndicesStart = polylineSegmentInstances.length;
        for (var i = 0; i < verticesLength - 3; i += 3) {
            var groundPolylineSegmentGeometry = GroundLineGeometry.fromArrays(i, rightFacingNormals, bottomPositions, topPositions);
            var segmentLength = groundPolylineSegmentGeometry.segmentBottomLength;
            var attributes = GroundLineGeometry.getAttributes(groundPolylineSegmentGeometry, lengthSoFar, segmentLength, totalLength);
            lengthSoFar += segmentLength;

            attributes.width = new GeometryInstanceAttribute({
                componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute: 1,
                normalize : false,
                value : [groundPolylineGeometry.width]
            });

            polylineSegmentInstances.push(new GeometryInstance({
                geometry : groundPolylineSegmentGeometry,
                attributes : attributes,
                id : commonId
            }));
        }
        idsToInstanceIndices[commonId] = [segmentIndicesStart, polylineSegmentInstances.length - 1];
    }

    GroundPolylinePrimitive.prototype.update = function(frameState) {
        if (!defined(this._primitive) && !defined(this.polylineGeometryInstances)) {
            return;
        }

        /*
        if (!GroundPrimitive._initialized) {
            //>>includeStart('debug', pragmas.debug);
            if (!this.asynchronous) {
                throw new DeveloperError('For synchronous GroundPolylinePrimitives, you must call GroundPrimitive.initializeTerrainHeights() and wait for the returned promise to resolve.');
            }
            //>>includeEnd('debug');

            GroundPrimitive.initializeTerrainHeights();
            return;
        }*/

        var i;

        var that = this;
        var primitiveOptions = this._primitiveOptions;
        if (!defined(this._primitive)) {
            // Decompose GeometryInstances into an array of GeometryInstances containing GroundPolylineSegmentGeometries.
            // Compute the overall bounding volume
            // TODO later: compute rectangle for getting min/max heights
            var ellipsoid = frameState.mapProjection.ellipsoid;

            var polylineSegmentInstances = [];
            var geometryInstances = isArray(this.polylineGeometryInstances) ? this.polylineGeometryInstances : [this.polylineGeometryInstances];
            var geometryInstancesLength = geometryInstances.length;
            for (i = 0; i < geometryInstancesLength; ++i) {
                var geometryInstance = geometryInstances[i];
                var id = geometryInstance.id;

                decompose(geometryInstance, polylineSegmentInstances, this._idsToInstanceIndices);
            }

            primitiveOptions.geometryInstances = polylineSegmentInstances;
            primitiveOptions.appearance = this._appearance;

            this._primitive = new Primitive(primitiveOptions);
            this._primitive.readyPromise.then(function(primitive) {
                that._ready = true;

                if (that.releaseGeometryInstances) {
                    that.polylineGeometryInstances = undefined;
                }

                var error = primitive._error;
                if (!defined(error)) {
                    that._readyPromise.resolve(that);
                } else {
                    that._readyPromise.reject(error);
                }
            });
        }
        this._primitive.appearance = this._appearance;
        this._primitive.show = this.show;
        this._primitive.update(frameState);
    };

    GroundPolylinePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    GroundPolylinePrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    GroundPolylinePrimitive.prototype.getGeometryInstanceAttributes = function(id) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(this._primitive)) {
            throw new DeveloperError('must call update before calling getGeometryInstanceAttributes');
        }
        //>>includeEnd('debug');

        // All GeometryInstances generated by decomposing a GroundPolylineGeometry will have
        // the same pick ID, so we have to map from their individual instance attributes to a
        // master instance attribute and synchronize changes as they happen.
        return this._primitive.getGeometryInstanceAttributes(id);
    };

    /**
     * Checks if the given Scene supports GroundPolylinePrimitives.
     * GroundPolylinePrimitives require support for the WEBGL_depth_texture extension.
     *
     * @param {Scene} scene The current scene.
     * @returns {Boolean} Whether or not the current scene supports GroundPolylinePrimitives.
     */
    GroundPolylinePrimitive.isSupported = function(scene) {
        return scene.frameState.context.depthTexture;
    };

    return GroundPolylinePrimitive;
});
