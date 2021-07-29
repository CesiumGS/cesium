vec3 LINEARtoSRGB(vec3 linearIn) 
{
    #ifndef HDR 
    return pow(linearIn, vec3(1.0/2.2));
    #else 
    return linearIn;
    #endif 
}

ModelMaterial lightingStage(ModelMaterial inputMaterial)
{
    // copying so normal
    ModelMaterial outputMaterial = inputMaterial;
    vec3 color = vec3(0.0);

    // Hard-coding the unlit behavior for now, PBR will come in a future
    // branch
    color = inputMaterial.diffuse;

    color = LINEARtoSRGB(color);

    outputMaterial.diffuse = color;
    return outputMaterial;
}