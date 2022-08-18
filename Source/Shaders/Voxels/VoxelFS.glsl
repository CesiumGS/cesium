// import { intersectScene } from "./Intersection.glsl";
// import { TraversalData, SampleData, traverseOctreeFromBeginning, traverseOctreeFromExisting } from "./Octree.glsl";
// import { accumulatePropertiesFromMegatexture } from "./Megatexture.glsl";

#define STEP_COUNT_MAX 1000 // Harcoded value because GLSL doesn't like variable length loops
#define ALPHA_ACCUM_MAX 0.98 // Must be > 0.0 and <= 1.0

uniform mat3 u_transformDirectionViewToLocal;
uniform vec3 u_cameraPositionUv;

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

void main()
{
    vec4 fragCoord = gl_FragCoord;
    vec2 screenCoord = (fragCoord.xy - czm_viewport.xy) / czm_viewport.zw; // [0,1]
    vec3 eyeDirection = normalize(czm_windowToEyeCoordinates(fragCoord).xyz);
    vec3 viewDirWorld = normalize(czm_inverseViewRotation * eyeDirection); // normalize again just in case
    vec3 viewDirUv = normalize(u_transformDirectionViewToLocal * eyeDirection); // normalize again just in case
    vec3 viewPosUv = u_cameraPositionUv;

    Intersections ix;
    vec2 entryExitT = intersectScene(screenCoord, viewPosUv, viewDirUv, ix);

    // Exit early if the scene was completely missed.
    if (entryExitT.x == NO_HIT) {
        discard;
    }

    float currT = entryExitT.x;
    float endT = entryExitT.y;
    vec3 positionUv = viewPosUv + currT * viewDirUv;

    // Traverse the tree from the start position
    TraversalData traversalData;
    SampleData sampleDatas[SAMPLE_COUNT];
    traverseOctreeFromBeginning(positionUv, traversalData, sampleDatas);

    #if defined(JITTER)
        float noise = hash(screenCoord); // [0,1]
        currT += noise * traversalData.stepT;
        positionUv += noise * traversalData.stepT * viewDirUv;
    #endif

    FragmentInput fragmentInput;
    #if defined(STATISTICS)
        setStatistics(fragmentInput.metadata.statistics);
    #endif

    vec4 colorAccum =vec4(0.0);

    for (int stepCount = 0; stepCount < STEP_COUNT_MAX; ++stepCount) {
        // Read properties from the megatexture based on the traversal state
        Properties properties = accumulatePropertiesFromMegatexture(sampleDatas);
        
        // Prepare the custom shader inputs
        copyPropertiesToMetadata(properties, fragmentInput.metadata);
        fragmentInput.voxel.positionUv = positionUv;
        fragmentInput.voxel.positionShapeUv = traversalData.positionUvShapeSpace;
        fragmentInput.voxel.positionUvLocal = traversalData.positionUvLocal;
        fragmentInput.voxel.viewDirUv = viewDirUv;
        fragmentInput.voxel.viewDirWorld = viewDirWorld;
        fragmentInput.voxel.travelDistance = traversalData.stepT;

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
        currT += traversalData.stepT;
        positionUv += traversalData.stepT * viewDirUv;

        // Check if there's more intersections.
        if (currT > endT) {
            #if (INTERSECTION_COUNT == 1)
                break;
            #else
                vec2 entryExitT = nextIntersection(ix);
                if (entryExitT.x == NO_HIT) {
                    break;
                } else {
                    // Found another intersection. Keep raymarching.
                    currT += entryExitT.x;
                    endT += entryExitT.y;
                    positionUv += entryExitT.x * viewDirUv;
                }
            #endif
        }

        // Traverse the tree from the current ray position.
        // This is similar to traverseOctree but is faster when the ray is in the same tile as the previous step.
        traverseOctreeFromExisting(positionUv, traversalData, sampleDatas);
    }

    // Convert the alpha from [0,ALPHA_ACCUM_MAX] to [0,1]
    colorAccum.a /= ALPHA_ACCUM_MAX;

    #if defined(PICKING)
        // If alpha is 0.0 there is nothing to pick
        if (colorAccum.a == 0.0) {
            discard;
        }
        gl_FragColor = u_pickColor;
    #else
        gl_FragColor = colorAccum;
    #endif
}
