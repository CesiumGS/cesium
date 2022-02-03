import DOMPurify from "../ThirdParty/dompurify.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";

let nextCreditId = 0;
const creditToId = {};

/**
 * A credit contains data pertaining to how to display attributions/credits for certain content on the screen.
 * @param {String} html An string representing an html code snippet
 * @param {Boolean} [showOnScreen=false] If true, the credit will be visible in the main credit container.  Otherwise, it will appear in a popover
 *
 * @alias Credit
 * @constructor
 *
 * @exception {DeveloperError} html is required.
 *
 * @example
 * //Create a credit with a tooltip, image and link
 * const credit = new Cesium.Credit('<a href="https://cesium.com/" target="_blank"><img src="/images/cesium_logo.png" title="Cesium"/></a>');
 */
function Credit(html, showOnScreen) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("html", html);
  //>>includeEnd('debug');
  let id;
  const key = html;

  if (defined(creditToId[key])) {
    id = creditToId[key];
  } else {
    id = nextCreditId++;
    creditToId[key] = id;
  }

  showOnScreen = defaultValue(showOnScreen, false);

  // Credits are immutable so generate an id to use to optimize equal()
  this._id = id;
  this._html = html;
  this._showOnScreen = showOnScreen;
  this._element = undefined;
}

Object.defineProperties(Credit.prototype, {
  /**
   * The credit content
   * @memberof Credit.prototype
   * @type {String}
   * @readonly
   */
  html: {
    get: function () {
      return this._html;
    },
  },

  /**
   * @memberof Credit.prototype
   * @type {Number}
   * @readonly
   *
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * Whether the credit should be displayed on screen or in a lightbox
   * @memberof Credit.prototype
   * @type {Boolean}
   * @readonly
   */
  showOnScreen: {
    get: function () {
      return this._showOnScreen;
    },
  },

  /**
   * Gets the credit element
   * @memberof Credit.prototype
   * @type {HTMLElement}
   * @readonly
   */
  element: {
    get: function () {
      if (!defined(this._element)) {
        const html = DOMPurify.sanitize(this._html);

        const div = document.createElement("div");
        div._creditId = this._id;
        div.style.display = "inline";
        div.innerHTML = html;

        const links = div.querySelectorAll("a");
        for (let i = 0; i < links.length; i++) {
          links[i].setAttribute("target", "_blank");
        }

        this._element = div;
      }
      return this._element;
    },
  },
});

/**
 * Returns true if the credits are equal
 *
 * @param {Credit} left The first credit
 * @param {Credit} right The second credit
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Credit.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) && defined(right) && left._id === right._id)
  );
};

/**
 * Returns true if the credits are equal
 *
 * @param {Credit} credit The credit to compare to.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Credit.prototype.equals = function (credit) {
  return Credit.equals(this, credit);
};

/**
 * @private
 * @param attribution
 * @return {Credit}
 */
Credit.getIonCredit = function (attribution) {
  const showOnScreen =
    defined(attribution.collapsible) && !attribution.collapsible;
  const credit = new Credit(attribution.html, showOnScreen);

  credit._isIon = credit.html.indexOf("ion-credit.png") !== -1;
  return credit;
};

/**
 * Duplicates a Credit instance.
 *
 * @param {Credit} [credit] The Credit to duplicate.
 * @returns {Credit} A new Credit instance that is a duplicate of the one provided. (Returns undefined if the credit is undefined)
 */
Credit.clone = function (credit) {
  if (defined(credit)) {
    return new Credit(credit.html, credit.showOnScreen);
  }
};
export default Credit;
