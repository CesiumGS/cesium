// The editor grid's fragment shader. Draws antialiased lines at several
// LODs of spacing, fading out each level as its cells shrink on screen, and
// fades the grid out with distance from the camera.

uniform float u_spacing;
uniform float u_subdivisions;
uniform vec4 u_lineColor;
uniform vec4 u_xAxisColor;
uniform vec4 u_yAxisColor;
// The camera's position in the grid plane's coordinate system, in meters.
uniform vec2 u_cameraPosition;
// The distance from the camera at which the grid has faded out, in meters.
uniform float u_extent;

in vec2 v_positionPlane;

// How small a level's cells get on screen, in CSS pixels, before it fades out.
const float MINIMUM_CELL_SIZE = 10.0;
const float LINE_WIDTH = 1.0;
const float AXIS_WIDTH = 2.0;
// Where the grid starts fading out, as a fraction of u_extent.
const float FADE_START = 0.2;

// How much of a pixel a line covers, given the distance from the pixel's
// center to the line's center and the line's width, both in drawing buffer
// pixels. Coverage falls from 1 to 0 over the pixel straddling the line's
// edge: it's 1 up to half a pixel inside the edge, at half the width from the
// center, and 0 from half a pixel outside it.
float lineCoverage(float distance, float width)
{
    return clamp(0.5 * width + 0.5 - distance, 0.0, 1.0);
}

// How much of the pixel the lines of one level cover
float levelCoverage(vec2 metersPerPixel, float spacing)
{
    // fract(x - 0.5) - 0.5 is x minus its nearest integer, so this is the
    // distance to the nearest line along each axis, in cells.
    vec2 cellPosition = v_positionPlane / spacing;
    vec2 cellsToLine = abs(fract(cellPosition - 0.5) - 0.5);
    vec2 pixelsToLine = cellsToLine * spacing / metersPerPixel;

    float width = LINE_WIDTH * czm_pixelRatio;
    return max(lineCoverage(pixelsToLine.x, width), lineCoverage(pixelsToLine.y, width));
}

// Composites a premultiplied color in front of another. (See Porter-Duff "over" operator for alpha blending)
vec4 compositeInFront(vec4 front, vec4 back)
{
    return front + back * (1.0 - front.a);
}

void main()
{
    // Note: Unlike czm_metersPerPixel, which measures a pixel facing the camera, this
    // includes the grid plane's perspective foreshortening (using fwidth, a screen-space derivative)
    vec2 metersPerPixel = max(fwidth(v_positionPlane), vec2(1.0e-6));

    // Level n's lines are u_spacing * u_subdivisions^n apart.
    // 'lod' is the continuous level whose cells would be MINIMUM_CELL_SIZE pixels across
    // here: its integer part is the finest level drawn, and its fractional part is how far that level has faded out.
    //
    // Measuring cells along the axis whose pixels span the most meters acts to fade out lines before they get
    // dense enough to alias, even where the grid plane gets foreshortened.
    float minimumCellSpacing = max(metersPerPixel.x, metersPerPixel.y) * MINIMUM_CELL_SIZE * czm_pixelRatio;
    float lod = max(log(minimumCellSpacing / u_spacing) / log(u_subdivisions), 0.0);
    float lodFraction = fract(lod);

    // Draws the finest level drawn and the next two coarser ones. As lod goes
    // from one integer to the next, the finest level fades from half
    // brightness to none, the next from full to half, and the coarsest stays
    // full. Then each takes the place of the next finer one at the same
    // brightness, so lines don't pop as the levels shift.
    float fineSpacing = u_spacing * pow(u_subdivisions, floor(lod));
    float mediumSpacing = fineSpacing * u_subdivisions;
    float coarseSpacing = mediumSpacing * u_subdivisions;
    float fineWeight = 0.5 * (1.0 - lodFraction);
    float mediumWeight = 1.0 - 0.5 * lodFraction;

    // Coarser levels' lines coincide with finer levels', so this takes the
    // brightest rather than adding them up.
    float coverage = max(
        levelCoverage(metersPerPixel, fineSpacing) * fineWeight,
        max(
            levelCoverage(metersPerPixel, mediumSpacing) * mediumWeight,
            levelCoverage(metersPerPixel, coarseSpacing)
        )
    );

    // Composites in premultiplied alpha, so colors don't bleed through where a line's coverage is low.
    vec4 color = vec4(u_lineColor.rgb, 1.0) * u_lineColor.a * coverage;

    // The x axis is the line y = 0, and the y axis the line x = 0.
    vec2 pixelsToAxis = abs(v_positionPlane) / metersPerPixel;
    float axisWidth = AXIS_WIDTH * czm_pixelRatio;
    float xAxisCoverage = lineCoverage(pixelsToAxis.y, axisWidth);
    float yAxisCoverage = lineCoverage(pixelsToAxis.x, axisWidth);
    color = compositeInFront(vec4(u_xAxisColor.rgb, 1.0) * u_xAxisColor.a * xAxisCoverage, color);
    color = compositeInFront(vec4(u_yAxisColor.rgb, 1.0) * u_yAxisColor.a * yAxisCoverage, color);

    // Fades out from FADE_START of the extent to the extent, where the quad
    // the grid is drawn on ends.
    float distanceToCamera = length(v_positionPlane - u_cameraPosition);
    color *= 1.0 - smoothstep(FADE_START * u_extent, u_extent, distanceToCamera);

    out_FragColor = vec4(color.rgb / max(color.a, czm_epsilon7), color.a);
}
