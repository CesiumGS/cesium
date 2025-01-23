/**
 * The type of geocoding to be performed by a {@link GeocoderService}.
 * @enum {number}
 * @see Geocoder
 */
const GeocodeType = {
  /**
   * Perform a search where the input is considered complete.
   *
   * @type {number}
   * @constant
   */
  SEARCH: 0,

  /**
   * Perform an auto-complete using partial input, typically
   * reserved for providing possible results as a user is typing.
   *
   * @type {number}
   * @constant
   */
  AUTOCOMPLETE: 1,
};
export default Object.freeze(GeocodeType);
