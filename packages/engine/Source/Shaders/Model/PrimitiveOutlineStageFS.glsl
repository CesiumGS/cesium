void primitiveOutlineStage(inout czm_modelMaterial material) {
    if (!model_showOutline) {
        return;
    }

    float outlineX = 
        texture(model_outlineTexture, vec2(v_outlineCoordinates.x, 0.5)).r;
    float outlineY = 
        texture(model_outlineTexture, vec2(v_outlineCoordinates.y, 0.5)).r;
    float outlineZ = 
        texture(model_outlineTexture, vec2(v_outlineCoordinates.z, 0.5)).r;
    float outlineness = max(outlineX, max(outlineY, outlineZ));

    // DEBUG:
    if (outlineness > 0.01) {
        material.diffuse = vec3(1.0, 0.0, 0.0);
    }
    
    // outlineness = clamp(outlineness * 8.0, 0.0, 1.0);
    // if (outlineness > 0.1) {
    //     material.diffuse = mix(material.diffuse, model_outlineColor.rgb, 0.8);
    // }
}

