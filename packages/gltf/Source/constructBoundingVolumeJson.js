import {
  Cartesian3,
  DeveloperError,
  Matrix3,
  Quaternion,
  defined,
} from "@cesium/core";

/**
 * Converts the <code>boundingVolume</code> of a glTF node using the <code>3DTILES_tileset</code>
 * extension to the box or sphere bounding volume format of a 3D Tiles tileset JSON.
 * Only box and sphere shapes are supported.
 *
 * @param {object} boundingVolumeJson The glTF bounding volume, with a <code>shape</code> index and an optional <code>translation</code>, <code>rotation</code>, and <code>scale</code>.
 * @param {object[]} shapes The <code>shapes</code> array of the glTF.
 * @returns {{box: number[]}|{sphere: number[]}} The bounding volume in tileset JSON format, with either the box center followed by its half axes, or the sphere center followed by its radius.
 *
 * @exception {DeveloperError} Only box and sphere shapes are supported for the bounding volume.
 *
 * @internal
 */
function constructBoundingVolumeJson(boundingVolumeJson, shapes) {
  const {
    shape,
    translation = [0, 0, 0],
    rotation,
    scale,
  } = boundingVolumeJson;
  const { box, sphere } = shapes[shape];
  if (defined(box)) {
    return constructBox(box, translation, rotation, scale);
  }
  if (defined(sphere)) {
    return constructSphere(sphere, translation, scale);
  }
  throw new DeveloperError(
    "Only box and sphere shapes are supported for the bounding volume.",
  );
}

function constructBox(box, translation, rotation, scale) {
  // A glTF box stores its full size, while a tileset JSON box stores half axes.
  const halfAxes = Matrix3.fromScale(
    new Cartesian3(box.size[0] * 0.5, box.size[1] * 0.5, box.size[2] * 0.5),
  );
  if (defined(scale)) {
    Matrix3.multiplyByScale(
      halfAxes,
      new Cartesian3(scale[0], scale[1], scale[2]),
      halfAxes,
    );
  }
  if (defined(rotation)) {
    Matrix3.multiply(
      Matrix3.fromQuaternion(Quaternion.unpack(rotation)),
      halfAxes,
      halfAxes,
    );
  }
  return { box: Matrix3.pack(halfAxes, translation.slice(), 3) };
}

function constructSphere(sphere, translation, scale) {
  let radius = sphere.radius ?? 0.5;
  if (defined(scale)) {
    // A non-uniform scale makes an ellipsoid, so the largest axis keeps it enclosed.
    radius *= Math.max(
      Math.abs(scale[0]),
      Math.abs(scale[1]),
      Math.abs(scale[2]),
    );
  }
  return { sphere: [translation[0], translation[1], translation[2], radius] };
}

export default constructBoundingVolumeJson;
