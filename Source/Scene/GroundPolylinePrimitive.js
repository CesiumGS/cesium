define([
        '../Core/Check',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/GeometryInstanceAttribute',
        '../Core/GroundPolylineGeometry',
        '../Core/GroundLineGeometry',
        '../Core/isArray',
        '../Core/Matrix4',
        '../Shaders/PolylineShadowVolumeVS',
        '../Shaders/PolylineShadowVolumeFS',
        '../Renderer/DrawCommand',
        '../Renderer/Pass',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        './GroundPrimitive',
        './Material',
        './MaterialAppearance',
        './Primitive',
        './SceneMode'
    ], function(
        Check,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        GeometryInstance,
        GeometryInstanceAttribute,
        GroundPolylineGeometry,
        GroundLineGeometry,
        isArray,
        Matrix4,
        PolylineShadowVolumeVS,
        PolylineShadowVolumeFS,
        DrawCommand,
        Pass,
        RenderState,
        ShaderProgram,
        ShaderSource,
        GroundPrimitive,
        Material,
        MaterialAppearance,
        Primitive,
        SceneMode) {
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
     * @param {Boolean} [options.debugShowShadowVolume=false] For debugging only. Determines if the shadow volume for each geometry in the primitive is drawn.
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

        this.allowPicking = defaultValue(options.allowPicking, true);

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

        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * Draws the shadow volume for each geometry in the primitive.
         * </p>
         * TODO: make this read only, set-on-construct
         * @type {Boolean}
         *
         * @default false
         */
        this.debugShowShadowVolume = defaultValue(options.debugShowShadowVolume, false);

        this._primitiveOptions = {
            geometryInstances : undefined, // TODO: addtl params
            appearance : undefined,
            releaseGeometryInstances : this.releaseGeometryInstances,
            asynchronous : this.asynchronous,
            _createShaderProgramFunction : undefined,
            _createCommandsFunction : undefined,
            _updateAndQueueCommandsFunction : undefined,
        };

        this._primitive = undefined;
        this._ready = false;

        this._maxTerrainHeight = GroundPrimitive._defaultMaxTerrainHeight;
        this._minTerrainHeight = GroundPrimitive._defaultMinTerrainHeight;

        this._sp = undefined;
        this._spPick = undefined;
        this._sp2D = undefined;
        this._spPick2D = undefined;
        this._renderState = RenderState.fromCache({
            depthTest : {
                enabled : false // Helps prevent problems when viewing very closely
            }
        });

        // Map for synchronizing geometry instance attributes between polylines and line segments
        this._idsToInstanceIndices = {};
        this._attributeSynchronizerCache = {};
    }

    function generatePolylineAppearance(material, renderState) {
        return new MaterialAppearance({
            flat : true,
            translucent : true,
            closed : false,
            materialSupport : MaterialAppearance.MaterialSupport.BASIC,
            vertexShaderSource : PolylineShadowVolumeVS,
            fragmentShaderSource : PolylineShadowVolumeFS,
            material : material,
            renderState : renderState
        });
    }

    defineProperties(GroundPolylinePrimitive.prototype, {
        material : {
            get : function() {
                return this._material;
            },
            set : function(value) {
                this._material = value;
                this._appearance = generatePolylineAppearance(value, this._renderState);
            }
        }
    });

    function decompose(geometryInstance, projection, polylineSegmentInstances, idsToInstanceIndices) {
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
            var attributes = GroundLineGeometry.getAttributes(groundPolylineSegmentGeometry, projection, lengthSoFar, segmentLength, totalLength);
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

    // TODO: remove
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

    function modifyForEncodedNormals(compressVertices, vertexShaderSource) {
        if (!compressVertices) {
            return vertexShaderSource;
        }

        var attributeName = 'compressedAttributes';
        var attributeDecl = 'attribute float ' + attributeName + ';';

        var globalDecl = 'vec3 normal;\n';
        var decode = '    normal = czm_octDecode(' + attributeName + ');\n';

        var modifiedVS = vertexShaderSource;
        modifiedVS = modifiedVS.replace(/attribute\s+vec3\s+normal;/g, '');
        modifiedVS = ShaderSource.replaceMain(modifiedVS, 'czm_non_compressed_main');
        var compressedMain =
            'void main() \n' +
            '{ \n' +
            decode +
            '    czm_non_compressed_main(); \n' +
            '}';

        return [attributeDecl, globalDecl, modifiedVS, compressedMain].join('\n');
    }

    function createShaderProgram(groundPolylinePrimitive, frameState, appearance) {
        var context = frameState.context;
        var primitive = groundPolylinePrimitive._primitive;

        var attributeLocations = primitive._attributeLocations;

        var vs = primitive._batchTable.getVertexShaderCallback()(PolylineShadowVolumeVS);

        vs = Primitive._appendShowToShader(primitive, vs);
        vs = Primitive._appendDistanceDisplayConditionToShader(primitive, vs);
        vs = modifyForEncodedNormals(primitive.compressVertices, vs);
        vs = Primitive._modifyShaderPosition(groundPolylinePrimitive, vs, frameState.scene3DOnly);

        // Tesselation on these volumes tends to be low,
        // which causes problems when interpolating log depth from vertices.
        // So force computing and writing logarithmic depth in the fragment shader.
        // Re-enable at far distances to avoid z-fighting.
        var vsDefines =  ['ENABLE_GL_POSITION_LOG_DEPTH_AT_HEIGHT'];
        var fsDefines =  groundPolylinePrimitive.debugShowShadowVolume ? ['DEBUG_SHOW_VOLUME'] : [];

        var vsColor3D = new ShaderSource({
            defines : vsDefines,
            sources : [vs]
        });
        var fsColor3D = new ShaderSource({
            defines : fsDefines,
            sources : [appearance.material.shaderSource, PolylineShadowVolumeFS]
        });
        groundPolylinePrimitive._sp = ShaderProgram.replaceCache({
            context : context,
            shaderProgram : primitive._sp,
            vertexShaderSource : vsColor3D,
            fragmentShaderSource : fsColor3D,
            attributeLocations : attributeLocations
        });
        validateShaderMatching(groundPolylinePrimitive._sp, attributeLocations);

        // Derive 2D/CV
        var colorProgram2D = context.shaderCache.getDerivedShaderProgram(groundPolylinePrimitive._sp, '2dColor');
        if (!defined(colorProgram2D)) {
            var vsColor2D = new ShaderSource({
                defines : vsDefines.concat(['COLUMBUS_VIEW_2D']),
                sources : [vs]
            });
            colorProgram2D = context.shaderCache.createDerivedShaderProgram(groundPolylinePrimitive._sp, '2dColor', {
                context : context,
                shaderProgram : groundPolylinePrimitive._sp2D,
                vertexShaderSource : vsColor2D,
                fragmentShaderSource : fsColor3D,
                attributeLocations : attributeLocations
            });
        }
        groundPolylinePrimitive._sp2D = colorProgram2D;

        if (groundPolylinePrimitive.allowPicking) {
            var vsPick = ShaderSource.createPickVertexShaderSource(vs);
            vsPick = Primitive._updatePickColorAttribute(vsPick);

            var vsPick3D = new ShaderSource({
                defines : vsDefines,
                sources : [vsPick]
            });
            var fsPick3D = new ShaderSource({
                defines : fsDefines.concat(['PICK']),
                sources : [PolylineShadowVolumeFS],
                pickColorQualifier : 'varying'
            });

            groundPolylinePrimitive._spPick = ShaderProgram.replaceCache({
                context : context,
                shaderProgram : groundPolylinePrimitive._spPick,
                vertexShaderSource : vsPick3D,
                fragmentShaderSource : fsPick3D,
                attributeLocations : attributeLocations
            });
            validateShaderMatching(groundPolylinePrimitive._spPick, attributeLocations);

            // Derive 2D/CV
            var pickProgram2D = context.shaderCache.getDerivedShaderProgram(groundPolylinePrimitive._spPick, '2dColor');
            if (!defined(pickProgram2D)) {
                var vsPick2D = new ShaderSource({
                    defines : vsDefines.concat(['COLUMBUS_VIEW_2D']),
                    sources : [vsPick]
                });
                pickProgram2D = context.shaderCache.createDerivedShaderProgram(groundPolylinePrimitive._spPick, '2dColor', {
                    context : context,
                    shaderProgram : groundPolylinePrimitive._spPick2D,
                    vertexShaderSource : vsPick2D,
                    fragmentShaderSource : fsPick3D,
                    attributeLocations : attributeLocations
                });
            }
            groundPolylinePrimitive._spPick2D = pickProgram2D;
        }
    }

    function createCommands(groundPolylinePrimitive, appearance, material, translucent, colorCommands, pickCommands) {
        var primitive = groundPolylinePrimitive._primitive;
        var length = primitive._va.length;
        colorCommands.length = length;
        pickCommands.length = length;

        var i;
        var command;
        var uniformMap = primitive._batchTable.getUniformMapCallback()(material._uniforms);
        var pass = translucent ? Pass.TRANSLUCENT : Pass.OPAQUE;

        for (i = 0; i < length; i++) {
            var vertexArray = primitive._va[i];

            command = colorCommands[i];
            if (!defined(command)) {
                command = colorCommands[i] = new DrawCommand({
                    owner : groundPolylinePrimitive,
                    primitiveType : primitive._primitiveType
                });
            }

            command.vertexArray = vertexArray;
            command.renderState = groundPolylinePrimitive._renderState;
            command.shaderProgram = groundPolylinePrimitive._sp;
            command.uniformMap = uniformMap;
            command.pass = pass;

            // derive for 2D
            var derivedColorCommand = command.derivedCommands.color2D;
            if (!defined(derivedColorCommand)) {
                derivedColorCommand = DrawCommand.shallowClone(command);
                command.derivedCommands.color2D = derivedColorCommand;
            }
            derivedColorCommand.vertexArray = vertexArray;
            derivedColorCommand.renderState = groundPolylinePrimitive._renderState;
            derivedColorCommand.shaderProgram = groundPolylinePrimitive._sp2D;
            derivedColorCommand.uniformMap = uniformMap;
            derivedColorCommand.pass = pass;

            // Pick
            command = pickCommands[i];
            if (!defined(command)) {
                command = pickCommands[i] = new DrawCommand({
                    owner : groundPolylinePrimitive,
                    primitiveType : primitive._primitiveType
                });
            }

            command.vertexArray = vertexArray;
            command.renderState = groundPolylinePrimitive._renderState;
            command.shaderProgram = groundPolylinePrimitive._spPick;
            command.uniformMap = uniformMap;
            command.pass = pass;

            // derive for 2D
            var derivedPickCommand = command.derivedCommands.pick2D;
            if (!defined(derivedPickCommand)) {
                derivedPickCommand = DrawCommand.shallowClone(command);
                command.derivedCommands.pick2D = derivedColorCommand;
            }
            derivedPickCommand.vertexArray = vertexArray;
            derivedPickCommand.renderState = groundPolylinePrimitive._renderState;
            derivedPickCommand.shaderProgram = groundPolylinePrimitive._spPick2D;
            derivedPickCommand.uniformMap = uniformMap;
            derivedPickCommand.pass = pass;
        }
    }

    function updateAndQueueCommands(groundPolylinePrimitive, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume) {
        var primitive = groundPolylinePrimitive._primitive;

        //>>includeStart('debug', pragmas.debug);
        if (frameState.mode !== SceneMode.SCENE3D && !Matrix4.equals(modelMatrix, Matrix4.IDENTITY)) {
            throw new DeveloperError('Primitive.modelMatrix is only supported in 3D mode.');
        }
        //>>includeEnd('debug');

        Primitive._updateBoundingVolumes(primitive, frameState, modelMatrix);

        var boundingSpheres;
        if (frameState.mode === SceneMode.SCENE3D) {
            boundingSpheres = primitive._boundingSphereWC;
        } else if (frameState.mode === SceneMode.COLUMBUS_VIEW) {
            boundingSpheres = primitive._boundingSphereCV;
        } else if (frameState.mode === SceneMode.SCENE2D && defined(primitive._boundingSphere2D)) {
            boundingSpheres = primitive._boundingSphere2D;
        } else if (defined(primitive._boundingSphereMorph)) {
            boundingSpheres = primitive._boundingSphereMorph;
        }

        var commandList = frameState.commandList;
        var passes = frameState.passes;
        if (passes.render) {
            var colorLength = colorCommands.length;

            for (var j = 0; j < colorLength; ++j) {
                var colorCommand = colorCommands[j];
                // Use derived appearance command for 2D
                if (frameState.mode !== SceneMode.SCENE3D &&
                    colorCommand.shaderProgram === groundPolylinePrimitive._spPick) {
                    colorCommand = colorCommand.derivedCommands.color2D;
                }
                colorCommand.modelMatrix = modelMatrix;
                colorCommand.boundingVolume = boundingSpheres[j];
                colorCommand.cull = cull;
                colorCommand.debugShowBoundingVolume = debugShowBoundingVolume;

                commandList.push(colorCommand);
            }
        }

        if (passes.pick) {
            var pickLength = pickCommands.length;
            for (var k = 0; k < pickLength; ++k) {
                var pickCommand = pickCommands[k];
                // Used derived pick command for 2D
                if (frameState.mode !== SceneMode.SCENE3D &&
                    pickCommand.shaderProgram === groundPolylinePrimitive._spPick) {
                    pickCommand = pickCommand.derivedCommands.pick2D;
                }
                pickCommand.modelMatrix = modelMatrix;
                pickCommand.boundingVolume = boundingSpheres[k];
                pickCommand.cull = cull;

                commandList.push(pickCommand);
            }
        }
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

                decompose(geometryInstance, frameState.mapProjection, polylineSegmentInstances, this._idsToInstanceIndices);
            }

            primitiveOptions.geometryInstances = polylineSegmentInstances;
            primitiveOptions.appearance = this._appearance;

            primitiveOptions._createShaderProgramFunction = function(primitive, frameState, appearance) {
                createShaderProgram(that, frameState, appearance);
            };
            primitiveOptions._createCommandsFunction = function(primitive, appearance, material, translucent, twoPasses, colorCommands, pickCommands) {
                createCommands(that, appearance, material, translucent, colorCommands, pickCommands);
            };
            primitiveOptions._updateAndQueueCommandsFunction = function(primitive, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume, twoPasses) {
                updateAndQueueCommands(that, frameState, colorCommands, pickCommands, modelMatrix, cull, debugShowBoundingVolume);
            };

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
        this._primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
        this._primitive.update(frameState);
    };

    GroundPolylinePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    GroundPolylinePrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        this._sp = this._sp && this._sp.destroy();
        this._spPick = this._spPick && this._spPick.destroy();

        // Derived programs, destroyed above if they existed.
        this._sp2D = undefined;
        this._spPick2D = undefined;

        //These objects may be fairly large and reference other large objects (like Entities)
        //We explicitly set them to undefined here so that the memory can be freed
        //even if a reference to the destroyed GroundPolylinePrimitive has been kept around.
        this._idsToInstanceIndices = undefined;
        this._attributeSynchronizerCache = undefined;

        return destroyObject(this);
    };

    // An object that, on setting an attribute, will set all the instances' attributes.
    function InstanceAttributeSynchronizer(batchTable, firstInstanceIndex, lastInstanceIndex, batchTableAttributeIndices) {
        var properties = {};
        for (var name in batchTableAttributeIndices) {
            if (batchTableAttributeIndices.hasOwnProperty(name)) {
                var attributeIndex = batchTableAttributeIndices[name];
                properties[name] = {
                    get : createGetFunction(batchTable, firstInstanceIndex, attributeIndex),
                    set : createSetFunction(batchTable, firstInstanceIndex, lastInstanceIndex, attributeIndex)
                };

                // TODO: make some of these read only
            }
        }
        defineProperties(this, properties);
    }

    function getAttributeValue(value) {
        var componentsPerAttribute = value.length;
        if (componentsPerAttribute === 1) {
            return value[0];
        } else if (componentsPerAttribute === 2) {
            return Cartesian2.unpack(value, 0, scratchGetAttributeCartesian2);
        } else if (componentsPerAttribute === 3) {
            return Cartesian3.unpack(value, 0, scratchGetAttributeCartesian3);
        } else if (componentsPerAttribute === 4) {
            return Cartesian4.unpack(value, 0, scratchGetAttributeCartesian4);
        }
    }

    function createSetFunction(batchTable, firstInstanceIndex, lastInstanceIndex, attributeIndex) {
        return function(value) {
            //>>includeStart('debug', pragmas.debug);
            if (!defined(value) || !defined(value.length) || value.length < 1 || value.length > 4) {
                throw new DeveloperError('value must be and array with length between 1 and 4.');
            }
            //>>includeEnd('debug');
            for (var i = firstInstanceIndex; i <= lastInstanceIndex; i++) {
                var attributeValue = getAttributeValue(value);
                batchTable.setBatchedAttribute(i, attributeIndex, attributeValue);
            }
        };
    }

    function createGetFunction(batchTable, instanceIndex, attributeIndex) {
        return function() {
            var attributeValue = batchTable.getBatchedAttribute(instanceIndex, attributeIndex);
            var attribute = batchTable.attributes[attributeIndex];
            var componentsPerAttribute = attribute.componentsPerAttribute;
            var value = ComponentDatatype.createTypedArray(attribute.componentDatatype, componentsPerAttribute);
            if (defined(attributeValue.constructor.pack)) {
                attributeValue.constructor.pack(attributeValue, value, 0);
            } else {
                value[0] = attributeValue;
            }
            return value;
        };
    }

    GroundPolylinePrimitive.prototype.getGeometryInstanceAttributes = function(id) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(id)) {
            throw new DeveloperError('id is required');
        }
        if (!defined(this._primitive) || !defined(this._primitive._batchTable)) {
            throw new DeveloperError('must call update before calling getGeometryInstanceAttributes');
        }
        //>>includeEnd('debug');

        // All GeometryInstances generated by decomposing a GroundPolylineGeometry will have
        // the same pick ID, so we have to map from their individual instance attributes to a
        // master instance attribute and synchronize changes as they happen.

        var instanceIndices = this._idsToInstanceIndices[id];
        if (!defined(instanceIndices)) {
            return undefined;
        }
        var attributeSynchronizer = this._attributeSynchronizerCache[id];
        if (!defined(attributeSynchronizer)) {
            attributeSynchronizer = new InstanceAttributeSynchronizer(this._primitive._batchTable,
                instanceIndices[0], instanceIndices[1], this._primitive._batchTableAttributeIndices);
            this._attributeSynchronizerCache[id] = attributeSynchronizer;
        }
        return attributeSynchronizer;
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
