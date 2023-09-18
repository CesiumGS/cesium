//This file is automatically rebuilt by the Cesium build process.
export default "\n\
in vec2 v_textureCoordinates;\n\
\n\
void main()\n\
{\n\
    czm_materialInput materialInput;\n\
    \n\
    materialInput.s = v_textureCoordinates.s;\n\
    materialInput.st = v_textureCoordinates;\n\
    materialInput.str = vec3(v_textureCoordinates, 0.0);\n\
    materialInput.normalEC = vec3(0.0, 0.0, -1.0);\n\
    \n\
    czm_material material = czm_getMaterial(materialInput);\n\
\n\
    out_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n\
}\n\
";
