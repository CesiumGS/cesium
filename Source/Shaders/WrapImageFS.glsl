#extension GL_EXT_frag_depth : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
    #define highp mediump
#endif

#define REQUIRES_EC
#define REQUIRES_WC
#define TEXTURE_COORDINATES
#define CULL_FRAGMENTS
#define NORMAL_EC
#define VERTEX_TEXTURE_COORDS
#define USES_NORMAL_EC
#define USES_POSITION_TO_EYE_EC
#define OES_texture_float_linear







const float czm_epsilon2 = 0.01;
















const float czm_pi = 3.141592653589793;
















const float czm_piOverTwo = 1.5707963267948966;














float czm_branchFreeTernary(bool comparison, float a, float b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}














vec2 czm_branchFreeTernary(bool comparison, vec2 a, vec2 b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}














vec3 czm_branchFreeTernary(bool comparison, vec3 a, vec3 b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}














vec4 czm_branchFreeTernary(bool comparison, vec4 a, vec4 b) {
    float useA = float(comparison);
    return a * useA + b * (1.0 - useA);
}

uniform mat3 czm_normal3D;
uniform vec3 czm_lightColor;










const float czm_sceneMode3D = 3.0;

uniform float czm_sceneMode;




















float czm_getSpecular(vec3 lightDirectionEC, vec3 toEyeEC, vec3 normalEC, float shininess)
{
    vec3 toReflectedLight = reflect(-lightDirectionEC, normalEC);
    float specular = max(dot(toReflectedLight, toEyeEC), 0.0);



    return pow(specular, max(shininess, czm_epsilon2));
}



















float czm_getLambertDiffuse(vec3 lightDirectionEC, vec3 normalEC)
{
    return max(dot(lightDirectionEC, normalEC), 0.0);
}














struct czm_material
{
    vec3 diffuse;
    float specular;
    float shininess;
    vec3 normal;
    vec3 emission;
    float alpha;
};






















float czm_fastApproximateAtan(float x) {
    return x * (-0.1784 * x - 0.0663 * x * x + 1.0301);
}















float czm_fastApproximateAtan(float x, float y) {


    float t = abs(x);
    float opposite = abs(y);
    float adjacent = max(t, opposite);
    opposite = min(t, opposite);

    t = czm_fastApproximateAtan(opposite / adjacent);


    t = czm_branchFreeTernary(abs(y) > abs(x), czm_piOverTwo - t, t);
    t = czm_branchFreeTernary(x < 0.0, czm_pi - t, t);
    t = czm_branchFreeTernary(y < 0.0, -t, t);
    return t;
}

uniform float czm_log2FarDepthFromNearPlusOne;
uniform vec2 czm_currentFrustum;
uniform vec4 czm_frustumPlanes;
uniform mat4 czm_inverseProjection;
uniform mat4 czm_viewportTransformation;
uniform vec4 czm_viewport;
uniform float czm_gamma;
















struct czm_materialInput
{
    float s;
    vec2 st;
    vec3 str;
    vec3 normalEC;
    mat3 tangentToEyeMatrix;
    vec3 positionToEyeEC;
    float height;
    float slope;
    float aspect;
};












float czm_lineDistance(vec2 point1, vec2 point2, vec2 point) {
    return abs((point2.y - point1.y) * point.x - (point2.x - point1.x) * point.y + point2.x * point1.y - point2.y * point1.x) / distance(point2, point1);
}























mat3 czm_eastNorthUpToEyeCoordinates(vec3 positionMC, vec3 normalEC)
{
    vec3 tangentMC = normalize(vec3(-positionMC.y, positionMC.x, 0.0));
    vec3 tangentEC = normalize(czm_normal3D * tangentMC);
    vec3 bitangentEC = normalize(cross(normalEC, tangentEC));

    return mat3(
        tangentEC.x,   tangentEC.y,   tangentEC.z,
        bitangentEC.x, bitangentEC.y, bitangentEC.z,
        normalEC.x,    normalEC.y,    normalEC.z);
}

uniform vec3 czm_lightDirectionEC;
float czm_private_getLambertDiffuseOfMaterial(vec3 lightDirectionEC, czm_material material)
{
    return czm_getLambertDiffuse(lightDirectionEC, material.normal);
}

