/**
 * The Täsch to Zermatt road, baked: 40 vertices of longitude and latitude
 * (degrees), the shortest path through swisstopo's swissTLM3D road classes
 * (streets and tracks, not paths) between the two stations' ends, simplified
 * with Douglas–Peucker to about 9 m. About 6.3 km. Heights are not here: the
 * page reads them from the globe, so the road lies on the terrain the other
 * scenes draw.
 *
 * Source: swisstopo, swissTLM3D (© swisstopo), through the geo.admin.ch
 * identify service, fetched once offline; a live version would stitch the
 * short pieces the service returns.
 */
export const ROAD: ReadonlyArray<readonly [number, number]> = [
  [7.74919, 46.0207],
  [7.74992, 46.02126],
  [7.75109, 46.02161],
  [7.75143, 46.02197],
  [7.75146, 46.02362],
  [7.75315, 46.02589],
  [7.75286, 46.02742],
  [7.75391, 46.02898],
  [7.75568, 46.03073],
  [7.75621, 46.03164],
  [7.75724, 46.03218],
  [7.75848, 46.03346],
  [7.75875, 46.03402],
  [7.75853, 46.03489],
  [7.75881, 46.03541],
  [7.76194, 46.03751],
  [7.76269, 46.03833],
  [7.76275, 46.0391],
  [7.7642, 46.0397],
  [7.76499, 46.04102],
  [7.76783, 46.04376],
  [7.76851, 46.04489],
  [7.77001, 46.04646],
  [7.77025, 46.04738],
  [7.76999, 46.04833],
  [7.77027, 46.04859],
  [7.77088, 46.04878],
  [7.77134, 46.04973],
  [7.77199, 46.05284],
  [7.77357, 46.05446],
  [7.77381, 46.05626],
  [7.77467, 46.05744],
  [7.77468, 46.05816],
  [7.77712, 46.06079],
  [7.77781, 46.06222],
  [7.7779, 46.06361],
  [7.77771, 46.06477],
  [7.77826, 46.06837],
  [7.7792, 46.06958],
  [7.77891, 46.07091],
];

export const ROAD_CREDIT = {
  what: "The Täsch to Zermatt road",
  who: "© swisstopo, swissTLM3D (road centrelines through the geo.admin.ch identify service), baked into 40 vertices; heights from Cesium World Terrain",
  terms:
    "swisstopo's open government data, free with source attribution (terms as read from memory: check before shipping).",
  href: "https://www.swisstopo.admin.ch/en/landscape-model-swisstlm3d",
} as const;
