void main() {
  // TODO: Where to put definition of ModelMaterial? 
  // or should it be czm_ModelMaterial?
  ModelMaterial material = defaultModelMaterial();

  material = materialStage(material);
  material = lightingStage(material);

  gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
}