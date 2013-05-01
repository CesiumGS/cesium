void main()
{
    czm_materialInput materialInput;
    
    czm_material material = czm_getMaterial(materialInput);
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);
}
