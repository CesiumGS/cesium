import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(4854512);
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

const legend = document.getElementById("legend");

// ── Style functions ──────────────────────────────────────────────────────────

function styleByYear() {
  tileset.style = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        [
          "Number(${cnstrct_yr}) === 0 || ${cnstrct_yr} === null",
          "color('grey', 0.6)",
        ],
        ["Number(${cnstrct_yr}) < 1900", "color('#4b0082', 0.8)"],
        ["Number(${cnstrct_yr}) < 1940", "color('#0000cd', 0.8)"],
        ["Number(${cnstrct_yr}) < 1970", "color('#008080', 0.8)"],
        ["Number(${cnstrct_yr}) < 1990", "color('#228b22', 0.8)"],
        ["Number(${cnstrct_yr}) < 2000", "color('#ffd700', 0.8)"],
        ["Number(${cnstrct_yr}) < 2010", "color('#ff8c00', 0.8)"],
        ["true", "color('#ff3300', 0.8)"],
      ],
    },
  });
  legend.style.display = "block";
  legend.innerHTML = `
    <div class="item"><span class="swatch" style="background:#808080"></span>Unknown</div>
    <div class="item"><span class="swatch" style="background:#4b0082"></span>Before 1900</div>
    <div class="item"><span class="swatch" style="background:#0000cd"></span>1900–1939</div>
    <div class="item"><span class="swatch" style="background:#008080"></span>1940–1969</div>
    <div class="item"><span class="swatch" style="background:#228b22"></span>1970–1989</div>
    <div class="item"><span class="swatch" style="background:#ffd700"></span>1990–1999</div>
    <div class="item"><span class="swatch" style="background:#ff8c00"></span>2000–2009</div>
    <div class="item"><span class="swatch" style="background:#ff3300"></span>2010–present</div>
  `;
}

function styleByHeight() {
  tileset.style = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        [
          "Number(${heightroof}) === 0 || ${heightroof} === null",
          "color('grey', 0.6)",
        ],
        ["Number(${heightroof}) < 10", "color('#ffffcc', 0.8)"],
        ["Number(${heightroof}) < 20", "color('#a1dab4', 0.8)"],
        ["Number(${heightroof}) < 50", "color('#41b6c4', 0.8)"],
        ["Number(${heightroof}) < 100", "color('#2c7fb8', 0.8)"],
        ["true", "color('#253494', 0.9)"],
      ],
    },
  });
  legend.style.display = "block";
  legend.innerHTML = `
    <div class="item"><span class="swatch" style="background:#808080"></span>Unknown</div>
    <div class="item"><span class="swatch" style="background:#ffffcc"></span>&lt; 10 ft</div>
    <div class="item"><span class="swatch" style="background:#a1dab4"></span>10–19 ft</div>
    <div class="item"><span class="swatch" style="background:#41b6c4"></span>20–49 ft</div>
    <div class="item"><span class="swatch" style="background:#2c7fb8"></span>50–99 ft</div>
    <div class="item"><span class="swatch" style="background:#253494"></span>≥ 100 ft</div>
  `;
}

function styleHighlightTall() {
  tileset.style = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        ["Number(${heightroof}) >= 300", "color('#ff0000', 1.0)"],
        ["Number(${heightroof}) >= 100", "color('#ff8c00', 0.9)"],
        ["true", "color('#aaaaaa', 0.3)"],
      ],
    },
  });
  legend.style.display = "block";
  legend.innerHTML = `
    <div class="item"><span class="swatch" style="background:#ff0000"></span>≥ 300 ft (skyscraper)</div>
    <div class="item"><span class="swatch" style="background:#ff8c00"></span>100–299 ft (tall)</div>
    <div class="item"><span class="swatch" style="background:#aaaaaa"></span>Low-rise</div>
  `;
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

const dropdown = document.getElementById("dropdown");
dropdown.addEventListener("change", () => {
  switch (dropdown.value) {
    case "year":
      styleByYear();
      break;
    case "height":
      styleByHeight();
      break;
    case "tall":
      styleHighlightTall();
      break;
  }
});

// Apply default style on load.
styleByYear();

viewer.flyTo(tileset, {
  offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 8000),
});
