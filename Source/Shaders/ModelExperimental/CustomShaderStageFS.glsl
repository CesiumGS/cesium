czm_modelMaterial customShaderStage(czm_modelMaterial inputMaterial) 
{
  // FragmentInput and initializeInputStruct() are dynamically generated in JS, 
  // see CustomShaderStage.js
  FragmentInput fsInput;
  initializeInputStruct(fsInput);
  czm_modelMaterial outputMaterial = inputMaterial;
  fragmentMain(fsInput, outputMaterial);
  return outputMaterial;
}