float czm_private_getSpecularOfMaterial(vec3 lightDirectionEC, vec3 toEyeEC, czm_material material)
{
    return czm_getSpecular(lightDirectionEC, toEyeEC, material.normal, material.shininess);
}




















vec4 czm_phong(vec3 toEye, czm_material material, vec3 lightDirectionEC)
{

    float diffuse = czm_private_getLambertDiffuseOfMaterial(vec3(0.0, 0.0, 1.0), material);
    if (czm_sceneMode == czm_sceneMode3D) {

        diffuse += czm_private_getLambertDiffuseOfMaterial(vec3(0.0, 1.0, 0.0), material);
    }

    float specular = czm_private_getSpecularOfMaterial(lightDirectionEC, toEye, material);


    vec3 materialDiffuse = material.diffuse * 0.5;

    vec3 ambient = materialDiffuse;
    vec3 color = ambient + material.emission;
    color += materialDiffuse * diffuse * czm_lightColor;
    color += material.specular * specular * czm_lightColor;

    return vec4(color, material.alpha);
}

vec4 czm_private_phong(vec3 toEye, czm_material material, vec3 lightDirectionEC)
{
    float diffuse = czm_private_getLambertDiffuseOfMaterial(lightDirectionEC, material);
    float specular = czm_private_getSpecularOfMaterial(lightDirectionEC, toEye, material);

    vec3 ambient = vec3(0.0);
    vec3 color = ambient + material.emission;
    color += material.diffuse * diffuse * czm_lightColor;
    color += material.specular * specular * czm_lightColor;

    return vec4(color, material.alpha);
}


#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)
varying float v_WindowZ;
#endif

















void czm_writeDepthClamp()
{
#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)
    gl_FragDepthEXT = clamp(v_WindowZ * gl_FragCoord.w, 0.0, 1.0);
#endif
}











float czm_planeDistance(vec4 plane, vec3 point) {
    return (dot(plane.xyz, point) + plane.w);
}












float czm_planeDistance(vec3 planeNormal, float planeDistance, vec3 point) {
    return (dot(planeNormal, point) + planeDistance);
}
















const float czm_twoPi = 6.283185307179586;













vec2 czm_approximateSphericalCoordinates(vec3 normal) {

    float latitudeApproximation = czm_fastApproximateAtan(sqrt(normal.x * normal.x + normal.y * normal.y), normal.z);
    float longitudeApproximation = czm_fastApproximateAtan(normal.x, normal.y);
    return vec2(latitudeApproximation, longitudeApproximation);
}

