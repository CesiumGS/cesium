czm_modelMaterial customShaderStage(czm_modelMaterial inputMaterial) 
{
  FragmentInput fsInput;
  initializeInputStruct(fsInput);
  czm_modelMaterial outputMaterial = inputMaterial;
  fragmentMain(fsInput, outputMaterial);
  return outputMaterial;
}