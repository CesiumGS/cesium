import AssociativeArray from "../Core/AssociativeArray.js";
import buildModuleUrl from "../Core/buildModuleUrl.js";
import Check from "../Core/Check.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Uri from "../ThirdParty/Uri.js";

const mobileWidth = 576;
const lightboxHeight = 100;
const textColor = "#ffffff";
const highlightColor = "#48b";

function contains(credits, credit) {
  const len = credits.length;
  for (let i = 0; i < len; i++) {
    const existingCredit = credits[i];
    if (Credit.equals(existingCredit, credit)) {
      return true;
    }
  }
  return false;
}

function swapCesiumCredit(creditDisplay) {
  // We don't want to clutter the screen with the Cesium logo and the Cesium ion
  // logo at the same time. Since the ion logo is required, we just replace the
  // Cesium logo or add the logo if the Cesium one was removed.
  const previousCredit = creditDisplay._previousCesiumCredit;
  const currentCredit = creditDisplay._currentCesiumCredit;
  if (Credit.equals(currentCredit, previousCredit)) {
    return;
  }

  if (defined(previousCredit)) {
    creditDisplay._cesiumCreditContainer.removeChild(previousCredit.element);
  }
  if (defined(currentCredit)) {
    creditDisplay._cesiumCreditContainer.appendChild(currentCredit.element);
  }

  creditDisplay._previousCesiumCredit = currentCredit;
}

const delimiterClassName = "cesium-credit-delimiter";

function createDelimiterElement(delimiter) {
  const delimiterElement = document.createElement("span");
  delimiterElement.textContent = delimiter;
  delimiterElement.className = delimiterClassName;
  return delimiterElement;
}

function createCreditElement(element, elementWrapperTagName) {
  // may need to wrap the credit in another element
  if (defined(elementWrapperTagName)) {
    const wrapper = document.createElement(elementWrapperTagName);
    wrapper._creditId = element._creditId;
    wrapper.appendChild(element);
    element = wrapper;
  }
  return element;
}

function displayCredits(container, credits, delimiter, elementWrapperTagName) {
  const childNodes = container.childNodes;
  let domIndex = -1;
  for (let creditIndex = 0; creditIndex < credits.length; ++creditIndex) {
    const credit = credits[creditIndex];
    if (defined(credit)) {
      domIndex = creditIndex;
      if (defined(delimiter)) {
        // credits may be separated by delimiters
        domIndex *= 2;
        if (creditIndex > 0) {
          const delimiterDomIndex = domIndex - 1;
          if (childNodes.length <= delimiterDomIndex) {
            container.appendChild(createDelimiterElement(delimiter));
          } else {
            const existingDelimiter = childNodes[delimiterDomIndex];
            if (existingDelimiter.className !== delimiterClassName) {
              container.replaceChild(
                createDelimiterElement(delimiter),
                existingDelimiter
              );
            }
          }
        }
      }

      const element = credit.element;

      // check to see if the correct credit is in the right place
      if (childNodes.length <= domIndex) {
        container.appendChild(
          createCreditElement(element, elementWrapperTagName)
        );
      } else {
        const existingElement = childNodes[domIndex];
        if (existingElement._creditId !== credit._id) {
          // not the right credit, swap it in
          container.replaceChild(
            createCreditElement(element, elementWrapperTagName),
            existingElement
          );
        }
      }
    }
  }

  // any remaining nodes in the container are unnecessary
  ++domIndex;
  while (domIndex < childNodes.length) {
    container.removeChild(childNodes[domIndex]);
  }
}

function styleLightboxContainer(that) {
  const lightboxCredits = that._lightboxCredits;
  const width = that.viewport.clientWidth;
  const height = that.viewport.clientHeight;
  if (width !== that._lastViewportWidth) {
    if (width < mobileWidth) {
      lightboxCredits.className =
        "cesium-credit-lightbox cesium-credit-lightbox-mobile";
      lightboxCredits.style.marginTop = "0";
    } else {
      lightboxCredits.className =
        "cesium-credit-lightbox cesium-credit-lightbox-expanded";
      lightboxCredits.style.marginTop =
        Math.floor((height - lightboxCredits.clientHeight) * 0.5) + "px";
    }
    that._lastViewportWidth = width;
  }

  if (width >= mobileWidth && height !== that._lastViewportHeight) {
    lightboxCredits.style.marginTop =
      Math.floor((height - lightboxCredits.clientHeight) * 0.5) + "px";
    that._lastViewportHeight = height;
  }
}

