// See Intersection.glsl for the definition of intersectScene
// See IntersectionUtils.glsl for the definition of nextIntersection
// See convertUvToBox.glsl, convertUvToCylinder.glsl, or convertUvToEllipsoid.glsl
// for the definition of convertUvToShapeUvSpace. The appropriate function is 
// selected based on the VoxelPrimitive shape type, and added to the shader in
// Scene/VoxelRenderResources.js.
// See Octree.glsl for the definitions of TraversalData, SampleData,
// traverseOctreeFromBeginning, and traverseOctreeFromExisting
// See Megatexture.glsl for the definition of accumulatePropertiesFromMegatexture

#define STEP_COUNT_MAX 1000 // Harcoded value because GLSL doesn't like variable length loops
#if defined(PICKING_VOXEL)
    #define ALPHA_ACCUM_MAX 0.1
#else
    #define ALPHA_ACCUM_MAX 0.98 // Must be > 0.0 and <= 1.0
#endif

uniform mat3 u_transformDirectionViewToLocal;
uniform vec3 u_cameraPositionUv;
uniform float u_stepSize;

#if defined(PICKING)
    uniform vec4 u_pickColor;
#endif

vec3 getSampleSize(in int level) {
    vec3 sampleCount = exp2(float(level)) * vec3(u_dimensions);
    vec3 sampleSizeUv = 1.0 / sampleCount;
    return scaleShapeUvToShapeSpace(sampleSizeUv);
}

#define MINIMUM_STEP_SCALAR (0.02)
#define SHIFT_FRACTION (0.001)

/**
 * Given a coordinate within a tile, and sample spacings along a ray through
 * the coordinate, find the distance to the points where the ray entered and
 * exited the voxel cell, along with the surface normals at those points.
 * The surface normals are returned in shape space coordinates.
 */
RayShapeIntersection getVoxelIntersection(in vec3 tileUv, in vec3 sampleSizeAlongRay) {
    vec3 voxelCoord = tileUv * vec3(u_dimensions);
    vec3 directions = sign(sampleSizeAlongRay);
    vec3 positiveDirections = max(directions, 0.0);
    vec3 entryCoord = mix(ceil(voxelCoord), floor(voxelCoord), positiveDirections);
    vec3 exitCoord = entryCoord + directions;

    vec3 distanceFromEntry = -abs((entryCoord - voxelCoord) * sampleSizeAlongRay);
    float lastEntry = maxComponent(distanceFromEntry);
    bvec3 isLastEntry = equal(distanceFromEntry, vec3(lastEntry));
    vec3 entryNormal = -1.0 * vec3(isLastEntry) * directions;
    vec4 entry = vec4(entryNormal, lastEntry);

    vec3 distanceToExit = abs((exitCoord - voxelCoord) * sampleSizeAlongRay);
    float firstExit = minComponent(distanceToExit);
    bvec3 isFirstExit = equal(distanceToExit, vec3(firstExit));
    vec3 exitNormal = vec3(isFirstExit) * directions;
    vec4 exit = vec4(exitNormal, firstExit);

    return RayShapeIntersection(entry, exit);
}

vec4 getStepSize(in SampleData sampleData, in Ray viewRay, in RayShapeIntersection shapeIntersection, in mat3 jacobianT, in float currentT) {
    // The Jacobian is computed in a space where the shape spans [-1, 1].
    // But the ray is marched in a space where the shape fills [0, 1].
    // So we need to scale the Jacobian by 2.
    vec3 gradient = 2.0 * viewRay.rawDir * jacobianT;
    vec3 sampleSizeAlongRay = getSampleSize(sampleData.tileCoords.w) / gradient;

    RayShapeIntersection voxelIntersection = getVoxelIntersection(sampleData.tileUv, sampleSizeAlongRay);

    // Transform normal from shape space to Cartesian space
    vec3 voxelNormal = normalize(jacobianT * voxelIntersection.entry.xyz);
    // Compare with the shape intersection, to choose the appropriate normal
    vec4 voxelEntry = vec4(voxelNormal, currentT + voxelIntersection.entry.w);
    vec4 entry = intersectionMax(shapeIntersection.entry, voxelEntry);

    float fixedStep = minComponent(abs(sampleSizeAlongRay)) * u_stepSize;
    float shift = fixedStep * SHIFT_FRACTION;
    float dt = voxelIntersection.exit.w + shift;
    if ((currentT + dt) > shapeIntersection.exit.w) {
        // Stop at end of shape
        dt = shapeIntersection.exit.w - currentT + shift;
    }
    float stepSize = clamp(dt, fixedStep * MINIMUM_STEP_SCALAR, fixedStep + shift);

    return vec4(entry.xyz, stepSize);
}

