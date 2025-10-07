// See Intersection.glsl for the definition of intersectScene
// See IntersectionUtils.glsl for the definition of nextIntersection
// See convertLocalToBoxUv.glsl, convertLocalToCylinderUv.glsl, or convertLocalToEllipsoidUv.glsl
// for the definitions of convertLocalToShapeSpaceDerivative and getTileAndUvCoordinate. 
// The appropriate functions are selected based on the VoxelPrimitive shape type, 
// and added to the shader in Scene/VoxelRenderResources.js.
// See Octree.glsl for the definitions of TraversalData, SampleData,
// traverseOctreeFromBeginning, and traverseOctreeFromExisting
// See Megatexture.glsl for the definition of accumulatePropertiesFromMegatexture

#define STEP_COUNT_MAX 1000 // Harcoded value because GLSL doesn't like variable length loops
#if defined(PICKING_VOXEL)
    #define ALPHA_ACCUM_MAX 0.1
#else
    #define ALPHA_ACCUM_MAX 0.98 // Must be > 0.0 and <= 1.0
#endif

uniform mat4 u_transformPositionViewToLocal;
uniform mat3 u_transformDirectionViewToLocal;
uniform vec3 u_cameraPositionLocal;
uniform vec3 u_cameraDirectionLocal;
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
    vec3 gradient = viewRay.dir * jacobianT;
    vec3 sampleSizeAlongRay = getSampleSize(sampleData.tileCoords.w) / gradient;

    RayShapeIntersection voxelIntersection = getVoxelIntersection(sampleData.tileUv, sampleSizeAlongRay);

    // Transform normal from shape space to Cartesian space to eye space
    vec3 voxelNormal = jacobianT * voxelIntersection.entry.xyz;
    voxelNormal = normalize(czm_normal * voxelNormal);

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

int getSampleIndex(in SampleData sampleData) {
    // tileUv = 1.0 is a valid coordinate but sampleIndex = u_inputDimensions is not.
    // (tileUv = 1.0 corresponds to the far edge of the last sample, at index = u_inputDimensions - 1).
    // Clamp to [0, voxelDimensions - 0.5) to avoid numerical error before flooring
    vec3 maxCoordinate = vec3(u_inputDimensions) - vec3(0.5);
    vec3 inputCoordinate = clamp(sampleData.inputCoordinate, vec3(0.0), maxCoordinate);
    ivec3 sampleIndex = ivec3(floor(inputCoordinate));
    // Convert to a 1D index for lookup in a 1D data array
    return sampleIndex.x + u_inputDimensions.x * (sampleIndex.y + u_inputDimensions.y * sampleIndex.z);
}

/**
 * Compute the view ray at the current fragment, in the local coordinates of the shape.
 */
Ray getViewRayLocal() {
    vec4 eyeCoordinates = czm_windowToEyeCoordinates(gl_FragCoord);
    vec3 origin;
    vec3 direction;
    if (czm_orthographicIn3D == 1.0) {
        eyeCoordinates.z = 0.0;
        origin = (u_transformPositionViewToLocal * eyeCoordinates).xyz;
        direction = u_cameraDirectionLocal;
    } else {
        origin = u_cameraPositionLocal;
        direction = u_transformDirectionViewToLocal * normalize(eyeCoordinates.xyz);
    }
    return Ray(origin, direction);
}

Ray getViewRayEC() {
    vec4 eyeCoordinates = czm_windowToEyeCoordinates(gl_FragCoord);
    vec3 viewPosEC = (czm_orthographicIn3D == 1.0)
        ? vec3(eyeCoordinates.xy, 0.0)
        : vec3(0.0);
    vec3 viewDirEC = normalize(eyeCoordinates.xyz);
    return Ray(viewPosEC, viewDirEC);
}

void main()
{
    Ray viewRayLocal = getViewRayLocal();
    Ray viewRayEC = getViewRayEC();

    Intersections ix;
    vec2 screenCoord = (gl_FragCoord.xy - czm_viewport.xy) / czm_viewport.zw; // [0,1]
    RayShapeIntersection shapeIntersection = intersectScene(screenCoord, viewRayLocal, viewRayEC, ix);
    // Exit early if the scene was completely missed.
    if (shapeIntersection.entry.w == NO_HIT) {
        discard;
    }

    float currentT = shapeIntersection.entry.w;
    float endT = shapeIntersection.exit.w;

    vec3 positionEC = viewRayEC.pos + currentT * viewRayEC.dir;
    TileAndUvCoordinate tileAndUv = getTileAndUvCoordinate(positionEC);
    vec3 positionLocal = viewRayLocal.pos + currentT * viewRayLocal.dir;
    mat3 jacobianT = convertLocalToShapeSpaceDerivative(positionLocal);

    // Traverse the tree from the start position
    TraversalData traversalData;
    SampleData sampleDatas[SAMPLE_COUNT];
    traverseOctreeFromBeginning(tileAndUv, traversalData, sampleDatas);
    vec4 step = getStepSize(sampleDatas[0], viewRayLocal, shapeIntersection, jacobianT, currentT);

    FragmentInput fragmentInput;
    #if defined(STATISTICS)
        setStatistics(fragmentInput.metadataStatistics);
    #endif

    czm_modelMaterial materialOutput;
    vec4 colorAccum = vec4(0.0);

    for (int stepCount = 0; stepCount < STEP_COUNT_MAX; ++stepCount) {
        // Read properties from the megatexture based on the traversal state
        Properties properties = accumulatePropertiesFromMegatexture(sampleDatas);

        // Prepare the custom shader inputs
        copyPropertiesToMetadata(properties, fragmentInput.metadata);

        fragmentInput.attributes.positionEC = positionEC;
        // Re-normalize normals: some shape intersections may have been scaled to encode positive/negative shapes
        fragmentInput.attributes.normalEC = normalize(step.xyz);

        fragmentInput.voxel.viewDirUv = viewRayLocal.dir;

        fragmentInput.voxel.travelDistance = step.w;
        fragmentInput.voxel.stepCount = stepCount;
        fragmentInput.voxel.tileIndex = sampleDatas[0].megatextureIndex;
        fragmentInput.voxel.sampleIndex = getSampleIndex(sampleDatas[0]);
        fragmentInput.voxel.distanceToDepthBuffer = ix.distanceToDepthBuffer - currentT;

        // Run the custom shader
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
                }
            #endif
        }
        positionEC = viewRayEC.pos + currentT * viewRayEC.dir;
        tileAndUv = getTileAndUvCoordinate(positionEC);
        positionLocal = viewRayLocal.pos + currentT * viewRayLocal.dir;
        jacobianT = convertLocalToShapeSpaceDerivative(positionLocal);

        // Traverse the tree from the current ray position.
        // This is similar to traverseOctreeFromBeginning but is faster when the ray is in the same tile as the previous step.
        traverseOctreeFromExisting(tileAndUv, traversalData, sampleDatas);
        step = getStepSize(sampleDatas[0], viewRayLocal, shapeIntersection, jacobianT, currentT);
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
        vec2 sampleIndex = packIntToVec2(getSampleIndex(sampleDatas[0]));
        out_FragColor = vec4(megatextureId, sampleIndex);
    #else
        out_FragColor = colorAccum;
    #endif
}
