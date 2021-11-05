
#define SMAASampleLevelZeroOffset( tex, coord, offset ) texture2D( tex, coord + float( offset ) * resolution, 0.0 )
#define SMAA_MAX_SEARCH_STEPS 8
#define SMAA_AREATEX_MAX_DISTANCE 16
#define SMAA_AREATEX_PIXEL_SIZE 1.0 / vec2( 160.0, 560.0 )
#define SMAA_AREATEX_SUBTEX_SIZE 1.0 / 7.0

uniform sampler2D colorTexture;
uniform sampler2D tArea;
uniform sampler2D tSearch;

varying vec2 v_textureCoordinates;
vec2 resolution = 1.0 / czm_viewport.zw;

#if __VERSION__ == 100
  vec2 round( vec2 x ) {
    return sign( x ) * floor( abs( x ) + 0.5 );
  }
#endif

float SMAASearchLength( sampler2D searchTex, vec2 e, float bias, float scale )
{
  // Not required if searchTex accesses are set to point:
  // float2 SEARCH_TEX_PIXEL_SIZE = 1.0 / float2(66.0, 33.0);
  // e = float2(bias, 0.0) + 0.5 * SEARCH_TEX_PIXEL_SIZE +
  //     e * float2(scale, 1.0) * float2(64.0, 32.0) * SEARCH_TEX_PIXEL_SIZE;
  e.r = bias + e.r * scale;
  return 255.0 * texture2D( searchTex, e, 0.0 ).r;
}

float SMAASearchXLeft( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end )
{
  /**
    * @PSEUDO_GATHER4
    * This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
    * sample between edge, thus fetching four edges in a row.
    * Sampling with different offsets in each direction allows to disambiguate
    * which edges are active from the four fetched ones.
    */
  vec2 e = vec2( 0.0, 1.0 );
  for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ )
  { // WebGL port note: Changed while to for
    e = texture2D( edgesTex, texcoord, 0.0 ).rg;
    texcoord -= vec2( 2.0, 0.0 ) * resolution;
    if ( ! ( texcoord.x > end && e.g > 0.8281 && e.r == 0.0 ) ) break;
  }
  // We correct the previous (-0.25, -0.125) offset we applied:
  texcoord.x += 0.25 * resolution.x;
  // The searches are bias by 1, so adjust the coords accordingly:
  texcoord.x += resolution.x;
  // Disambiguate the length added by the last step:
  texcoord.x += 2.0 * resolution.x; // Undo last step
  texcoord.x -= resolution.x * SMAASearchLength(searchTex, e, 0.0, 0.5);
  return texcoord.x;
}

float SMAASearchXRight( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end )
{
  vec2 e = vec2( 0.0, 1.0 );
  for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ )
  { // WebGL port note: Changed while to for
    e = texture2D( edgesTex, texcoord, 0.0 ).rg;
    texcoord += vec2( 2.0, 0.0 ) * resolution;
    if ( ! ( texcoord.x < end && e.g > 0.8281 && e.r == 0.0 ) ) break;
  }
  texcoord.x -= 0.25 * resolution.x;
  texcoord.x -= resolution.x;
  texcoord.x -= 2.0 * resolution.x;
  texcoord.x += resolution.x * SMAASearchLength( searchTex, e, 0.5, 0.5 );
  return texcoord.x;
}

float SMAASearchYUp( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end )
{
  vec2 e = vec2( 1.0, 0.0 );
  for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ )
  { // WebGL port note: Changed while to for
    e = texture2D( edgesTex, texcoord, 0.0 ).rg;
    texcoord += vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
    if ( ! ( texcoord.y > end && e.r > 0.8281 && e.g == 0.0 ) ) break;
  }
  texcoord.y -= 0.25 * resolution.y; // WebGL port note: Changed sign
  texcoord.y -= resolution.y; // WebGL port note: Changed sign
  texcoord.y -= 2.0 * resolution.y; // WebGL port note: Changed sign
  texcoord.y += resolution.y * SMAASearchLength( searchTex, e.gr, 0.0, 0.5 ); // WebGL port note: Changed sign
  return texcoord.y;
}
float SMAASearchYDown( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end )
{
  vec2 e = vec2( 1.0, 0.0 );
  for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ )
  { // WebGL port note: Changed while to for
    e = texture2D( edgesTex, texcoord, 0.0 ).rg;
    texcoord -= vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
    if ( ! ( texcoord.y < end && e.r > 0.8281 && e.g == 0.0 ) ) break;
  }
  texcoord.y += 0.25 * resolution.y; // WebGL port note: Changed sign
  texcoord.y += resolution.y; // WebGL port note: Changed sign
  texcoord.y += 2.0 * resolution.y; // WebGL port note: Changed sign
  texcoord.y -= resolution.y * SMAASearchLength( searchTex, e.gr, 0.5, 0.5 ); // WebGL port note: Changed sign
  return texcoord.y;
}

