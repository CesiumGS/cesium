import Check from "../Core/Check";

export default function ImplicitTemplateUri(uri) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("uri", uri);
  //>>includeEnd('debug');

  // TODO: sanitize input. Make sure there is x, y, and z

  this._uri = uri;
}

ImplicitTemplateUri.prototype.substitute = function (implicitCoordinates) {
  var uri = this._uri;
  uri = uri.replace("{level}", implicitCoordinates.level);
  uri = uri.replace("{x}", implicitCoordinates.x);
  uri = uri.replace("{y}", implicitCoordinates.y);
  if (implicitCoordinates.tilingScheme === ImplicitSubdivisionScheme.OCTREE) {
    uri = uri.replace("{z}", implicitCoordinates.z);
  }
  return uri;
};
