import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayerPicker: false,
  geocoder: false,
});

const imageryLayers = viewer.imageryLayers;

const baseLayerSelect = document.getElementById("baseLayerSelect");
const overlayContainer = document.getElementById("overlayLayers");

const baseLayers = [];
const overlayLayers = [];

async function setupLayers() {
  await addBaseLayerOption(
    "Bing Maps Aerial",
    Cesium.createWorldImageryAsync(),
  );

  await addBaseLayerOption(
    "Bing Maps Road",
    Cesium.createWorldImageryAsync({
      style: Cesium.IonWorldImageryStyle.ROAD,
    }),
  );

  await addBaseLayerOption(
    "ArcGIS World Street Maps",
    Cesium.ArcGisMapServerImageryProvider.fromUrl(
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
    ),
  );

  await addBaseLayerOption(
    "OpenStreetMap",
    new Cesium.OpenStreetMapImageryProvider(),
  );

  await addBaseLayerOption(
    "USGS Shaded Relief (WMTS)",
    new Cesium.WebMapTileServiceImageryProvider({
      url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/WMTS",
      layer: "USGSShadedReliefOnly",
      style: "default",
      format: "image/jpeg",
      tileMatrixSetID: "default028mm",
      maximumLevel: 19,
      credit: "U. S. Geological Survey",
    }),
  );
  await addBaseLayerOption(
    "Stadia x Stamen Watercolor",
    new Cesium.OpenStreetMapImageryProvider({
      url: "https://tiles.stadiamaps.com/tiles/stamen_watercolor/",
      fileExtension: "jpg",
      credit: `&copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a>
               &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>
               &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>
               &copy; <a href="https://www.openstreetmap.org/about/" target="_blank">OpenStreetMap contributors</a>`,
    }),
  );
  await addBaseLayerOption(
    "Natural Earth II (local)",
    Cesium.TileMapServiceImageryProvider.fromUrl(
      Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
    ),
  );

  addAdditionalLayerOption(
    "GOES Infrared",
    new Cesium.WebMapServiceImageryProvider({
      url: "https://mesonet.agron.iastate.edu/cgi-bin/wms/goes/conus_ir.cgi?",
      layers: "goes_conus_ir",
      parameters: {
        transparent: "true",
        format: "image/png",
      },
    }),
    0.5,
  );

  addAdditionalLayerOption(
    "Weather Radar",
    new Cesium.WebMapServiceImageryProvider({
      url: "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi?",
      layers: "nexrad-n0r",
      parameters: {
        transparent: "true",
        format: "image/png",
      },
    }),
    0.5,
  );
  addAdditionalLayerOption(
    "TileMapService Image",
    Cesium.TileMapServiceImageryProvider.fromUrl(
      "../images/cesium_maptiler/Cesium_Logo_Color",
    ),
    0.2,
  );
  addAdditionalLayerOption(
    "Single Image",
    Cesium.SingleTileImageryProvider.fromUrl(
      "../images/Cesium_Logo_overlay.png",
      {
        rectangle: Cesium.Rectangle.fromDegrees(-115.0, 38.0, -107, 39.75),
      },
    ),
    1.0,
  );
  addAdditionalLayerOption(
    "Grid",
    new Cesium.GridImageryProvider(),
    1.0,
    false,
  );
  addAdditionalLayerOption(
    "Tile Coordinates",
    new Cesium.TileCoordinatesImageryProvider(),
    1.0,
    false,
  );
}

async function addBaseLayerOption(name, imageryProviderPromise) {
  const provider = await Promise.resolve(imageryProviderPromise);

  const layer = new Cesium.ImageryLayer(provider);
  layer.name = name;

  baseLayers.push(layer);

  // add to dropdown
  const option = document.createElement("option");
  option.textContent = name;
  option.value = baseLayers.length - 1;
  baseLayerSelect.appendChild(option);

  // first layer becomes active
  if (imageryLayers.length === 0) {
    imageryLayers.add(layer);
  }
}

async function addAdditionalLayerOption(
  name,
  imageryProviderPromise,
  alpha = 0.5,
  show = true,
) {
  const provider = await Promise.resolve(imageryProviderPromise);

  const layer = new Cesium.ImageryLayer(provider);

  layer.name = name;
  layer.alpha = alpha;
  layer.show = show;

  imageryLayers.add(layer);
  overlayLayers.push(layer);

  createOverlayToggle(layer);
}

function createOverlayToggle(layer) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("overlay-row");

  // visibility checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = layer.show;
  checkbox.addEventListener("change", () => {
    layer.show = checkbox.checked;
  });

  // layer name
  const label = document.createElement("span");
  label.textContent = layer.name;

  // move up button
  const upBtn = document.createElement("button");
  upBtn.textContent = "▲";
  upBtn.onclick = () => moveLayer(layer, "up");

  // move down button
  const downBtn = document.createElement("button");
  downBtn.textContent = "▼";
  downBtn.onclick = () => moveLayer(layer, "down");

  // opacity slider
  const opacitySlider = document.createElement("input");
  opacitySlider.type = "range";
  opacitySlider.min = 0;
  opacitySlider.max = 1;
  opacitySlider.step = 0.01;
  opacitySlider.value = layer.alpha;
  opacitySlider.addEventListener("input", () => {
    layer.alpha = parseFloat(opacitySlider.value);
  });

  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);
  wrapper.appendChild(upBtn);
  wrapper.appendChild(downBtn);
  wrapper.appendChild(opacitySlider);

  // reference for reordering
  layer._uiElement = wrapper;

  // insert at top to match top-to-top layer order
  overlayContainer.insertBefore(wrapper, overlayContainer.firstChild);
}

function moveLayer(layer, direction) {
  const index = imageryLayers.indexOf(layer);

  if (direction === "up" && index < imageryLayers.length - 1) {
    imageryLayers.raise(layer);

    const prevSibling = layer._uiElement.previousElementSibling;
    if (prevSibling) {
      overlayContainer.insertBefore(layer._uiElement, prevSibling);
    }
  } else if (direction === "down" && index > 0) {
    imageryLayers.lower(layer);

    const nextSibling = layer._uiElement.nextElementSibling;
    if (nextSibling) {
      overlayContainer.insertBefore(nextSibling, layer._uiElement);
    }
  }
}

baseLayerSelect.addEventListener("change", function () {
  const index = parseInt(this.value);
  const selected = baseLayers[index];

  // remove current base layer (always index 0)
  imageryLayers.remove(imageryLayers.get(0), false);

  // add new base layer at bottom
  imageryLayers.add(selected, 0);
});

setupLayers();
