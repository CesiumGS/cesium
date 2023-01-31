import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

var warnings = {};

/**
 * Logs a one time message to the console.  Use this function instead of
 * <code>console.log</code> directly since this does not log duplicate messages
 * unless it is called from multiple workers.
 *
 * @function oneTimeWarning
 *
 * @param {String} identifier The unique identifier for this warning.
 * @param {String} [message=identifier] The message to log to the console.
 *
 * @example
 * for(var i=0;i<foo.length;++i) {
 *    if (!defined(foo[i].bar)) {
 *       // Something that can be recovered from but may happen a lot
 *       oneTimeWarning('foo.bar undefined', 'foo.bar is undefined. Setting to 0.');
 *       foo[i].bar = 0;
 *       // ...
 *    }
 * }
 *
 * @private
 */
function oneTimeWarning(identifier, message) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(identifier)) {
    throw new DeveloperError("identifier is required.");
  }
  //>>includeEnd('debug');

  if (!defined(warnings[identifier])) {
    warnings[identifier] = true;
    console.warn(defaultValue(message, identifier));
  }
}

oneTimeWarning.geometryOutlines =
  "Entity geometry outlines are unsupported on terrain. Outlines will be disabled. To enable outlines, disable geometry terrain clamping by explicitly setting height to 0.";

oneTimeWarning.geometryZIndex =
  "Entity geometry with zIndex are unsupported when height or extrudedHeight are defined.  zIndex will be ignored";

oneTimeWarning.geometryHeightReference =
  "Entity corridor, ellipse, polygon or rectangle with heightReference must also have a defined height.  heightReference will be ignored";
oneTimeWarning.geometryExtrudedHeightReference =
  "Entity corridor, ellipse, polygon or rectangle with extrudedHeightReference must also have a defined extrudedHeight.  extrudedHeightReference will be ignored";
export default oneTimeWarning;
