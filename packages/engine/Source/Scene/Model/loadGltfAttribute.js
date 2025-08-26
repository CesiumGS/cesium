import defined from "../../Core/defined.js";
import Frozen from "../../Core/Frozen.js";
import createModelAttribute from "./createModelAttribute.js";
import * as SpzVertexAttributes from "../SpzVertexAttributes.js";
import { defaultGltfVertexAttributeSemantics } from "../VertexAttributeSemantic.js";

// Ordered from least to greatest precedence
const primitiveExtensions = {
  [SpzVertexAttributes.extensionName]: SpzVertexAttributes,
  // TODO: Draco
};

export default function loadPrimitiveAttributes({ gltf, primitive }) {
  const attributes = primitive.attributes;
  if (!defined(attributes)) {
    return;
  }

  const extensions = primitive?.extensions ?? Frozen.EMPTY_OBJECT;
  const extensionAttributes = Object.entries(extensions).map(
    ([extensionName, extension]) => {
      const { getAttributesFromExtension } = primitiveExtensions[extensionName];
      return getAttributesFromExtension(extension);
    },
  );
  const extensionAttributeSemantics = Object.fromEntries(
    extensionAttributes.flatten(),
  );

  const attributeSemantics = {
    ...defaultGltfVertexAttributeSemantics,
    ...extensionAttributeSemantics,
  };

  const primitiveAttributes = [];
  const loaders = [];
  for (const [propertyName, accessorId] of Object.entries(attributes)) {
    const attributeSemantic = attributeSemantics[propertyName];
    const accessor = attributeSemantic.accessorId ?? gltf.accessors[accessorId];
    const attribute = createModelAttribute({
      gltf,
      accessor,
      attributeSemantic,
    });

    let vertexBufferLoader;

    primitiveAttributes.push(attribute);
    loaders.push(vertexBufferLoader);
  }

  return {
    primitiveAttributes,
    loaders,
  }
}
