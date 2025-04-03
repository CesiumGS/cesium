// TODO_DRAPING A structure containing information
// about a piece of imagery that is covered by a given
// `Rectangle`
class ImageryCoverage {
  constructor() {
    // All {number}
    this.x = undefined;
    this.y = undefined;
    this.level = undefined;
    // {Cartesian4}, minU, minV, maxU, maxV
    this.texCoordsRectangle = undefined;
  }
}

export default ImageryCoverage;
