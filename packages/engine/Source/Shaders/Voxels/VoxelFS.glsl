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

vec4 getNextRayPosition(inout Ray viewRay, in SampleData sampleData, in RayShapeIntersection shapeIntersection, in float currentT) {
    float lodStep = u_stepSize / pow(2.0, float(sampleData.tileCoords.w));
#if defined(CONSTANT_STEP)
    // Shrink the step size for points closer to the camera
    // float dt = min(lodStep, lodStep * max(0.04, 4.0 * currentT));
    return vec4(viewRay.dir, currentT + lodStep);
#else
    #if defined(SHAPE_BOX)
        VoxelBounds voxel = constructVoxelBounds(sampleData.tileCoords, sampleData.tileUv);
    #else
        VoxelCell voxel = constructVoxelCell(sampleData.tileCoords, sampleData.tileUv);
    #endif
    RayShapeIntersection voxelIntersection = intersectVoxel(viewRay, voxel);
    vec4 exit = intersectionMin(voxelIntersection.exit, shapeIntersection.exit);
    float dt = clamp(100.0 * currentT * lodStep, 0.01 * lodStep, 0.1 * lodStep);
    vec3 dPosition = exit.w * viewRay.dir + dt * exit.xyz;
    viewRay.pos += dPosition;
    return vec4(-1.0 * normalize(exit.xyz), exit.w);
#endif
}

void main()
{
    vec4 fragCoord = gl_FragCoord;
    vec2 screenCoord = (fragCoord.xy - czm_viewport.xy) / czm_viewport.zw; // [0,1]
    vec3 eyeDirection = normalize(czm_windowToEyeCoordinates(fragCoord).xyz);
    vec3 viewDirWorld = normalize(czm_inverseViewRotation * eyeDirection); // normalize again just in case
    vec3 viewDirUv = normalize(u_transformDirectionViewToLocal * eyeDirection);
    vec3 viewPosUv = u_cameraPositionUv;
    #if defined(SHAPE_BOX)
        vec3 dInv = 1.0 / viewDirUv;
        Ray viewRayUv = Ray(viewPosUv, viewDirUv, dInv);
    #else
        Ray viewRayUv = Ray(viewPosUv, viewDirUv);
    #endif

    Intersections ix;
    RayShapeIntersection shapeIntersection = intersectScene(screenCoord, viewRayUv, ix);
    vec4 cellIntersection = shapeIntersection.entry;

    // Exit early if the scene was completely missed.
    if (cellIntersection.w == NO_HIT) {
        discard;
    }

    float currT = cellIntersection.w;
    vec3 dPosition = currT * (viewDirUv - 0.01 * u_stepSize * cellIntersection.xyz);
    viewRayUv.pos = viewPosUv + dPosition;

    // Traverse the tree from the start position
    vec3 positionUvShapeSpace = convertUvToShapeUvSpace(viewRayUv.pos);
    TraversalData traversalData;
    SampleData sampleDatas[SAMPLE_COUNT];
    traverseOctreeFromBeginning(positionUvShapeSpace, traversalData, sampleDatas);

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
        fragmentInput.voxel.positionUv = viewRayUv.pos;
        fragmentInput.voxel.positionShapeUv = positionUvShapeSpace;
        fragmentInput.voxel.positionUvLocal = sampleDatas[0].tileUv;
        fragmentInput.voxel.viewDirUv = viewDirUv;
        fragmentInput.voxel.viewDirWorld = viewDirWorld;
        fragmentInput.voxel.surfaceNormal = cellIntersection.xyz;
        fragmentInput.voxel.stepCount = stepCount;
        fragmentInput.voxel.travelDistance = cellIntersection.w;

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

        // Keep raymarching
        cellIntersection = getNextRayPosition(viewRayUv, sampleDatas[0], shapeIntersection, currT);
        currT += cellIntersection.w;

        // Check if there's more intersections.
        if (currT >= shapeIntersection.exit.w) {
            #if (INTERSECTION_COUNT == 1)
                break;
            #else
                shapeIntersection = nextIntersection(ix);
                if (shapeIntersection.entry.w == NO_HIT) {
                    break;
                } else {
                    // Found another intersection. Resume raymarching there
                    cellIntersection = shapeIntersection.entry;
                    float dt = cellIntersection.w - currT;
                    currT = cellIntersection.w;
                    cellIntersection.w = dt;
                    dPosition = currT * (viewDirUv - 0.01 * u_stepSize * cellIntersection.xyz);
                    viewRayUv.pos = viewPosUv + dPosition;
                }
            #endif
        }

        // Traverse the tree from the current ray position.
        // This is similar to traverseOctreeFromBeginning but is faster when the ray is in the same tile as the previous step.
        positionUvShapeSpace = convertUvToShapeUvSpace(viewRayUv.pos);
        traverseOctreeFromExisting(positionUvShapeSpace, traversalData, sampleDatas);
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
