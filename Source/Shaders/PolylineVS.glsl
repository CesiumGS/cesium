attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 position2DHigh;
attribute vec3 position2DLow;
attribute vec4 prev;
attribute vec4 next;
attribute vec4 color;
attribute vec4 misc;

varying vec4 v_color;
varying vec4 v_outlineColor;
varying float v_textureCoordinate;

varying vec4 v_pickColor;

uniform float u_morphTime;

vec4 czm_decodeColor(float encoded)
{
    const float bias = -0.55 / 255.0;
    const vec4 scale = vec4(1.0, 256.0, 65536.0, 16777216.0);
    vec4 decoded = scale * encoded;
    float r = floor(decoded.x) / 255.0;
    float g = fract(decoded.x) + bias;
    float b = fract(decoded.y) + bias;
    //float a = fract(decoded.z) + bias;
    float a = 1.0;
    
    return vec4(r, g, b, a);
}

void main() 
{
    float texCoord = misc.x;
    float expandDir = misc.y;
    float width = misc.z * 0.5;
    float show = misc.w;
    
    vec4 p;
    vec4 prevDir;
    vec4 nextDir;

    if (u_morphTime == 1.0)
    {
        p = vec4(czm_translateRelativeToEye(position3DHigh, position3DLow), 1.0);
        prevDir = vec4(czm_sphericalToCartesianCoordinates(prev.xy), 0.0);
        nextDir = vec4(czm_sphericalToCartesianCoordinates(next.xy), 0.0);
    }
    else if (u_morphTime == 0.0)
    {
        p = vec4(czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy), 1.0);
        prevDir = vec4(czm_sphericalToCartesianCoordinates(prev.zw), 0.0);
        nextDir = vec4(czm_sphericalToCartesianCoordinates(next.zw), 0.0);
    }
    else
    {
        p = czm_columbusViewMorph(
                czm_translateRelativeToEye(position2DHigh.zxy, position2DLow.zxy),
                czm_translateRelativeToEye(position3DHigh, position3DLow), 
                u_morphTime);
        prevDir = czm_columbusViewMorph(
                    czm_sphericalToCartesianCoordinates(prev.xy), 
                    czm_sphericalToCartesianCoordinates(prev.zw), 
                    u_morphTime);
        nextDir = czm_columbusViewMorph(
                    czm_sphericalToCartesianCoordinates(next.xy), 
                    czm_sphericalToCartesianCoordinates(next.zw), 
                    u_morphTime);
        
        prevDir.w = 0.0;
        nextDir.w = 0.0;
    }
    
    vec4 positionEC = czm_modelViewRelativeToEye * p;
    vec4 prevEC = czm_modelView * prevDir;
    vec4 nextEC = czm_modelView * nextDir;
    
    vec3 direction = (prevEC.xyz + nextEC.xyz) * 0.5;
    direction.z = 0.0;
    direction = normalize(direction);
    
    if (direction.x < 0.0)
    {
        expandDir *= -1.0;
    }
    
    float angle = acos(dot(direction, nextEC.xyz));
    if (abs(angle - czm_piOverTwo) > czm_epsilon1)
    {
        width = width / sin(angle);
    }
    
    float pixelSize = czm_pixelSize * abs(positionEC.z);
    direction = direction * expandDir * width * pixelSize;
    
    vec4 positionWC = czm_eyeToWindowCoordinates(vec4(positionEC.xyz + direction, 1.0));
    
    gl_Position = czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0);
    
    v_textureCoordinate = texCoord;
    v_color = czm_decodeColor(color.x);
    v_outlineColor = czm_decodeColor(color.y);
    v_pickColor = czm_decodeColor(color.z);
}