vec2 packIntToVec2(int value) {
    float shifted = float(value) / 255.0;
    float lowBits = fract(shifted);
    float highBits = floor(shifted) / 255.0;
    return vec2(highBits, lowBits);
}

vec2 packFloatToVec2(float value) {
    float lowBits = fract(value);
    float highBits = floor(value) / 255.0;
    return vec2(highBits, lowBits);
}

int getSampleIndex(in vec3 tileUv) {
    ivec3 voxelDimensions = u_dimensions;
    vec3 sampleCoordinate = tileUv * vec3(voxelDimensions);
    // tileUv = 1.0 is a valid coordinate but sampleIndex = voxelDimensions is not.
    // (tileUv = 1.0 corresponds to the last sample, at index = voxelDimensions - 1).
    // Clamp to [0, voxelDimensions - 0.5) to avoid numerical error before flooring
    vec3 maxCoordinate = vec3(voxelDimensions) - vec3(0.5);
    sampleCoordinate = clamp(sampleCoordinate, vec3(0.0), maxCoordinate);
    ivec3 sampleIndex = ivec3(floor(sampleCoordinate));
    #if defined(PADDING)
        voxelDimensions += u_paddingBefore + u_paddingAfter;
        sampleIndex += u_paddingBefore;
    #endif
    // Convert to a 1D index for lookup in a 1D data array
    return sampleIndex.x + voxelDimensions.x * (sampleIndex.y + voxelDimensions.y * sampleIndex.z);
}