uniform mat4 czm_inverseView;
uniform sampler2D czm_globeDepthTexture;










 float czm_unpackDepth(vec4 packedDepth)
 {


    return dot(packedDepth, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
 }


























vec4 czm_windowToEyeCoordinates(vec4 fragmentCoordinate)
{

    float x = 2.0 * (fragmentCoordinate.x - czm_viewport.x) / czm_viewport.z - 1.0;
    float y = 2.0 * (fragmentCoordinate.y - czm_viewport.y) / czm_viewport.w - 1.0;
    float z = (fragmentCoordinate.z - czm_viewportTransformation[3][2]) / czm_viewportTransformation[2][2];
    vec4 q = vec4(x, y, z, 1.0);


    q /= fragmentCoordinate.w;


    if (!(czm_inverseProjection == mat4(0.0)))
    {
        q = czm_inverseProjection * q;
    }
    else
    {
        float top = czm_frustumPlanes.x;
        float bottom = czm_frustumPlanes.y;
        float left = czm_frustumPlanes.z;
        float right = czm_frustumPlanes.w;

        float near = czm_currentFrustum.x;
        float far = czm_currentFrustum.y;

        q.x = (q.x * (right - left) + left + right) * 0.5;
        q.y = (q.y * (top - bottom) + bottom + top) * 0.5;
        q.z = (q.z * (near - far) - near - far) * 0.5;
        q.w = 1.0;
    }

    return q;
}





















vec4 czm_windowToEyeCoordinates(vec2 fragmentCoordinateXY, float depthOrLogDepth)
{

#ifdef LOG_DEPTH
    float near = czm_currentFrustum.x;
    float far = czm_currentFrustum.y;
    float log2Depth = depthOrLogDepth * czm_log2FarDepthFromNearPlusOne;
    float depthFromNear = pow(2.0, log2Depth) - 1.0;
    float depthFromCamera = depthFromNear + near;
    vec4 windowCoord = vec4(fragmentCoordinateXY, far * (1.0 - near / depthFromCamera) / (far - near), 1.0);
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(windowCoord);
    eyeCoordinate.w = 1.0 / depthFromCamera;
    return eyeCoordinate;
#else
    vec4 windowCoord = vec4(fragmentCoordinateXY, depthOrLogDepth, 1.0);
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(windowCoord);
#endif
    return eyeCoordinate;
}










vec3 czm_gammaCorrect(vec3 color) {
#ifdef HDR
    color = pow(color, vec3(czm_gamma));
#endif
    return color;
}

vec4 czm_gammaCorrect(vec4 color) {
#ifdef HDR
    color.rgb = pow(color.rgb, vec3(czm_gamma));
#endif
    return color;
}

















czm_material czm_getDefaultMaterial(czm_materialInput materialInput)
{
    czm_material material;
    material.diffuse = vec3(0.0);
    material.specular = 0.0;
    material.shininess = 1.0;
    material.normal = materialInput.normalEC;
    material.emission = vec3(0.0);
    material.alpha = 1.0;
    return material;
}



#line 0

#line 0
uniform vec4 color_2;uniform vec2 repeat_1;uniform sampler2D image_0;czm_material czm_getMaterial(czm_materialInput materialInput)
{
czm_material material = czm_getDefaultMaterial(materialInput);
material.diffuse = czm_gammaCorrect(texture2D(image_0, materialInput.st).rgb * color_2.rgb);
material.alpha = texture2D(image_0, materialInput.st).a * color_2.a;
return material;
}

#line 0
#ifdef GL_EXT_frag_depth

#endif

#ifdef TEXTURE_COORDINATES
#ifdef SPHERICAL
varying vec4 v_sphericalExtents;
#else
varying vec2 v_inversePlaneExtents;
varying vec4 v_westPlane;
varying vec4 v_southPlane;
#endif
varying vec3 v_uvMinAndSphericalLongitudeRotation;
varying vec3 v_uMaxAndInverseDistance;
varying vec3 v_vMaxAndInverseDistance;
#endif



#ifdef VERTEX_TEXTURE_COORDS
varying highp vec2 vTextureCoord;
#endif

#ifdef PER_INSTANCE_COLOR
varying vec4 v_color;
#endif

#ifdef NORMAL_EC
vec3 getEyeCoordinate3FromWindowCoordinate(vec2 fragCoord, float logDepthOrDepth) {
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(fragCoord, logDepthOrDepth);
    return eyeCoordinate.xyz / eyeCoordinate.w;
}

vec3 vectorFromOffset(vec4 eyeCoordinate, vec2 positiveOffset) {
    vec2 glFragCoordXY = gl_FragCoord.xy;

    float upOrRightLogDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (glFragCoordXY + positiveOffset) / czm_viewport.zw));
    float downOrLeftLogDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, (glFragCoordXY - positiveOffset) / czm_viewport.zw));


    bvec2 upOrRightInBounds = lessThan(glFragCoordXY + positiveOffset, czm_viewport.zw);
    float useUpOrRight = float(upOrRightLogDepth > 0.0 && upOrRightInBounds.x && upOrRightInBounds.y);
    float useDownOrLeft = float(useUpOrRight == 0.0);
    vec3 upOrRightEC = getEyeCoordinate3FromWindowCoordinate(glFragCoordXY + positiveOffset, upOrRightLogDepth);
    vec3 downOrLeftEC = getEyeCoordinate3FromWindowCoordinate(glFragCoordXY - positiveOffset, downOrLeftLogDepth);
    return (upOrRightEC - (eyeCoordinate.xyz / eyeCoordinate.w)) * useUpOrRight + ((eyeCoordinate.xyz / eyeCoordinate.w) - downOrLeftEC) * useDownOrLeft;
}
#endif

void main(void)
{
#ifdef REQUIRES_EC
    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, gl_FragCoord.xy / czm_viewport.zw));
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);
#endif

