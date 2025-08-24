void RuntimeModelInstancingStage(inout czm_modelMaterial material)
{
  if (v_gex_instanceColor.r == 0.0 &&
      v_gex_instanceColor.g == 0.0 &&
      v_gex_instanceColor.b == 0.0 &&
      v_gex_instanceColor.a == 0.0) {
    return;
  }
  
  material.diffuse = mix(material.diffuse, v_gex_instanceColor.rgb, gex_instanceColorBlend);
  float highlight = ceil(gex_instanceColorBlend);
  material.diffuse *= mix(v_gex_instanceColor.rgb, vec3(1.0), highlight);
  material.alpha *= v_gex_instanceColor.a;
}