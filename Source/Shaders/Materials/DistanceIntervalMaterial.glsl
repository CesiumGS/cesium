uniform vec4 u_colors[NUMBER_OF_DISTANCES];
uniform float u_distances[NUMBER_OF_DISTANCES];

// x,y,z : diffuse color
// w : alpha
vec4 agi_getMaterialDiffuseComponent(MaterialHelperInput helperInput)
{
    vec4 color = vec4(0.0);
    
    for (int i = 0; i < NUMBER_OF_DISTANCES; ++i)
    {
	    if (helperInput.zDistance < u_distances[i])
	    {
		    color = u_colors[i];
		    break;
	    }
    }
    
    return color;
}
