uniform sampler2D u_texture;

varying vec2 v_textureCoordinates;

void main()
{
    czm_materialInput materialInput;
    
    materialInput.st = v_textureCoordinates;
    materialInput.str = vec3(v_textureCoordinates, 0.0);
    
    czm_material material = czm_getMaterial(materialInput);
       
    gl_FragColor = vec4(material.diffuse, material.alpha);
}