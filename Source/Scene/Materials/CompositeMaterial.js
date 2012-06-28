/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Core/Jobs',
        '../../ThirdParty/Chain',
        './combineMaterials',
        './BlendMap',
        './AlphaMapMaterial',
        './AsphaltMaterial',
        './BlobMaterial',
        './BrickMaterial',
        './BumpMapMaterial',
        './CementMaterial',
        './CheckerboardMaterial',
        './ColorMaterial',
        './DiffuseMapMaterial',
        './DistanceIntervalMaterial',
        './DotMaterial',
        './EmissionMapMaterial',
        './FacetMaterial',
        './FresnelMaterial',
        './GrassMaterial',
        './HorizontalStripeMaterial',
        './NormalMapMaterial',
        './ReflectionMaterial',
        './RefractionMaterial',
        './SpecularMapMaterial',
        './TieDyeMaterial',
        './VerticalStripeMaterial',
        './WoodMaterial'
    ], function(
        DeveloperError,
        Jobs,
        Chain,
        combineMaterials,
        BlendMap,
        AlphaMapMaterial,
        AsphaltMaterial,
        BlobMaterial,
        BrickMaterial,
        BumpMapMaterial,
        CementMaterial,
        CheckerboardMaterial,
        ColorMaterial,
        DiffuseMapMaterial,
        DistanceIntervalMaterial,
        DotMaterial,
        EmissionMapMaterial,
        FacetMaterial,
        FresnelMaterial,
        GrassMaterial,
        HorizontalStripeMaterial,
        NormalMapMaterial,
        ReflectionMaterial,
        RefractionMaterial,
        SpecularMapMaterial,
        TieDyeMaterial,
        VerticalStripeMaterial,
        WoodMaterial) {
    "use strict";

    /**
     * CompositeMaterial is different than other materials in that it
     * combines multiple base materials into one. A CompositeMaterial is
     * specified in JSON and contains 'materials' and 'components' fields.
     * 'materials' is an array of material containers. Each material container has
     * a string 'id' (e.g. 'diffuseMap1'), a material type (e.g. 'DiffuseMapMaterial'),
     * and all of the necessary values to instantiate the material. The material type can
     * either be one of the traditional materials or a BlendMap. A BlendMap samples from a
     * texture and returns a float that can be used to alter material values.
     * 'components' is a sequence of material properties including 'diffuse', 'specular',
     * 'normal', 'emission', and 'alpha'. Each component has a corresponding expression that
     * combines different materials to reach the desired effect. These expressions can use
     * any valid glsl math functions or operations. If a component is not specified, the value
     * from agi_getDefaultMaterial is used.
     *
     * Example composite material in JSON:
     *
     * Behavior: Mix a ReflectionMaterial and DiffuseMapMaterial with a BlendMap:
     *
     * 'compositeMaterial' : {
     *     'materials' : [
     *         {
     *             'id' : 'reflection',
     *             'type' : 'ReflectionMaterial',
     *             'positiveX' : 'reflection1.png',
     *             'negativeX' : 'reflection2.png',
     *             'positiveY' : 'reflection3.png',
     *             'negativeY' : 'reflection4.png',
     *             'positiveZ' : 'reflection5.png',
     *             'negativeZ' : 'reflection6.png',
     *              'channels' : 'RGB'
     *         },
     *         {
     *             'id' : 'diffuse',
     *             'type' : 'DiffuseMapMaterial',
     *             'image' : 'diffuse.png',
     *             'channels' : 'RGB'
     *         },
     *         {
     *             'id' : 'mixer',
     *             'type' : 'BlendMaterial',
     *             'image' : 'mixer.png',
     *             'channels' : 'R'
     *         },
     *         {
     *             'id' : 'alphamap',
     *             'type' : 'AlphaMapMaterial',
     *             'image' : 'diffuse.png',
     *             'channels' : 'A'
     *         }
     *     ],
     *
     *     'components' : {
     *         'diffuse' : 'mix(reflection, diffuse, mixer)'
     *         'alpha' : 'alphamap'
     *     }
     * }
     *
     *
     * @name CompositeMaterial
     * @constructor
     */
    function CompositeMaterial(template) {
        var materialTemplates = template.materials;

        // Load all the images before creating the material
        // var images = this._getAllImages(materialTemplates);

        // Construct a material out of each material template in JSON.
        // Add the material id to agi_getMaterial or agi_getBlendAmount
        // to distinguish materials from each other.
        var i;
        var materialContainers = [];
        for (i = 0; i < materialTemplates.length; i++) {
            var materialTemplate = materialTemplates[i];
            var material = this._materialFactory._constructMaterial(materialTemplate.type, materialTemplate);

            var originalMethodName = (materialTemplate.type === 'BlendMap') ? 'agi_getBlendAmount' : 'agi_getMaterial';
            var newMethodName = originalMethodName + '_' + materialTemplate.id;
            material.shaderSource = material.shaderSource.replace(originalMethodName, newMethodName);

            materialContainers.push({
               id : materialTemplate.id,
               type : materialTemplate.type,
               material : material,
               methodName : newMethodName
            });
        }

        // Start constructing the shader source for the composite material.
        var finalMaterial = combineMaterials(materialContainers);
        var materialString = finalMaterial._getShaderSource();

        materialString += '#line 0\n';
        materialString += 'agi_material agi_getMaterial(agi_materialInput materialInput)\n{\n';
        materialString += 'agi_material material = agi_getDefaultMaterial(materialInput);\n';

        // Loop over all the components ('diffuse', 'normal', etc) in the template and
        // replace the material ids from each component expression with their expanded forms.
        // Example: 'diffuse' : 'mix(reflection, diffuseMap, blender)'
        // Becomes: material.diffuse = mix(
        //              agi_getMaterial_reflection(materialInput).diffuse,
        //              agi_getMaterial_diffuseMap(materialInput).diffuse,
        //              agi_getBlendAmount_blender());

        var components = template.components;
        for (var component in components) {
            if (components.hasOwnProperty(component)) {
                var expression = components[component];
                // Replace each material id with the expanded form.
                for (i = 0; i < materialContainers.length; i++) {
                    var materialContainer = materialContainers[i];
                    if (expression.indexOf(materialContainer.id) !== -1) {
                        // Material id found, replace with expanded form.
                        var expandedMethod = materialContainer.methodName + '(materialInput)';
                        if (materialContainer.type !== 'BlendMap'){
                            expandedMethod += "." + component;
                        }
                        expression = expression.replace(materialContainer.id, expandedMethod);
                    }
                }
                materialString += 'material.' + component + ' = ' + expression + ';\n';
            }
        }
        materialString += 'return material;\n}\n';
        this.shaderSource = materialString;
        this._uniforms = finalMaterial._uniforms;
    }

    CompositeMaterial.prototype._getAllImages = function(materialTemplates) {
        // Save for later. Need to find a way to detect which material
        // properties are images. Some go under the name 'image', but others
        // go under the name 'positiveX', 'negativeZ', etc.
        /*
        var images = [];
        for (var i = 0; i < materialTemplates.length; i++) {
            var materialTemplate = materialTemplates[i];
            if (materialTemplate.image !== 'undefined') {
                images.push(materialTemplate.image);
            }
        }
        return images;
        */
    };

    CompositeMaterial.prototype._materialFactory = {
        _materials : {
            'BlendMap' : BlendMap,
            'AlphaMapMaterial' : AlphaMapMaterial,
            'AsphaltMaterial' : AsphaltMaterial,
            'BlobMaterial' : BlobMaterial,
            'BrickMaterial' : BrickMaterial,
            'BumpMapMaterial' : BumpMapMaterial,
            'CementMaterial' : CementMaterial,
            'CheckerboardMaterial' : CheckerboardMaterial,
            'ColorMaterial' : ColorMaterial,
            'DiffuseMapMaterial' : DiffuseMapMaterial,
            'DistanceIntervalMaterial' : DistanceIntervalMaterial,
            'DotMaterial' : DotMaterial,
            'EmissionMapMaterial' : EmissionMapMaterial,
            'FacetMaterial' : FacetMaterial,
            'FresnelMaterial' : FresnelMaterial,
            'GrassMaterial' : GrassMaterial,
            'HorizontalStripeMaterial' : HorizontalStripeMaterial,
            'NormalMapMaterial' : NormalMapMaterial,
            'ReflectionMaterial' : ReflectionMaterial,
            'RefractionMaterial' : RefractionMaterial,
            'SpecularMapMaterial' : SpecularMapMaterial,
            'TieDyeMaterial' : TieDyeMaterial,
            'VerticalStripeMaterial' : VerticalStripeMaterial,
            'WoodMaterial' : WoodMaterial
        },
        _constructMaterial : function(name, template) {
            if (this._materials.hasOwnProperty(name) === false) {
                throw new DeveloperError('Material with type ' + name + ' does not exist.');
            }
            return (new this._materials[name](template));
        }
    };

    CompositeMaterial.prototype._getShaderSource = function() {
        return '#line 0\n' +
               this.shaderSource;
    };

    return CompositeMaterial;
});