void main()
{
    vec4 fragCoord = gl_FragCoord;
    vec2 screenCoord = (fragCoord.xy - czm_viewport.xy) / czm_viewport.zw; // [0,1]
    vec3 eyeDirection = normalize(czm_windowToEyeCoordinates(fragCoord).xyz);
    vec3 viewDirWorld = normalize(czm_inverseViewRotation * eyeDirection); // normalize again just in case
    vec3 viewDirUv = normalize(u_transformDirectionViewToLocal * eyeDirection); // normalize again just in case
    vec3 viewPosUv = u_cameraPositionUv;
    #if defined(SHAPE_ELLIPSOID)
        // viewDirUv has been scaled to a space where the ellipsoid is a sphere.
        // Undo this scaling to get the raw direction.
        vec3 rawDir = viewDirUv * u_ellipsoidRadiiUv;
        Ray viewRayUv = Ray(viewPosUv, viewDirUv, rawDir);
    #else
        Ray viewRayUv = Ray(viewPosUv, viewDirUv, viewDirUv);
    #endif

    Intersections ix;
    RayShapeIntersection shapeIntersection = intersectScene(screenCoord, viewRayUv, ix);

    // Exit early if the scene was completely missed.
    if (shapeIntersection.entry.w == NO_HIT) {
        discard;
    }

    float currentT = shapeIntersection.entry.w;
    float endT = shapeIntersection.exit.w;
    vec3 positionUv = viewPosUv + currentT * viewDirUv;
    PointJacobianT pointJacobian = convertUvToShapeUvSpaceDerivative(positionUv);

    // Traverse the tree from the start position
    TraversalData traversalData;
    SampleData sampleDatas[SAMPLE_COUNT];
    traverseOctreeFromBeginning(pointJacobian.point, traversalData, sampleDatas);
    vec4 step = getStepSize(sampleDatas[0], viewRayUv, shapeIntersection, pointJacobian.jacobianT, currentT);

    #if defined(JITTER)
        float noise = hash(screenCoord); // [0,1]
        currentT += noise * step.w;
        positionUv += noise * step.w * viewDirUv;
    #endif

    FragmentInput fragmentInput;
    #if defined(STATISTICS)
        setStatistics(fragmentInput.metadata.statistics);
    #endif

    vec4 colorAccum = vec4(0.0);

    for (int stepCount = 0; stepCount < STEP_COUNT_MAX; ++stepCount) {
        // Read properties from the megatexture based on the traversal state
        Properties properties = accumulatePropertiesFromMegatexture(sampleDatas);

        // Prepare the custom shader inputs
        copyPropertiesToMetadata(properties, fragmentInput.metadata);
        fragmentInput.voxel.positionUv = positionUv;
        fragmentInput.voxel.positionShapeUv = pointJacobian.point;
        fragmentInput.voxel.positionUvLocal = sampleDatas[0].tileUv;
        fragmentInput.voxel.viewDirUv = viewDirUv;
        fragmentInput.voxel.viewDirWorld = viewDirWorld;
        fragmentInput.voxel.surfaceNormal = step.xyz;
        fragmentInput.voxel.travelDistance = step.w;
        fragmentInput.voxel.stepCount = stepCount;
        fragmentInput.voxel.tileIndex = sampleDatas[0].megatextureIndex;
        fragmentInput.voxel.sampleIndex = getSampleIndex(sampleDatas[0].tileUv);

        // Run the custom shader
        czm_modelMaterial materialOutput;
        fragmentMain(fragmentInput, materialOutput);

        // Sanitize the custom shader output
        vec4 color = vec4(materialOutput.diffuse, materialOutput.alpha);
        color.rgb = max(color.rgb, vec3(0.0));
        color.a = clamp(color.a, 0.0, 1.0);

        // Pre-multiplied alpha blend
        colorAccum += (1.0 - colorAccum.a) * vec4(color.rgb * color.a, color.a);

        // Stop traversing if the alpha has been fully saturated
        if (colorAccum.a > ALPHA_ACCUM_MAX) {
            colorAccum.a = ALPHA_ACCUM_MAX;
            break;
        }

        if (step.w == 0.0) {
            // Shape is infinitely thin. The ray may have hit the edge of a
            // foreground voxel. Step ahead slightly to check for more voxels
            step.w == 0.00001;
        }

        // Keep raymarching
        currentT += step.w;
        positionUv = viewPosUv + currentT * viewDirUv;

        // Check if there's more intersections.
        if (currentT > endT) {
            #if (INTERSECTION_COUNT == 1)
                break;
            #else
                shapeIntersection = nextIntersection(ix);
                if (shapeIntersection.entry.w == NO_HIT) {
                    break;
                } else {
                    // Found another intersection. Resume raymarching there
                    currentT = shapeIntersection.entry.w;
                    endT = shapeIntersection.exit.w;
                    positionUv = viewPosUv + currentT * viewDirUv;
                }
            #endif
        }

        // Traverse the tree from the current ray position.
        // This is similar to traverseOctreeFromBeginning but is faster when the ray is in the same tile as the previous step.
        pointJacobian = convertUvToShapeUvSpaceDerivative(positionUv);
        traverseOctreeFromExisting(pointJacobian.point, traversalData, sampleDatas);
        step = getStepSize(sampleDatas[0], viewRayUv, shapeIntersection, pointJacobian.jacobianT, currentT);
    }

    // Convert the alpha from [0,ALPHA_ACCUM_MAX] to [0,1]
    colorAccum.a /= ALPHA_ACCUM_MAX;

    #if defined(PICKING)
        // If alpha is 0.0 there is nothing to pick
        if (colorAccum.a == 0.0) {
            discard;
        }
        out_FragColor = u_pickColor;
    #elif defined(PICKING_VOXEL)
        // If alpha is 0.0 there is nothing to pick
        if (colorAccum.a == 0.0) {
            discard;
        }
        vec2 megatextureId = packIntToVec2(sampleDatas[0].megatextureIndex);
        vec2 sampleIndex = packIntToVec2(getSampleIndex(sampleDatas[0].tileUv));
        out_FragColor = vec4(megatextureId, sampleIndex);
    #else
        out_FragColor = colorAccum;
    #endif
}
