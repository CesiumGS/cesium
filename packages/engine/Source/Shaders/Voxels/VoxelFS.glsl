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
#define ALPHA_ACCUM_MAX 0.98 // Must be > 0.0 and <= 1.0

uniform mat3 u_transformDirectionViewToLocal;
uniform vec3 u_cameraPositionUv;
uniform float u_stepSize;

#if defined(PICKING)
    uniform vec4 u_pickColor;
#endif

#if defined(JITTER)
float hash(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * 50.0); // magic number = hashscale
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}
#endif

float minComponent(in vec3 v) {
    return min(min(v.x, v.y), v.z);
}

/**
 * Compute the normal of the surface the ray intersected when it entered the voxel.
 */
vec3 getVoxelNormalShapeSpace(in vec3 tileUv, in vec3 gradient) {
    vec3 voxelCoord = tileUv * vec3(u_dimensions);
    vec3 directions = sign(gradient);
    vec3 positiveDirections = max(directions, 0.0);
    vec3 entryShapeUv = mix(ceil(voxelCoord), floor(voxelCoord), positiveDirections);
    vec3 sampleDistanceFromEntry = voxelCoord - entryShapeUv;
    vec3 tileDistanceFromEntry = sampleDistanceFromEntry / vec3(u_dimensions);
    vec3 distanceFromEntry = scaleShapeUvToShapeSpace(tileDistanceFromEntry);
    vec3 distanceAlongRay = distanceFromEntry / gradient; // All positive
    float lastEntry = minComponent(distanceAlongRay);
    bvec3 isLastEntry = lessThanEqual(distanceAlongRay, vec3(lastEntry));
    return -1.0 * vec3(isLastEntry) * directions;
}

vec4 getStepSize(in SampleData sampleData, in Ray viewRay, in RayShapeIntersection shapeIntersection, in mat3 jacobianT) {
#if defined(SHAPE_BOX)
    Box voxelBox = constructVoxelBox(sampleData.tileCoords, sampleData.tileUv);
    RayShapeIntersection voxelIntersection = intersectBox(viewRay, voxelBox);
    vec4 entry = intersectionMax(shapeIntersection.entry, voxelIntersection.entry);
    float exit = min(voxelIntersection.exit.w, shapeIntersection.exit.w);
    float dt = (exit - entry.w) * RAY_SCALE;
    return vec4(normalize(entry.xyz), dt);
#elif defined(SHAPE_ELLIPSOID)
    float dimAtLevel = pow(2.0, float(sampleData.tileCoords.w));
    float tileSizeAtLevel = 1.0 / dimAtLevel;
    vec3 sampleSizeUv = tileSizeAtLevel / vec3(u_dimensions);
    vec3 sampleSizeShape = scaleShapeUvToShapeSpace(sampleSizeUv);

    // TODO: don't recompute this
    vec3 directionUnWarped = 2.0 * viewRay.dir * u_ellipsoidRadiiUv;
    vec3 gradient = directionUnWarped * jacobianT;

    vec3 normalShapeSpace = getVoxelNormalShapeSpace(sampleData.tileUv, gradient);
    vec3 normal = normalize(jacobianT * normalShapeSpace);

    vec3 sampleSizeAlongRay = sampleSizeShape / abs(gradient);
    float stepSize = minComponent(sampleSizeAlongRay) * u_stepSize;

    // TODO: check if shapeIntersection.entry is truncating the sample intersection
    //return vec4(normalize(shapeIntersection.entry.xyz), stepSize);
    return vec4(normal, stepSize);
#else
    float dimAtLevel = pow(2.0, float(sampleData.tileCoords.w));
    float shapeEntryT = shapeIntersection.entry.w * RAY_SCALE;
    float constantStep = u_stepSize / dimAtLevel;
    return vec4(normalize(shapeIntersection.entry.xyz), constantStep);
#endif
}