#ifdef REQUIRES_WC
    vec4 worldCoordinate4 = czm_inverseView * eyeCoordinate;
    vec3 worldCoordinate = worldCoordinate4.xyz / worldCoordinate4.w;
#endif

#ifdef TEXTURE_COORDINATES
    vec2 uv;
#ifdef SPHERICAL

    vec2 sphericalLatLong = czm_approximateSphericalCoordinates(worldCoordinate);
    sphericalLatLong.y += v_uvMinAndSphericalLongitudeRotation.z;
    sphericalLatLong.y = czm_branchFreeTernary(sphericalLatLong.y < czm_pi, sphericalLatLong.y, sphericalLatLong.y - czm_twoPi);
    uv.x = (sphericalLatLong.y - v_sphericalExtents.y) * v_sphericalExtents.w;
    uv.y = (sphericalLatLong.x - v_sphericalExtents.x) * v_sphericalExtents.z;
#else

    uv.x = czm_planeDistance(v_westPlane, eyeCoordinate.xyz / eyeCoordinate.w) * v_inversePlaneExtents.x;
    uv.y = czm_planeDistance(v_southPlane, eyeCoordinate.xyz / eyeCoordinate.w) * v_inversePlaneExtents.y;
#endif
#endif

#ifdef PICK
#ifdef CULL_FRAGMENTS
    if (0.0 <= uv.x && uv.x <= 1.0 && 0.0 <= uv.y && uv.y <= 1.0) {
        gl_FragColor.a = 1.0;
        czm_writeDepthClamp();
    }
#else
        gl_FragColor.a = 1.0;
#endif
#else

#ifdef CULL_FRAGMENTS
    if (uv.x <= 0.0 || 1.0 <= uv.x || uv.y <= 0.0 || 1.0 <= uv.y) {
        discard;
    }
#endif

#ifdef NORMAL_EC

    vec3 downUp = vectorFromOffset(eyeCoordinate, vec2(0.0, 1.0));
    vec3 leftRight = vectorFromOffset(eyeCoordinate, vec2(1.0, 0.0));
    vec3 normalEC = normalize(cross(leftRight, downUp));
#endif


#ifdef PER_INSTANCE_COLOR

    vec4 color = czm_gammaCorrect(v_color);
#ifdef FLAT
    gl_FragColor = color;
#else
    czm_materialInput materialInput;
    materialInput.normalEC = normalEC;
    materialInput.positionToEyeEC = -eyeCoordinate.xyz;
    czm_material material = czm_getDefaultMaterial(materialInput);
    material.diffuse = color.rgb;
    material.alpha = color.a;

    gl_FragColor = czm_phong(normalize(-eyeCoordinate.xyz), material, czm_lightDirectionEC);
#endif


    gl_FragColor.rgb *= gl_FragColor.a;

#else





    czm_materialInput materialInput;

#ifdef USES_NORMAL_EC
    materialInput.normalEC = normalEC;
#endif

#ifdef USES_POSITION_TO_EYE_EC
    materialInput.positionToEyeEC = -eyeCoordinate.xyz;
#endif

#ifdef USES_TANGENT_TO_EYE
    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(worldCoordinate, normalEC);
#endif

#ifdef VERTEX_TEXTURE_COORDS
    materialInput.st = vTextureCoord;
#endif

#ifdef USES_ST



    materialInput.st.x = czm_lineDistance(v_uvMinAndSphericalLongitudeRotation.xy, v_uMaxAndInverseDistance.xy, uv) * v_uMaxAndInverseDistance.z;
    materialInput.st.y = czm_lineDistance(v_uvMinAndSphericalLongitudeRotation.xy, v_vMaxAndInverseDistance.xy, uv) * v_vMaxAndInverseDistance.z;
#endif

    czm_material material = czm_getMaterial(materialInput);

#ifdef FLAT
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
#else
    gl_FragColor = czm_phong(normalize(-eyeCoordinate.xyz), material, czm_lightDirectionEC);
#endif


    gl_FragColor.rgb *= gl_FragColor.a;

#endif
    czm_writeDepthClamp();
#endif

    #ifdef VERTEX_TEXTURE_COORDS
      gl_FragColor.rg = vTextureCoord;
      gl_FragColor.b = 0.0;
      gl_FragColor.a = 1.0;
    #endif
}
