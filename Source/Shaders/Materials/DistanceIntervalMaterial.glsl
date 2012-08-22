uniform vec4 u_colors[NUMBER_OF_DISTANCES];
uniform float u_distances[NUMBER_OF_DISTANCES];

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec4 color = vec4(0.0);
    
    for (int i = 0; i < NUMBER_OF_DISTANCES; ++i)
    {
	    if (materialInput.positionMC.z < u_distances[i])
	    {
		    color = u_colors[i];
		    break;
	    }
    }
    
    material.diffuse = color.rgb;
    material.alpha = color.a;
     
    return material;
}
