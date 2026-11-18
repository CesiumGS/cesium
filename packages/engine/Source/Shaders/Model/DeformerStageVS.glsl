void deformerStage(inout ProcessedAttributes attributes)
{
    mat3 jacobian;
    attributes.positionMC = getDeformedPosition(attributes.positionMC, jacobian);

    #ifdef HAS_NORMALS
    // The cofactor matrix transforms normals like the inverse transpose, up to scale.
    mat3 cofactor = mat3(
        cross(jacobian[1], jacobian[2]),
        cross(jacobian[2], jacobian[0]),
        cross(jacobian[0], jacobian[1])
    );
    attributes.normalMC = normalize(cofactor * attributes.normalMC);
    #endif

    #ifdef HAS_TANGENTS
    attributes.tangentMC = normalize(jacobian * attributes.tangentMC);
    #endif
}
