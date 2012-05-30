uniform vec4 u_colors[NUMBER_OF_DISTANCES];
uniform float u_distances[NUMBER_OF_DISTANCES];

vec4 agi_getMaterialColor(float zDistance, vec2 st, vec3 str)
{
    vec4 color = vec4(0.0);
    
    for (int i = 0; i < NUMBER_OF_DISTANCES; ++i)
    {
	    if (zDistance < u_distances[i])
	    {
		    color = u_colors[i];
		    break;
	    }
    }
    
    return color;
}
