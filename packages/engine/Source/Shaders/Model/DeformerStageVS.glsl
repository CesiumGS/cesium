void deformerStage(inout ProcessedAttributes attributes)
{
    attributes.positionMC = getDeformedPosition(attributes.positionMC);
}