function addStyle(selector, styles) {
  let style = selector + " {";
  for (const attribute in styles) {
    if (styles.hasOwnProperty(attribute)) {
      style += attribute + ": " + styles[attribute] + "; ";
    }
  }
  style += " }\n";
  return style;
}

function appendCss() {
  let style = "";
  style += addStyle(".cesium-credit-lightbox-overlay", {
    display: "none",
    "z-index": "1", //must be at least 1 to draw over top other Cesium widgets
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    "background-color": "rgba(80, 80, 80, 0.8)",
  });

  style += addStyle(".cesium-credit-lightbox", {
    "background-color": "#303336",
    color: textColor,
    position: "relative",
    "min-height": lightboxHeight + "px",
    margin: "auto",
  });

  style += addStyle(
    ".cesium-credit-lightbox > ul > li a, .cesium-credit-lightbox > ul > li a:visited",
    {
      color: textColor,
    }
  );

  style += addStyle(".cesium-credit-lightbox > ul > li a:hover", {
    color: highlightColor,
  });

  style += addStyle(".cesium-credit-lightbox.cesium-credit-lightbox-expanded", {
    border: "1px solid #444",
    "border-radius": "5px",
    "max-width": "370px",
  });

  style += addStyle(".cesium-credit-lightbox.cesium-credit-lightbox-mobile", {
    height: "100%",
    width: "100%",
  });

  style += addStyle(".cesium-credit-lightbox-title", {
    padding: "20px 20px 0 20px",
  });

  style += addStyle(".cesium-credit-lightbox-close", {
    "font-size": "18pt",
    cursor: "pointer",
    position: "absolute",
    top: "0",
    right: "6px",
    color: textColor,
  });

  style += addStyle(".cesium-credit-lightbox-close:hover", {
    color: highlightColor,
  });

  style += addStyle(".cesium-credit-lightbox > ul", {
    margin: "0",
    padding: "12px 20px 12px 40px",
    "font-size": "13px",
  });

  style += addStyle(".cesium-credit-lightbox > ul > li", {
    "padding-bottom": "6px",
  });

  style += addStyle(".cesium-credit-lightbox > ul > li *", {
    padding: "0",
    margin: "0",
  });

  style += addStyle(".cesium-credit-expand-link", {
    "padding-left": "5px",
    cursor: "pointer",
    "text-decoration": "underline",
    color: textColor,
  });
  style += addStyle(".cesium-credit-expand-link:hover", {
    color: highlightColor,
  });

  style += addStyle(".cesium-credit-text", {
    color: textColor,
  });

  style += addStyle(
    ".cesium-credit-textContainer *, .cesium-credit-logoContainer *",
    {
      display: "inline",
    }
  );

  const head = document.head;
  const css = document.createElement("style");
  css.innerHTML = style;
  head.insertBefore(css, head.firstChild);
}

/**
 * The credit display is responsible for displaying credits on screen.
 *
 * @param {HTMLElement} container The HTML element where credits will be displayed
 * @param {String} [delimiter= ' • '] The string to separate text credits
 * @param {HTMLElement} [viewport=document.body] The HTML element that will contain the credits popup
 *
 * @alias CreditDisplay
 * @constructor
 *
 * @example
 * const creditDisplay = new Cesium.CreditDisplay(creditContainer);
 */
