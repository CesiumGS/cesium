//This file is automatically rebuilt by the Cesium build process.
export default "void primitiveOutlineStage(inout czm_modelMaterial material) {\n\
    if (!model_showOutline) {\n\
        return;\n\
    }\n\
\n\
    float outlineX = \n\
        texture(model_outlineTexture, vec2(v_outlineCoordinates.x, 0.5)).r;\n\
    float outlineY = \n\
        texture(model_outlineTexture, vec2(v_outlineCoordinates.y, 0.5)).r;\n\
    float outlineZ = \n\
        texture(model_outlineTexture, vec2(v_outlineCoordinates.z, 0.5)).r;\n\
    float outlineness = max(outlineX, max(outlineY, outlineZ));\n\
\n\
    material.diffuse = mix(material.diffuse, model_outlineColor.rgb, model_outlineColor.a * outlineness);\n\
}\n\
\n\
";
