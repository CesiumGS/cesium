import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

const position = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706);
const url = "../../SampleData/models/CesiumMan/Cesium_Man.glb";
viewer.trackedEntity = viewer.entities.add({
  name: url,
  position: position,
  model: {
    uri: url,
  },
});

const fragmentShaderSource = `
          uniform sampler2D colorTexture;
          in vec2 v_textureCoordinates;
          const int KERNEL_WIDTH = 16;
          void main(void)
          {
              vec2 step = czm_pixelRatio / czm_viewport.zw;
              vec2 integralPos = v_textureCoordinates - mod(v_textureCoordinates, 8.0 * step);
              vec3 averageValue = vec3(0.0);
              for (int i = 0; i < KERNEL_WIDTH; i++)
              {
                  for (int j = 0; j < KERNEL_WIDTH; j++)
                  {
                      averageValue += texture(colorTexture, integralPos + step * vec2(i, j)).rgb;
                  }
              }
              averageValue /= float(KERNEL_WIDTH * KERNEL_WIDTH);
              out_FragColor = vec4(averageValue, 1.0);
          }
          `;
viewer.scene.postProcessStages.add(
  new Cesium.PostProcessStage({
    fragmentShader: fragmentShaderSource,
  }),
);
