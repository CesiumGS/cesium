//This file is automatically rebuilt by the Cesium build process.
export default "// See Intersection.glsl for the definition of intersectScene\n\
// See IntersectionUtils.glsl for the definition of nextIntersection\n\
// See convertUvToBox.glsl, convertUvToCylinder.glsl, or convertUvToEllipsoid.glsl\n\
// for the definition of convertUvToShapeUvSpace. The appropriate function is \n\
// selected based on the VoxelPrimitive shape type, and added to the shader in\n\
// Scene/VoxelRenderResources.js.\n\
// See Octree.glsl for the definitions of TraversalData, SampleData,\n\
// traverseOctreeFromBeginning, and traverseOctreeFromExisting\n\
// See Megatexture.glsl for the definition of accumulatePropertiesFromMegatexture\n\
\n\
#define STEP_COUNT_MAX 1000 // Harcoded value because GLSL doesn't like variable length loops\n\
#define ALPHA_ACCUM_MAX 0.98 // Must be > 0.0 and <= 1.0\n\
\n\
uniform mat3 u_transformDirectionViewToLocal;\n\
uniform vec3 u_cameraPositionUv;\n\
uniform float u_stepSize;\n\
\n\
#if defined(PICKING)\n\
    uniform vec4 u_pickColor;\n\
#endif\n\
\n\
#if defined(JITTER)\n\
float hash(vec2 p)\n\
{\n\
    vec3 p3 = fract(vec3(p.xyx) * 50.0); // magic number = hashscale\n\
    p3 += dot(p3, p3.yzx + 19.19);\n\
    return fract((p3.x + p3.y) * p3.z);\n\
}\n\
#endif\n\
\n\
vec4 getStepSize(in SampleData sampleData, in Ray viewRay, in RayShapeIntersection shapeIntersection) {\n\
#if defined(SHAPE_BOX)\n\
    Box voxelBox = constructVoxelBox(sampleData.tileCoords, sampleData.tileUv);\n\
    RayShapeIntersection voxelIntersection = intersectBox(viewRay, voxelBox);\n\
    vec4 entry = shapeIntersection.entry.w >= voxelIntersection.entry.w ? shapeIntersection.entry : voxelIntersection.entry;\n\
    float exit = min(voxelIntersection.exit.w, shapeIntersection.exit.w);\n\
    float dt = (exit - entry.w) * RAY_SCALE;\n\
    return vec4(normalize(entry.xyz), dt);\n\
#else\n\
    float dimAtLevel = pow(2.0, float(sampleData.tileCoords.w));\n\
    return vec4(viewRay.dir, u_stepSize / dimAtLevel);\n\
#endif\n\
}\n\
\n\
void main()\n\
{\n\
    vec4 fragCoord = gl_FragCoord;\n\
    vec2 screenCoord = (fragCoord.xy - czm_viewport.xy) / czm_viewport.zw; // [0,1]\n\
    vec3 eyeDirection = normalize(czm_windowToEyeCoordinates(fragCoord).xyz);\n\
    vec3 viewDirWorld = normalize(czm_inverseViewRotation * eyeDirection); // normalize again just in case\n\
    vec3 viewDirUv = normalize(u_transformDirectionViewToLocal * eyeDirection); // normalize again just in case\n\
    vec3 viewPosUv = u_cameraPositionUv;\n\
    #if defined(SHAPE_BOX)\n\
        vec3 dInv = 1.0 / viewDirUv;\n\
        Ray viewRayUv = Ray(viewPosUv, viewDirUv, dInv);\n\
    #else\n\
        Ray viewRayUv = Ray(viewPosUv, viewDirUv);\n\
    #endif\n\
\n\
    Intersections ix;\n\
    RayShapeIntersection shapeIntersection = intersectScene(screenCoord, viewRayUv, ix);\n\
\n\
    // Exit early if the scene was completely missed.\n\
    if (shapeIntersection.entry.w == NO_HIT) {\n\
        discard;\n\
    }\n\
\n\
    float currT = shapeIntersection.entry.w * RAY_SCALE;\n\
    float endT = shapeIntersection.exit.w;\n\
    vec3 positionUv = viewPosUv + currT * viewDirUv;\n\
    vec3 positionUvShapeSpace = convertUvToShapeUvSpace(positionUv);\n\
\n\
    // Traverse the tree from the start position\n\
    TraversalData traversalData;\n\
    SampleData sampleDatas[SAMPLE_COUNT];\n\
    traverseOctreeFromBeginning(positionUvShapeSpace, traversalData, sampleDatas);\n\
    vec4 step = getStepSize(sampleDatas[0], viewRayUv, shapeIntersection);\n\
\n\
    #if defined(JITTER)\n\
        float noise = hash(screenCoord); // [0,1]\n\
        currT += noise * step.w;\n\
        positionUv += noise * step.w * viewDirUv;\n\
    #endif\n\
\n\
    FragmentInput fragmentInput;\n\
    #if defined(STATISTICS)\n\
        setStatistics(fragmentInput.metadata.statistics);\n\
    #endif\n\
\n\
    vec4 colorAccum =vec4(0.0);\n\
\n\
    for (int stepCount = 0; stepCount < STEP_COUNT_MAX; ++stepCount) {\n\
        // Read properties from the megatexture based on the traversal state\n\
        Properties properties = accumulatePropertiesFromMegatexture(sampleDatas);\n\
\n\
        // Prepare the custom shader inputs\n\
        copyPropertiesToMetadata(properties, fragmentInput.metadata);\n\
        fragmentInput.voxel.positionUv = positionUv;\n\
        fragmentInput.voxel.positionShapeUv = positionUvShapeSpace;\n\
        fragmentInput.voxel.positionUvLocal = sampleDatas[0].tileUv;\n\
        fragmentInput.voxel.viewDirUv = viewDirUv;\n\
        fragmentInput.voxel.viewDirWorld = viewDirWorld;\n\
        fragmentInput.voxel.surfaceNormal = step.xyz;\n\
        fragmentInput.voxel.travelDistance = step.w;\n\
\n\
        // Run the custom shader\n\
        czm_modelMaterial materialOutput;\n\
        fragmentMain(fragmentInput, materialOutput);\n\
\n\
        // Sanitize the custom shader output\n\
        vec4 color = vec4(materialOutput.diffuse, materialOutput.alpha);\n\
        color.rgb = max(color.rgb, vec3(0.0));\n\
        color.a = clamp(color.a, 0.0, 1.0);\n\
\n\
        // Pre-multiplied alpha blend\n\
        colorAccum += (1.0 - colorAccum.a) * vec4(color.rgb * color.a, color.a);\n\
\n\
        // Stop traversing if the alpha has been fully saturated\n\
        if (colorAccum.a > ALPHA_ACCUM_MAX) {\n\
            colorAccum.a = ALPHA_ACCUM_MAX;\n\
            break;\n\
        }\n\
\n\
        if (step.w == 0.0) {\n\
            // Shape is infinitely thin. The ray may have hit the edge of a\n\
            // foreground voxel. Step ahead slightly to check for more voxels\n\
            step.w == 0.00001;\n\
        }\n\
\n\
        // Keep raymarching\n\
        currT += step.w;\n\
        positionUv += step.w * viewDirUv;\n\
\n\
        // Check if there's more intersections.\n\
        if (currT > endT) {\n\
            #if (INTERSECTION_COUNT == 1)\n\
                break;\n\
            #else\n\
                shapeIntersection = nextIntersection(ix);\n\
                if (shapeIntersection.entry.w == NO_HIT) {\n\
                    break;\n\
                } else {\n\
                    // Found another intersection. Resume raymarching there\n\
                    currT = shapeIntersection.entry.w * RAY_SCALE;\n\
                    endT = shapeIntersection.exit.w;\n\
                    positionUv = viewPosUv + currT * viewDirUv;\n\
                }\n\
            #endif\n\
        }\n\
\n\
        // Traverse the tree from the current ray position.\n\
        // This is similar to traverseOctreeFromBeginning but is faster when the ray is in the same tile as the previous step.\n\
        positionUvShapeSpace = convertUvToShapeUvSpace(positionUv);\n\
        traverseOctreeFromExisting(positionUvShapeSpace, traversalData, sampleDatas);\n\
        step = getStepSize(sampleDatas[0], viewRayUv, shapeIntersection);\n\
    }\n\
\n\
    // Convert the alpha from [0,ALPHA_ACCUM_MAX] to [0,1]\n\
    colorAccum.a /= ALPHA_ACCUM_MAX;\n\
\n\
    #if defined(PICKING)\n\
        // If alpha is 0.0 there is nothing to pick\n\
        if (colorAccum.a == 0.0) {\n\
            discard;\n\
        }\n\
        out_FragColor = u_pickColor;\n\
    #else\n\
        out_FragColor = colorAccum;\n\
    #endif\n\
}\n\
";
