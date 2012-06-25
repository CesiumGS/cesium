uniform vec4 u_colors[NUMBER_OF_DISTANCES];
uniform float u_distances[NUMBER_OF_DISTANCES];

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    agi_material material = agi_getDefaultMaterial(materialInput);

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
