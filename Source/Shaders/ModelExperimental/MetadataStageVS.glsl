void metadataStage(out Metadata metadata, out MetadataClass metadataClass, ProcessedAttributes attributes)
{
  initializeMetadata(metadata, metadataClass, attributes);
  setMetadataVaryings();
}
