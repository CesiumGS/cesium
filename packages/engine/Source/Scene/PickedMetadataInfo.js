/**
 * Information about metadata that is supposed to be picked.
 *
 * This is initialized in the `Scene.pickMetadata` function, and passed to
 * the `FrameState`. It is used to configure the draw commands that render
 * the metadata values of an object into the picking frame buffer. The
 * raw values are read from that buffer, and are then translated back into
 * proper metadata values in `Picking.pickMetadata`, using the structural
 * information about the metadata `classProperty` that is stored here.
 *
 * @private
 */
function PickedMetadataInfo(schemaId, className, propertyName, classProperty) {
  /**
   * The optional ID of the metadata schema
   *
   * @type {string|undefined}
   */
  this.schemaId = schemaId;
  /**
   * The name of the metadata class
   *
   * @type {string}
   */
  this.className = className;
  /**
   * The name of the metadata property
   *
   * @type {string}
   */
  this.propertyName = propertyName;
  /**
   * The optional ID of the metadata schema
   *
   * @type {MetadataClassProperty}
   */
  this.classProperty = classProperty;
}
export default PickedMetadataInfo;
