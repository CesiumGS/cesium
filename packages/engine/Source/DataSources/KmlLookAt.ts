/**
 * @alias KmlLookAt
 * @constructor
 *
 * @param {Cartesian3} position camera position
 * @param {HeadingPitchRange} headingPitchRange camera orientation
 */
function KmlLookAt(position: any, headingPitchRange: any) {
  this.position = position;
  this.headingPitchRange = headingPitchRange;
}
export default KmlLookAt;
