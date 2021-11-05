uniform sampler2D colorTexture;
varying vec2 v_textureCoordinates;

float SMAA_THRESHOLD = 0.1;
vec4 SMAAColorEdgeDetectionPS(vec2 texcoord, vec4 offset[3], sampler2D colorTex)
{
    vec2 threshold = vec2(SMAA_THRESHOLD, SMAA_THRESHOLD);

    // Calculate color deltas:
    vec4 delta;
    vec3 C = texture2D( colorTex, texcoord ).rgb;
    vec3 Cleft = texture2D( colorTex, offset[0].xy ).rgb;
    vec3 t = abs( C - Cleft );
    delta.x = max( max( t.r, t.g ), t.b );
    vec3 Ctop = texture2D( colorTex, offset[0].zw ).rgb;
    t = abs( C - Ctop );
    delta.y = max( max( t.r, t.g ), t.b );

    // We do the usual threshold:
    vec2 edges = step( threshold, delta.xy );

    // Then discard if there is no edge:
    if ( dot( edges, vec2( 1.0, 1.0 ) ) == 0.0 )
    {
      discard;
    }

    // Calculate right and bottom deltas:
    vec3 Cright = texture2D( colorTex, offset[1].xy ).rgb;
    t = abs( C - Cright );
    delta.z = max( max( t.r, t.g ), t.b );
    vec3 Cbottom  = texture2D( colorTex, offset[1].zw ).rgb;
    t = abs( C - Cbottom );
    delta.w = max( max( t.r, t.g ), t.b );

    // Calculate the maximum delta in the direct neighborhood:
    float maxDelta = max( max( max( delta.x, delta.y ), delta.z ), delta.w );

    // Calculate left-left and top-top deltas:
    vec3 Cleftleft  = texture2D( colorTex, offset[2].xy ).rgb;
    t = abs( C - Cleftleft );
    delta.z = max( max( t.r, t.g ), t.b );
    vec3 Ctoptop = texture2D( colorTex, offset[2].zw ).rgb;
    t = abs( C - Ctoptop );
    delta.w = max( max( t.r, t.g ), t.b );

    // Calculate the final maximum delta:
    maxDelta = max( max( maxDelta, delta.z ), delta.w );

    // Local contrast adaptation in action:
    edges.xy *= step( 0.5 * maxDelta, delta.xy );

    return vec4( edges, 0.0, 0.0 );
}

void main()
{
    vec2 resolution = 1.0 / czm_viewport.zw;// / czm_pixelRatio;
    vec4 offset[ 3 ];
    offset[ 0 ] = v_textureCoordinates.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0,  1.0 ); // WebGL port note: Changed sign in W component
    offset[ 1 ] = v_textureCoordinates.xyxy + resolution.xyxy * vec4(  1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
    offset[ 2 ] = v_textureCoordinates.xyxy + resolution.xyxy * vec4( -2.0, 0.0, 0.0,  2.0 ); // WebGL port note: Changed sign in W component

    gl_FragColor = SMAAColorEdgeDetectionPS( v_textureCoordinates, offset, colorTexture );
    // gl_FragColor = vec4(v_textureCoordinates, 0.0, 1.0);
}