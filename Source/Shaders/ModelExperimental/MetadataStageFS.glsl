vec2 computePropertySt(float featureId, float propertyOffset, float textureSize) {
    // TODO: Handle multiline features.
    // TODO: Also feature offset.
    float x = (propertyOffset + featureId + 0.5) / textureSize;
    float y = 0.5;
    return vec2(x, y);
}

void metadataStage(ProcessedAttributes attributes, inout Metadata metadata) {
    // TODO: should we use attributes or a FeatureId struct?
    metadata.airTemperature = texture2D(
      u_featureTable_weatherTable_float,
      computePropertySt(
        attributes.featureId_0,
        0.0, // property offset
        3.0 * 1000.0 // total number of values in texture
      )
    ).r;
    metadata.airPressure = texture2D(
      u_featureTable_weatherTable_float,
      computePropertySt(
        attributes.featureId_0,
        1000.0,
        3.0 * 1000.0
      )
    ).r;
    metadata.windVelocity = texture2D(
      u_featureTable_weatherTable_float,
      computePropertySt(
        attributes.featureId_0,
        2000.0,
        3.0 * 1000.0
      )
    ).rgb;
}
