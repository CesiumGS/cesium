/*global define*/
define(['../../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * A material file is made up of methods that return diffuse, specular,
     * normal, emission, and other values. In the event that the material
     * does not want specialized behavior for one of these values,
     * materialBuilder will insert a default method into the shader source.
     */

    var materialBuilder = {

        // Normal
        // x,y,z : normal in eye space
        materialNormalComponentHeader :
        "vec3 agi_getMaterialNormalComponent(MaterialHelperInput helperInput)",
        materialNormalComponentBody :
        "{\n return helperInput.normalEC; \n}\n",

        // Diffuse
        // x,y,z : diffuse color
        // w : alpha
        materialDiffuseComponentHeader :
        "vec4 agi_getMaterialDiffuseComponent(MaterialHelperInput helperInput)",
        materialDiffuseComponentBody :
        "{\n return vec4(0.2, 0.2, 0.2, 1.0); \n}\n",

        // Specular
        // x,y,z : specular color
        // w : specular intensity
        materialSpecularComponentHeader :
        "vec4 agi_getMaterialSpecularComponent(MaterialHelperInput helperInput)",
        materialSpecularComponentBody :
        "{\n return vec4(0.5, 0.5, 0.5, 0.05); \n}\n",

        // Emission
        // x,y,z : emission color, in other words per-object ambient light
        materialEmissionComponentHeader :
        "vec3 agi_getMaterialEmissionComponent(MaterialHelperInput helperInput)",
        materialEmissionComponentBody :
        "{\n return vec3(0.0, 0.0, 0.0); \n}\n",

        /**
         * Pass in the material shader string and any additional shaders
         * as arguments and this method will combine them into one.
         * If the material shader is missing one of the agi_getMaterial*
         * functions, this method will insert a default version into the shader string.
         */
        constructMaterial : function(material) {

            //Assemble the optional shader files first
            var shaderString = "#line 0\n";
            for(var i = 1; i < arguments.length; i++){
                shaderString += arguments[i];
                shaderString += "#line 0\n";
            }

            //All possible material properties.
            var materialProperties = ["Normal", "Diffuse", "Specular", "Emission"];

            //Find out which agi_getMaterial* methods are missing.
            for(i = 0; i < materialProperties.length; i++)
            {
                var property = materialProperties[i];
                var varName = "material" + property + "Component";
                var hasProperty = material.indexOf(materialBuilder[varName + "Header"]);
                if(hasProperty === -1){
                    shaderString += materialBuilder[varName + "Header"] +
                                    materialBuilder[varName + "Body"];
                }
            }

            //Append the original material file source
            shaderString += material;
            return shaderString;
        }
    };

    return materialBuilder;
});

