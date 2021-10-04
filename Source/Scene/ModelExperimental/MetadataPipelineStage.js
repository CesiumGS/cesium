import PixelDatatype from "../../Renderer/PixelDatatype.js";
import PixelFormat from "../../Core/PixelFormat.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import ContextLimits from "../../Renderer/ContextLimits.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Texture from "../../Renderer/Texture.js";
import Sampler from "../../Renderer/Sampler.js";
import MetadataStageFS from "../../Shaders/ModelExperimental/MetadataStageFS.js";
import MetadataType from "../MetadataType.js";

var FeatureTableTextureType = Object.freeze({
  FLOAT: 0,
  INT: 1,
  INCOMPATIBLE: 2,
});

// this is a prototype, I'll refactor it once I have it working.
var MetadataPipelineStage = {};
MetadataPipelineStage.name = "MetadataPipelineStage"; // Helps with debugging

MetadataPipelineStage.STRUCT_ID_METADATA = "Metadata";
MetadataPipelineStage.STRUCT_NAME_METADATA = "Metadata";

MetadataPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var shaderBuilder = renderResources.shaderBuilder;
  // TODO: is there a better way to access this?
  var featureMetadata =
    renderResources.model._sceneGraph._modelComponents.featureMetadata;

  shaderBuilder.addStruct(
    MetadataPipelineStage.STRUCT_ID_METADATA,
    MetadataPipelineStage.STRUCT_NAME_METADATA,
    ShaderDestination.FRAGMENT
  );

  // TODO: How to handle JSON and hierarchy tables?
  var featureTable = featureMetadata.getFeatureTable("weatherTable");
  //var weatherClass = metadataTable.class;
  //var weatherProperties = weatherClass.properties;

  // this should be based on components.featureMetadata.schema.classes
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA,
    "float",
    "airTemperature"
  );
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA,
    "float",
    "airPressure"
  );
  shaderBuilder.addStructField(
    MetadataPipelineStage.STRUCT_ID_METADATA,
    "vec3",
    "windVelocity"
  );

  /* maybe the layout would look like this???
  var floatTextureLayout = {
    valueCount: 3000,
    multipleRows: false,
    maxChannels: 2,
    properties: {
      airTemperature: {
        offset: 0,
        glslType: "float",
        channels: "r"
      },
      airPressure: {
        offset: 1000,
        glslType: "float",
        channels: "r"
      },
      windVelocity: {
        offset: 2000,
        glslType: "vec3",
        channels: "rgb"
      }
    }
  };
  */

  // what about channels?
  // what about multiple rows?
  var layout = computeFeatureTableTextureLayout(featureTable);
  if (!defined(layout)) {
    return;
  }

  var intTexture = makePropertyTexture(
    featureTable,
    layout,
    FeatureTableTextureType.INT,
    frameState
  );
  var floatTexture = makePropertyTexture(
    featureTable,
    layout,
    FeatureTableTextureType.FLOAT,
    frameState
  );

  var uniformName;
  var featureTableId = "weatherTable";
  if (defined(intTexture)) {
    uniformName = "u_featureTable_" + featureTableId + "_int";
    renderResources.uniformMap[uniformName] = function () {
      return intTexture;
    };

    shaderBuilder.addUniform(
      "sampler2D",
      uniformName,
      ShaderDestination.FRAGMENT
    );
  }

  if (defined(floatTexture)) {
    uniformName = "u_featureTable_" + featureTableId + "_float";
    renderResources.uniformMap[uniformName] = function () {
      return floatTexture;
    };

    shaderBuilder.addUniform(
      "sampler2D",
      uniformName,
      ShaderDestination.FRAGMENT
    );
  }

  shaderBuilder.addDefine(
    "HAS_METADATA",
    undefined,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addFragmentLines([MetadataStageFS]);
};

function getPackedGpuType(metadataType) {
  switch (metadataType) {
    case MetadataType.INT8:
    case MetadataType.UINT8:
    case MetadataType.BOOLEAN:
      return FeatureTableTextureType.INT;
    case MetadataType.FLOAT32:
    case MetadataType.FLOAT64: // lossy
    case MetadataType.INT16:
    case MetadataType.INT32: // lossy
    case MetadataType.INT64: // lossy
    case MetadataType.UINT16:
    case MetadataType.UINT32: // lossy
    case MetadataType.UINT64: // lossy
      return FeatureTableTextureType.FLOAT;
    default:
      return FeatureTableTextureType.INCOMPATIBLE;
  }
}