vec2 SMAAArea( sampler2D areaTex, vec2 dist, float e1, float e2, float offset )
{
  // Rounding prevents precision errors of bilinear filtering:
  vec2 texcoord = float( SMAA_AREATEX_MAX_DISTANCE ) * round( 4.0 * vec2( e1, e2 ) ) + dist;
  // We do a scale and bias for mapping to texel space:
  texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord + ( 0.5 * SMAA_AREATEX_PIXEL_SIZE );
  // Move to proper place, according to the subpixel offset:
  texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;
  return texture2D( areaTex, texcoord, 0.0 ).rg;
}

vec4 SMAABlendingWeightCalculationPS( vec2 texcoord, vec2 pixcoord, vec4 offset[ 3 ], sampler2D edgesTex, sampler2D areaTex, sampler2D searchTex, ivec4 subsampleIndices )
{
  vec4 weights = vec4( 0.0, 0.0, 0.0, 0.0 );
  vec2 e = texture2D( edgesTex, texcoord ).rg;
  if ( e.g > 0.0 )
  { // Edge at north
    vec2 d;
    // Find the distance to the left:
    vec2 coords;
    coords.x = SMAASearchXLeft( edgesTex, searchTex, offset[ 0 ].xy, offset[ 2 ].x );
    coords.y = offset[ 1 ].y; // offset[1].y = texcoord.y - 0.25 * resolution.y (@CROSSING_OFFSET)
    d.x = coords.x;
    // Now fetch the left crossing edges, two at a time using bilinear
    // filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
    // discern what value each edge has:
    float e1 = texture2D( edgesTex, coords, 0.0 ).r;
    // Find the distance to the right:
    coords.x = SMAASearchXRight( edgesTex, searchTex, offset[ 0 ].zw, offset[ 2 ].y );
    d.y = coords.x;
    // We want the distances to be in pixel units (doing this here allow to
    // better interleave arithmetic and memory accesses):
    d = d / resolution.x - pixcoord.x;
    // SMAAArea below needs a sqrt, as the areas texture is compressed
    // quadratically:
    vec2 sqrt_d = sqrt( abs( d ) );
    // Fetch the right crossing edges:
    coords.y -= 1.0 * resolution.y; // WebGL port note: Added
    float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 1, 0 ) ).r;
    // Ok, we know how this pattern looks like, now it is time for getting
    // the actual area:
    weights.rg = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.y ) );
  }

  if ( e.r > 0.0 )
  { // Edge at west
    vec2 d;
    // Find the distance to the top:
    vec2 coords;
    coords.y = SMAASearchYUp( edgesTex, searchTex, offset[ 1 ].xy, offset[ 2 ].z );
    coords.x = offset[ 0 ].x; // offset[1].x = texcoord.x - 0.25 * resolution.x;
    d.x = coords.y;
    // Fetch the top crossing edges:
    float e1 = texture2D( edgesTex, coords, 0.0 ).g;
    // Find the distance to the bottom:
    coords.y = SMAASearchYDown( edgesTex, searchTex, offset[ 1 ].zw, offset[ 2 ].w );
    d.y = coords.y;
    // We want the distances to be in pixel units:
    d = d / resolution.y - pixcoord.y;
    // SMAAArea below needs a sqrt, as the areas texture is compressed
    // quadratically:
    vec2 sqrt_d = sqrt( abs( d ) );
    // Fetch the bottom crossing edges:
    coords.y -= 1.0 * resolution.y; // WebGL port note: Added
    float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 0, 1 ) ).g;
    // Get the area for this direction:
    weights.ba = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.x ) );
  }
  return weights;
}

void main()
{
  vec4 offset[ 3 ];
  // We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
  offset[ 0 ] = v_textureCoordinates.xyxy + resolution.xyxy * vec4( -0.25, 0.125, 1.25, 0.125 ); // WebGL port note: Changed sign in Y and W components
  offset[ 1 ] = v_textureCoordinates.xyxy + resolution.xyxy * vec4( -0.125, 0.25, -0.125, -1.25 ); // WebGL port note: Changed sign in Y and W components
  // And these for the searches, they indicate the ends of the loops:
  offset[ 2 ] = vec4( offset[ 0 ].xz, offset[ 1 ].yw ) + vec4( -2.0, 2.0, -2.0, 2.0 ) * resolution.xxyy * float( SMAA_MAX_SEARCH_STEPS );

  vec2 pixCoord = v_textureCoordinates / resolution;
  gl_FragColor = SMAABlendingWeightCalculationPS( v_textureCoordinates, pixCoord, offset, colorTexture, tArea, tSearch, ivec4( 0.0 ) );
}
