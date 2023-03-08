//This file is automatically rebuilt by the Cesium build process.
export default "mat4 getInstancingTransform()\n\
{\n\
    mat4 instancingTransform;\n\
\n\
    #ifdef HAS_INSTANCE_MATRICES\n\
    instancingTransform = mat4(\n\
        a_instancingTransformRow0.x, a_instancingTransformRow1.x, a_instancingTransformRow2.x, 0.0, // Column 1\n\
        a_instancingTransformRow0.y, a_instancingTransformRow1.y, a_instancingTransformRow2.y, 0.0, // Column 2\n\
        a_instancingTransformRow0.z, a_instancingTransformRow1.z, a_instancingTransformRow2.z, 0.0, // Column 3\n\
        a_instancingTransformRow0.w, a_instancingTransformRow1.w, a_instancingTransformRow2.w, 1.0  // Column 4\n\
    );\n\
    #else\n\
    vec3 translation = vec3(0.0, 0.0, 0.0);\n\
    vec3 scale = vec3(1.0, 1.0, 1.0);\n\
    \n\
        #ifdef HAS_INSTANCE_TRANSLATION\n\
        translation = a_instanceTranslation;\n\
        #endif\n\
        #ifdef HAS_INSTANCE_SCALE\n\
        scale = a_instanceScale;\n\
        #endif\n\
\n\
    instancingTransform = mat4(\n\
        scale.x, 0.0, 0.0, 0.0,\n\
        0.0, scale.y, 0.0, 0.0,\n\
        0.0, 0.0, scale.z, 0.0,\n\
        translation.x, translation.y, translation.z, 1.0\n\
    ); \n\
    #endif\n\
\n\
    return instancingTransform;\n\
}\n\
\n\
#ifdef USE_2D_INSTANCING\n\
mat4 getInstancingTransform2D()\n\
{\n\
    mat4 instancingTransform2D;\n\
\n\
    #ifdef HAS_INSTANCE_MATRICES\n\
    instancingTransform2D = mat4(\n\
        a_instancingTransform2DRow0.x, a_instancingTransform2DRow1.x, a_instancingTransform2DRow2.x, 0.0, // Column 1\n\
        a_instancingTransform2DRow0.y, a_instancingTransform2DRow1.y, a_instancingTransform2DRow2.y, 0.0, // Column 2\n\
        a_instancingTransform2DRow0.z, a_instancingTransform2DRow1.z, a_instancingTransform2DRow2.z, 0.0, // Column 3\n\
        a_instancingTransform2DRow0.w, a_instancingTransform2DRow1.w, a_instancingTransform2DRow2.w, 1.0  // Column 4\n\
    );\n\
    #else\n\
    vec3 translation2D = vec3(0.0, 0.0, 0.0);\n\
    vec3 scale = vec3(1.0, 1.0, 1.0);\n\
    \n\
        #ifdef HAS_INSTANCE_TRANSLATION\n\
        translation2D = a_instanceTranslation2D;\n\
        #endif\n\
        #ifdef HAS_INSTANCE_SCALE\n\
        scale = a_instanceScale;\n\
        #endif\n\
\n\
    instancingTransform2D = mat4(\n\
        scale.x, 0.0, 0.0, 0.0,\n\
        0.0, scale.y, 0.0, 0.0,\n\
        0.0, 0.0, scale.z, 0.0,\n\
        translation2D.x, translation2D.y, translation2D.z, 1.0\n\
    ); \n\
    #endif\n\
\n\
    return instancingTransform2D;\n\
}\n\
#endif\n\
";
