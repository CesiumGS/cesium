
in vec2 v_textureCoordinates;

void main()
{
    czm_materialInput materialInput;
    
    materialInput.s = v_textureCoordinates.s;
    materialInput.st = v_textureCoordinates;
    materialInput.str = vec3(v_textureCoordinates, 0.0);
    materialInput.normalEC = vec3(0.0, 0.0, -1.0);
    
    czm_material material = czm_getMaterial(materialInput);

    out_FragColor = vec4(material.diffuse + material.emission, material.alpha);
}
