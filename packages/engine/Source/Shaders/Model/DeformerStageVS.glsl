void deformerStage(inout ProcessedAttributes attributes)
{
    attributes.positionMC = applyDeformers(attributes.positionMC);
}
