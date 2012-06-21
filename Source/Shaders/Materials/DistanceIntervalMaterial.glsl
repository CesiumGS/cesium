uniform vec4 u_colors[NUMBER_OF_DISTANCES];
uniform float u_distances[NUMBER_OF_DISTANCES];

agi_material agi_getMaterial(agi_materialInput materialInput)
{
    vec4 color = vec4(0.0);
    
    for (int i = 0; i < NUMBER_OF_DISTANCES; ++i)
    {
	    if (materialInput.zDistance < u_distances[i])
	    {
		    color = u_colors[i];
		    break;
	    }
    }
    
    material.alphaComponent = color.rgb;
     
    return material;
}
