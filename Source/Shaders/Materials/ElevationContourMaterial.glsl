#ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
#endif

uniform vec4 color;
uniform float spacing;
uniform float width;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    float distanceToContour = mod(materialInput.height, spacing);

#ifdef GL_OES_standard_derivatives
    float dxc = abs(dFdx(materialInput.height));
    float dyc = abs(dFdy(materialInput.height));
    float dF = max(dxc, dyc) * width;
    material.alpha = (distanceToContour < dF) ? 1.0 : 0.0;
#else
    material.alpha = (distanceToContour < (czm_resolutionScale * width)) ? 1.0 : 0.0;
#endif

    material.diffuse = color.rgb;

    return material;
}
