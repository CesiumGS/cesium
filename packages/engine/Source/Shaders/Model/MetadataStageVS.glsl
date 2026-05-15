void metadataStage(
  FeatureIds featureIds,
  out Metadata metadata,
  out MetadataClass metadataClass,
  out MetadataStatistics metadataStatistics,
  ProcessedAttributes attributes
  )
{
  initializeMetadata(featureIds, metadata, metadataClass, metadataStatistics, attributes);
  setMetadataVaryings();
}