function CreditDisplay(container, delimiter, viewport) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("container", container);
  //>>includeEnd('debug');
  const that = this;

  viewport = defaultValue(viewport, document.body);

  const lightbox = document.createElement("div");
  lightbox.className = "cesium-credit-lightbox-overlay";
  viewport.appendChild(lightbox);

  const lightboxCredits = document.createElement("div");
  lightboxCredits.className = "cesium-credit-lightbox";
  lightbox.appendChild(lightboxCredits);

  function hideLightbox(event) {
    if (lightboxCredits.contains(event.target)) {
      return;
    }
    that.hideLightbox();
  }
  lightbox.addEventListener("click", hideLightbox, false);

  const title = document.createElement("div");
  title.className = "cesium-credit-lightbox-title";
  title.textContent = "Data provided by:";
  lightboxCredits.appendChild(title);

  const closeButton = document.createElement("a");
  closeButton.onclick = this.hideLightbox.bind(this);
  closeButton.innerHTML = "&times;";
  closeButton.className = "cesium-credit-lightbox-close";
  lightboxCredits.appendChild(closeButton);

  const creditList = document.createElement("ul");
  lightboxCredits.appendChild(creditList);

  const cesiumCreditContainer = document.createElement("div");
  cesiumCreditContainer.className = "cesium-credit-logoContainer";
  cesiumCreditContainer.style.display = "inline";
  container.appendChild(cesiumCreditContainer);

  const screenContainer = document.createElement("div");
  screenContainer.className = "cesium-credit-textContainer";
  screenContainer.style.display = "inline";
  container.appendChild(screenContainer);

  const expandLink = document.createElement("a");
  expandLink.className = "cesium-credit-expand-link";
  expandLink.onclick = this.showLightbox.bind(this);
  expandLink.textContent = "Data attribution";
  container.appendChild(expandLink);

  appendCss();
  const cesiumCredit = Credit.clone(CreditDisplay.cesiumCredit);

  this._delimiter = defaultValue(delimiter, " • ");
  this._screenContainer = screenContainer;
  this._cesiumCreditContainer = cesiumCreditContainer;
  this._lastViewportHeight = undefined;
  this._lastViewportWidth = undefined;
  this._lightboxCredits = lightboxCredits;
  this._creditList = creditList;
  this._lightbox = lightbox;
  this._hideLightbox = hideLightbox;
  this._expandLink = expandLink;
  this._expanded = false;
  this._defaultCredits = [];
  this._cesiumCredit = cesiumCredit;
  this._previousCesiumCredit = undefined;
  this._currentCesiumCredit = cesiumCredit;
  this._currentFrameCredits = {
    screenCredits: new AssociativeArray(),
    lightboxCredits: new AssociativeArray(),
  };
  this._defaultCredit = undefined;

  this.viewport = viewport;

  /**
   * The HTML element where credits will be displayed.
   * @type {HTMLElement}
   */
  this.container = container;
}

/**
 * Adds a credit to the list of current credits to be displayed in the credit container
 *
 * @param {Credit} credit The credit to display
 */
CreditDisplay.prototype.addCredit = function (credit) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("credit", credit);
  //>>includeEnd('debug');

  if (credit._isIon) {
    // If this is the an ion logo credit from the ion server
    // Juse use the default credit (which is identical) to avoid blinking
    if (!defined(this._defaultCredit)) {
      this._defaultCredit = Credit.clone(getDefaultCredit());
    }
    this._currentCesiumCredit = this._defaultCredit;
    return;
  }

  if (!credit.showOnScreen) {
    this._currentFrameCredits.lightboxCredits.set(credit.id, credit);
  } else {
    this._currentFrameCredits.screenCredits.set(credit.id, credit);
  }
};

/**
 * Adds credits that will persist until they are removed
 *
 * @param {Credit} credit The credit to added to defaults
 */
CreditDisplay.prototype.addDefaultCredit = function (credit) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("credit", credit);
  //>>includeEnd('debug');

  const defaultCredits = this._defaultCredits;
  if (!contains(defaultCredits, credit)) {
    defaultCredits.push(credit);
  }
};

/**
 * Removes a default credit
 *
 * @param {Credit} credit The credit to be removed from defaults
 */
CreditDisplay.prototype.removeDefaultCredit = function (credit) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("credit", credit);
  //>>includeEnd('debug');

  const defaultCredits = this._defaultCredits;
  const index = defaultCredits.indexOf(credit);
  if (index !== -1) {
    defaultCredits.splice(index, 1);
  }
};