void main()
{
    vec4 fragCoord = gl_FragCoord;
    vec2 screenCoord = (fragCoord.xy - czm_viewport.xy) / czm_viewport.zw; // [0,1]
    vec3 eyeDirection = normalize(czm_windowToEyeCoordinates(fragCoord).xyz);
    vec3 viewDirWorld = normalize(czm_inverseViewRotation * eyeDirection); // normalize again just in case
    vec3 viewDirUv = normalize(u_transformDirectionViewToLocal * eyeDirection); // normalize again just in case
    vec3 viewPosUv = u_cameraPositionUv;
    #if defined(SHAPE_BOX)
        vec3 dInv = 1.0 / viewDirUv;
        Ray viewRayUv = Ray(viewPosUv, viewDirUv, dInv);
    #else
        Ray viewRayUv = Ray(viewPosUv, viewDirUv);
    #endif

    Intersections ix;
    RayShapeIntersection shapeIntersection = intersectScene(screenCoord, viewRayUv, ix);

    // Exit early if the scene was completely missed.
    if (shapeIntersection.entry.w == NO_HIT) {
        discard;
    }

    float currT = shapeIntersection.entry.w * RAY_SCALE;
    float endT = shapeIntersection.exit.w;
    vec3 positionUv = viewPosUv + currT * viewDirUv;
    // TODO: remove 2.0 factor?
    vec3 directionUnWarped = 2.0 * viewDirUv * u_ellipsoidRadiiUv;
    // TODO: revisit naming
    PointJacobianT pointJacobianShapeSpace = convertUvToShapeSpaceDerivative(positionUv);
    vec3 positionUvShapeSpace = convertShapeToShapeUvSpace(pointJacobianShapeSpace.point);

    // Traverse the tree from the start position
    TraversalData traversalData;
    SampleData sampleDatas[SAMPLE_COUNT];
    traverseOctreeFromBeginning(positionUvShapeSpace, traversalData, sampleDatas);
    vec4 step = getStepSize(sampleDatas[0], viewRayUv, shapeIntersection, pointJacobianShapeSpace.jacobianT);

    #if defined(JITTER)
        float noise = hash(screenCoord); // [0,1]
        currT += noise * step.w;
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
        fragmentInput.voxel.positionShapeUv = positionUvShapeSpace;
        fragmentInput.voxel.gradient = directionUnWarped * pointJacobianShapeSpace.jacobianT;
        fragmentInput.voxel.positionUvLocal = sampleDatas[0].tileUv;
        fragmentInput.voxel.viewDirUv = viewDirUv;
        fragmentInput.voxel.viewDirWorld = viewDirWorld;
        fragmentInput.voxel.surfaceNormal = step.xyz;
        fragmentInput.voxel.travelDistance = step.w;

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
        currT += step.w;
        positionUv += step.w * viewDirUv;

        // Check if there's more intersections.
        if (currT > endT) {
            #if (INTERSECTION_COUNT == 1)
                break;
            #else
                shapeIntersection = nextIntersection(ix);
                if (shapeIntersection.entry.w == NO_HIT) {
                    break;
                } else {
                    // Found another intersection. Resume raymarching there
                    currT = shapeIntersection.entry.w * RAY_SCALE;
                    endT = shapeIntersection.exit.w;
                    positionUv = viewPosUv + currT * viewDirUv;
                }
            #endif
        }

        // Traverse the tree from the current ray position.
        // This is similar to traverseOctreeFromBeginning but is faster when the ray is in the same tile as the previous step.
        pointJacobianShapeSpace = convertUvToShapeSpaceDerivative(positionUv);
        positionUvShapeSpace = convertShapeToShapeUvSpace(pointJacobianShapeSpace.point);
        traverseOctreeFromExisting(positionUvShapeSpace, traversalData, sampleDatas);
        step = getStepSize(sampleDatas[0], viewRayUv, shapeIntersection, pointJacobianShapeSpace.jacobianT);
    }

    // Convert the alpha from [0,ALPHA_ACCUM_MAX] to [0,1]
    colorAccum.a /= ALPHA_ACCUM_MAX;

    #if defined(PICKING)
        // If alpha is 0.0 there is nothing to pick
        if (colorAccum.a == 0.0) {
            discard;
        }
        out_FragColor = u_pickColor;
    #else
        out_FragColor = colorAccum;
    #endif
}
