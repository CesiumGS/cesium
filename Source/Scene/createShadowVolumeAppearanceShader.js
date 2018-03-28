define([
        '../Core/Check',
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Renderer/PixelDatatype',
        '../Scene/PerInstanceColorAppearance'
], function(
        Check,
        defaultValue,
        defineProperties,
        PixelDatatype,
        PerInstanceColorAppearance) {
    'use strict';

    var shaderDependenciesScratch = new ShaderDependencies();
    /**
     * Creates the shadow volume fragment shader for a ClassificationPrimitive to use a given appearance.
     *
     * @param {Appearance} appearance An Appearance to be used with a ClassificationPrimitive.
     * @param {Boolean} [extentsCulling=false] Discard fragments outside the instance's spherical extents.
     * @returns {String} Shader source for a fragment shader using the input appearance.
     * @private
     */
    function createShadowVolumeAppearanceShader(appearance, extentsCulling, small) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('appearance', appearance);
        //>>includeEnd('debug');

        var extentsCull = defaultValue(extentsCulling, true);
        var smallExtents = defaultValue(small, true);

        if (appearance instanceof PerInstanceColorAppearance) {
            return getPerInstanceColorShader(extentsCull, appearance.flat, smallExtents);
        }

        var shaderDependencies = shaderDependenciesScratch.reset();
        shaderDependencies.requiresTexcoords = extentsCull;
        shaderDependencies.requiresEyeCoord = !appearance.flat;

        // Scan material source for what hookups are needed. Assume czm_materialInput materialInput.
        var materialShaderSource = appearance.material.shaderSource;

        var usesNormalEC = shaderDependencies.normalEC = materialShaderSource.includes('materialInput.normalEC') || materialShaderSource.includes('czm_getDefaultMaterial');
        var usesPositionToEyeEC = shaderDependencies.positionToEyeEC = materialShaderSource.includes('materialInput.positionToEyeEC');
        var usesTangentToEyeMat = shaderDependencies.tangentToEyeMatrix = materialShaderSource.includes('materialInput.tangentToEyeMatrix');
        var usesSt = shaderDependencies.st = materialShaderSource.includes('materialInput.st');

        var glsl =
            '#ifdef GL_EXT_frag_depth\n' +
            '#extension GL_EXT_frag_depth : enable\n' +
            '#endif\n';
        if (extentsCull || usesSt) {
            glsl +=
                'varying vec4 v_sphericalExtents;\n' +
                'varying vec4 v_planarExtentsLatitude;\n' +
                'varying vec4 v_planarExtentsLongitude;\n';
        }

        glsl += getLocalFunctions(shaderDependencies, smallExtents);

        glsl +=
            'void main(void)\n' +
            '{\n';

        glsl += getDependenciesAndCulling(shaderDependencies, extentsCull, smallExtents);

        glsl += '    czm_materialInput materialInput;\n';
        if (usesNormalEC) {
            glsl += '    materialInput.normalEC = normalEC;\n';
        }
        if (usesPositionToEyeEC) {
            glsl += '    materialInput.positionToEyeEC = -eyeCoord.xyz;\n';
        }
        if (usesTangentToEyeMat) {
            glsl += '    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(worldCoord, normalEC);\n';
        }
        if (usesSt) {
            glsl += '    materialInput.st = vec2(v, u);\n';
        }
        glsl += '    czm_material material = czm_getMaterial(materialInput);\n';

        if (appearance.flat) {
            glsl += '    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n';
        } else {
            glsl += '    gl_FragColor = czm_phong(normalize(-eyeCoord.xyz), material);\n';
        }

        glsl += '}\n';
        return glsl;
    }

    function getPerInstanceColorShader(extentsCulling, flatShading, smallExtents) {
        var glsl =
            '#ifdef GL_EXT_frag_depth\n' +
            '#extension GL_EXT_frag_depth : enable\n' +
            '#endif\n' +
            'varying vec4 v_color;\n';
        if (extentsCulling) {
            glsl +=
                'varying vec4 v_sphericalExtents;\n';
        }
        var shaderDependencies = shaderDependenciesScratch.reset();
        shaderDependencies.requiresTexcoords = extentsCulling;
        shaderDependencies.requiresNormalEC = !flatShading;

        glsl += getLocalFunctions(shaderDependencies, smallExtents);

        glsl += 'void main(void)\n' +
                '{\n';

        glsl += getDependenciesAndCulling(shaderDependencies, extentsCulling, smallExtents);

        if (flatShading) {
            glsl +=
                '    gl_FragColor = v_color;\n';
        } else {
            glsl +=
                '    czm_materialInput materialInput;\n' +
                '    materialInput.normalEC = normalEC;\n' +
                '    materialInput.positionToEyeEC = -eyeCoord.xyz;\n' +
                '    czm_material material = czm_getDefaultMaterial(materialInput);\n' +
                '    material.diffuse = v_color.rgb;\n' +
                '    material.alpha = v_color.a;\n' +

                '    gl_FragColor = czm_phong(normalize(-eyeCoord.xyz), material);\n';
        }
        glsl += '}\n';
        return glsl;
    }

    function getDependenciesAndCulling(shaderDependencies, extentsCulling, smallExtents) {
        var glsl = '';
        if (shaderDependencies.requiresEyeCoord) {
            glsl +=
                '    vec4 eyeCoord = getEyeCoord(gl_FragCoord.xy);\n';
        }
        if (shaderDependencies.requiresWorldCoord) {
            glsl +=
                '    vec4 worldCoord4 = czm_inverseView * eyeCoord;\n' +
                '    vec3 worldCoord = worldCoord4.xyz / worldCoord4.w;\n';
        }
        if (shaderDependencies.requiresTexcoords) {
            if (smallExtents) {  // TODO: add ability to do long-and-narrows?
                glsl +=
                '    // Unpack planes and transform to eye space\n' +
                '    float u = computePlanarTexcoord(v_planarExtentsLatitude, worldCoord);\n' +
                '    float v = computePlanarTexcoord(v_planarExtentsLongitude, worldCoord);\n';
            } else {
                glsl +=
                '    // Treat world coords as a sphere normal for spherical coordinates\n' +
                '    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(worldCoord);\n' +
                '    float u = (sphericalLatLong.x - v_sphericalExtents.y) * v_sphericalExtents.w;\n' +
                '    float v = (sphericalLatLong.y - v_sphericalExtents.x) * v_sphericalExtents.z;\n'; // TODO: clean up...
            }
        }
        if (extentsCulling) {
            glsl +=
                '    if (u <= 0.0 || 1.0 <= u || v <= 0.0 || 1.0 <= v) {\n' + // TODO: there's floating point problems at the edges of rectangles. Use remapping.
                '       discard;\n' +
                '    }\n';
        }
        // Lots of texture access, so lookup after discard check
        if (shaderDependencies.requiresNormalEC) {
            glsl +=
                '    // compute normal. sample adjacent pixels in 2x2 block in screen space\n' +
                '    vec3 downUp = getVectorFromOffset(eyeCoord, gl_FragCoord.xy, vec2(0.0, 1.0));\n' +
                '    vec3 leftRight = getVectorFromOffset(eyeCoord, gl_FragCoord.xy, vec2(1.0, 0.0));\n' +
                '    vec3 normalEC = normalize(cross(leftRight, downUp));\n' +
                '\n';
        }
        return glsl;
    }

    function getLocalFunctions(shaderDependencies, smallExtents) {
        var glsl = '';
        if (shaderDependencies.requiresEyeCoord) {
            glsl +=
                'vec4 getEyeCoord(vec2 fragCoord) {\n' +
                '    vec2 coords = fragCoord / czm_viewport.zw;\n' +
                '    float depth = czm_unpackDepth(texture2D(czm_globeDepthTexture, coords));\n' +
                '    vec4 windowCoord = vec4(fragCoord, depth, 1.0);\n' +
                '    vec4 eyeCoord = czm_windowToEyeCoordinates(windowCoord);\n' +
                '    return eyeCoord;\n' +
                '}\n';
        }
        if (shaderDependencies.requiresNormalEC) {
            glsl +=
                'vec3 getEyeCoord3FromWindowCoord(vec2 fragCoord, float depth) {\n' +
                '    vec4 windowCoord = vec4(fragCoord, depth, 1.0);\n' +
                '    vec4 eyeCoord = czm_windowToEyeCoordinates(windowCoord);\n' +
                '    return eyeCoord.xyz / eyeCoord.w;\n' +
                '}\n' +

                'vec3 getVectorFromOffset(vec4 eyeCoord, vec2 fragCoord2, vec2 positiveOffset) {\n' +
                '    // Sample depths at both offset and negative offset\n' +
                '    float upOrRightDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (fragCoord2 + positiveOffset) / czm_viewport.zw));\n' +
                '    float downOrLeftDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (fragCoord2 - positiveOffset) / czm_viewport.zw));\n' +
                // TODO: could re-ordering here help performance? do texture fetches, then logic, then unpack?
                '    // Explicitly evaluate both paths\n' +
                '    bvec2 upOrRightInBounds = lessThan(fragCoord2 + positiveOffset, czm_viewport.zw);\n' +
                '    float useUpOrRight = float(upOrRightDepth > 0.0 && upOrRightInBounds.x && upOrRightInBounds.y);\n' +
                '    float useDownOrLeft = float(useUpOrRight == 0.0);\n' +

                '    vec3 upOrRightEC = getEyeCoord3FromWindowCoord(fragCoord2 + positiveOffset, upOrRightDepth);\n' +
                '    vec3 downOrLeftEC = getEyeCoord3FromWindowCoord(fragCoord2 - positiveOffset, downOrLeftDepth);\n' +

                '    return (upOrRightEC - (eyeCoord.xyz / eyeCoord.w)) * useUpOrRight + ((eyeCoord.xyz / eyeCoord.w) - downOrLeftEC) * useDownOrLeft;\n' +
                '}\n';
        }
        if (shaderDependencies.requiresTexcoords && smallExtents) {
            glsl +=
                'float computePlanarTexcoord(vec4 packedPlanarExtent, vec3 worldCoords) {\n' +
                '    // planar extent is a plane at the origin (so just a direction) and an extent distance.\n' +
                '    return (dot(packedPlanarExtent.xyz, worldCoords)) * packedPlanarExtent.w;\n' +
                '}\n';
        }
        return glsl;
    }

    /**
     * Tracks shader dependencies.
     * @private
     */
    function ShaderDependencies() {
        this._requiresEyeCoord = false;
        this._requiresWorldCoord = false; // depends on eyeCoord, needed for material and for phong
        this._requiresNormalEC = false; // depends on eyeCoord, needed for material
        this._requiresTexcoords = false; // depends on worldCoord, needed for material and for culling
    }

    ShaderDependencies.prototype.reset = function() {
        this._requiresEyeCoord = false;
        this._requiresWorldCoord = false;
        this._requiresNormalEC = false;
        this._requiresTexcoords = false;
        return this;
    };

    defineProperties(ShaderDependencies.prototype, {
        // Set when assessing final shading (flat vs. phong) and spherical extent culling
        requiresEyeCoord : {
            get : function() {
                return this._requiresEyeCoord;
            },
            set : function(value) {
                this._requiresEyeCoord = value || this._requiresEyeCoord;
            }
        },
        requiresWorldCoord : {
            get : function() {
                return this._requiresWorldCoord;
            },
            set : function(value) {
                this._requiresWorldCoord = value || this._requiresWorldCoord;
                this.requiresEyeCoord = this._requiresWorldCoord;
            }
        },
        requiresNormalEC : {
            get : function() {
                return this._requiresNormalEC;
            },
            set : function(value) {
                this._requiresNormalEC = value || this._requiresNormalEC;
                this.requiresEyeCoord = this._requiresNormalEC;
            }
        },
        requiresTexcoords : {
            get : function() {
                return this._requiresTexcoords;
            },
            set : function(value) {
                this._requiresTexcoords = value || this._requiresTexcoords;
                this.requiresWorldCoord = this._requiresTexcoords;
            }
        },
        // Set when assessing material hookups
        normalEC : {
            set : function(value) {
                this.requiresNormalEC = value;
            }
        },
        tangentToEyeMatrix : {
            set : function(value) {
                this.requiresWorldCoord = value;
                this.requiresNormalEC = value;
            }
        },
        positionToEyeEC : {
            set : function(value) {
                this.requiresEyeCoord = value;
            }
        },
        st : {
            set : function(value) {
                this.requiresTexcoords = value;
            }
        }
    });

    return createShadowVolumeAppearanceShader;
});
