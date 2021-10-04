import PixelDatatype from "../../Renderer/PixelDatatype.js";
import PixelFormat from "../../Core/PixelFormat.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Texture from "../../Renderer/Texture.js";
import Sampler from "../../Renderer/Sampler.js";
import MetadataStageFS from "../../Shaders/ModelExperimental/MetadataStageFS.js";

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
  var weatherTable = featureMetadata.getFeatureTable("weatherTable");
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

  var airTemperatureArray = weatherTable.getPropertyTypedArray(
    "airTemperature"
  );
  var airPressureArray = weatherTable.getPropertyTypedArray("airPressure");
  var windVelocityArray = weatherTable.getPropertyTypedArray("windVelocity");
  var i;
  var featureTableArray = new Float32Array(3 * 3000);
  for (i = 0; i < 1000; i++) {
    featureTableArray[3 * i] = airTemperatureArray[i];
  }

  for (i = 0; i < 1000; i++) {
    featureTableArray[3 * 1000 + 3 * i] = airPressureArray[i];
  }

  for (i = 0; i < 1000; i++) {
    featureTableArray[3 * 2000 + 3 * i] = windVelocityArray[3 * i];
    featureTableArray[3 * 2000 + 3 * i + 1] = windVelocityArray[3 * i + 1];
    featureTableArray[3 * 2000 + 3 * i + 2] = windVelocityArray[3 * i + 2];
  }

  var featureTableTexture = new Texture({
    context: frameState.context,
    pixelFormat: PixelFormat.RGB,
    pixelDatatype: PixelDatatype.FLOAT,
    source: {
      arrayBufferView: featureTableArray,
      width: 3000,
      height: 1,
    },
    sampler: Sampler.NEAREST,
    flipY: false,
  });

  var uniformName = "u_featureTable_0_float";
  renderResources.uniformMap[uniformName] = function () {
    return featureTableTexture;
  };

  shaderBuilder.addDefine(
    "HAS_METADATA",
    undefined,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addUniform(
    "sampler2D",
    uniformName,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addFragmentLines([MetadataStageFS]);
};

export default MetadataPipelineStage;
