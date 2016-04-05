
vec2 czm_cubeMapToUV(vec3 d)
{
    vec3 abs = abs(d);
    float max = max(max(abs.x, abs.y), abs.z); // Get the largest component
    vec3 weights = step(max, abs); // 1.0 for the largest component, 0.0 for the others
    float sign = dot(weights, sign(d)) * 0.5 + 0.5; // 0 or 1
    float sc = mix(dot(weights, vec3(d.z, d.x, -d.x)), dot(weights, vec3(-d.z, d.x, d.x)), sign);
    float tc = mix(dot(weights, vec3(-d.y, -d.z, -d.y)), dot(weights, vec3(-d.y, d.z, -d.y)), sign);
    vec2 uv = (vec2(sc, tc) / max) * 0.5 + 0.5;
    float offsetX = dot(weights, vec3(0.0, 1.0, 2.0));
    float offsetY = sign;
    uv.x = (uv.x + offsetX) / 3.0;
    uv.y = (uv.y + offsetY) / 2.0;
    return uv;
}