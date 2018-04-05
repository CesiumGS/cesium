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
    function ShadowVolumeAppearanceShader(appearance, extentsCulling, planarExtents) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('appearance', appearance);
        //>>includeEnd('debug');

        this._extentsCulling = defaultValue(extentsCulling, false);
        this._planarExtents = defaultValue(planarExtents, false);
        this._shaderSource = createShadowVolumeAppearanceShader(appearance, this._extentsCulling, this._planarExtents);
        this._usesTextureCoordinates = shaderDependenciesScratch._requiresTextureCoordinates;
    }

    defineProperties(ShadowVolumeAppearanceShader.prototype, {
        /**
         * Whether or not the resulting shader uses texture coordinates.
         *
         * @memberof ShadowVolumeAppearanceShader.prototype
         * @type {Boolean}
         * @readonly
         */
        usesTextureCoordinates : {
            get : function() {
                return this._usesTextureCoordinates;
            }
        },
        /**
         * Whether or not the resulting shader's texture coordinates are computed from planar extents.
         *
         * @memberof ShadowVolumeAppearanceShader.prototype
         * @type {Boolean}
         * @readonly
         */
        planarExtents : {
            get : function() {
                return this._planarExtents;
            }
        },
        /**
         * The fragment shader source.
         * @memberof ShadowVolumeAppearanceShader.prototype
         * @type {String}
         * @readonly
         */
        fragmentShaderSource : {
            get : function() {
                return this._shaderSource;
            }
        }
    });

    function createShadowVolumeAppearanceShader(appearance, extentsCull, planarExtents) {
        var shaderDependencies = shaderDependenciesScratch.reset();
        if (appearance instanceof PerInstanceColorAppearance) {
            return getPerInstanceColorShader(extentsCull, appearance.flat, planarExtents);
        }

        shaderDependencies.requiresTextureCoordinates = extentsCull;
        shaderDependencies.requiresEC = !appearance.flat;

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
            glsl += planarExtents ?
                'varying vec2 v_inversePlaneExtents;\n' +
                'varying vec4 v_westPlane;\n' +
                'varying vec4 v_southPlane;\n' :

                'varying vec4 v_sphericalExtents;\n';
        }

        glsl += getLocalFunctions(shaderDependencies, planarExtents);

        glsl +=
            'void main(void)\n' +
            '{\n';

        glsl += getDependenciesAndCulling(shaderDependencies, extentsCull, planarExtents);

        glsl += '    czm_materialInput materialInput;\n';
        if (usesNormalEC) {
            glsl += '    materialInput.normalEC = normalEC;\n';
        }
        if (usesPositionToEyeEC) {
            glsl += '    materialInput.positionToEyeEC = -eyeCoordinate.xyz;\n';
        }
        if (usesTangentToEyeMat) {
            glsl += '    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(worldCoordinate, normalEC);\n';
        }
        if (usesSt) {
            glsl += '    materialInput.st = vec2(v, u);\n';
        }
        glsl += '    czm_material material = czm_getMaterial(materialInput);\n';

        if (appearance.flat) {
            glsl += '    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n';
        } else {
            glsl += '    gl_FragColor = czm_phong(normalize(-eyeCoordinate.xyz), material);\n';
        }

        glsl += '}\n';
        return glsl;
    }

    function getPerInstanceColorShader(extentsCulling, flatShading, planarExtents) {
        var glsl =
            '#ifdef GL_EXT_frag_depth\n' +
            '#extension GL_EXT_frag_depth : enable\n' +
            '#endif\n' +
            'varying vec4 v_color;\n';
        if (extentsCulling) {
            glsl += planarExtents ?
                'varying vec2 v_inversePlaneExtents;\n' +
                'varying vec4 v_westPlane;\n' +
                'varying vec4 v_southPlane;\n' :

                'varying vec4 v_sphericalExtents;\n';
        }
        var shaderDependencies = shaderDependenciesScratch;
        shaderDependencies.requiresTextureCoordinates = extentsCulling;
        shaderDependencies.requiresNormalEC = !flatShading;

        glsl += getLocalFunctions(shaderDependencies, planarExtents);

        glsl += 'void main(void)\n' +
                '{\n';

        glsl += getDependenciesAndCulling(shaderDependencies, extentsCulling, planarExtents);

        if (flatShading) {
            glsl +=
                '    gl_FragColor = v_color;\n';
        } else {
            glsl +=
                '    czm_materialInput materialInput;\n' +
                '    materialInput.normalEC = normalEC;\n' +
                '    materialInput.positionToEyeEC = -eyeCoordinate.xyz;\n' +
                '    czm_material material = czm_getDefaultMaterial(materialInput);\n' +
                '    material.diffuse = v_color.rgb;\n' +
                '    material.alpha = v_color.a;\n' +

                '    gl_FragColor = czm_phong(normalize(-eyeCoordinate.xyz), material);\n';
        }
        glsl += '}\n';
        return glsl;
    }

    function getDependenciesAndCulling(shaderDependencies, extentsCulling, planarExtents) {
        var glsl = '';
        if (shaderDependencies.requiresEC) {
            glsl +=
                '    vec4 eyeCoordinate = getEyeCoordinate(gl_FragCoord.xy);\n';
        }
        if (shaderDependencies.requiresWC) {
            glsl +=
                '    vec4 worldCoordinate4 = czm_inverseView * eyeCoordinate;\n' +
                '    vec3 worldCoordinate = worldCoordinate4.xyz / worldCoordinate4.w;\n';
        }
        if (shaderDependencies.requiresTextureCoordinates) {
            if (planarExtents) {
                glsl +=
                '    // Unpack planes and transform to eye space\n' +
                '    float u = computePlanarTextureCoordinates(v_southPlane, eyeCoordinate.xyz / eyeCoordinate.w, v_inversePlaneExtents.y);\n' +
                '    float v = computePlanarTextureCoordinates(v_westPlane, eyeCoordinate.xyz / eyeCoordinate.w, v_inversePlaneExtents.x);\n';
            } else {
                glsl +=
                '    // Treat world coords as a sphere normal for spherical coordinates\n' +
                '    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(worldCoordinate);\n' +
                '    float u = (sphericalLatLong.x - v_sphericalExtents.x) * v_sphericalExtents.z;\n' +
                '    float v = (sphericalLatLong.y - v_sphericalExtents.y) * v_sphericalExtents.w;\n';
            }
        }
        if (extentsCulling) {
            glsl +=
                '    if (u <= 0.0 || 1.0 <= u || v <= 0.0 || 1.0 <= v) {\n' +
                '       discard;\n' +
                '    }\n';
        }
        // Lots of texture access, so lookup after discard check
        if (shaderDependencies.requiresNormalEC) {
            glsl +=
                '    // compute normal. sample adjacent pixels in 2x2 block in screen space\n' +
                '    vec3 downUp = getVectorFromOffset(eyeCoordinate, gl_FragCoord.xy, vec2(0.0, 1.0));\n' +
                '    vec3 leftRight = getVectorFromOffset(eyeCoordinate, gl_FragCoord.xy, vec2(1.0, 0.0));\n' +
                '    vec3 normalEC = normalize(cross(leftRight, downUp));\n' +
                '\n';
        }
        return glsl;
    }

    function getLocalFunctions(shaderDependencies, planarExtents) {
        var glsl = '';
        if (shaderDependencies.requiresEC) {
            glsl +=
                'vec4 getEyeCoordinate(vec2 fragCoord) {\n' +
                '    vec2 coords = fragCoord / czm_viewport.zw;\n' +
                '    float depth = czm_unpackDepth(texture2D(czm_globeDepthTexture, coords));\n' +
                '    vec4 windowCoord = vec4(fragCoord, depth, 1.0);\n' +
                '    vec4 eyeCoordinate = czm_windowToEyeCoordinates(windowCoord);\n' +
                '    return eyeCoordinate;\n' +
                '}\n';
        }
        if (shaderDependencies.requiresNormalEC) {
            glsl +=
                'vec3 getEyeCoordinate3FromWindowCoordordinate(vec2 fragCoord, float depth) {\n' +
                '    vec4 windowCoord = vec4(fragCoord, depth, 1.0);\n' +
                '    vec4 eyeCoordinate = czm_windowToEyeCoordinates(windowCoord);\n' +
                '    return eyeCoordinate.xyz / eyeCoordinate.w;\n' +
                '}\n' +

                'vec3 getVectorFromOffset(vec4 eyeCoordinate, vec2 glFragCoordXY, vec2 positiveOffset) {\n' +
                '    // Sample depths at both offset and negative offset\n' +
                '    float upOrRightDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (glFragCoordXY + positiveOffset) / czm_viewport.zw));\n' +
                '    float downOrLeftDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (glFragCoordXY - positiveOffset) / czm_viewport.zw));\n' +
                '    // Explicitly evaluate both paths\n' +
                '    bvec2 upOrRightInBounds = lessThan(glFragCoordXY + positiveOffset, czm_viewport.zw);\n' +
                '    float useUpOrRight = float(upOrRightDepth > 0.0 && upOrRightInBounds.x && upOrRightInBounds.y);\n' +
                '    float useDownOrLeft = float(useUpOrRight == 0.0);\n' +

                '    vec3 upOrRightEC = getEyeCoordinate3FromWindowCoordordinate(glFragCoordXY + positiveOffset, upOrRightDepth);\n' +
                '    vec3 downOrLeftEC = getEyeCoordinate3FromWindowCoordordinate(glFragCoordXY - positiveOffset, downOrLeftDepth);\n' +

                '    return (upOrRightEC - (eyeCoordinate.xyz / eyeCoordinate.w)) * useUpOrRight + ((eyeCoordinate.xyz / eyeCoordinate.w) - downOrLeftEC) * useDownOrLeft;\n' +
                '}\n';
        }
        if (shaderDependencies.requiresTextureCoordinates && planarExtents) {
            glsl +=
                'float computePlanarTextureCoordinates(vec4 plane, vec3 eyeCoordinates, float inverseExtent) {\n' +
                '    return (dot(plane.xyz, eyeCoordinates) + plane.w) * inverseExtent;\n' +
                '}\n';
        }
        return glsl;
    }

    /**
     * Tracks shader dependencies.
     * @private
     */
    function ShaderDependencies() {
        this._requiresEC = false;
        this._requiresWC = false; // depends on eye coordinates, needed for material and for phong
        this._requiresNormalEC = false; // depends on eye coordinates, needed for material
        this._requiresTextureCoordinates = false; // depends on world coordinates, needed for material and for culling
    }

    ShaderDependencies.prototype.reset = function() {
        this._requiresEC = false;
        this._requiresWC = false;
        this._requiresNormalEC = false;
        this._requiresTextureCoordinates = false;
        return this;
    };

    defineProperties(ShaderDependencies.prototype, {
        // Set when assessing final shading (flat vs. phong) and culling using computed texture coordinates
        requiresEC : {
            get : function() {
                return this._requiresEC;
            },
            set : function(value) {
                this._requiresEC = value || this._requiresEC;
            }
        },
        requiresWC : {
            get : function() {
                return this._requiresWC;
            },
            set : function(value) {
                this._requiresWC = value || this._requiresWC;
                this.requiresEC = this._requiresWC;
            }
        },
        requiresNormalEC : {
            get : function() {
                return this._requiresNormalEC;
            },
            set : function(value) {
                this._requiresNormalEC = value || this._requiresNormalEC;
                this.requiresEC = this._requiresNormalEC;
            }
        },
        requiresTextureCoordinates : {
            get : function() {
                return this._requiresTextureCoordinates;
            },
            set : function(value) {
                this._requiresTextureCoordinates = value || this._requiresTextureCoordinates;
                this.requiresWC = this._requiresTextureCoordinates;
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
                this.requiresWC = value;
                this.requiresNormalEC = value;
            }
        },
        positionToEyeEC : {
            set : function(value) {
                this.requiresEC = value;
            }
        },
        st : {
            set : function(value) {
                this.requiresTextureCoordinates = value;
            }
        }
    });

    return ShadowVolumeAppearanceShader;
});
