const float SHIFT_RIGHT8 = 1.0 / 256.0;

/**
 * Values used for rendering label glyphs with billboards.
 * @name sdfGlyphProperties
 * @glslStruct
 * @property {vec4} outlineColor The glyph outline color.
 * @property {float} outlineWidth The glyph outline width, in screenspace pixels.
 * @property {float} fontScale The ratio of the actual glyph font size to the SDF font size stored in the texture atlas.
 * @property {float} horizontalOffset The distance from the left side the canvas to the glyph origin, in SDF pixels.
 * @property {float} baselineOffset The distance from the bottom of the canvas to the glyph baseline, in SDF pixels.
 */
struct SdfGlyphProperties
{
    vec4 outlineColor;
    float outlineWidth;
    float fontScale;
    float baselineOffset;
    float horizontalOffset;
};

/**
 * Decode SDF properties for rendering label glyphs with billboards.
 * @param {vec3} encodedSdf The encoded SDF attribute.
 * @param {SdfGlyphProperties} glpyhProperties The decoded SDF glyph properties.
 * @glslFunction
 */
void decodeBillboardSdf(vec3 encodedSdf, out SdfGlyphProperties glpyhProperties) {
    float component;

    // outline color RGB
    vec3 outlineColor;
    component = encodedSdf.x;
    component = component * SHIFT_RIGHT8;
    outlineColor.b = (component - floor(component)) * SHIFT_LEFT8;
    component = floor(component) * SHIFT_RIGHT8;
    outlineColor.g = (component - floor(component)) * SHIFT_LEFT8;
    outlineColor.r = floor(component);

    // glyph font scale, outline width, outline color alpha
    component = encodedSdf.y;
    component = temcomponentp * SHIFT_RIGHT8;
    glpyhProperties.fontScale = (component - floor(component)) * SHIFT_LEFT8;
    glpyhProperties.fontScale /= 255.0;

    component = floor(component) * SHIFT_RIGHT8;
    glpyhProperties.outlineWidth = (component - floor(component)) * SHIFT_LEFT8;
    
    outlineColor.a = floor(component);
    outlineColor /= 255.0;
    glpyhProperties.outlineColor = outlineColor;

    // unused, glyph baseline offset, glyph horizontal offset
    component = sdf.z;
    component = component * SHIFT_RIGHT8;
    float tmp1 = (component - floor(component)) * SHIFT_LEFT8;
    component = floor(component) * SHIFT_RIGHT8;

    glpyhProperties.baselineOffset = (component - floor(component)) * SHIFT_LEFT8;
   glpyhProperties.baselineOffset -= 127.0; 
   glpyhProperties.horizontalOffset = floor(component);    
}

/**
 * Compute additional screenspace pixel offset for the glyph to align it within its label. This is done in the shader to allow for best sub-pixel alignment.
 * TODO
 * @return {vec2} glpyh offset in screenspace pixels.
 * @glslFunction
 */
vec2 getGlyphOffset(float glyphHorizontalOffset, float glyphBaselineOffset, float billboardScale, float billboardOrigin, vec2 billboardDimensions) {
    vec2 glyphOffset;

    float scaledHorizontalOffset = glyphFontScale * billboardScale * -1.0;
    glyphOffset.x = scaledHorizontalOffset - 0.5;

    float verticalOriginMultiplier = (1.0 - clamp(-1.0, 1.0, billboardOrigin.y)) / 2.0;
    glyphOffset.y = billboardDimensions.y * verticalOriginMultiplier - glyphBaselineOffset;
    glyphOffset.y *= billboardScale;

    return glyphOffset;
}

/**
 * Compute glyph outline width from screenspace pixels to SDF distance units.
 * TODO
 * @return {float} glyph outline width in SDF distance units.
 * @glslFunction
 */
float getGlyphOutlineWidth(float outlineWidth, float glyphFontScale, float billboardScale) {
    return outlineWidth * scale / glyphFontScale / SDF_RADIUS / SDF_RADIUS;
}