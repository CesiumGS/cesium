void primitiveOutlineStage(inout czm_modelMaterial material) {
    float outlineX = 
        texture2D(model_outlineTexture, vec2(v_outlineCoordinates.x, 0.5)).r;
    float outlineY = 
        texture2D(model_outlineTexture, vec2(v_outlineCoordinates.y, 0.5)).r;
    float outlineZ = 
        texture2D(model_outlineTexture, vec2(v_outlineCoordinates.z, 0.5)).r;
    float outlineness = max(outlineX, max(outlineY, outlineZ));

    vec3 outlineColor = vec3(0.0);
    material.diffuse = mix(material.diffuse, outlineColor, outlineness);
}

