/**
 * The type of geocoding to be performed by a {@link GeocoderService}.
 * @enum {Number}
 * @see Geocoder
 */
const GeocodeType = {
  /**
   * Perform a search where the input is considered complete.
   *
   * @type {Number}
   * @constant
   */
  SEARCH: 0,

  /**
   * Perform an auto-complete using partial input, typically
   * reserved for providing possible results as a user is typing.
   *
   * @type {Number}
   * @constant
   */
  AUTOCOMPLETE: 1,
};
export default Object.freeze(GeocodeType);
