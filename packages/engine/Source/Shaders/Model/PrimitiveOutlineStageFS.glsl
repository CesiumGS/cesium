void primitiveOutlineStage(inout czm_modelMaterial material) {
    if (!model_showOutline) {
        return;
    }

    float outlineX = 
        texture2D(model_outlineTexture, vec2(v_outlineCoordinates.x, 0.5)).r;
    float outlineY = 
        texture2D(model_outlineTexture, vec2(v_outlineCoordinates.y, 0.5)).r;
    float outlineZ = 
        texture2D(model_outlineTexture, vec2(v_outlineCoordinates.z, 0.5)).r;
    float outlineness = max(outlineX, max(outlineY, outlineZ));

    material.diffuse = mix(material.diffuse, model_outlineColor.rgb, model_outlineColor.a * outlineness);
}

