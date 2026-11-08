import type { Viewer } from "../../widgets/index.ts";
declare const viewer: Viewer;
declare const url: string;
// ---
// One resource can be placed many times.
const model = await viewer.loadModel(url);
const placement = model.place({
  at: { longitude: -75.6, latitude: 40.0 },
  heightReference: "clampToGround",
});
viewer.zoomTo(placement);
