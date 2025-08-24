void RuntimeModelInstancingStage(inout czm_modelMaterial material)
{
  material.diffuse = mix(material.diffuse, v_gex_instanceColor.rgb, gex_instanceColorBlend);
  float highlight = ceil(gex_instanceColorBlend);
  material.diffuse *= mix(v_gex_instanceColor.rgb, vec3(1.0), highlight);
  material.alpha *= v_gex_instanceColor.a;
}