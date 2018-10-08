vec3 czm_sampleOctahedralProjection(sampler2D projectedMap, vec2 textureSize, vec3 dir, float lod) {
    dir /= dot(vec3(1.0), abs(dir));
    vec2 rev = abs(dir.zx) - vec2(1.0);
    vec2 neg = vec2(dir.x < 0.0 ? rev.x : -rev.x,
                    dir.z < 0.0 ? rev.y : -rev.y);
    vec2 uv = dir.y < 0.0 ? neg : dir.xz;
    vec2 coord = 0.5 * uv + vec2(0.5);

    lod = floor(lod);

    if (lod > 0.0)
    {
        // Each subseqeuent mip level is half the size
        float scale = 1.0 / pow(2.0, lod);
        float offset = ((textureSize.y + 1.0) / textureSize.x);
        vec2 pixel = 1.0 / textureSize;

        coord.x *= offset;
        coord *= scale;

        coord.x += offset + pixel.x;
        coord.y += (1.0 - (1.0 / pow(2.0, lod - 1.0))) + pixel.y * (lod - 1.0) * 2.0;
    }
    else
    {
        coord.x *= (textureSize.y / textureSize.x);
    }

    return texture2D(projectedMap, coord).rgb;
}
