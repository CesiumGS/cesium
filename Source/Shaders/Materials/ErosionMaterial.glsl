uniform vec4 color;
uniform float time;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    float alpha = 1.0;
    if (time != 1.0)
    {
        float t = 0.5 + (0.5 * czm_snoise(materialInput.str / (1.0 / 10.0)));   // Scale [-1, 1] to [0, 1]
    
        if (t > time)
        {
            alpha = 0.0;
        }
    }
    
    material.diffuse = color.rgb;
    material.alpha = color.a * alpha;

    return material;
}
