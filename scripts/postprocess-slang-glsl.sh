#!/bin/bash
# Post-process SPIRV-Cross GLSL output to match CesiumJS expectations

if [ $# -ne 1 ]; then
    echo "Usage: $0 <glsl-file>"
    exit 1
fi

FILE="$1"

# Fix combined sampler names: SPIRV_Cross_CombinedXXXXXXSampler -> XXXX
# Handles cases like SPIRV_Cross_CombinedcolorTexturecolorTextureSampler -> colorTexture
sed -i '' 's/SPIRV_Cross_Combined\([a-zA-Z0-9_]*\)\1Sampler/\1/g' "$FILE"

# Fix output variable: entryPointParam_main -> out_FragColor
sed -i '' 's/entryPointParam_main/out_FragColor/g' "$FILE"

# Remove the output variable declaration (CesiumJS adds it automatically)
sed -i '' '/^layout(location = 0) out.*out_FragColor;/d' "$FILE"

# Extract uniform names from GlobalParams struct and convert to plain uniforms
# Match lines like: "    highp float brightness;"
sed -n '/^layout(std140) uniform GlobalParams_std140/,/^}/p' "$FILE" | \
    grep -E '^\s*(highp |mediump |lowp )?(float|vec[234]|mat[234]|int|uint|bool)\s+[a-zA-Z0-9_]+;' | \
    sed -E 's/^\s*/uniform /' > "$FILE.uniforms"

# Remove the GlobalParams struct block
sed -i '' '/^layout(std140) uniform GlobalParams_std140/,/^} globalParams;/d' "$FILE"

# Insert extracted uniforms before first existing uniform or after precision declarations
if [ -s "$FILE.uniforms" ]; then
    # Find line number of first uniform or sampler
    LINE=$(grep -n "^uniform" "$FILE" | head -1 | cut -d: -f1)
    if [ -z "$LINE" ]; then
        # No uniforms yet, add after precision declarations
        LINE=$(grep -n "^precision" "$FILE" | tail -1 | cut -d: -f1)
        LINE=$((LINE + 1))
    fi
    
    # Insert the uniforms
    if [ -n "$LINE" ]; then
        sed -i '' "${LINE}r $FILE.uniforms" "$FILE"
    fi
fi

rm -f "$FILE.uniforms"

# Replace globalParams.VARNAME with VARNAME in shader code
sed -i '' 's/globalParams\.\([a-zA-Z0-9_]*\)/\1/g' "$FILE"

# Remove any remaining GlobalParams array declarations from flattened UBO
sed -i '' '/uniform.*GlobalParams_std140\[[0-9]*\];/d' "$FILE"

# Replace GlobalParams_std140[N].x style references with generic uniform names
# This handles the flattened array case
for i in {0..9}; do
    for component in x y z w; do
        sed -i '' "s/GlobalParams_std140\[$i\]\.$component/globalParam${i}_$component/g" "$FILE"
    done
done

echo "Post-processed $FILE"
