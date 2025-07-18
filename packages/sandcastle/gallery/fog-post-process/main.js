import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

viewer.scene.camera.setView({
  destination: new Cesium.Cartesian3(
    1216356.033078094,
    -4736402.278325668,
    4081270.375520902,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    0.08033365594766728,
    -0.29519015695063455,
    0.00027759141518046704,
  ),
  endTransform: Cesium.Matrix4.IDENTITY,
});

if (!viewer.scene.context.depthTexture) {
  window.alert("This browser does not support the fog post process.");
}

const fragmentShaderSource = `
          float getDistance(sampler2D depthTexture, vec2 texCoords)
          {
              float depth = czm_unpackDepth(texture(depthTexture, texCoords));
              if (depth == 0.0) {
                  return czm_infinity;
              }
              vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
              return -eyeCoordinate.z / eyeCoordinate.w;
          }
          float interpolateByDistance(vec4 nearFarScalar, float distance)
          {
              float startDistance = nearFarScalar.x;
              float startValue = nearFarScalar.y;
              float endDistance = nearFarScalar.z;
              float endValue = nearFarScalar.w;
              float t = clamp((distance - startDistance) / (endDistance - startDistance), 0.0, 1.0);
              return mix(startValue, endValue, t);
          }
          vec4 alphaBlend(vec4 sourceColor, vec4 destinationColor)
          {
              return sourceColor * vec4(sourceColor.aaa, 1.0) + destinationColor * (1.0 - sourceColor.a);
          }
          uniform sampler2D colorTexture;
          uniform sampler2D depthTexture;
          uniform vec4 fogByDistance;
          uniform vec4 fogColor;
          in vec2 v_textureCoordinates;
          void main(void)
          {
              float distance = getDistance(depthTexture, v_textureCoordinates);
              vec4 sceneColor = texture(colorTexture, v_textureCoordinates);
              float blendAmount = interpolateByDistance(fogByDistance, distance);
              vec4 finalFogColor = vec4(fogColor.rgb, fogColor.a * blendAmount);
              out_FragColor = alphaBlend(finalFogColor, sceneColor);
          }
          `;

viewer.scene.postProcessStages.add(
  new Cesium.PostProcessStage({
    fragmentShader: fragmentShaderSource,
    uniforms: {
      fogByDistance: new Cesium.Cartesian4(10, 0.0, 200, 1.0),
      fogColor: Cesium.Color.BLACK,
    },
  }),
);

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(40866);
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