function selectDestinationTexture(classProperty) {
  if (classProperty.type === MetadataType.ARRAY) {
    if (
      !defined(classProperty.componentCount) ||
      classProperty.componentCount > 4
    ) {
      return FeatureTableTextureType.INCOMPATIBLE;
    }

    return getPackedGpuType(classProperty.componentType);
  }

  if (classProperty.type === MetadataType.ENUM) {
    return getPackedGpuType(classProperty.enumType);
  }

  return getPackedGpuType(classProperty.type);
}

function computeFeatureTableTextureLayout(featureTable) {
  var metadataClass = featureTable.class;
  if (!defined(metadataClass)) {
    return undefined;
  }

  var featureCount = featureTable.count;

  var layout = {
    featureCount: featureCount,
  };
  layout[FeatureTableTextureType.FLOAT] = {
    maxComponentCount: 1,
    properties: [],
  };
  layout[FeatureTableTextureType.INT] = {
    maxComponentCount: 1,
    properties: [],
  };

  var classProperties = metadataClass.properties;
  for (var propertyId in classProperties) {
    if (classProperties.hasOwnProperty(propertyId)) {
      var classProperty = classProperties[propertyId];
      var destination = selectDestinationTexture(classProperty);
      if (destination === FeatureTableTextureType.INCOMPATIBLE) {
        // Some types like STRING are not GPU compatible, so skip them.
        continue;
      }
      // Select either layout.floatTexture or layout.intTexture
      var destinationLayout = layout[destination];

      var componentCount = defaultValue(classProperty.componentCount, 1);
      destinationLayout.maxComponentCount = Math.max(
        destinationLayout.maxComponentCount,
        componentCount
      );
      destinationLayout.properties.push(classProperty);
    }
  }

  return layout;
}

function makePropertyTexture(featureTable, layout, destination, frameState) {
  var destinationLayout = layout[destination];
  var propertyCount = destinationLayout.properties.length;
  if (propertyCount === 0) {
    return undefined;
  }

  var featureCount = layout.featureCount;
  var valueCount = propertyCount * featureCount;
  var arraySize = valueCount * destinationLayout.maxComponentCount;

  var featureTableArray;
  if (destination === FeatureTableTextureType.INT) {
    featureTableArray = new Uint8Array(arraySize);
  } else {
    featureTableArray = new Float32Array(arraySize);
  }

  for (var i = 0; i < propertyCount; i++) {
    var classProperty = destinationLayout.properties[i];
    var propertyTypedArray = featureTable.getPropertyTypedArray(
      classProperty.id
    );
    addPropertyToTexture({
      propertyIndex: i,
      featureCount: featureCount,
      componentCount: defaultValue(classProperty.componentCount, 1),
      maxComponentCount: destinationLayout.maxComponentCount,
      propertyTypedArray: propertyTypedArray,
      featureTableArray: featureTableArray,
    });
  }

  var maximumWidth = ContextLimits.maximumTextureSize;
  var width = Math.min(valueCount, maximumWidth);
  var height = Math.ceil(valueCount / maximumWidth);

  return new Texture({
    context: frameState.context,
    pixelFormat: PixelFormat.RGB,
    pixelDatatype: PixelDatatype.FLOAT,
    source: {
      arrayBufferView: featureTableArray,
      width: width,
      height: height,
    },
    sampler: Sampler.NEAREST,
    flipY: false,
  });
}

function addPropertyToTexture(options) {
  var propertyIndex = options.propertyIndex;
  var featureCount = options.featureCount;
  var componentCount = options.componentCount;
  var maxComponentCount = options.maxComponentCount;
  var propertyTypedArray = options.propertyTypedArray;
  var featureTableArray = options.featureTableArray;

  var propertyOffset = propertyIndex * featureCount * maxComponentCount;
  for (var i = 0; i < featureCount; i++) {
    for (var j = 0; j < componentCount; j++) {
      featureTableArray[propertyOffset + maxComponentCount * i + j] =
        propertyTypedArray[componentCount * i + j];
    }
  }
}

export default MetadataPipelineStage;
