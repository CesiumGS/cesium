/**
 * @typedef KmlFeatureData.Author
 * @type {object}
 * @property {string} name Gets the name.
 * @property {string} uri Gets the URI.
 * @property {number} age Gets the email.
 */

/**
 * @typedef KmlFeatureData.Link
 * @type {object}
 * @property {string} href Gets the href.
 * @property {string} hreflang Gets the language of the linked resource.
 * @property {string} rel Gets the link relation.
 * @property {string} type Gets the link type.
 * @property {string} title Gets the link title.
 * @property {string} length Gets the link length.
 */

/**
 * Contains KML Feature data loaded into the <code>Entity.kml</code> property by {@link KmlDataSource}.
 */
class KmlFeatureData {
  constructor() {
    /**
     * Gets the atom syndication format author field.
     * @type {KmlFeatureData.Author}
     */
    this.author = {
      name: undefined,
      uri: undefined,
      email: undefined,
    };

    /**
     * Gets the link.
     * @type {KmlFeatureData.Link}
     */
    this.link = {
      href: undefined,
      hreflang: undefined,
      rel: undefined,
      type: undefined,
      title: undefined,
      length: undefined,
    };

    /**
     * Gets the unstructured address field.
     * @type {string}
     */
    this.address = undefined;
    /**
     * Gets the phone number.
     * @type {string}
     */
    this.phoneNumber = undefined;
    /**
     * Gets the snippet.
     * @type {string}
     */
    this.snippet = undefined;
    /**
     * Gets the extended data, parsed into a JSON object.
     * Currently only the <code>Data</code> property is supported.
     * <code>SchemaData</code> and custom data are ignored.
     * @type {string}
     */
    this.extendedData = undefined;
  }
}

export default KmlFeatureData;