CreditDisplay.prototype.showLightbox = function () {
  this._lightbox.style.display = "block";
  this._expanded = true;
};

CreditDisplay.prototype.hideLightbox = function () {
  this._lightbox.style.display = "none";
  this._expanded = false;
};

/**
 * Updates the credit display before a new frame is rendered.
 */
CreditDisplay.prototype.update = function () {
  if (this._expanded) {
    styleLightboxContainer(this);
  }
};

/**
 * Resets the credit display to a beginning of frame state, clearing out current credits.
 */
CreditDisplay.prototype.beginFrame = function () {
  const currentFrameCredits = this._currentFrameCredits;

  const screenCredits = currentFrameCredits.screenCredits;
  screenCredits.removeAll();
  const defaultCredits = this._defaultCredits;
  for (let i = 0; i < defaultCredits.length; ++i) {
    const defaultCredit = defaultCredits[i];
    screenCredits.set(defaultCredit.id, defaultCredit);
  }

  currentFrameCredits.lightboxCredits.removeAll();

  if (!Credit.equals(CreditDisplay.cesiumCredit, this._cesiumCredit)) {
    this._cesiumCredit = Credit.clone(CreditDisplay.cesiumCredit);
  }
  this._currentCesiumCredit = this._cesiumCredit;
};

/**
 * Sets the credit display to the end of frame state, displaying credits from the last frame in the credit container.
 */
CreditDisplay.prototype.endFrame = function () {
  const screenCredits = this._currentFrameCredits.screenCredits.values;
  displayCredits(
    this._screenContainer,
    screenCredits,
    this._delimiter,
    undefined
  );

  const lightboxCredits = this._currentFrameCredits.lightboxCredits.values;
  this._expandLink.style.display =
    lightboxCredits.length > 0 ? "inline" : "none";
  displayCredits(this._creditList, lightboxCredits, undefined, "li");

  swapCesiumCredit(this);
};

/**
 * Destroys the resources held by this object.  Destroying an object allows for deterministic
 * release of resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
CreditDisplay.prototype.destroy = function () {
  this._lightbox.removeEventListener("click", this._hideLightbox, false);

  this.container.removeChild(this._cesiumCreditContainer);
  this.container.removeChild(this._screenContainer);
  this.container.removeChild(this._expandLink);
  this.viewport.removeChild(this._lightbox);

  return destroyObject(this);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 */
CreditDisplay.prototype.isDestroyed = function () {
  return false;
};

CreditDisplay._cesiumCredit = undefined;
CreditDisplay._cesiumCreditInitialized = false;

let defaultCredit;
function getDefaultCredit() {
  if (!defined(defaultCredit)) {
    let logo = buildModuleUrl("Assets/Images/ion-credit.png");

    // When hosting in a WebView, the base URL scheme is file:// or ms-appx-web://
    // which is stripped out from the Credit's <img> tag; use the full path instead
    if (
      logo.indexOf("http://") !== 0 &&
      logo.indexOf("https://") !== 0 &&
      logo.indexOf("data:") !== 0
    ) {
      const logoUrl = new Uri(logo);
      logo = logoUrl.path();
    }

    defaultCredit = new Credit(
      '<a href="https://cesium.com/" target="_blank"><img src="' +
        logo +
        '" title="Cesium ion"/></a>',
      true
    );
  }

  if (!CreditDisplay._cesiumCreditInitialized) {
    CreditDisplay._cesiumCredit = defaultCredit;
    CreditDisplay._cesiumCreditInitialized = true;
  }
  return defaultCredit;
}

Object.defineProperties(CreditDisplay, {
  /**
   * Gets or sets the Cesium logo credit.
   * @memberof CreditDisplay
   * @type {Credit}
   */
  cesiumCredit: {
    get: function () {
      getDefaultCredit();
      return CreditDisplay._cesiumCredit;
    },
    set: function (value) {
      CreditDisplay._cesiumCredit = value;
      CreditDisplay._cesiumCreditInitialized = true;
    },
  },
});
export default CreditDisplay;
