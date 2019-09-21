var tmp = {};

/*!
 * Autolinker.js
 * 3.11.0
 *
 * Copyright(c) 2019 Gregory Jacobs <greg@greg-jacobs.com>
 * MIT License
 *
 * https://github.com/gregjacobs/Autolinker.js
 */
(function (global, factory) {
    global.Autolinker = factory();
}(tmp, function () { 'use strict';

    /**
     * Assigns (shallow copies) the properties of `src` onto `dest`, if the
     * corresponding property on `dest` === `undefined`.
     *
     * @param {Object} dest The destination object.
     * @param {Object} src The source object.
     * @return {Object} The destination object (`dest`)
     */
    function defaults(dest, src) {
        for (var prop in src) {
            if (src.hasOwnProperty(prop) && dest[prop] === undefined) {
                dest[prop] = src[prop];
            }
        }
        return dest;
    }
    /**
     * Truncates the `str` at `len - ellipsisChars.length`, and adds the `ellipsisChars` to the
     * end of the string (by default, two periods: '..'). If the `str` length does not exceed
     * `len`, the string will be returned unchanged.
     *
     * @param {String} str The string to truncate and add an ellipsis to.
     * @param {Number} truncateLen The length to truncate the string at.
     * @param {String} [ellipsisChars=...] The ellipsis character(s) to add to the end of `str`
     *   when truncated. Defaults to '...'
     */
    function ellipsis(str, truncateLen, ellipsisChars) {
        var ellipsisLength;
        if (str.length > truncateLen) {
            if (ellipsisChars == null) {
                ellipsisChars = '&hellip;';
                ellipsisLength = 3;
            }
            else {
                ellipsisLength = ellipsisChars.length;
            }
            str = str.substring(0, truncateLen - ellipsisLength) + ellipsisChars;
        }
        return str;
    }
    /**
     * Supports `Array.prototype.indexOf()` functionality for old IE (IE8 and below).
     *
     * @param {Array} arr The array to find an element of.
     * @param {*} element The element to find in the array, and return the index of.
     * @return {Number} The index of the `element`, or -1 if it was not found.
     */
    function indexOf(arr, element) {
        if (Array.prototype.indexOf) {
            return arr.indexOf(element);
        }
        else {
            for (var i = 0, len = arr.length; i < len; i++) {
                if (arr[i] === element)
                    return i;
            }
            return -1;
        }
    }
    /**
     * Removes array elements based on a filtering function. Mutates the input
     * array.
     *
     * Using this instead of the ES5 Array.prototype.filter() function, to allow
     * Autolinker compatibility with IE8, and also to prevent creating many new
     * arrays in memory for filtering.
     *
     * @param {Array} arr The array to remove elements from. This array is
     *   mutated.
     * @param {Function} fn A function which should return `true` to
     *   remove an element.
     * @return {Array} The mutated input `arr`.
     */
    function remove(arr, fn) {
        for (var i = arr.length - 1; i >= 0; i--) {
            if (fn(arr[i]) === true) {
                arr.splice(i, 1);
            }
        }
    }
    /**
     * Performs the functionality of what modern browsers do when `String.prototype.split()` is called
     * with a regular expression that contains capturing parenthesis.
     *
     * For example:
     *
     *     // Modern browsers:
     *     "a,b,c".split( /(,)/ );  // --> [ 'a', ',', 'b', ',', 'c' ]
     *
     *     // Old IE (including IE8):
     *     "a,b,c".split( /(,)/ );  // --> [ 'a', 'b', 'c' ]
     *
     * This method emulates the functionality of modern browsers for the old IE case.
     *
     * @param {String} str The string to split.
     * @param {RegExp} splitRegex The regular expression to split the input `str` on. The splitting
     *   character(s) will be spliced into the array, as in the "modern browsers" example in the
     *   description of this method.
     *   Note #1: the supplied regular expression **must** have the 'g' flag specified.
     *   Note #2: for simplicity's sake, the regular expression does not need
     *   to contain capturing parenthesis - it will be assumed that any match has them.
     * @return {String[]} The split array of strings, with the splitting character(s) included.
     */
    function splitAndCapture(str, splitRegex) {
        if (!splitRegex.global)
            throw new Error("`splitRegex` must have the 'g' flag set");
        var result = [], lastIdx = 0, match;
        while (match = splitRegex.exec(str)) {
            result.push(str.substring(lastIdx, match.index));
            result.push(match[0]); // push the splitting char(s)
            lastIdx = match.index + match[0].length;
        }
        result.push(str.substring(lastIdx));
        return result;
    }
    /**
     * Function that should never be called but is used to check that every
     * enum value is handled using TypeScript's 'never' type.
     */
    function throwUnhandledCaseError(theValue) {
        throw new Error("Unhandled case for value: '" + theValue + "'");
    }

    /**
     * @class Autolinker.HtmlTag
     * @extends Object
     *
     * Represents an HTML tag, which can be used to easily build/modify HTML tags programmatically.
     *
     * Autolinker uses this abstraction to create HTML tags, and then write them out as strings. You may also use
     * this class in your code, especially within a {@link Autolinker#replaceFn replaceFn}.
     *
     * ## Examples
     *
     * Example instantiation:
     *
     *     var tag = new Autolinker.HtmlTag( {
     *         tagName : 'a',
     *         attrs   : { 'href': 'http://google.com', 'class': 'external-link' },
     *         innerHtml : 'Google'
     *     } );
     *
     *     tag.toAnchorString();  // <a href="http://google.com" class="external-link">Google</a>
     *
     *     // Individual accessor methods
     *     tag.getTagName();                 // 'a'
     *     tag.getAttr( 'href' );            // 'http://google.com'
     *     tag.hasClass( 'external-link' );  // true
     *
     *
     * Using mutator methods (which may be used in combination with instantiation config properties):
     *
     *     var tag = new Autolinker.HtmlTag();
     *     tag.setTagName( 'a' );
     *     tag.setAttr( 'href', 'http://google.com' );
     *     tag.addClass( 'external-link' );
     *     tag.setInnerHtml( 'Google' );
     *
     *     tag.getTagName();                 // 'a'
     *     tag.getAttr( 'href' );            // 'http://google.com'
     *     tag.hasClass( 'external-link' );  // true
     *
     *     tag.toAnchorString();  // <a href="http://google.com" class="external-link">Google</a>
     *
     *
     * ## Example use within a {@link Autolinker#replaceFn replaceFn}
     *
     *     var html = Autolinker.link( "Test google.com", {
     *         replaceFn : function( match ) {
     *             var tag = match.buildTag();  // returns an {@link Autolinker.HtmlTag} instance, configured with the Match's href and anchor text
     *             tag.setAttr( 'rel', 'nofollow' );
     *
     *             return tag;
     *         }
     *     } );
     *
     *     // generated html:
     *     //   Test <a href="http://google.com" target="_blank" rel="nofollow">google.com</a>
     *
     *
     * ## Example use with a new tag for the replacement
     *
     *     var html = Autolinker.link( "Test google.com", {
     *         replaceFn : function( match ) {
     *             var tag = new Autolinker.HtmlTag( {
     *                 tagName : 'button',
     *                 attrs   : { 'title': 'Load URL: ' + match.getAnchorHref() },
     *                 innerHtml : 'Load URL: ' + match.getAnchorText()
     *             } );
     *
     *             return tag;
     *         }
     *     } );
     *
     *     // generated html:
     *     //   Test <button title="Load URL: http://google.com">Load URL: google.com</button>
     */
    var HtmlTag = /** @class */ (function () {
        /**
         * @method constructor
         * @param {Object} [cfg] The configuration properties for this class, in an Object (map)
         */
        function HtmlTag(cfg) {
            if (cfg === void 0) { cfg = {}; }
            /**
             * @cfg {String} tagName
             *
             * The tag name. Ex: 'a', 'button', etc.
             *
             * Not required at instantiation time, but should be set using {@link #setTagName} before {@link #toAnchorString}
             * is executed.
             */
            this.tagName = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Object.<String, String>} attrs
             *
             * An key/value Object (map) of attributes to create the tag with. The keys are the attribute names, and the
             * values are the attribute values.
             */
            this.attrs = {}; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String} innerHTML
             *
             * The inner HTML for the tag.
             */
            this.innerHTML = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @protected
             * @property {RegExp} whitespaceRegex
             *
             * Regular expression used to match whitespace in a string of CSS classes.
             */
            this.whitespaceRegex = /\s+/; // default value just to get the above doc comment in the ES5 output and documentation generator
            this.tagName = cfg.tagName || '';
            this.attrs = cfg.attrs || {};
            this.innerHTML = cfg.innerHtml || cfg.innerHTML || ''; // accept either the camelCased form or the fully capitalized acronym as in the DOM
        }
        /**
         * Sets the tag name that will be used to generate the tag with.
         *
         * @param {String} tagName
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setTagName = function (tagName) {
            this.tagName = tagName;
            return this;
        };
        /**
         * Retrieves the tag name.
         *
         * @return {String}
         */
        HtmlTag.prototype.getTagName = function () {
            return this.tagName || '';
        };
        /**
         * Sets an attribute on the HtmlTag.
         *
         * @param {String} attrName The attribute name to set.
         * @param {String} attrValue The attribute value to set.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setAttr = function (attrName, attrValue) {
            var tagAttrs = this.getAttrs();
            tagAttrs[attrName] = attrValue;
            return this;
        };
        /**
         * Retrieves an attribute from the HtmlTag. If the attribute does not exist, returns `undefined`.
         *
         * @param {String} attrName The attribute name to retrieve.
         * @return {String} The attribute's value, or `undefined` if it does not exist on the HtmlTag.
         */
        HtmlTag.prototype.getAttr = function (attrName) {
            return this.getAttrs()[attrName];
        };
        /**
         * Sets one or more attributes on the HtmlTag.
         *
         * @param {Object.<String, String>} attrs A key/value Object (map) of the attributes to set.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setAttrs = function (attrs) {
            Object.assign(this.getAttrs(), attrs);
            return this;
        };
        /**
         * Retrieves the attributes Object (map) for the HtmlTag.
         *
         * @return {Object.<String, String>} A key/value object of the attributes for the HtmlTag.
         */
        HtmlTag.prototype.getAttrs = function () {
            return this.attrs || (this.attrs = {});
        };
        /**
         * Sets the provided `cssClass`, overwriting any current CSS classes on the HtmlTag.
         *
         * @param {String} cssClass One or more space-separated CSS classes to set (overwrite).
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setClass = function (cssClass) {
            return this.setAttr('class', cssClass);
        };
        /**
         * Convenience method to add one or more CSS classes to the HtmlTag. Will not add duplicate CSS classes.
         *
         * @param {String} cssClass One or more space-separated CSS classes to add.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.addClass = function (cssClass) {
            var classAttr = this.getClass(), whitespaceRegex = this.whitespaceRegex, classes = (!classAttr) ? [] : classAttr.split(whitespaceRegex), newClasses = cssClass.split(whitespaceRegex), newClass;
            while (newClass = newClasses.shift()) {
                if (indexOf(classes, newClass) === -1) {
                    classes.push(newClass);
                }
            }
            this.getAttrs()['class'] = classes.join(" ");
            return this;
        };
        /**
         * Convenience method to remove one or more CSS classes from the HtmlTag.
         *
         * @param {String} cssClass One or more space-separated CSS classes to remove.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.removeClass = function (cssClass) {
            var classAttr = this.getClass(), whitespaceRegex = this.whitespaceRegex, classes = (!classAttr) ? [] : classAttr.split(whitespaceRegex), removeClasses = cssClass.split(whitespaceRegex), removeClass;
            while (classes.length && (removeClass = removeClasses.shift())) {
                var idx = indexOf(classes, removeClass);
                if (idx !== -1) {
                    classes.splice(idx, 1);
                }
            }
            this.getAttrs()['class'] = classes.join(" ");
            return this;
        };
        /**
         * Convenience method to retrieve the CSS class(es) for the HtmlTag, which will each be separated by spaces when
         * there are multiple.
         *
         * @return {String}
         */
        HtmlTag.prototype.getClass = function () {
            return this.getAttrs()['class'] || "";
        };
        /**
         * Convenience method to check if the tag has a CSS class or not.
         *
         * @param {String} cssClass The CSS class to check for.
         * @return {Boolean} `true` if the HtmlTag has the CSS class, `false` otherwise.
         */
        HtmlTag.prototype.hasClass = function (cssClass) {
            return (' ' + this.getClass() + ' ').indexOf(' ' + cssClass + ' ') !== -1;
        };
        /**
         * Sets the inner HTML for the tag.
         *
         * @param {String} html The inner HTML to set.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setInnerHTML = function (html) {
            this.innerHTML = html;
            return this;
        };
        /**
         * Backwards compatibility method name.
         *
         * @param {String} html The inner HTML to set.
         * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
         */
        HtmlTag.prototype.setInnerHtml = function (html) {
            return this.setInnerHTML(html);
        };
        /**
         * Retrieves the inner HTML for the tag.
         *
         * @return {String}
         */
        HtmlTag.prototype.getInnerHTML = function () {
            return this.innerHTML || "";
        };
        /**
         * Backward compatibility method name.
         *
         * @return {String}
         */
        HtmlTag.prototype.getInnerHtml = function () {
            return this.getInnerHTML();
        };
        /**
         * Override of superclass method used to generate the HTML string for the tag.
         *
         * @return {String}
         */
        HtmlTag.prototype.toAnchorString = function () {
            var tagName = this.getTagName(), attrsStr = this.buildAttrsStr();
            attrsStr = (attrsStr) ? ' ' + attrsStr : ''; // prepend a space if there are actually attributes
            return ['<', tagName, attrsStr, '>', this.getInnerHtml(), '</', tagName, '>'].join("");
        };
        /**
         * Support method for {@link #toAnchorString}, returns the string space-separated key="value" pairs, used to populate
         * the stringified HtmlTag.
         *
         * @protected
         * @return {String} Example return: `attr1="value1" attr2="value2"`
         */
        HtmlTag.prototype.buildAttrsStr = function () {
            if (!this.attrs)
                return ""; // no `attrs` Object (map) has been set, return empty string
            var attrs = this.getAttrs(), attrsArr = [];
            for (var prop in attrs) {
                if (attrs.hasOwnProperty(prop)) {
                    attrsArr.push(prop + '="' + attrs[prop] + '"');
                }
            }
            return attrsArr.join(" ");
        };
        return HtmlTag;
    }());

    /**
     * Date: 2015-10-05
     * Author: Kasper Søfren <soefritz@gmail.com> (https://github.com/kafoso)
     *
     * A truncation feature, where the ellipsis will be placed at a section within
     * the URL making it still somewhat human readable.
     *
     * @param {String} url						 A URL.
     * @param {Number} truncateLen		 The maximum length of the truncated output URL string.
     * @param {String} ellipsisChars	 The characters to place within the url, e.g. "...".
     * @return {String} The truncated URL.
     */
    function truncateSmart(url, truncateLen, ellipsisChars) {
        var ellipsisLengthBeforeParsing;
        var ellipsisLength;
        if (ellipsisChars == null) {
            ellipsisChars = '&hellip;';
            ellipsisLength = 3;
            ellipsisLengthBeforeParsing = 8;
        }
        else {
            ellipsisLength = ellipsisChars.length;
            ellipsisLengthBeforeParsing = ellipsisChars.length;
        }
        var parse_url = function (url) {
            var urlObj = {};
            var urlSub = url;
            var match = urlSub.match(/^([a-z]+):\/\//i);
            if (match) {
                urlObj.scheme = match[1];
                urlSub = urlSub.substr(match[0].length);
            }
            match = urlSub.match(/^(.*?)(?=(\?|#|\/|$))/i);
            if (match) {
                urlObj.host = match[1];
                urlSub = urlSub.substr(match[0].length);
            }
            match = urlSub.match(/^\/(.*?)(?=(\?|#|$))/i);
            if (match) {
                urlObj.path = match[1];
                urlSub = urlSub.substr(match[0].length);
            }
            match = urlSub.match(/^\?(.*?)(?=(#|$))/i);
            if (match) {
                urlObj.query = match[1];
                urlSub = urlSub.substr(match[0].length);
            }
            match = urlSub.match(/^#(.*?)$/i);
            if (match) {
                urlObj.fragment = match[1];
                //urlSub = urlSub.substr(match[0].length);  -- not used. Uncomment if adding another block.
            }
            return urlObj;
        };
        var buildUrl = function (urlObj) {
            var url = "";
            if (urlObj.scheme && urlObj.host) {
                url += urlObj.scheme + "://";
            }
            if (urlObj.host) {
                url += urlObj.host;
            }
            if (urlObj.path) {
                url += "/" + urlObj.path;
            }
            if (urlObj.query) {
                url += "?" + urlObj.query;
            }
            if (urlObj.fragment) {
                url += "#" + urlObj.fragment;
            }
            return url;
        };
        var buildSegment = function (segment, remainingAvailableLength) {
            var remainingAvailableLengthHalf = remainingAvailableLength / 2, startOffset = Math.ceil(remainingAvailableLengthHalf), endOffset = (-1) * Math.floor(remainingAvailableLengthHalf), end = "";
            if (endOffset < 0) {
                end = segment.substr(endOffset);
            }
            return segment.substr(0, startOffset) + ellipsisChars + end;
        };
        if (url.length <= truncateLen) {
            return url;
        }
        var availableLength = truncateLen - ellipsisLength;
        var urlObj = parse_url(url);
        // Clean up the URL
        if (urlObj.query) {
            var matchQuery = urlObj.query.match(/^(.*?)(?=(\?|\#))(.*?)$/i);
            if (matchQuery) {
                // Malformed URL; two or more "?". Removed any content behind the 2nd.
                urlObj.query = urlObj.query.substr(0, matchQuery[1].length);
                url = buildUrl(urlObj);
            }
        }
        if (url.length <= truncateLen) {
            return url;
        }
        if (urlObj.host) {
            urlObj.host = urlObj.host.replace(/^www\./, "");
            url = buildUrl(urlObj);
        }
        if (url.length <= truncateLen) {
            return url;
        }
        // Process and build the URL
        var str = "";
        if (urlObj.host) {
            str += urlObj.host;
        }
        if (str.length >= availableLength) {
            if (urlObj.host.length == truncateLen) {
                return (urlObj.host.substr(0, (truncateLen - ellipsisLength)) + ellipsisChars).substr(0, availableLength + ellipsisLengthBeforeParsing);
            }
            return buildSegment(str, availableLength).substr(0, availableLength + ellipsisLengthBeforeParsing);
        }
        var pathAndQuery = "";
        if (urlObj.path) {
            pathAndQuery += "/" + urlObj.path;
        }
        if (urlObj.query) {
            pathAndQuery += "?" + urlObj.query;
        }
        if (pathAndQuery) {
            if ((str + pathAndQuery).length >= availableLength) {
                if ((str + pathAndQuery).length == truncateLen) {
                    return (str + pathAndQuery).substr(0, truncateLen);
                }
                var remainingAvailableLength = availableLength - str.length;
                return (str + buildSegment(pathAndQuery, remainingAvailableLength)).substr(0, availableLength + ellipsisLengthBeforeParsing);
            }
            else {
                str += pathAndQuery;
            }
        }
        if (urlObj.fragment) {
            var fragment = "#" + urlObj.fragment;
            if ((str + fragment).length >= availableLength) {
                if ((str + fragment).length == truncateLen) {
                    return (str + fragment).substr(0, truncateLen);
                }
                var remainingAvailableLength2 = availableLength - str.length;
                return (str + buildSegment(fragment, remainingAvailableLength2)).substr(0, availableLength + ellipsisLengthBeforeParsing);
            }
            else {
                str += fragment;
            }
        }
        if (urlObj.scheme && urlObj.host) {
            var scheme = urlObj.scheme + "://";
            if ((str + scheme).length < availableLength) {
                return (scheme + str).substr(0, truncateLen);
            }
        }
        if (str.length <= truncateLen) {
            return str;
        }
        var end = "";
        if (availableLength > 0) {
            end = str.substr((-1) * Math.floor(availableLength / 2));
        }
        return (str.substr(0, Math.ceil(availableLength / 2)) + ellipsisChars + end).substr(0, availableLength + ellipsisLengthBeforeParsing);
    }

    /**
     * Date: 2015-10-05
     * Author: Kasper Søfren <soefritz@gmail.com> (https://github.com/kafoso)
     *
     * A truncation feature, where the ellipsis will be placed in the dead-center of the URL.
     *
     * @param {String} url             A URL.
     * @param {Number} truncateLen     The maximum length of the truncated output URL string.
     * @param {String} ellipsisChars   The characters to place within the url, e.g. "..".
     * @return {String} The truncated URL.
     */
    function truncateMiddle(url, truncateLen, ellipsisChars) {
        if (url.length <= truncateLen) {
            return url;
        }
        var ellipsisLengthBeforeParsing;
        var ellipsisLength;
        if (ellipsisChars == null) {
            ellipsisChars = '&hellip;';
            ellipsisLengthBeforeParsing = 8;
            ellipsisLength = 3;
        }
        else {
            ellipsisLengthBeforeParsing = ellipsisChars.length;
            ellipsisLength = ellipsisChars.length;
        }
        var availableLength = truncateLen - ellipsisLength;
        var end = "";
        if (availableLength > 0) {
            end = url.substr((-1) * Math.floor(availableLength / 2));
        }
        return (url.substr(0, Math.ceil(availableLength / 2)) + ellipsisChars + end).substr(0, availableLength + ellipsisLengthBeforeParsing);
    }

    /**
     * A truncation feature where the ellipsis will be placed at the end of the URL.
     *
     * @param {String} anchorText
     * @param {Number} truncateLen The maximum length of the truncated output URL string.
     * @param {String} ellipsisChars The characters to place within the url, e.g. "..".
     * @return {String} The truncated URL.
     */
    function truncateEnd(anchorText, truncateLen, ellipsisChars) {
        return ellipsis(anchorText, truncateLen, ellipsisChars);
    }

    /**
     * @protected
     * @class Autolinker.AnchorTagBuilder
     * @extends Object
     *
     * Builds anchor (&lt;a&gt;) tags for the Autolinker utility when a match is
     * found.
     *
     * Normally this class is instantiated, configured, and used internally by an
     * {@link Autolinker} instance, but may actually be used indirectly in a
     * {@link Autolinker#replaceFn replaceFn} to create {@link Autolinker.HtmlTag HtmlTag}
     * instances which may be modified before returning from the
     * {@link Autolinker#replaceFn replaceFn}. For example:
     *
     *     var html = Autolinker.link( "Test google.com", {
     *         replaceFn : function( match ) {
     *             var tag = match.buildTag();  // returns an {@link Autolinker.HtmlTag} instance
     *             tag.setAttr( 'rel', 'nofollow' );
     *
     *             return tag;
     *         }
     *     } );
     *
     *     // generated html:
     *     //   Test <a href="http://google.com" target="_blank" rel="nofollow">google.com</a>
     */
    var AnchorTagBuilder = /** @class */ (function () {
        /**
         * @method constructor
         * @param {Object} [cfg] The configuration options for the AnchorTagBuilder instance, specified in an Object (map).
         */
        function AnchorTagBuilder(cfg) {
            if (cfg === void 0) { cfg = {}; }
            /**
             * @cfg {Boolean} newWindow
             * @inheritdoc Autolinker#newWindow
             */
            this.newWindow = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Object} truncate
             * @inheritdoc Autolinker#truncate
             */
            this.truncate = {}; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String} className
             * @inheritdoc Autolinker#className
             */
            this.className = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            this.newWindow = cfg.newWindow || false;
            this.truncate = cfg.truncate || {};
            this.className = cfg.className || '';
        }
        /**
         * Generates the actual anchor (&lt;a&gt;) tag to use in place of the
         * matched text, via its `match` object.
         *
         * @param {Autolinker.match.Match} match The Match instance to generate an
         *   anchor tag from.
         * @return {Autolinker.HtmlTag} The HtmlTag instance for the anchor tag.
         */
        AnchorTagBuilder.prototype.build = function (match) {
            return new HtmlTag({
                tagName: 'a',
                attrs: this.createAttrs(match),
                innerHtml: this.processAnchorText(match.getAnchorText())
            });
        };
        /**
         * Creates the Object (map) of the HTML attributes for the anchor (&lt;a&gt;)
         *   tag being generated.
         *
         * @protected
         * @param {Autolinker.match.Match} match The Match instance to generate an
         *   anchor tag from.
         * @return {Object} A key/value Object (map) of the anchor tag's attributes.
         */
        AnchorTagBuilder.prototype.createAttrs = function (match) {
            var attrs = {
                'href': match.getAnchorHref() // we'll always have the `href` attribute
            };
            var cssClass = this.createCssClass(match);
            if (cssClass) {
                attrs['class'] = cssClass;
            }
            if (this.newWindow) {
                attrs['target'] = "_blank";
                attrs['rel'] = "noopener noreferrer"; // Issue #149. See https://mathiasbynens.github.io/rel-noopener/
            }
            if (this.truncate) {
                if (this.truncate.length && this.truncate.length < match.getAnchorText().length) {
                    attrs['title'] = match.getAnchorHref();
                }
            }
            return attrs;
        };
        /**
         * Creates the CSS class that will be used for a given anchor tag, based on
         * the `matchType` and the {@link #className} config.
         *
         * Example returns:
         *
         * - ""                                      // no {@link #className}
         * - "myLink myLink-url"                     // url match
         * - "myLink myLink-email"                   // email match
         * - "myLink myLink-phone"                   // phone match
         * - "myLink myLink-hashtag"                 // hashtag match
         * - "myLink myLink-mention myLink-twitter"  // mention match with Twitter service
         *
         * @protected
         * @param {Autolinker.match.Match} match The Match instance to generate an
         *   anchor tag from.
         * @return {String} The CSS class string for the link. Example return:
         *   "myLink myLink-url". If no {@link #className} was configured, returns
         *   an empty string.
         */
        AnchorTagBuilder.prototype.createCssClass = function (match) {
            var className = this.className;
            if (!className) {
                return "";
            }
            else {
                var returnClasses = [className], cssClassSuffixes = match.getCssClassSuffixes();
                for (var i = 0, len = cssClassSuffixes.length; i < len; i++) {
                    returnClasses.push(className + '-' + cssClassSuffixes[i]);
                }
                return returnClasses.join(' ');
            }
        };
        /**
         * Processes the `anchorText` by truncating the text according to the
         * {@link #truncate} config.
         *
         * @private
         * @param {String} anchorText The anchor tag's text (i.e. what will be
         *   displayed).
         * @return {String} The processed `anchorText`.
         */
        AnchorTagBuilder.prototype.processAnchorText = function (anchorText) {
            anchorText = this.doTruncate(anchorText);
            return anchorText;
        };
        /**
         * Performs the truncation of the `anchorText` based on the {@link #truncate}
         * option. If the `anchorText` is longer than the length specified by the
         * {@link #truncate} option, the truncation is performed based on the
         * `location` property. See {@link #truncate} for details.
         *
         * @private
         * @param {String} anchorText The anchor tag's text (i.e. what will be
         *   displayed).
         * @return {String} The truncated anchor text.
         */
        AnchorTagBuilder.prototype.doTruncate = function (anchorText) {
            var truncate = this.truncate;
            if (!truncate || !truncate.length)
                return anchorText;
            var truncateLength = truncate.length, truncateLocation = truncate.location;
            if (truncateLocation === 'smart') {
                return truncateSmart(anchorText, truncateLength);
            }
            else if (truncateLocation === 'middle') {
                return truncateMiddle(anchorText, truncateLength);
            }
            else {
                return truncateEnd(anchorText, truncateLength);
            }
        };
        return AnchorTagBuilder;
    }());

    /**
     * @abstract
     * @class Autolinker.match.Match
     *
     * Represents a match found in an input string which should be Autolinked. A Match object is what is provided in a
     * {@link Autolinker#replaceFn replaceFn}, and may be used to query for details about the match.
     *
     * For example:
     *
     *     var input = "...";  // string with URLs, Email Addresses, and Mentions (Twitter, Instagram, Soundcloud)
     *
     *     var linkedText = Autolinker.link( input, {
     *         replaceFn : function( match ) {
     *             console.log( "href = ", match.getAnchorHref() );
     *             console.log( "text = ", match.getAnchorText() );
     *
     *             switch( match.getType() ) {
     *                 case 'url' :
     *                     console.log( "url: ", match.getUrl() );
     *
     *                 case 'email' :
     *                     console.log( "email: ", match.getEmail() );
     *
     *                 case 'mention' :
     *                     console.log( "mention: ", match.getMention() );
     *             }
     *         }
     *     } );
     *
     * See the {@link Autolinker} class for more details on using the {@link Autolinker#replaceFn replaceFn}.
     */
    var Match = /** @class */ (function () {
        /**
         * @member Autolinker.match.Match
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function Match(cfg) {
            /**
             * @cfg {Autolinker.AnchorTagBuilder} tagBuilder (required)
             *
             * Reference to the AnchorTagBuilder instance to use to generate an anchor
             * tag for the Match.
             */
            this.__jsduckDummyDocProp = null; // property used just to get the above doc comment into the ES5 output and documentation generator
            /**
             * @cfg {String} matchedText (required)
             *
             * The original text that was matched by the {@link Autolinker.matcher.Matcher}.
             */
            this.matchedText = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Number} offset (required)
             *
             * The offset of where the match was made in the input string.
             */
            this.offset = 0; // default value just to get the above doc comment in the ES5 output and documentation generator
            this.tagBuilder = cfg.tagBuilder;
            this.matchedText = cfg.matchedText;
            this.offset = cfg.offset;
        }
        /**
         * Returns the original text that was matched.
         *
         * @return {String}
         */
        Match.prototype.getMatchedText = function () {
            return this.matchedText;
        };
        /**
         * Sets the {@link #offset} of where the match was made in the input string.
         *
         * A {@link Autolinker.matcher.Matcher} will be fed only HTML text nodes,
         * and will therefore set an original offset that is relative to the HTML
         * text node itself. However, we want this offset to be relative to the full
         * HTML input string, and thus if using {@link Autolinker#parse} (rather
         * than calling a {@link Autolinker.matcher.Matcher} directly), then this
         * offset is corrected after the Matcher itself has done its job.
         *
         * @param {Number} offset
         */
        Match.prototype.setOffset = function (offset) {
            this.offset = offset;
        };
        /**
         * Returns the offset of where the match was made in the input string. This
         * is the 0-based index of the match.
         *
         * @return {Number}
         */
        Match.prototype.getOffset = function () {
            return this.offset;
        };
        /**
         * Returns the CSS class suffix(es) for this match.
         *
         * A CSS class suffix is appended to the {@link Autolinker#className} in
         * the {@link Autolinker.AnchorTagBuilder} when a match is translated into
         * an anchor tag.
         *
         * For example, if {@link Autolinker#className} was configured as 'myLink',
         * and this method returns `[ 'url' ]`, the final class name of the element
         * will become: 'myLink myLink-url'.
         *
         * The match may provide multiple CSS class suffixes to be appended to the
         * {@link Autolinker#className} in order to facilitate better styling
         * options for different match criteria. See {@link Autolinker.match.Mention}
         * for an example.
         *
         * By default, this method returns a single array with the match's
         * {@link #getType type} name, but may be overridden by subclasses.
         *
         * @return {String[]}
         */
        Match.prototype.getCssClassSuffixes = function () {
            return [this.getType()];
        };
        /**
         * Builds and returns an {@link Autolinker.HtmlTag} instance based on the
         * Match.
         *
         * This can be used to easily generate anchor tags from matches, and either
         * return their HTML string, or modify them before doing so.
         *
         * Example Usage:
         *
         *     var tag = match.buildTag();
         *     tag.addClass( 'cordova-link' );
         *     tag.setAttr( 'target', '_system' );
         *
         *     tag.toAnchorString();  // <a href="http://google.com" class="cordova-link" target="_system">Google</a>
         *
         * Example Usage in {@link Autolinker#replaceFn}:
         *
         *     var html = Autolinker.link( "Test google.com", {
         *         replaceFn : function( match ) {
         *             var tag = match.buildTag();  // returns an {@link Autolinker.HtmlTag} instance
         *             tag.setAttr( 'rel', 'nofollow' );
         *
         *             return tag;
         *         }
         *     } );
         *
         *     // generated html:
         *     //   Test <a href="http://google.com" target="_blank" rel="nofollow">google.com</a>
         */
        Match.prototype.buildTag = function () {
            return this.tagBuilder.build(this);
        };
        return Match;
    }());

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    /**
     * @class Autolinker.match.Email
     * @extends Autolinker.match.Match
     *
     * Represents a Email match found in an input string which should be Autolinked.
     *
     * See this class's superclass ({@link Autolinker.match.Match}) for more details.
     */
    var EmailMatch = /** @class */ (function (_super) {
        __extends(EmailMatch, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function EmailMatch(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {String} email (required)
             *
             * The email address that was matched.
             */
            _this.email = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            _this.email = cfg.email;
            return _this;
        }
        /**
         * Returns a string name for the type of match that this class represents.
         * For the case of EmailMatch, returns 'email'.
         *
         * @return {String}
         */
        EmailMatch.prototype.getType = function () {
            return 'email';
        };
        /**
         * Returns the email address that was matched.
         *
         * @return {String}
         */
        EmailMatch.prototype.getEmail = function () {
            return this.email;
        };
        /**
         * Returns the anchor href that should be generated for the match.
         *
         * @return {String}
         */
        EmailMatch.prototype.getAnchorHref = function () {
            return 'mailto:' + this.email;
        };
        /**
         * Returns the anchor text that should be generated for the match.
         *
         * @return {String}
         */
        EmailMatch.prototype.getAnchorText = function () {
            return this.email;
        };
        return EmailMatch;
    }(Match));

    /**
     * @class Autolinker.match.Hashtag
     * @extends Autolinker.match.Match
     *
     * Represents a Hashtag match found in an input string which should be
     * Autolinked.
     *
     * See this class's superclass ({@link Autolinker.match.Match}) for more
     * details.
     */
    var HashtagMatch = /** @class */ (function (_super) {
        __extends(HashtagMatch, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function HashtagMatch(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {String} serviceName
             *
             * The service to point hashtag matches to. See {@link Autolinker#hashtag}
             * for available values.
             */
            _this.serviceName = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String} hashtag (required)
             *
             * The HashtagMatch that was matched, without the '#'.
             */
            _this.hashtag = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            _this.serviceName = cfg.serviceName;
            _this.hashtag = cfg.hashtag;
            return _this;
        }
        /**
         * Returns a string name for the type of match that this class represents.
         * For the case of HashtagMatch, returns 'hashtag'.
         *
         * @return {String}
         */
        HashtagMatch.prototype.getType = function () {
            return 'hashtag';
        };
        /**
         * Returns the configured {@link #serviceName} to point the HashtagMatch to.
         * Ex: 'facebook', 'twitter'.
         *
         * @return {String}
         */
        HashtagMatch.prototype.getServiceName = function () {
            return this.serviceName;
        };
        /**
         * Returns the matched hashtag, without the '#' character.
         *
         * @return {String}
         */
        HashtagMatch.prototype.getHashtag = function () {
            return this.hashtag;
        };
        /**
         * Returns the anchor href that should be generated for the match.
         *
         * @return {String}
         */
        HashtagMatch.prototype.getAnchorHref = function () {
            var serviceName = this.serviceName, hashtag = this.hashtag;
            switch (serviceName) {
                case 'twitter':
                    return 'https://twitter.com/hashtag/' + hashtag;
                case 'facebook':
                    return 'https://www.facebook.com/hashtag/' + hashtag;
                case 'instagram':
                    return 'https://instagram.com/explore/tags/' + hashtag;
                default: // Shouldn't happen because Autolinker's constructor should block any invalid values, but just in case.
                    throw new Error('Unknown service name to point hashtag to: ' + serviceName);
            }
        };
        /**
         * Returns the anchor text that should be generated for the match.
         *
         * @return {String}
         */
        HashtagMatch.prototype.getAnchorText = function () {
            return '#' + this.hashtag;
        };
        return HashtagMatch;
    }(Match));

    /**
     * @class Autolinker.match.Mention
     * @extends Autolinker.match.Match
     *
     * Represents a Mention match found in an input string which should be Autolinked.
     *
     * See this class's superclass ({@link Autolinker.match.Match}) for more details.
     */
    var MentionMatch = /** @class */ (function (_super) {
        __extends(MentionMatch, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function MentionMatch(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {String} serviceName
             *
             * The service to point mention matches to. See {@link Autolinker#mention}
             * for available values.
             */
            _this.serviceName = 'twitter'; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String} mention (required)
             *
             * The Mention that was matched, without the '@' character.
             */
            _this.mention = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            _this.mention = cfg.mention;
            _this.serviceName = cfg.serviceName;
            return _this;
        }
        /**
         * Returns a string name for the type of match that this class represents.
         * For the case of MentionMatch, returns 'mention'.
         *
         * @return {String}
         */
        MentionMatch.prototype.getType = function () {
            return 'mention';
        };
        /**
         * Returns the mention, without the '@' character.
         *
         * @return {String}
         */
        MentionMatch.prototype.getMention = function () {
            return this.mention;
        };
        /**
         * Returns the configured {@link #serviceName} to point the mention to.
         * Ex: 'instagram', 'twitter', 'soundcloud'.
         *
         * @return {String}
         */
        MentionMatch.prototype.getServiceName = function () {
            return this.serviceName;
        };
        /**
         * Returns the anchor href that should be generated for the match.
         *
         * @return {String}
         */
        MentionMatch.prototype.getAnchorHref = function () {
            switch (this.serviceName) {
                case 'twitter':
                    return 'https://twitter.com/' + this.mention;
                case 'instagram':
                    return 'https://instagram.com/' + this.mention;
                case 'soundcloud':
                    return 'https://soundcloud.com/' + this.mention;
                default: // Shouldn't happen because Autolinker's constructor should block any invalid values, but just in case.
                    throw new Error('Unknown service name to point mention to: ' + this.serviceName);
            }
        };
        /**
         * Returns the anchor text that should be generated for the match.
         *
         * @return {String}
         */
        MentionMatch.prototype.getAnchorText = function () {
            return '@' + this.mention;
        };
        /**
         * Returns the CSS class suffixes that should be used on a tag built with
         * the match. See {@link Autolinker.match.Match#getCssClassSuffixes} for
         * details.
         *
         * @return {String[]}
         */
        MentionMatch.prototype.getCssClassSuffixes = function () {
            var cssClassSuffixes = _super.prototype.getCssClassSuffixes.call(this), serviceName = this.getServiceName();
            if (serviceName) {
                cssClassSuffixes.push(serviceName);
            }
            return cssClassSuffixes;
        };
        return MentionMatch;
    }(Match));

    /**
     * @class Autolinker.match.Phone
     * @extends Autolinker.match.Match
     *
     * Represents a Phone number match found in an input string which should be
     * Autolinked.
     *
     * See this class's superclass ({@link Autolinker.match.Match}) for more
     * details.
     */
    var PhoneMatch = /** @class */ (function (_super) {
        __extends(PhoneMatch, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function PhoneMatch(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @protected
             * @property {String} number (required)
             *
             * The phone number that was matched, without any delimiter characters.
             *
             * Note: This is a string to allow for prefixed 0's.
             */
            _this.number = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @protected
             * @property  {Boolean} plusSign (required)
             *
             * `true` if the matched phone number started with a '+' sign. We'll include
             * it in the `tel:` URL if so, as this is needed for international numbers.
             *
             * Ex: '+1 (123) 456 7879'
             */
            _this.plusSign = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            _this.number = cfg.number;
            _this.plusSign = cfg.plusSign;
            return _this;
        }
        /**
         * Returns a string name for the type of match that this class represents.
         * For the case of PhoneMatch, returns 'phone'.
         *
         * @return {String}
         */
        PhoneMatch.prototype.getType = function () {
            return 'phone';
        };
        /**
         * Returns the phone number that was matched as a string, without any
         * delimiter characters.
         *
         * Note: This is a string to allow for prefixed 0's.
         *
         * @return {String}
         */
        PhoneMatch.prototype.getPhoneNumber = function () {
            return this.number;
        };
        /**
         * Alias of {@link #getPhoneNumber}, returns the phone number that was
         * matched as a string, without any delimiter characters.
         *
         * Note: This is a string to allow for prefixed 0's.
         *
         * @return {String}
         */
        PhoneMatch.prototype.getNumber = function () {
            return this.getPhoneNumber();
        };
        /**
         * Returns the anchor href that should be generated for the match.
         *
         * @return {String}
         */
        PhoneMatch.prototype.getAnchorHref = function () {
            return 'tel:' + (this.plusSign ? '+' : '') + this.number;
        };
        /**
         * Returns the anchor text that should be generated for the match.
         *
         * @return {String}
         */
        PhoneMatch.prototype.getAnchorText = function () {
            return this.matchedText;
        };
        return PhoneMatch;
    }(Match));

    /**
     * @class Autolinker.match.Url
     * @extends Autolinker.match.Match
     *
     * Represents a Url match found in an input string which should be Autolinked.
     *
     * See this class's superclass ({@link Autolinker.match.Match}) for more details.
     */
    var UrlMatch = /** @class */ (function (_super) {
        __extends(UrlMatch, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match
         *   instance, specified in an Object (map).
         */
        function UrlMatch(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {String} url (required)
             *
             * The url that was matched.
             */
            _this.url = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {"scheme"/"www"/"tld"} urlMatchType (required)
             *
             * The type of URL match that this class represents. This helps to determine
             * if the match was made in the original text with a prefixed scheme (ex:
             * 'http://www.google.com'), a prefixed 'www' (ex: 'www.google.com'), or
             * was matched by a known top-level domain (ex: 'google.com').
             */
            _this.urlMatchType = 'scheme'; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} protocolUrlMatch (required)
             *
             * `true` if the URL is a match which already has a protocol (i.e.
             * 'http://'), `false` if the match was from a 'www' or known TLD match.
             */
            _this.protocolUrlMatch = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} protocolRelativeMatch (required)
             *
             * `true` if the URL is a protocol-relative match. A protocol-relative match
             * is a URL that starts with '//', and will be either http:// or https://
             * based on the protocol that the site is loaded under.
             */
            _this.protocolRelativeMatch = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Object} stripPrefix (required)
             *
             * The Object form of {@link Autolinker#cfg-stripPrefix}.
             */
            _this.stripPrefix = { scheme: true, www: true }; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} stripTrailingSlash (required)
             * @inheritdoc Autolinker#cfg-stripTrailingSlash
             */
            _this.stripTrailingSlash = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} decodePercentEncoding (required)
             * @inheritdoc Autolinker#cfg-decodePercentEncoding
             */
            _this.decodePercentEncoding = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @private
             * @property {RegExp} schemePrefixRegex
             *
             * A regular expression used to remove the 'http://' or 'https://' from
             * URLs.
             */
            _this.schemePrefixRegex = /^(https?:\/\/)?/i;
            /**
             * @private
             * @property {RegExp} wwwPrefixRegex
             *
             * A regular expression used to remove the 'www.' from URLs.
             */
            _this.wwwPrefixRegex = /^(https?:\/\/)?(www\.)?/i;
            /**
             * @private
             * @property {RegExp} protocolRelativeRegex
             *
             * The regular expression used to remove the protocol-relative '//' from the {@link #url} string, for purposes
             * of {@link #getAnchorText}. A protocol-relative URL is, for example, "//yahoo.com"
             */
            _this.protocolRelativeRegex = /^\/\//;
            /**
             * @private
             * @property {Boolean} protocolPrepended
             *
             * Will be set to `true` if the 'http://' protocol has been prepended to the {@link #url} (because the
             * {@link #url} did not have a protocol)
             */
            _this.protocolPrepended = false;
            _this.urlMatchType = cfg.urlMatchType;
            _this.url = cfg.url;
            _this.protocolUrlMatch = cfg.protocolUrlMatch;
            _this.protocolRelativeMatch = cfg.protocolRelativeMatch;
            _this.stripPrefix = cfg.stripPrefix;
            _this.stripTrailingSlash = cfg.stripTrailingSlash;
            _this.decodePercentEncoding = cfg.decodePercentEncoding;
            return _this;
        }
        /**
         * Returns a string name for the type of match that this class represents.
         * For the case of UrlMatch, returns 'url'.
         *
         * @return {String}
         */
        UrlMatch.prototype.getType = function () {
            return 'url';
        };
        /**
         * Returns a string name for the type of URL match that this class
         * represents.
         *
         * This helps to determine if the match was made in the original text with a
         * prefixed scheme (ex: 'http://www.google.com'), a prefixed 'www' (ex:
         * 'www.google.com'), or was matched by a known top-level domain (ex:
         * 'google.com').
         *
         * @return {"scheme"/"www"/"tld"}
         */
        UrlMatch.prototype.getUrlMatchType = function () {
            return this.urlMatchType;
        };
        /**
         * Returns the url that was matched, assuming the protocol to be 'http://' if the original
         * match was missing a protocol.
         *
         * @return {String}
         */
        UrlMatch.prototype.getUrl = function () {
            var url = this.url;
            // if the url string doesn't begin with a protocol, assume 'http://'
            if (!this.protocolRelativeMatch && !this.protocolUrlMatch && !this.protocolPrepended) {
                url = this.url = 'http://' + url;
                this.protocolPrepended = true;
            }
            return url;
        };
        /**
         * Returns the anchor href that should be generated for the match.
         *
         * @return {String}
         */
        UrlMatch.prototype.getAnchorHref = function () {
            var url = this.getUrl();
            return url.replace(/&amp;/g, '&'); // any &amp;'s in the URL should be converted back to '&' if they were displayed as &amp; in the source html
        };
        /**
         * Returns the anchor text that should be generated for the match.
         *
         * @return {String}
         */
        UrlMatch.prototype.getAnchorText = function () {
            var anchorText = this.getMatchedText();
            if (this.protocolRelativeMatch) {
                // Strip off any protocol-relative '//' from the anchor text
                anchorText = this.stripProtocolRelativePrefix(anchorText);
            }
            if (this.stripPrefix.scheme) {
                anchorText = this.stripSchemePrefix(anchorText);
            }
            if (this.stripPrefix.www) {
                anchorText = this.stripWwwPrefix(anchorText);
            }
            if (this.stripTrailingSlash) {
                anchorText = this.removeTrailingSlash(anchorText); // remove trailing slash, if there is one
            }
            if (this.decodePercentEncoding) {
                anchorText = this.removePercentEncoding(anchorText);
            }
            return anchorText;
        };
        // ---------------------------------------
        // Utility Functionality
        /**
         * Strips the scheme prefix (such as "http://" or "https://") from the given
         * `url`.
         *
         * @private
         * @param {String} url The text of the anchor that is being generated, for
         *   which to strip off the url scheme.
         * @return {String} The `url`, with the scheme stripped.
         */
        UrlMatch.prototype.stripSchemePrefix = function (url) {
            return url.replace(this.schemePrefixRegex, '');
        };
        /**
         * Strips the 'www' prefix from the given `url`.
         *
         * @private
         * @param {String} url The text of the anchor that is being generated, for
         *   which to strip off the 'www' if it exists.
         * @return {String} The `url`, with the 'www' stripped.
         */
        UrlMatch.prototype.stripWwwPrefix = function (url) {
            return url.replace(this.wwwPrefixRegex, '$1'); // leave any scheme ($1), it one exists
        };
        /**
         * Strips any protocol-relative '//' from the anchor text.
         *
         * @private
         * @param {String} text The text of the anchor that is being generated, for which to strip off the
         *   protocol-relative prefix (such as stripping off "//")
         * @return {String} The `anchorText`, with the protocol-relative prefix stripped.
         */
        UrlMatch.prototype.stripProtocolRelativePrefix = function (text) {
            return text.replace(this.protocolRelativeRegex, '');
        };
        /**
         * Removes any trailing slash from the given `anchorText`, in preparation for the text to be displayed.
         *
         * @private
         * @param {String} anchorText The text of the anchor that is being generated, for which to remove any trailing
         *   slash ('/') that may exist.
         * @return {String} The `anchorText`, with the trailing slash removed.
         */
        UrlMatch.prototype.removeTrailingSlash = function (anchorText) {
            if (anchorText.charAt(anchorText.length - 1) === '/') {
                anchorText = anchorText.slice(0, -1);
            }
            return anchorText;
        };
        /**
         * Decodes percent-encoded characters from the given `anchorText`, in
         * preparation for the text to be displayed.
         *
         * @private
         * @param {String} anchorText The text of the anchor that is being
         *   generated, for which to decode any percent-encoded characters.
         * @return {String} The `anchorText`, with the percent-encoded characters
         *   decoded.
         */
        UrlMatch.prototype.removePercentEncoding = function (anchorText) {
            // First, convert a few of the known % encodings to the corresponding
            // HTML entities that could accidentally be interpretted as special
            // HTML characters
            var preProcessedEntityAnchorText = anchorText
                .replace(/%22/gi, '&quot;') // " char
                .replace(/%26/gi, '&amp;') // & char
                .replace(/%27/gi, '&#39;') // ' char
                .replace(/%3C/gi, '&lt;') // < char
                .replace(/%3E/gi, '&gt;'); // > char
            try {
                // Now attempt to decode the rest of the anchor text
                return decodeURIComponent(preProcessedEntityAnchorText);
            }
            catch (e) { // Invalid % escape sequence in the anchor text
                return preProcessedEntityAnchorText;
            }
        };
        return UrlMatch;
    }(Match));

    /**
     * @abstract
     * @class Autolinker.matcher.Matcher
     *
     * An abstract class and interface for individual matchers to find matches in
     * an input string with linkified versions of them.
     *
     * Note that Matchers do not take HTML into account - they must be fed the text
     * nodes of any HTML string, which is handled by {@link Autolinker#parse}.
     */
    var Matcher = /** @class */ (function () {
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Matcher
         *   instance, specified in an Object (map).
         */
        function Matcher(cfg) {
            /**
             * @cfg {Autolinker.AnchorTagBuilder} tagBuilder (required)
             *
             * Reference to the AnchorTagBuilder instance to use to generate HTML tags
             * for {@link Autolinker.match.Match Matches}.
             */
            this.__jsduckDummyDocProp = null; // property used just to get the above doc comment into the ES5 output and documentation generator
            this.tagBuilder = cfg.tagBuilder;
        }
        return Matcher;
    }());

    /*
     * This file builds and stores a library of the common regular expressions used
     * by the Autolinker utility.
     *
     * Other regular expressions may exist ad-hoc, but these are generally the
     * regular expressions that are shared between source files.
     */
    /**
     * Regular expression to match upper and lowercase ASCII letters
     */
    var letterRe = /[A-Za-z]/;
    /**
     * Regular expression to match ASCII digits
     */
    var digitRe = /[0-9]/;
    /**
     * Regular expression to match whitespace
     */
    var whitespaceRe = /\s/;
    /**
     * Regular expression to match quote characters
     */
    var quoteRe = /['"]/;
    /**
     * Regular expression to match the range of ASCII control characters (0-31), and
     * the backspace char (127)
     */
    var controlCharsRe = /[\x00-\x1F\x7F]/;
    /**
     * The string form of a regular expression that would match all of the
     * alphabetic ("letter") chars in the unicode character set when placed in a
     * RegExp character class (`[]`). This includes all international alphabetic
     * characters.
     *
     * These would be the characters matched by unicode regex engines `\p{L}`
     * escape ("all letters").
     *
     * Taken from the XRegExp library: http://xregexp.com/ (thanks @https://github.com/slevithan)
     * Specifically: http://xregexp.com/v/3.2.0/xregexp-all.js, the 'Letter'
     *   regex's bmp
     *
     * VERY IMPORTANT: This set of characters is defined inside of a Regular
     *   Expression literal rather than a string literal to prevent UglifyJS from
     *   compressing the unicode escape sequences into their actual unicode
     *   characters. If Uglify compresses these into the unicode characters
     *   themselves, this results in the error "Range out of order in character
     *   class" when these characters are used inside of a Regular Expression
     *   character class (`[]`). See usages of this const. Alternatively, we can set
     *   the UglifyJS option `ascii_only` to true for the build, but that doesn't
     *   help others who are pulling in Autolinker into their own build and running
     *   UglifyJS themselves.
     */
    var alphaCharsStr = /A-Za-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC/
        .source; // see note in above variable description
    /**
     * The string form of a regular expression that would match all emoji characters
     * Source: https://www.regextester.com/106421
     */
    var emojiStr = /\u00a9\u00ae\u2000-\u3300\ud83c\ud000-\udfff\ud83d\ud000-\udfff\ud83e\ud000-\udfff/
        .source;
    /**
     * The string form of a regular expression that would match all of the
     * combining mark characters in the unicode character set when placed in a
     * RegExp character class (`[]`).
     *
     * These would be the characters matched by unicode regex engines `\p{M}`
     * escape ("all marks").
     *
     * Taken from the XRegExp library: http://xregexp.com/ (thanks @https://github.com/slevithan)
     * Specifically: http://xregexp.com/v/3.2.0/xregexp-all.js, the 'Mark'
     *   regex's bmp
     *
     * VERY IMPORTANT: This set of characters is defined inside of a Regular
     *   Expression literal rather than a string literal to prevent UglifyJS from
     *   compressing the unicode escape sequences into their actual unicode
     *   characters. If Uglify compresses these into the unicode characters
     *   themselves, this results in the error "Range out of order in character
     *   class" when these characters are used inside of a Regular Expression
     *   character class (`[]`). See usages of this const. Alternatively, we can set
     *   the UglifyJS option `ascii_only` to true for the build, but that doesn't
     *   help others who are pulling in Autolinker into their own build and running
     *   UglifyJS themselves.
     */
    var marksStr = /\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D4-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D01-\u0D03\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF8\u1CF9\u1DC0-\u1DF5\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F/
        .source; // see note in above variable description
    /**
     * The string form of a regular expression that would match all of the
     * alphabetic ("letter") chars, emoji, and combining marks in the unicode character set
     * when placed in a RegExp character class (`[]`). This includes all
     * international alphabetic characters.
     *
     * These would be the characters matched by unicode regex engines `\p{L}\p{M}`
     * escapes and emoji characters.
     */
    var alphaCharsAndMarksStr = alphaCharsStr + emojiStr + marksStr;
    /**
     * The string form of a regular expression that would match all of the
     * decimal number chars in the unicode character set when placed in a RegExp
     * character class (`[]`).
     *
     * These would be the characters matched by unicode regex engines `\p{Nd}`
     * escape ("all decimal numbers")
     *
     * Taken from the XRegExp library: http://xregexp.com/ (thanks @https://github.com/slevithan)
     * Specifically: http://xregexp.com/v/3.2.0/xregexp-all.js, the 'Decimal_Number'
     *   regex's bmp
     *
     * VERY IMPORTANT: This set of characters is defined inside of a Regular
     *   Expression literal rather than a string literal to prevent UglifyJS from
     *   compressing the unicode escape sequences into their actual unicode
     *   characters. If Uglify compresses these into the unicode characters
     *   themselves, this results in the error "Range out of order in character
     *   class" when these characters are used inside of a Regular Expression
     *   character class (`[]`). See usages of this const. Alternatively, we can set
     *   the UglifyJS option `ascii_only` to true for the build, but that doesn't
     *   help others who are pulling in Autolinker into their own build and running
     *   UglifyJS themselves.
     */
    var decimalNumbersStr = /0-9\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0DE6-\u0DEF\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u1090-\u1099\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\uA620-\uA629\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uA9F0-\uA9F9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19/
        .source; // see note in above variable description
    /**
     * The string form of a regular expression that would match all of the
     * letters and decimal number chars in the unicode character set when placed in
     * a RegExp character class (`[]`).
     *
     * These would be the characters matched by unicode regex engines
     * `[\p{L}\p{Nd}]` escape ("all letters and decimal numbers")
     */
    var alphaNumericCharsStr = alphaCharsAndMarksStr + decimalNumbersStr;
    /**
     * The string form of a regular expression that would match all of the
     * letters, combining marks, and decimal number chars in the unicode character
     * set when placed in a RegExp character class (`[]`).
     *
     * These would be the characters matched by unicode regex engines
     * `[\p{L}\p{M}\p{Nd}]` escape ("all letters, combining marks, and decimal
     * numbers")
     */
    var alphaNumericAndMarksCharsStr = alphaCharsAndMarksStr + decimalNumbersStr;
    // Simplified IP regular expression
    var ipStr = '(?:[' + decimalNumbersStr + ']{1,3}\\.){3}[' + decimalNumbersStr + ']{1,3}';
    // Protected domain label which do not allow "-" character on the beginning and the end of a single label
    var domainLabelStr = '[' + alphaNumericAndMarksCharsStr + '](?:[' + alphaNumericAndMarksCharsStr + '\\-]{0,61}[' + alphaNumericAndMarksCharsStr + '])?';
    var getDomainLabelStr = function (group) {
        return '(?=(' + domainLabelStr + '))\\' + group;
    };
    /**
     * A function to match domain names of a URL or email address.
     * Ex: 'google', 'yahoo', 'some-other-company', etc.
     */
    var getDomainNameStr = function (group) {
        return '(?:' + getDomainLabelStr(group) + '(?:\\.' + getDomainLabelStr(group + 1) + '){0,126}|' + ipStr + ')';
    };
    /**
     * A regular expression that is simply the character class of the characters
     * that may be used in a domain name, minus the '-' or '.'
     */
    var domainNameCharRegex = new RegExp("[" + alphaNumericAndMarksCharsStr + "]");

    // NOTE: THIS IS A GENERATED FILE
    // To update with the latest TLD list, run `npm run update-tld-regex` or `yarn update-tld-regex` (depending on which you have installed)
    var tldRegex = /(?:xn--vermgensberatung-pwb|xn--vermgensberater-ctb|xn--clchc0ea0b2g2a9gcd|xn--w4r85el8fhu5dnra|northwesternmutual|travelersinsurance|vermögensberatung|xn--3oq18vl8pn36a|xn--5su34j936bgsg|xn--bck1b9a5dre4c|xn--mgbai9azgqp6j|xn--mgberp4a5d4ar|xn--xkc2dl3a5ee0h|vermögensberater|xn--fzys8d69uvgm|xn--mgba7c0bbn0a|xn--xkc2al3hye2a|americanexpress|kerryproperties|sandvikcoromant|xn--i1b6b1a6a2e|xn--kcrx77d1x4a|xn--lgbbat1ad8j|xn--mgba3a4f16a|xn--mgbaakc7dvf|xn--mgbc0a9azcg|xn--nqv7fs00ema|afamilycompany|americanfamily|bananarepublic|cancerresearch|cookingchannel|kerrylogistics|weatherchannel|xn--54b7fta0cc|xn--6qq986b3xl|xn--80aqecdr1a|xn--b4w605ferd|xn--fiq228c5hs|xn--h2breg3eve|xn--jlq61u9w7b|xn--mgba3a3ejt|xn--mgbaam7a8h|xn--mgbayh7gpa|xn--mgbb9fbpob|xn--mgbbh1a71e|xn--mgbca7dzdo|xn--mgbi4ecexp|xn--mgbx4cd0ab|xn--rvc1e0am3e|international|lifeinsurance|spreadbetting|travelchannel|wolterskluwer|xn--eckvdtc9d|xn--fpcrj9c3d|xn--fzc2c9e2c|xn--h2brj9c8c|xn--tiq49xqyj|xn--yfro4i67o|xn--ygbi2ammx|construction|lplfinancial|scholarships|versicherung|xn--3e0b707e|xn--45br5cyl|xn--80adxhks|xn--80asehdb|xn--8y0a063a|xn--gckr3f0f|xn--mgb9awbf|xn--mgbab2bd|xn--mgbgu82a|xn--mgbpl2fh|xn--mgbt3dhd|xn--mk1bu44c|xn--ngbc5azd|xn--ngbe9e0a|xn--ogbpf8fl|xn--qcka1pmc|accountants|barclaycard|blackfriday|blockbuster|bridgestone|calvinklein|contractors|creditunion|engineering|enterprises|foodnetwork|investments|kerryhotels|lamborghini|motorcycles|olayangroup|photography|playstation|productions|progressive|redumbrella|rightathome|williamhill|xn--11b4c3d|xn--1ck2e1b|xn--1qqw23a|xn--2scrj9c|xn--3bst00m|xn--3ds443g|xn--3hcrj9c|xn--42c2d9a|xn--45brj9c|xn--55qw42g|xn--6frz82g|xn--80ao21a|xn--9krt00a|xn--cck2b3b|xn--czr694b|xn--d1acj3b|xn--efvy88h|xn--estv75g|xn--fct429k|xn--fjq720a|xn--flw351e|xn--g2xx48c|xn--gecrj9c|xn--gk3at1e|xn--h2brj9c|xn--hxt814e|xn--imr513n|xn--j6w193g|xn--jvr189m|xn--kprw13d|xn--kpry57d|xn--kpu716f|xn--mgbbh1a|xn--mgbtx2b|xn--mix891f|xn--nyqy26a|xn--otu796d|xn--pbt977c|xn--pgbs0dh|xn--q9jyb4c|xn--rhqv96g|xn--rovu88b|xn--s9brj9c|xn--ses554g|xn--t60b56a|xn--vuq861b|xn--w4rs40l|xn--xhq521b|xn--zfr164b|சிங்கப்பூர்|accountant|apartments|associates|basketball|bnpparibas|boehringer|capitalone|consulting|creditcard|cuisinella|eurovision|extraspace|foundation|healthcare|immobilien|industries|management|mitsubishi|nationwide|newholland|nextdirect|onyourside|properties|protection|prudential|realestate|republican|restaurant|schaeffler|swiftcover|tatamotors|technology|telefonica|university|vistaprint|vlaanderen|volkswagen|xn--30rr7y|xn--3pxu8k|xn--45q11c|xn--4gbrim|xn--55qx5d|xn--5tzm5g|xn--80aswg|xn--90a3ac|xn--9dbq2a|xn--9et52u|xn--c2br7g|xn--cg4bki|xn--czrs0t|xn--czru2d|xn--fiq64b|xn--fiqs8s|xn--fiqz9s|xn--io0a7i|xn--kput3i|xn--mxtq1m|xn--o3cw4h|xn--pssy2u|xn--unup4y|xn--wgbh1c|xn--wgbl6a|xn--y9a3aq|accenture|alfaromeo|allfinanz|amsterdam|analytics|aquarelle|barcelona|bloomberg|christmas|community|directory|education|equipment|fairwinds|financial|firestone|fresenius|frontdoor|fujixerox|furniture|goldpoint|hisamitsu|homedepot|homegoods|homesense|honeywell|institute|insurance|kuokgroup|ladbrokes|lancaster|landrover|lifestyle|marketing|marshalls|melbourne|microsoft|panasonic|passagens|pramerica|richardli|scjohnson|shangrila|solutions|statebank|statefarm|stockholm|travelers|vacations|xn--90ais|xn--c1avg|xn--d1alf|xn--e1a4c|xn--fhbei|xn--j1aef|xn--j1amh|xn--l1acc|xn--ngbrx|xn--nqv7f|xn--p1acf|xn--tckwe|xn--vhquv|yodobashi|abudhabi|airforce|allstate|attorney|barclays|barefoot|bargains|baseball|boutique|bradesco|broadway|brussels|budapest|builders|business|capetown|catering|catholic|chrysler|cipriani|cityeats|cleaning|clinique|clothing|commbank|computer|delivery|deloitte|democrat|diamonds|discount|discover|download|engineer|ericsson|esurance|etisalat|everbank|exchange|feedback|fidelity|firmdale|football|frontier|goodyear|grainger|graphics|guardian|hdfcbank|helsinki|holdings|hospital|infiniti|ipiranga|istanbul|jpmorgan|lighting|lundbeck|marriott|maserati|mckinsey|memorial|merckmsd|mortgage|movistar|observer|partners|pharmacy|pictures|plumbing|property|redstone|reliance|saarland|samsclub|security|services|shopping|showtime|softbank|software|stcgroup|supplies|symantec|training|uconnect|vanguard|ventures|verisign|woodside|xn--90ae|xn--node|xn--p1ai|xn--qxam|yokohama|السعودية|abogado|academy|agakhan|alibaba|android|athleta|auction|audible|auspost|avianca|banamex|bauhaus|bentley|bestbuy|booking|brother|bugatti|capital|caravan|careers|cartier|channel|charity|chintai|citadel|clubmed|college|cologne|comcast|company|compare|contact|cooking|corsica|country|coupons|courses|cricket|cruises|dentist|digital|domains|exposed|express|farmers|fashion|ferrari|ferrero|finance|fishing|fitness|flights|florist|flowers|forsale|frogans|fujitsu|gallery|genting|godaddy|grocery|guitars|hamburg|hangout|hitachi|holiday|hosting|hoteles|hotmail|hyundai|iselect|ismaili|jewelry|juniper|kitchen|komatsu|lacaixa|lancome|lanxess|lasalle|latrobe|leclerc|liaison|limited|lincoln|markets|metlife|monster|netbank|netflix|network|neustar|okinawa|oldnavy|organic|origins|philips|pioneer|politie|realtor|recipes|rentals|reviews|rexroth|samsung|sandvik|schmidt|schwarz|science|shiksha|shriram|singles|staples|starhub|storage|support|surgery|systems|temasek|theater|theatre|tickets|tiffany|toshiba|trading|walmart|wanggou|watches|weather|website|wedding|whoswho|windows|winners|xfinity|yamaxun|youtube|zuerich|католик|اتصالات|الجزائر|العليان|پاکستان|كاثوليك|موبايلي|இந்தியா|abarth|abbott|abbvie|active|africa|agency|airbus|airtel|alipay|alsace|alstom|anquan|aramco|author|bayern|beauty|berlin|bharti|blanco|bostik|boston|broker|camera|career|caseih|casino|center|chanel|chrome|church|circle|claims|clinic|coffee|comsec|condos|coupon|credit|cruise|dating|datsun|dealer|degree|dental|design|direct|doctor|dunlop|dupont|durban|emerck|energy|estate|events|expert|family|flickr|futbol|gallup|garden|george|giving|global|google|gratis|health|hermes|hiphop|hockey|hotels|hughes|imamat|insure|intuit|jaguar|joburg|juegos|kaufen|kinder|kindle|kosher|lancia|latino|lawyer|lefrak|living|locker|london|luxury|madrid|maison|makeup|market|mattel|mobile|mobily|monash|mormon|moscow|museum|mutual|nagoya|natura|nissan|nissay|norton|nowruz|office|olayan|online|oracle|orange|otsuka|pfizer|photos|physio|piaget|pictet|quebec|racing|realty|reisen|repair|report|review|rocher|rogers|ryukyu|safety|sakura|sanofi|school|schule|search|secure|select|shouji|soccer|social|stream|studio|supply|suzuki|swatch|sydney|taipei|taobao|target|tattoo|tennis|tienda|tjmaxx|tkmaxx|toyota|travel|unicom|viajes|viking|villas|virgin|vision|voting|voyage|vuelos|walter|warman|webcam|xihuan|yachts|yandex|zappos|москва|онлайн|ابوظبي|ارامكو|الاردن|المغرب|امارات|فلسطين|مليسيا|भारतम्|இலங்கை|ファッション|actor|adult|aetna|amfam|amica|apple|archi|audio|autos|azure|baidu|beats|bible|bingo|black|boats|bosch|build|canon|cards|chase|cheap|cisco|citic|click|cloud|coach|codes|crown|cymru|dabur|dance|deals|delta|dodge|drive|dubai|earth|edeka|email|epost|epson|faith|fedex|final|forex|forum|gallo|games|gifts|gives|glade|glass|globo|gmail|green|gripe|group|gucci|guide|homes|honda|horse|house|hyatt|ikano|intel|irish|iveco|jetzt|koeln|kyoto|lamer|lease|legal|lexus|lilly|linde|lipsy|lixil|loans|locus|lotte|lotto|lupin|macys|mango|media|miami|money|mopar|movie|nadex|nexus|nikon|ninja|nokia|nowtv|omega|osaka|paris|parts|party|phone|photo|pizza|place|poker|praxi|press|prime|promo|quest|radio|rehab|reise|ricoh|rocks|rodeo|rugby|salon|sener|seven|sharp|shell|shoes|skype|sling|smart|smile|solar|space|sport|stada|store|study|style|sucks|swiss|tatar|tires|tirol|tmall|today|tokyo|tools|toray|total|tours|trade|trust|tunes|tushu|ubank|vegas|video|vodka|volvo|wales|watch|weber|weibo|works|world|xerox|yahoo|zippo|ایران|بازار|بھارت|سودان|سورية|همراه|भारोत|संगठन|বাংলা|భారత్|ഭാരതം|嘉里大酒店|aarp|able|adac|aero|aigo|akdn|ally|amex|arab|army|arpa|arte|asda|asia|audi|auto|baby|band|bank|bbva|beer|best|bike|bing|blog|blue|bofa|bond|book|buzz|cafe|call|camp|care|cars|casa|case|cash|cbre|cern|chat|citi|city|club|cool|coop|cyou|data|date|dclk|deal|dell|desi|diet|dish|docs|doha|duck|duns|dvag|erni|fage|fail|fans|farm|fast|fiat|fido|film|fire|fish|flir|food|ford|free|fund|game|gbiz|gent|ggee|gift|gmbh|gold|golf|goog|guge|guru|hair|haus|hdfc|help|here|hgtv|host|hsbc|icbc|ieee|imdb|immo|info|itau|java|jeep|jobs|jprs|kddi|kiwi|kpmg|kred|land|lego|lgbt|lidl|life|like|limo|link|live|loan|loft|love|ltda|luxe|maif|meet|meme|menu|mini|mint|mobi|moda|moto|name|navy|news|next|nico|nike|ollo|open|page|pars|pccw|pics|ping|pink|play|plus|pohl|porn|post|prod|prof|qpon|raid|read|reit|rent|rest|rich|rmit|room|rsvp|ruhr|safe|sale|sarl|save|saxo|scor|scot|seat|seek|sexy|shaw|shia|shop|show|silk|sina|site|skin|sncf|sohu|song|sony|spot|star|surf|talk|taxi|team|tech|teva|tiaa|tips|town|toys|tube|vana|visa|viva|vivo|vote|voto|wang|weir|wien|wiki|wine|work|xbox|yoga|zara|zero|zone|дети|сайт|بارت|بيتك|ڀارت|تونس|شبكة|عراق|عمان|موقع|भारत|ভারত|ভাৰত|ਭਾਰਤ|ભારત|ଭାରତ|ಭಾರತ|ලංකා|グーグル|クラウド|ポイント|大众汽车|组织机构|電訊盈科|香格里拉|aaa|abb|abc|aco|ads|aeg|afl|aig|anz|aol|app|art|aws|axa|bar|bbc|bbt|bcg|bcn|bet|bid|bio|biz|bms|bmw|bnl|bom|boo|bot|box|buy|bzh|cab|cal|cam|car|cat|cba|cbn|cbs|ceb|ceo|cfa|cfd|com|crs|csc|dad|day|dds|dev|dhl|diy|dnp|dog|dot|dtv|dvr|eat|eco|edu|esq|eus|fan|fit|fly|foo|fox|frl|ftr|fun|fyi|gal|gap|gdn|gea|gle|gmo|gmx|goo|gop|got|gov|hbo|hiv|hkt|hot|how|ibm|ice|icu|ifm|inc|ing|ink|int|ist|itv|jcb|jcp|jio|jll|jmp|jnj|jot|joy|kfh|kia|kim|kpn|krd|lat|law|lds|llc|lol|lpl|ltd|man|map|mba|med|men|mil|mit|mlb|mls|mma|moe|moi|mom|mov|msd|mtn|mtr|nab|nba|nec|net|new|nfl|ngo|nhk|now|nra|nrw|ntt|nyc|obi|off|one|ong|onl|ooo|org|ott|ovh|pay|pet|phd|pid|pin|pnc|pro|pru|pub|pwc|qvc|red|ren|ril|rio|rip|run|rwe|sap|sas|sbi|sbs|sca|scb|ses|sew|sex|sfr|ski|sky|soy|srl|srt|stc|tab|tax|tci|tdk|tel|thd|tjx|top|trv|tui|tvs|ubs|uno|uol|ups|vet|vig|vin|vip|wed|win|wme|wow|wtc|wtf|xin|xxx|xyz|you|yun|zip|бел|ком|қаз|мкд|мон|орг|рус|срб|укр|հայ|קום|عرب|قطر|كوم|مصر|कॉम|नेट|คอม|ไทย|ストア|セール|みんな|中文网|天主教|我爱你|新加坡|淡马锡|诺基亚|飞利浦|ac|ad|ae|af|ag|ai|al|am|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cw|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw|ελ|бг|ею|рф|გე|닷넷|닷컴|삼성|한국|コム|世界|中信|中国|中國|企业|佛山|信息|健康|八卦|公司|公益|台湾|台灣|商城|商店|商标|嘉里|在线|大拿|娱乐|家電|工行|广东|微博|慈善|手机|手表|招聘|政务|政府|新闻|时尚|書籍|机构|游戏|澳門|点看|珠宝|移动|网址|网店|网站|网络|联通|谷歌|购物|通販|集团|食品|餐厅|香港)/;

    // For debugging: search for other "For debugging" lines
    // import CliTable from 'cli-table';
    /**
     * @class Autolinker.matcher.Email
     * @extends Autolinker.matcher.Matcher
     *
     * Matcher to find email matches in an input string.
     *
     * See this class's superclass ({@link Autolinker.matcher.Matcher}) for more details.
     */
    var EmailMatcher = /** @class */ (function (_super) {
        __extends(EmailMatcher, _super);
        function EmailMatcher() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * Valid characters that can be used in the "local" part of an email address,
             * i.e. the "name" part of "name@site.com"
             */
            _this.localPartCharRegex = new RegExp("[" + alphaNumericAndMarksCharsStr + "!#$%&'*+/=?^_`{|}~-]");
            /**
             * Stricter TLD regex which adds a beginning and end check to ensure
             * the string is a valid TLD
             */
            _this.strictTldRegex = new RegExp("^" + tldRegex.source + "$");
            return _this;
        }
        /**
         * @inheritdoc
         */
        EmailMatcher.prototype.parseMatches = function (text) {
            var tagBuilder = this.tagBuilder, localPartCharRegex = this.localPartCharRegex, strictTldRegex = this.strictTldRegex, matches = [], len = text.length, noCurrentEmailMatch = new CurrentEmailMatch();
            // for matching a 'mailto:' prefix
            var mailtoTransitions = {
                'm': 'a',
                'a': 'i',
                'i': 'l',
                'l': 't',
                't': 'o',
                'o': ':',
            };
            var charIdx = 0, state = 0 /* NonEmailMatch */, currentEmailMatch = noCurrentEmailMatch;
            // For debugging: search for other "For debugging" lines
            // const table = new CliTable( {
            // 	head: [ 'charIdx', 'char', 'state', 'charIdx', 'currentEmailAddress.idx', 'hasDomainDot' ]
            // } );
            while (charIdx < len) {
                var char = text.charAt(charIdx);
                // For debugging: search for other "For debugging" lines
                // table.push(
                // 	[ charIdx, char, State[ state ], charIdx, currentEmailAddress.idx, currentEmailAddress.hasDomainDot ]
                // );
                switch (state) {
                    case 0 /* NonEmailMatch */:
                        stateNonEmailAddress(char);
                        break;
                    case 1 /* Mailto */:
                        stateMailTo(text.charAt(charIdx - 1), char);
                        break;
                    case 2 /* LocalPart */:
                        stateLocalPart(char);
                        break;
                    case 3 /* LocalPartDot */:
                        stateLocalPartDot(char);
                        break;
                    case 4 /* AtSign */:
                        stateAtSign(char);
                        break;
                    case 5 /* DomainChar */:
                        stateDomainChar(char);
                        break;
                    case 6 /* DomainHyphen */:
                        stateDomainHyphen(char);
                        break;
                    case 7 /* DomainDot */:
                        stateDomainDot(char);
                        break;
                    default:
                        throwUnhandledCaseError(state);
                }
                // For debugging: search for other "For debugging" lines
                // table.push(
                // 	[ charIdx, char, State[ state ], charIdx, currentEmailAddress.idx, currentEmailAddress.hasDomainDot ]
                // );
                charIdx++;
            }
            // Capture any valid match at the end of the string
            captureMatchIfValidAndReset();
            // For debugging: search for other "For debugging" lines
            //console.log( '\n' + table.toString() );
            return matches;
            // Handles the state when we're not in an email address
            function stateNonEmailAddress(char) {
                if (char === 'm') {
                    beginEmailMatch(1 /* Mailto */);
                }
                else if (localPartCharRegex.test(char)) {
                    beginEmailMatch();
                }
            }
            // Handles if we're reading a 'mailto:' prefix on the string
            function stateMailTo(prevChar, char) {
                if (prevChar === ':') {
                    // We've reached the end of the 'mailto:' prefix
                    if (localPartCharRegex.test(char)) {
                        state = 2 /* LocalPart */;
                        currentEmailMatch = new CurrentEmailMatch(__assign({}, currentEmailMatch, { hasMailtoPrefix: true }));
                    }
                    else {
                        // we've matched 'mailto:' but didn't get anything meaningful
                        // immediately afterwards (for example, we encountered a
                        // space character, or an '@' character which formed 'mailto:@'
                        resetToNonEmailMatchState();
                    }
                }
                else if (mailtoTransitions[prevChar] === char) ;
                else if (localPartCharRegex.test(char)) {
                    // We we're reading a prefix of 'mailto:', but encountered a
                    // different character that didn't continue the prefix
                    state = 2 /* LocalPart */;
                }
                else if (char === '.') {
                    // We we're reading a prefix of 'mailto:', but encountered a
                    // dot character
                    state = 3 /* LocalPartDot */;
                }
                else if (char === '@') {
                    // We we're reading a prefix of 'mailto:', but encountered a
                    // an @ character
                    state = 4 /* AtSign */;
                }
                else {
                    // not an email address character, return to "NonEmailAddress" state
                    resetToNonEmailMatchState();
                }
            }
            // Handles the state when we're currently in the "local part" of an
            // email address (as opposed to the "domain part")
            function stateLocalPart(char) {
                if (char === '.') {
                    state = 3 /* LocalPartDot */;
                }
                else if (char === '@') {
                    state = 4 /* AtSign */;
                }
                else if (localPartCharRegex.test(char)) ;
                else {
                    // not an email address character, return to "NonEmailAddress" state
                    resetToNonEmailMatchState();
                }
            }
            // Handles the state where we've read
            function stateLocalPartDot(char) {
                if (char === '.') {
                    // We read a second '.' in a row, not a valid email address
                    // local part
                    resetToNonEmailMatchState();
                }
                else if (char === '@') {
                    // We read the '@' character immediately after a dot ('.'), not
                    // an email address
                    resetToNonEmailMatchState();
                }
                else if (localPartCharRegex.test(char)) {
                    state = 2 /* LocalPart */;
                }
                else {
                    // Anything else, not an email address
                    resetToNonEmailMatchState();
                }
            }
            function stateAtSign(char) {
                if (domainNameCharRegex.test(char)) {
                    state = 5 /* DomainChar */;
                }
                else {
                    // Anything else, not an email address
                    resetToNonEmailMatchState();
                }
            }
            function stateDomainChar(char) {
                if (char === '.') {
                    state = 7 /* DomainDot */;
                }
                else if (char === '-') {
                    state = 6 /* DomainHyphen */;
                }
                else if (domainNameCharRegex.test(char)) ;
                else {
                    // Anything else, we potentially matched if the criteria has
                    // been met
                    captureMatchIfValidAndReset();
                }
            }
            function stateDomainHyphen(char) {
                if (char === '-' || char === '.') {
                    // Not valid to have two hyphens ("--") or hypen+dot ("-.")
                    captureMatchIfValidAndReset();
                }
                else if (domainNameCharRegex.test(char)) {
                    state = 5 /* DomainChar */;
                }
                else {
                    // Anything else
                    captureMatchIfValidAndReset();
                }
            }
            function stateDomainDot(char) {
                if (char === '.' || char === '-') {
                    // not valid to have two dots ("..") or dot+hypen (".-")
                    captureMatchIfValidAndReset();
                }
                else if (domainNameCharRegex.test(char)) {
                    state = 5 /* DomainChar */;
                    // After having read a '.' and then a valid domain character,
                    // we now know that the domain part of the email is valid, and
                    // we have found at least a partial EmailMatch (however, the
                    // email address may have additional characters from this point)
                    currentEmailMatch = new CurrentEmailMatch(__assign({}, currentEmailMatch, { hasDomainDot: true }));
                }
                else {
                    // Anything else
                    captureMatchIfValidAndReset();
                }
            }
            function beginEmailMatch(newState) {
                if (newState === void 0) { newState = 2 /* LocalPart */; }
                state = newState;
                currentEmailMatch = new CurrentEmailMatch({ idx: charIdx });
            }
            function resetToNonEmailMatchState() {
                state = 0 /* NonEmailMatch */;
                currentEmailMatch = noCurrentEmailMatch;
            }
            /*
             * Captures the current email address as an EmailMatch if it's valid,
             * and resets the state to read another email address.
             */
            function captureMatchIfValidAndReset() {
                if (currentEmailMatch.hasDomainDot) { // we need at least one dot in the domain to be considered a valid email address
                    var matchedText = text.slice(currentEmailMatch.idx, charIdx);
                    // If we read a '.' or '-' char that ended the email address
                    // (valid domain name characters, but only valid email address
                    // characters if they are followed by something else), strip
                    // it off now
                    if (/[-.]$/.test(matchedText)) {
                        matchedText = matchedText.slice(0, -1);
                    }
                    var emailAddress = currentEmailMatch.hasMailtoPrefix
                        ? matchedText.slice('mailto:'.length)
                        : matchedText;
                    // if the email address has a valid TLD, add it to the list of matches
                    if (doesEmailHaveValidTld(emailAddress)) {
                        matches.push(new EmailMatch({
                            tagBuilder: tagBuilder,
                            matchedText: matchedText,
                            offset: currentEmailMatch.idx,
                            email: emailAddress
                        }));
                    }
                }
                resetToNonEmailMatchState();
                /**
                 * Determines if the given email address has a valid TLD or not
                 * @param {string} emailAddress - email address
                 * @return {Boolean} - true is email have valid TLD, false otherwise
                 */
                function doesEmailHaveValidTld(emailAddress) {
                    var emailAddressTld = emailAddress.split('.').pop() || '';
                    var emailAddressNormalized = emailAddressTld.toLowerCase();
                    var isValidTld = strictTldRegex.test(emailAddressNormalized);
                    return isValidTld;
                }
            }
        };
        return EmailMatcher;
    }(Matcher));
    var CurrentEmailMatch = /** @class */ (function () {
        function CurrentEmailMatch(cfg) {
            if (cfg === void 0) { cfg = {}; }
            this.idx = cfg.idx !== undefined ? cfg.idx : -1;
            this.hasMailtoPrefix = !!cfg.hasMailtoPrefix;
            this.hasDomainDot = !!cfg.hasDomainDot;
        }
        return CurrentEmailMatch;
    }());

    /**
     * @private
     * @class Autolinker.matcher.UrlMatchValidator
     * @singleton
     *
     * Used by Autolinker to filter out false URL positives from the
     * {@link Autolinker.matcher.Url UrlMatcher}.
     *
     * Due to the limitations of regular expressions (including the missing feature
     * of look-behinds in JS regular expressions), we cannot always determine the
     * validity of a given match. This class applies a bit of additional logic to
     * filter out any false positives that have been matched by the
     * {@link Autolinker.matcher.Url UrlMatcher}.
     */
    var UrlMatchValidator = /** @class */ (function () {
        function UrlMatchValidator() {
        }
        /**
         * Determines if a given URL match found by the {@link Autolinker.matcher.Url UrlMatcher}
         * is valid. Will return `false` for:
         *
         * 1) URL matches which do not have at least have one period ('.') in the
         *    domain name (effectively skipping over matches like "abc:def").
         *    However, URL matches with a protocol will be allowed (ex: 'http://localhost')
         * 2) URL matches which do not have at least one word character in the
         *    domain name (effectively skipping over matches like "git:1.0").
         * 3) A protocol-relative url match (a URL beginning with '//') whose
         *    previous character is a word character (effectively skipping over
         *    strings like "abc//google.com")
         *
         * Otherwise, returns `true`.
         *
         * @param {String} urlMatch The matched URL, if there was one. Will be an
         *   empty string if the match is not a URL match.
         * @param {String} protocolUrlMatch The match URL string for a protocol
         *   match. Ex: 'http://yahoo.com'. This is used to match something like
         *   'http://localhost', where we won't double check that the domain name
         *   has at least one '.' in it.
         * @return {Boolean} `true` if the match given is valid and should be
         *   processed, or `false` if the match is invalid and/or should just not be
         *   processed.
         */
        UrlMatchValidator.isValid = function (urlMatch, protocolUrlMatch) {
            if ((protocolUrlMatch && !this.isValidUriScheme(protocolUrlMatch)) ||
                this.urlMatchDoesNotHaveProtocolOrDot(urlMatch, protocolUrlMatch) || // At least one period ('.') must exist in the URL match for us to consider it an actual URL, *unless* it was a full protocol match (like 'http://localhost')
                (this.urlMatchDoesNotHaveAtLeastOneWordChar(urlMatch, protocolUrlMatch) && // At least one letter character must exist in the domain name after a protocol match. Ex: skip over something like "git:1.0"
                    !this.isValidIpAddress(urlMatch)) || // Except if it's an IP address
                this.containsMultipleDots(urlMatch)) {
                return false;
            }
            return true;
        };
        UrlMatchValidator.isValidIpAddress = function (uriSchemeMatch) {
            var newRegex = new RegExp(this.hasFullProtocolRegex.source + this.ipRegex.source);
            var uriScheme = uriSchemeMatch.match(newRegex);
            return uriScheme !== null;
        };
        UrlMatchValidator.containsMultipleDots = function (urlMatch) {
            var stringBeforeSlash = urlMatch;
            if (this.hasFullProtocolRegex.test(urlMatch)) {
                stringBeforeSlash = urlMatch.split('://')[1];
            }
            return stringBeforeSlash.split('/')[0].indexOf("..") > -1;
        };
        /**
         * Determines if the URI scheme is a valid scheme to be autolinked. Returns
         * `false` if the scheme is 'javascript:' or 'vbscript:'
         *
         * @private
         * @param {String} uriSchemeMatch The match URL string for a full URI scheme
         *   match. Ex: 'http://yahoo.com' or 'mailto:a@a.com'.
         * @return {Boolean} `true` if the scheme is a valid one, `false` otherwise.
         */
        UrlMatchValidator.isValidUriScheme = function (uriSchemeMatch) {
            var uriSchemeMatchArr = uriSchemeMatch.match(this.uriSchemeRegex), uriScheme = uriSchemeMatchArr && uriSchemeMatchArr[0].toLowerCase();
            return (uriScheme !== 'javascript:' && uriScheme !== 'vbscript:');
        };
        /**
         * Determines if a URL match does not have either:
         *
         * a) a full protocol (i.e. 'http://'), or
         * b) at least one dot ('.') in the domain name (for a non-full-protocol
         *    match).
         *
         * Either situation is considered an invalid URL (ex: 'git:d' does not have
         * either the '://' part, or at least one dot in the domain name. If the
         * match was 'git:abc.com', we would consider this valid.)
         *
         * @private
         * @param {String} urlMatch The matched URL, if there was one. Will be an
         *   empty string if the match is not a URL match.
         * @param {String} protocolUrlMatch The match URL string for a protocol
         *   match. Ex: 'http://yahoo.com'. This is used to match something like
         *   'http://localhost', where we won't double check that the domain name
         *   has at least one '.' in it.
         * @return {Boolean} `true` if the URL match does not have a full protocol,
         *   or at least one dot ('.') in a non-full-protocol match.
         */
        UrlMatchValidator.urlMatchDoesNotHaveProtocolOrDot = function (urlMatch, protocolUrlMatch) {
            return (!!urlMatch && (!protocolUrlMatch || !this.hasFullProtocolRegex.test(protocolUrlMatch)) && urlMatch.indexOf('.') === -1);
        };
        /**
         * Determines if a URL match does not have at least one word character after
         * the protocol (i.e. in the domain name).
         *
         * At least one letter character must exist in the domain name after a
         * protocol match. Ex: skip over something like "git:1.0"
         *
         * @private
         * @param {String} urlMatch The matched URL, if there was one. Will be an
         *   empty string if the match is not a URL match.
         * @param {String} protocolUrlMatch The match URL string for a protocol
         *   match. Ex: 'http://yahoo.com'. This is used to know whether or not we
         *   have a protocol in the URL string, in order to check for a word
         *   character after the protocol separator (':').
         * @return {Boolean} `true` if the URL match does not have at least one word
         *   character in it after the protocol, `false` otherwise.
         */
        UrlMatchValidator.urlMatchDoesNotHaveAtLeastOneWordChar = function (urlMatch, protocolUrlMatch) {
            if (urlMatch && protocolUrlMatch) {
                return !this.hasWordCharAfterProtocolRegex.test(urlMatch);
            }
            else {
                return false;
            }
        };
        /**
         * Regex to test for a full protocol, with the two trailing slashes. Ex: 'http://'
         *
         * @private
         * @property {RegExp} hasFullProtocolRegex
         */
        UrlMatchValidator.hasFullProtocolRegex = /^[A-Za-z][-.+A-Za-z0-9]*:\/\//;
        /**
         * Regex to find the URI scheme, such as 'mailto:'.
         *
         * This is used to filter out 'javascript:' and 'vbscript:' schemes.
         *
         * @private
         * @property {RegExp} uriSchemeRegex
         */
        UrlMatchValidator.uriSchemeRegex = /^[A-Za-z][-.+A-Za-z0-9]*:/;
        /**
         * Regex to determine if at least one word char exists after the protocol (i.e. after the ':')
         *
         * @private
         * @property {RegExp} hasWordCharAfterProtocolRegex
         */
        UrlMatchValidator.hasWordCharAfterProtocolRegex = new RegExp(":[^\\s]*?[" + alphaCharsStr + "]");
        /**
         * Regex to determine if the string is a valid IP address
         *
         * @private
         * @property {RegExp} ipRegex
         */
        UrlMatchValidator.ipRegex = /[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?\.[0-9][0-9]?[0-9]?(:[0-9]*)?\/?$/;
        return UrlMatchValidator;
    }());

    /**
     * @class Autolinker.matcher.Url
     * @extends Autolinker.matcher.Matcher
     *
     * Matcher to find URL matches in an input string.
     *
     * See this class's superclass ({@link Autolinker.matcher.Matcher}) for more details.
     */
    var UrlMatcher = /** @class */ (function (_super) {
        __extends(UrlMatcher, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match instance,
         *   specified in an Object (map).
         */
        function UrlMatcher(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {Object} stripPrefix (required)
             *
             * The Object form of {@link Autolinker#cfg-stripPrefix}.
             */
            _this.stripPrefix = { scheme: true, www: true }; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} stripTrailingSlash (required)
             * @inheritdoc Autolinker#stripTrailingSlash
             */
            _this.stripTrailingSlash = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} decodePercentEncoding (required)
             * @inheritdoc Autolinker#decodePercentEncoding
             */
            _this.decodePercentEncoding = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @protected
             * @property {RegExp} matcherRegex
             *
             * The regular expression to match URLs with an optional scheme, port
             * number, path, query string, and hash anchor.
             *
             * Example matches:
             *
             *     http://google.com
             *     www.google.com
             *     google.com/path/to/file?q1=1&q2=2#myAnchor
             *
             *
             * This regular expression will have the following capturing groups:
             *
             * 1.  Group that matches a scheme-prefixed URL (i.e. 'http://google.com').
             *     This is used to match scheme URLs with just a single word, such as
             *     'http://localhost', where we won't double check that the domain name
             *     has at least one dot ('.') in it.
             * 2.  Group that matches a 'www.' prefixed URL. This is only matched if the
             *     'www.' text was not prefixed by a scheme (i.e.: not prefixed by
             *     'http://', 'ftp:', etc.)
             * 3.  A protocol-relative ('//') match for the case of a 'www.' prefixed
             *     URL. Will be an empty string if it is not a protocol-relative match.
             *     We need to know the character before the '//' in order to determine
             *     if it is a valid match or the // was in a string we don't want to
             *     auto-link.
             * 4.  Group that matches a known TLD (top level domain), when a scheme
             *     or 'www.'-prefixed domain is not matched.
             * 5.  A protocol-relative ('//') match for the case of a known TLD prefixed
             *     URL. Will be an empty string if it is not a protocol-relative match.
             *     See #3 for more info.
             */
            _this.matcherRegex = (function () {
                var schemeRegex = /(?:[A-Za-z][-.+A-Za-z0-9]{0,63}:(?![A-Za-z][-.+A-Za-z0-9]{0,63}:\/\/)(?!\d+\/?)(?:\/\/)?)/, // match protocol, allow in format "http://" or "mailto:". However, do not match the first part of something like 'link:http://www.google.com' (i.e. don't match "link:"). Also, make sure we don't interpret 'google.com:8000' as if 'google.com' was a protocol here (i.e. ignore a trailing port number in this regex)
                wwwRegex = /(?:www\.)/, // starting with 'www.'
                // Allow optional path, query string, and hash anchor, not ending in the following characters: "?!:,.;"
                // http://blog.codinghorror.com/the-problem-with-urls/
                urlSuffixRegex = new RegExp('[/?#](?:[' + alphaNumericAndMarksCharsStr + '\\-+&@#/%=~_()|\'$*\\[\\]?!:,.;\u2713]*[' + alphaNumericAndMarksCharsStr + '\\-+&@#/%=~_()|\'$*\\[\\]\u2713])?');
                return new RegExp([
                    '(?:',
                    '(',
                    schemeRegex.source,
                    getDomainNameStr(2),
                    ')',
                    '|',
                    '(',
                    '(//)?',
                    wwwRegex.source,
                    getDomainNameStr(6),
                    ')',
                    '|',
                    '(',
                    '(//)?',
                    getDomainNameStr(10) + '\\.',
                    tldRegex.source,
                    '(?![-' + alphaNumericCharsStr + '])',
                    ')',
                    ')',
                    '(?::[0-9]+)?',
                    '(?:' + urlSuffixRegex.source + ')?' // match for path, query string, and/or hash anchor - optional
                ].join(""), 'gi');
            })();
            /**
             * A regular expression to use to check the character before a protocol-relative
             * URL match. We don't want to match a protocol-relative URL if it is part
             * of another word.
             *
             * For example, we want to match something like "Go to: //google.com",
             * but we don't want to match something like "abc//google.com"
             *
             * This regular expression is used to test the character before the '//'.
             *
             * @protected
             * @type {RegExp} wordCharRegExp
             */
            _this.wordCharRegExp = new RegExp('[' + alphaNumericAndMarksCharsStr + ']');
            _this.stripPrefix = cfg.stripPrefix;
            _this.stripTrailingSlash = cfg.stripTrailingSlash;
            _this.decodePercentEncoding = cfg.decodePercentEncoding;
            return _this;
        }
        /**
         * @inheritdoc
         */
        UrlMatcher.prototype.parseMatches = function (text) {
            var matcherRegex = this.matcherRegex, stripPrefix = this.stripPrefix, stripTrailingSlash = this.stripTrailingSlash, decodePercentEncoding = this.decodePercentEncoding, tagBuilder = this.tagBuilder, matches = [], match;
            var _loop_1 = function () {
                var matchStr = match[0], schemeUrlMatch = match[1], wwwUrlMatch = match[4], wwwProtocolRelativeMatch = match[5],
                //tldUrlMatch = match[ 8 ],  -- not needed at the moment
                tldProtocolRelativeMatch = match[9], offset = match.index, protocolRelativeMatch = wwwProtocolRelativeMatch || tldProtocolRelativeMatch, prevChar = text.charAt(offset - 1);
                if (!UrlMatchValidator.isValid(matchStr, schemeUrlMatch)) {
                    return "continue";
                }
                // If the match is preceded by an '@' character, then it is either
                // an email address or a username. Skip these types of matches.
                if (offset > 0 && prevChar === '@') {
                    return "continue";
                }
                // If it's a protocol-relative '//' match, but the character before the '//'
                // was a word character (i.e. a letter/number), then we found the '//' in the
                // middle of another word (such as "asdf//asdf.com"). In this case, skip the
                // match.
                if (offset > 0 && protocolRelativeMatch && this_1.wordCharRegExp.test(prevChar)) {
                    return "continue";
                }
                // If the URL ends with a question mark, don't include the question
                // mark as part of the URL. We'll assume the question mark was the
                // end of a sentence, such as: "Going to google.com?"
                if (/\?$/.test(matchStr)) {
                    matchStr = matchStr.substr(0, matchStr.length - 1);
                }
                // Handle a closing parenthesis or square bracket at the end of the
                // match, and exclude it if there is not a matching open parenthesis
                // or square bracket in the match itself.
                if (this_1.matchHasUnbalancedClosingParen(matchStr)) {
                    matchStr = matchStr.substr(0, matchStr.length - 1); // remove the trailing ")"
                }
                else {
                    // Handle an invalid character after the TLD
                    var pos = this_1.matchHasInvalidCharAfterTld(matchStr, schemeUrlMatch);
                    if (pos > -1) {
                        matchStr = matchStr.substr(0, pos); // remove the trailing invalid chars
                    }
                }
                // The autolinker accepts many characters in a url's scheme (like `fake://test.com`).
                // However, in cases where a URL is missing whitespace before an obvious link,
                // (for example: `nowhitespacehttp://www.test.com`), we only want the match to start
                // at the http:// part. We will check if the match contains a common scheme and then
                // shift the match to start from there.
                var foundCommonScheme = ['http://', 'https://'].find(function (commonScheme) { return !!schemeUrlMatch && schemeUrlMatch.indexOf(commonScheme) !== -1; });
                if (foundCommonScheme) {
                    // If we found an overmatched URL, we want to find the index
                    // of where the match should start and shift the match to
                    // start from the beginning of the common scheme
                    var indexOfSchemeStart = matchStr.indexOf(foundCommonScheme);
                    matchStr = matchStr.substr(indexOfSchemeStart);
                    schemeUrlMatch = schemeUrlMatch.substr(indexOfSchemeStart);
                    offset = offset + indexOfSchemeStart;
                }
                var urlMatchType = schemeUrlMatch ? 'scheme' : (wwwUrlMatch ? 'www' : 'tld'), protocolUrlMatch = !!schemeUrlMatch;
                matches.push(new UrlMatch({
                    tagBuilder: tagBuilder,
                    matchedText: matchStr,
                    offset: offset,
                    urlMatchType: urlMatchType,
                    url: matchStr,
                    protocolUrlMatch: protocolUrlMatch,
                    protocolRelativeMatch: !!protocolRelativeMatch,
                    stripPrefix: stripPrefix,
                    stripTrailingSlash: stripTrailingSlash,
                    decodePercentEncoding: decodePercentEncoding,
                }));
            };
            var this_1 = this;
            while ((match = matcherRegex.exec(text)) !== null) {
                _loop_1();
            }
            return matches;
        };
        /**
         * Determines if a match found has an unmatched closing parenthesis or
         * square bracket. If so, the parenthesis or square bracket will be removed
         * from the match itself, and appended after the generated anchor tag.
         *
         * A match may have an extra closing parenthesis at the end of the match
         * because the regular expression must include parenthesis for URLs such as
         * "wikipedia.com/something_(disambiguation)", which should be auto-linked.
         *
         * However, an extra parenthesis *will* be included when the URL itself is
         * wrapped in parenthesis, such as in the case of:
         *     "(wikipedia.com/something_(disambiguation))"
         * In this case, the last closing parenthesis should *not* be part of the
         * URL itself, and this method will return `true`.
         *
         * For square brackets in URLs such as in PHP arrays, the same behavior as
         * parenthesis discussed above should happen:
         *     "[http://www.example.com/foo.php?bar[]=1&bar[]=2&bar[]=3]"
         * The closing square bracket should not be part of the URL itself, and this
         * method will return `true`.
         *
         * @protected
         * @param {String} matchStr The full match string from the {@link #matcherRegex}.
         * @return {Boolean} `true` if there is an unbalanced closing parenthesis or
         *   square bracket at the end of the `matchStr`, `false` otherwise.
         */
        UrlMatcher.prototype.matchHasUnbalancedClosingParen = function (matchStr) {
            var endChar = matchStr.charAt(matchStr.length - 1);
            var startChar;
            if (endChar === ')') {
                startChar = '(';
            }
            else if (endChar === ']') {
                startChar = '[';
            }
            else {
                return false; // not a close parenthesis or square bracket
            }
            // Find if there are the same number of open braces as close braces in
            // the URL string, minus the last character (which we have already
            // determined to be either ')' or ']'
            var numOpenBraces = 0;
            for (var i = 0, len = matchStr.length - 1; i < len; i++) {
                var char = matchStr.charAt(i);
                if (char === startChar) {
                    numOpenBraces++;
                }
                else if (char === endChar) {
                    numOpenBraces = Math.max(numOpenBraces - 1, 0);
                }
            }
            // If the number of open braces matches the number of close braces in
            // the URL minus the last character, then the match has *unbalanced*
            // braces because of the last character. Example of unbalanced braces
            // from the regex match:
            //     "http://example.com?a[]=1]"
            if (numOpenBraces === 0) {
                return true;
            }
            return false;
        };
        /**
         * Determine if there's an invalid character after the TLD in a URL. Valid
         * characters after TLD are ':/?#'. Exclude scheme matched URLs from this
         * check.
         *
         * @protected
         * @param {String} urlMatch The matched URL, if there was one. Will be an
         *   empty string if the match is not a URL match.
         * @param {String} schemeUrlMatch The match URL string for a scheme
         *   match. Ex: 'http://yahoo.com'. This is used to match something like
         *   'http://localhost', where we won't double check that the domain name
         *   has at least one '.' in it.
         * @return {Number} the position where the invalid character was found. If
         *   no such character was found, returns -1
         */
        UrlMatcher.prototype.matchHasInvalidCharAfterTld = function (urlMatch, schemeUrlMatch) {
            if (!urlMatch) {
                return -1;
            }
            var offset = 0;
            if (schemeUrlMatch) {
                offset = urlMatch.indexOf(':');
                urlMatch = urlMatch.slice(offset);
            }
            var re = new RegExp("^((.?\/\/)?[-." + alphaNumericAndMarksCharsStr + "]*[-" + alphaNumericAndMarksCharsStr + "]\\.[-" + alphaNumericAndMarksCharsStr + "]+)");
            var res = re.exec(urlMatch);
            if (res === null) {
                return -1;
            }
            offset += res[1].length;
            urlMatch = urlMatch.slice(res[1].length);
            if (/^[^-.A-Za-z0-9:\/?#]/.test(urlMatch)) {
                return offset;
            }
            return -1;
        };
        return UrlMatcher;
    }(Matcher));

    /**
     * @class Autolinker.matcher.Hashtag
     * @extends Autolinker.matcher.Matcher
     *
     * Matcher to find HashtagMatch matches in an input string.
     */
    var HashtagMatcher = /** @class */ (function (_super) {
        __extends(HashtagMatcher, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match instance,
         *   specified in an Object (map).
         */
        function HashtagMatcher(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {String} serviceName
             *
             * The service to point hashtag matches to. See {@link Autolinker#hashtag}
             * for available values.
             */
            _this.serviceName = 'twitter'; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * The regular expression to match Hashtags. Example match:
             *
             *     #asdf
             *
             * @protected
             * @property {RegExp} matcherRegex
             */
            _this.matcherRegex = new RegExp("#[_" + alphaNumericAndMarksCharsStr + "]{1,139}(?![_" + alphaNumericAndMarksCharsStr + "])", 'g'); // lookahead used to make sure we don't match something above 139 characters
            /**
             * The regular expression to use to check the character before a username match to
             * make sure we didn't accidentally match an email address.
             *
             * For example, the string "asdf@asdf.com" should not match "@asdf" as a username.
             *
             * @protected
             * @property {RegExp} nonWordCharRegex
             */
            _this.nonWordCharRegex = new RegExp('[^' + alphaNumericAndMarksCharsStr + ']');
            _this.serviceName = cfg.serviceName;
            return _this;
        }
        /**
         * @inheritdoc
         */
        HashtagMatcher.prototype.parseMatches = function (text) {
            var matcherRegex = this.matcherRegex, nonWordCharRegex = this.nonWordCharRegex, serviceName = this.serviceName, tagBuilder = this.tagBuilder, matches = [], match;
            while ((match = matcherRegex.exec(text)) !== null) {
                var offset = match.index, prevChar = text.charAt(offset - 1);
                // If we found the match at the beginning of the string, or we found the match
                // and there is a whitespace char in front of it (meaning it is not a '#' char
                // in the middle of a word), then it is a hashtag match.
                if (offset === 0 || nonWordCharRegex.test(prevChar)) {
                    var matchedText = match[0], hashtag = match[0].slice(1); // strip off the '#' character at the beginning
                    matches.push(new HashtagMatch({
                        tagBuilder: tagBuilder,
                        matchedText: matchedText,
                        offset: offset,
                        serviceName: serviceName,
                        hashtag: hashtag
                    }));
                }
            }
            return matches;
        };
        return HashtagMatcher;
    }(Matcher));

    /**
     * @class Autolinker.matcher.Phone
     * @extends Autolinker.matcher.Matcher
     *
     * Matcher to find Phone number matches in an input string.
     *
     * See this class's superclass ({@link Autolinker.matcher.Matcher}) for more
     * details.
     */
    var PhoneMatcher = /** @class */ (function (_super) {
        __extends(PhoneMatcher, _super);
        function PhoneMatcher() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /**
             * The regular expression to match Phone numbers. Example match:
             *
             *     (123) 456-7890
             *
             * This regular expression has the following capturing groups:
             *
             * 1 or 2. The prefixed '+' sign, if there is one.
             *
             * @protected
             * @property {RegExp} matcherRegex
             */
            _this.matcherRegex = /(?:(?:(?:(\+)?\d{1,3}[-\040.]?)?\(?\d{3}\)?[-\040.]?\d{3}[-\040.]?\d{4})|(?:(\+)(?:9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)[-\040.]?(?:\d[-\040.]?){6,12}\d+))([,;]+[0-9]+#?)*/g;
            return _this;
        }
        // ex: (123) 456-7890, 123 456 7890, 123-456-7890, +18004441234,,;,10226420346#,
        // +1 (800) 444 1234, 10226420346#, 1-800-444-1234,1022,64,20346#
        /**
         * @inheritdoc
         */
        PhoneMatcher.prototype.parseMatches = function (text) {
            var matcherRegex = this.matcherRegex, tagBuilder = this.tagBuilder, matches = [], match;
            while ((match = matcherRegex.exec(text)) !== null) {
                // Remove non-numeric values from phone number string
                var matchedText = match[0], cleanNumber = matchedText.replace(/[^0-9,;#]/g, ''), // strip out non-digit characters exclude comma semicolon and #
                plusSign = !!(match[1] || match[2]), // match[ 1 ] or match[ 2 ] is the prefixed plus sign, if there is one
                before = match.index == 0 ? '' : text.substr(match.index - 1, 1), after = text.substr(match.index + matchedText.length, 1), contextClear = !before.match(/\d/) && !after.match(/\d/);
                if (this.testMatch(match[3]) && this.testMatch(matchedText) && contextClear) {
                    matches.push(new PhoneMatch({
                        tagBuilder: tagBuilder,
                        matchedText: matchedText,
                        offset: match.index,
                        number: cleanNumber,
                        plusSign: plusSign
                    }));
                }
            }
            return matches;
        };
        PhoneMatcher.prototype.testMatch = function (text) {
            return /\D/.test(text);
        };
        return PhoneMatcher;
    }(Matcher));

    /**
     * @class Autolinker.matcher.Mention
     * @extends Autolinker.matcher.Matcher
     *
     * Matcher to find/replace username matches in an input string.
     */
    var MentionMatcher = /** @class */ (function (_super) {
        __extends(MentionMatcher, _super);
        /**
         * @method constructor
         * @param {Object} cfg The configuration properties for the Match instance,
         *   specified in an Object (map).
         */
        function MentionMatcher(cfg) {
            var _this = _super.call(this, cfg) || this;
            /**
             * @cfg {'twitter'/'instagram'/'soundcloud'} protected
             *
             * The name of service to link @mentions to.
             *
             * Valid values are: 'twitter', 'instagram', or 'soundcloud'
             */
            _this.serviceName = 'twitter'; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * Hash of regular expression to match username handles. Example match:
             *
             *     @asdf
             *
             * @private
             * @property {Object} matcherRegexes
             */
            _this.matcherRegexes = {
                'twitter': new RegExp("@[_" + alphaNumericAndMarksCharsStr + "]{1,50}(?![_" + alphaNumericAndMarksCharsStr + "])", 'g'),
                'instagram': new RegExp("@[_." + alphaNumericAndMarksCharsStr + "]{1,30}(?![_" + alphaNumericAndMarksCharsStr + "])", 'g'),
                'soundcloud': new RegExp("@[-_." + alphaNumericAndMarksCharsStr + "]{1,50}(?![-_" + alphaNumericAndMarksCharsStr + "])", 'g') // lookahead used to make sure we don't match something above 50 characters
            };
            /**
             * The regular expression to use to check the character before a username match to
             * make sure we didn't accidentally match an email address.
             *
             * For example, the string "asdf@asdf.com" should not match "@asdf" as a username.
             *
             * @private
             * @property {RegExp} nonWordCharRegex
             */
            _this.nonWordCharRegex = new RegExp('[^' + alphaNumericAndMarksCharsStr + ']');
            _this.serviceName = cfg.serviceName;
            return _this;
        }
        /**
         * @inheritdoc
         */
        MentionMatcher.prototype.parseMatches = function (text) {
            var serviceName = this.serviceName, matcherRegex = this.matcherRegexes[this.serviceName], nonWordCharRegex = this.nonWordCharRegex, tagBuilder = this.tagBuilder, matches = [], match;
            if (!matcherRegex) {
                return matches;
            }
            while ((match = matcherRegex.exec(text)) !== null) {
                var offset = match.index, prevChar = text.charAt(offset - 1);
                // If we found the match at the beginning of the string, or we found the match
                // and there is a whitespace char in front of it (meaning it is not an email
                // address), then it is a username match.
                if (offset === 0 || nonWordCharRegex.test(prevChar)) {
                    var matchedText = match[0].replace(/\.+$/g, ''), // strip off trailing .
                    mention = matchedText.slice(1); // strip off the '@' character at the beginning
                    matches.push(new MentionMatch({
                        tagBuilder: tagBuilder,
                        matchedText: matchedText,
                        offset: offset,
                        serviceName: serviceName,
                        mention: mention
                    }));
                }
            }
            return matches;
        };
        return MentionMatcher;
    }(Matcher));

    // For debugging: search for other "For debugging" lines
    // import CliTable from 'cli-table';
    /**
     * Parses an HTML string, calling the callbacks to notify of tags and text.
     *
     * ## History
     *
     * This file previously used a regular expression to find html tags in the input
     * text. Unfortunately, we ran into a bunch of catastrophic backtracking issues
     * with certain input text, causing Autolinker to either hang or just take a
     * really long time to parse the string.
     *
     * The current code is intended to be a O(n) algorithm that walks through
     * the string in one pass, and tries to be as cheap as possible. We don't need
     * to implement the full HTML spec, but rather simply determine where the string
     * looks like an HTML tag, and where it looks like text (so that we can autolink
     * that).
     *
     * This state machine parser is intended just to be a simple but performant
     * parser of HTML for the subset of requirements we have. We simply need to:
     *
     * 1. Determine where HTML tags are
     * 2. Determine the tag name (Autolinker specifically only cares about <a>,
     *    <script>, and <style> tags, so as not to link any text within them)
     *
     * We don't need to:
     *
     * 1. Create a parse tree
     * 2. Auto-close tags with invalid markup
     * 3. etc.
     *
     * The other intention behind this is that we didn't want to add external
     * dependencies on the Autolinker utility which would increase its size. For
     * instance, adding htmlparser2 adds 125kb to the minified output file,
     * increasing its final size from 47kb to 172kb (at the time of writing). It
     * also doesn't work exactly correctly, treating the string "<3 blah blah blah"
     * as an HTML tag.
     *
     * Reference for HTML spec:
     *
     *     https://www.w3.org/TR/html51/syntax.html#sec-tokenization
     *
     * @param {String} html The HTML to parse
     * @param {Object} callbacks
     * @param {Function} callbacks.onOpenTag Callback function to call when an open
     *   tag is parsed. Called with the tagName as its argument.
     * @param {Function} callbacks.onCloseTag Callback function to call when a close
     *   tag is parsed. Called with the tagName as its argument. If a self-closing
     *   tag is found, `onCloseTag` is called immediately after `onOpenTag`.
     * @param {Function} callbacks.onText Callback function to call when text (i.e
     *   not an HTML tag) is parsed. Called with the text (string) as its first
     *   argument, and offset (number) into the string as its second.
     */
    function parseHtml(html, _a) {
        var onOpenTag = _a.onOpenTag, onCloseTag = _a.onCloseTag, onText = _a.onText, onComment = _a.onComment, onDoctype = _a.onDoctype;
        var noCurrentTag = new CurrentTag();
        var charIdx = 0, len = html.length, state = 0 /* Data */, currentDataIdx = 0, // where the current data start index is
        currentTag = noCurrentTag; // describes the current tag that is being read
        // For debugging: search for other "For debugging" lines
        // const table = new CliTable( {
        // 	head: [ 'charIdx', 'char', 'state', 'currentDataIdx', 'currentOpenTagIdx', 'tag.type' ]
        // } );
        while (charIdx < len) {
            var char = html.charAt(charIdx);
            // For debugging: search for other "For debugging" lines
            // ALSO: Temporarily remove the 'const' keyword on the State enum
            // table.push(
            // 	[ charIdx, char, State[ state ], currentDataIdx, currentTag.idx, currentTag.idx === -1 ? '' : currentTag.type ]
            // );
            switch (state) {
                case 0 /* Data */:
                    stateData(char);
                    break;
                case 1 /* TagOpen */:
                    stateTagOpen(char);
                    break;
                case 2 /* EndTagOpen */:
                    stateEndTagOpen(char);
                    break;
                case 3 /* TagName */:
                    stateTagName(char);
                    break;
                case 4 /* BeforeAttributeName */:
                    stateBeforeAttributeName(char);
                    break;
                case 5 /* AttributeName */:
                    stateAttributeName(char);
                    break;
                case 6 /* AfterAttributeName */:
                    stateAfterAttributeName(char);
                    break;
                case 7 /* BeforeAttributeValue */:
                    stateBeforeAttributeValue(char);
                    break;
                case 8 /* AttributeValueDoubleQuoted */:
                    stateAttributeValueDoubleQuoted(char);
                    break;
                case 9 /* AttributeValueSingleQuoted */:
                    stateAttributeValueSingleQuoted(char);
                    break;
                case 10 /* AttributeValueUnquoted */:
                    stateAttributeValueUnquoted(char);
                    break;
                case 11 /* AfterAttributeValueQuoted */:
                    stateAfterAttributeValueQuoted(char);
                    break;
                case 12 /* SelfClosingStartTag */:
                    stateSelfClosingStartTag(char);
                    break;
                case 13 /* MarkupDeclarationOpenState */:
                    stateMarkupDeclarationOpen(char);
                    break;
                case 14 /* CommentStart */:
                    stateCommentStart(char);
                    break;
                case 15 /* CommentStartDash */:
                    stateCommentStartDash(char);
                    break;
                case 16 /* Comment */:
                    stateComment(char);
                    break;
                case 17 /* CommentEndDash */:
                    stateCommentEndDash(char);
                    break;
                case 18 /* CommentEnd */:
                    stateCommentEnd(char);
                    break;
                case 19 /* CommentEndBang */:
                    stateCommentEndBang(char);
                    break;
                case 20 /* Doctype */:
                    stateDoctype(char);
                    break;
                default:
                    throwUnhandledCaseError(state);
            }
            // For debugging: search for other "For debugging" lines
            // ALSO: Temporarily remove the 'const' keyword on the State enum
            // table.push(
            // 	[ charIdx, char, State[ state ], currentDataIdx, currentTag.idx, currentTag.idx === -1 ? '' : currentTag.type ]
            // );
            charIdx++;
        }
        if (currentDataIdx < charIdx) {
            emitText();
        }
        // For debugging: search for other "For debugging" lines
        // console.log( '\n' + table.toString() );
        // Called when non-tags are being read (i.e. the text around HTML †ags)
        // https://www.w3.org/TR/html51/syntax.html#data-state
        function stateData(char) {
            if (char === '<') {
                startNewTag();
            }
        }
        // Called after a '<' is read from the Data state
        // https://www.w3.org/TR/html51/syntax.html#tag-open-state
        function stateTagOpen(char) {
            if (char === '!') {
                state = 13 /* MarkupDeclarationOpenState */;
            }
            else if (char === '/') {
                state = 2 /* EndTagOpen */;
                currentTag = new CurrentTag(__assign({}, currentTag, { isClosing: true }));
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else if (letterRe.test(char)) {
                // tag name start (and no '/' read)
                state = 3 /* TagName */;
                currentTag = new CurrentTag(__assign({}, currentTag, { isOpening: true }));
            }
            else {
                // Any other
                state = 0 /* Data */;
                currentTag = noCurrentTag;
            }
        }
        // After a '<x', '</x' sequence is read (where 'x' is a letter character),
        // this is to continue reading the tag name
        // https://www.w3.org/TR/html51/syntax.html#tag-name-state
        function stateTagName(char) {
            if (whitespaceRe.test(char)) {
                currentTag = new CurrentTag(__assign({}, currentTag, { name: captureTagName() }));
                state = 4 /* BeforeAttributeName */;
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else if (char === '/') {
                currentTag = new CurrentTag(__assign({}, currentTag, { name: captureTagName() }));
                state = 12 /* SelfClosingStartTag */;
            }
            else if (char === '>') {
                currentTag = new CurrentTag(__assign({}, currentTag, { name: captureTagName() }));
                emitTagAndPreviousTextNode(); // resets to Data state as well
            }
            else if (!letterRe.test(char) && !digitRe.test(char) && char !== ':') {
                // Anything else that does not form an html tag. Note: the colon
                // character is accepted for XML namespaced tags
                resetToDataState();
            }
        }
        // Called after the '/' is read from a '</' sequence
        // https://www.w3.org/TR/html51/syntax.html#end-tag-open-state
        function stateEndTagOpen(char) {
            if (char === '>') { // parse error. Encountered "</>". Skip it without treating as a tag
                resetToDataState();
            }
            else if (letterRe.test(char)) {
                state = 3 /* TagName */;
            }
            else {
                // some other non-tag-like character, don't treat this as a tag
                resetToDataState();
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#before-attribute-name-state
        function stateBeforeAttributeName(char) {
            if (whitespaceRe.test(char)) ;
            else if (char === '/') {
                state = 12 /* SelfClosingStartTag */;
            }
            else if (char === '>') {
                emitTagAndPreviousTextNode(); // resets to Data state as well
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else if (char === "=" || quoteRe.test(char) || controlCharsRe.test(char)) {
                // "Parse error" characters that, according to the spec, should be
                // appended to the attribute name, but we'll treat these characters
                // as not forming a real HTML tag
                resetToDataState();
            }
            else {
                // Any other char, start of a new attribute name
                state = 5 /* AttributeName */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#attribute-name-state
        function stateAttributeName(char) {
            if (whitespaceRe.test(char)) {
                state = 6 /* AfterAttributeName */;
            }
            else if (char === '/') {
                state = 12 /* SelfClosingStartTag */;
            }
            else if (char === '=') {
                state = 7 /* BeforeAttributeValue */;
            }
            else if (char === '>') {
                emitTagAndPreviousTextNode(); // resets to Data state as well
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else if (quoteRe.test(char)) {
                // "Parse error" characters that, according to the spec, should be
                // appended to the attribute name, but we'll treat these characters
                // as not forming a real HTML tag
                resetToDataState();
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#after-attribute-name-state
        function stateAfterAttributeName(char) {
            if (whitespaceRe.test(char)) ;
            else if (char === '/') {
                state = 12 /* SelfClosingStartTag */;
            }
            else if (char === '=') {
                state = 7 /* BeforeAttributeValue */;
            }
            else if (char === '>') {
                emitTagAndPreviousTextNode();
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else if (quoteRe.test(char)) {
                // "Parse error" characters that, according to the spec, should be
                // appended to the attribute name, but we'll treat these characters
                // as not forming a real HTML tag
                resetToDataState();
            }
            else {
                // Any other character, start a new attribute in the current tag
                state = 5 /* AttributeName */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#before-attribute-value-state
        function stateBeforeAttributeValue(char) {
            if (whitespaceRe.test(char)) ;
            else if (char === "\"") {
                state = 8 /* AttributeValueDoubleQuoted */;
            }
            else if (char === "'") {
                state = 9 /* AttributeValueSingleQuoted */;
            }
            else if (/[>=`]/.test(char)) {
                // Invalid chars after an '=' for an attribute value, don't count
                // the current tag as an HTML tag
                resetToDataState();
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else {
                // Any other character, consider it an unquoted attribute value
                state = 10 /* AttributeValueUnquoted */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#attribute-value-double-quoted-state
        function stateAttributeValueDoubleQuoted(char) {
            if (char === "\"") { // end the current double-quoted attribute
                state = 11 /* AfterAttributeValueQuoted */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#attribute-value-single-quoted-state
        function stateAttributeValueSingleQuoted(char) {
            if (char === "'") { // end the current single-quoted attribute
                state = 11 /* AfterAttributeValueQuoted */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#attribute-value-unquoted-state
        function stateAttributeValueUnquoted(char) {
            if (whitespaceRe.test(char)) {
                state = 4 /* BeforeAttributeName */;
            }
            else if (char === '>') {
                emitTagAndPreviousTextNode();
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#after-attribute-value-quoted-state
        function stateAfterAttributeValueQuoted(char) {
            if (whitespaceRe.test(char)) {
                state = 4 /* BeforeAttributeName */;
            }
            else if (char === '/') {
                state = 12 /* SelfClosingStartTag */;
            }
            else if (char === '>') {
                emitTagAndPreviousTextNode();
            }
            else if (char === '<') {
                // start of another tag (ignore the previous, incomplete one)
                startNewTag();
            }
            else {
                // Any other character, "parse error". Spec says to switch to the
                // BeforeAttributeState and re-consume the character, as it may be
                // the start of a new attribute name
                state = 4 /* BeforeAttributeName */;
                reconsumeCurrentCharacter();
            }
        }
        // A '/' has just been read in the current tag (presumably for '/>'), and
        // this handles the next character
        // https://www.w3.org/TR/html51/syntax.html#self-closing-start-tag-state
        function stateSelfClosingStartTag(char) {
            if (char === '>') {
                currentTag = new CurrentTag(__assign({}, currentTag, { isClosing: true }));
                emitTagAndPreviousTextNode(); // resets to Data state as well
            }
            else {
                state = 4 /* BeforeAttributeName */;
            }
        }
        // https://www.w3.org/TR/html51/syntax.html#markup-declaration-open-state
        // (HTML Comments or !DOCTYPE)
        function stateMarkupDeclarationOpen(char) {
            if (html.substr(charIdx, 2) === '--') { // html comment
                charIdx += 2; // "consume" characters
                currentTag = new CurrentTag(__assign({}, currentTag, { type: 'comment' }));
                state = 14 /* CommentStart */;
            }
            else if (html.substr(charIdx, 7).toUpperCase() === 'DOCTYPE') {
                charIdx += 7; // "consume" characters
                currentTag = new CurrentTag(__assign({}, currentTag, { type: 'doctype' }));
                state = 20 /* Doctype */;
            }
            else {
                // At this point, the spec specifies that the state machine should
                // enter the "bogus comment" state, in which case any character(s)
                // after the '<!' that were read should become an HTML comment up
                // until the first '>' that is read (or EOF). Instead, we'll assume
                // that a user just typed '<!' as part of text data
                resetToDataState();
            }
        }
        // Handles after the sequence '<!--' has been read
        // https://www.w3.org/TR/html51/syntax.html#comment-start-state
        function stateCommentStart(char) {
            if (char === '-') {
                // We've read the sequence '<!---' at this point (3 dashes)
                state = 15 /* CommentStartDash */;
            }
            else if (char === '>') {
                // At this point, we'll assume the comment wasn't a real comment
                // so we'll just emit it as data. We basically read the sequence
                // '<!-->'
                resetToDataState();
            }
            else {
                // Any other char, take it as part of the comment
                state = 16 /* Comment */;
            }
        }
        // We've read the sequence '<!---' at this point (3 dashes)
        // https://www.w3.org/TR/html51/syntax.html#comment-start-dash-state
        function stateCommentStartDash(char) {
            if (char === '-') {
                // We've read '<!----' (4 dashes) at this point
                state = 18 /* CommentEnd */;
            }
            else if (char === '>') {
                // At this point, we'll assume the comment wasn't a real comment
                // so we'll just emit it as data. We basically read the sequence
                // '<!--->'
                resetToDataState();
            }
            else {
                // Anything else, take it as a valid comment
                state = 16 /* Comment */;
            }
        }
        // Currently reading the comment's text (data)
        // https://www.w3.org/TR/html51/syntax.html#comment-state
        function stateComment(char) {
            if (char === '-') {
                state = 17 /* CommentEndDash */;
            }
        }
        // When we we've read the first dash inside a comment, it may signal the
        // end of the comment if we read another dash
        // https://www.w3.org/TR/html51/syntax.html#comment-end-dash-state
        function stateCommentEndDash(char) {
            if (char === '-') {
                state = 18 /* CommentEnd */;
            }
            else {
                // Wasn't a dash, must still be part of the comment
                state = 16 /* Comment */;
            }
        }
        // After we've read two dashes inside a comment, it may signal the end of
        // the comment if we then read a '>' char
        // https://www.w3.org/TR/html51/syntax.html#comment-end-state
        function stateCommentEnd(char) {
            if (char === '>') {
                emitTagAndPreviousTextNode();
            }
            else if (char === '!') {
                state = 19 /* CommentEndBang */;
            }
            else if (char === '-') ;
            else {
                // Anything else, switch back to the comment state since we didn't
                // read the full "end comment" sequence (i.e. '-->')
                state = 16 /* Comment */;
            }
        }
        // We've read the sequence '--!' inside of a comment
        // https://www.w3.org/TR/html51/syntax.html#comment-end-bang-state
        function stateCommentEndBang(char) {
            if (char === '-') {
                // We read the sequence '--!-' inside of a comment. The last dash
                // could signify that the comment is going to close
                state = 17 /* CommentEndDash */;
            }
            else if (char === '>') {
                // End of comment with the sequence '--!>'
                emitTagAndPreviousTextNode();
            }
            else {
                // The '--!' was not followed by a '>', continue reading the
                // comment's text
                state = 16 /* Comment */;
            }
        }
        /**
         * For DOCTYPES in particular, we don't care about the attributes. Just
         * advance to the '>' character and emit the tag, unless we find a '<'
         * character in which case we'll start a new tag.
         *
         * Example doctype tag:
         *    <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
         *
         * Actual spec: https://www.w3.org/TR/html51/syntax.html#doctype-state
         */
        function stateDoctype(char) {
            if (char === '>') {
                emitTagAndPreviousTextNode();
            }
            else if (char === '<') {
                startNewTag();
            }
        }
        /**
         * Resets the state back to the Data state, and removes the current tag.
         *
         * We'll generally run this function whenever a "parse error" is
         * encountered, where the current tag that is being read no longer looks
         * like a real HTML tag.
         */
        function resetToDataState() {
            state = 0 /* Data */;
            currentTag = noCurrentTag;
        }
        /**
         * Starts a new HTML tag at the current index, ignoring any previous HTML
         * tag that was being read.
         *
         * We'll generally run this function whenever we read a new '<' character,
         * including when we read a '<' character inside of an HTML tag that we were
         * previously reading.
         */
        function startNewTag() {
            state = 1 /* TagOpen */;
            currentTag = new CurrentTag({ idx: charIdx });
        }
        /**
         * Once we've decided to emit an open tag, that means we can also emit the
         * text node before it.
         */
        function emitTagAndPreviousTextNode() {
            var textBeforeTag = html.slice(currentDataIdx, currentTag.idx);
            if (textBeforeTag) {
                // the html tag was the first element in the html string, or two
                // tags next to each other, in which case we should not emit a text
                // node
                onText(textBeforeTag, currentDataIdx);
            }
            if (currentTag.type === 'comment') {
                onComment(currentTag.idx);
            }
            else if (currentTag.type === 'doctype') {
                onDoctype(currentTag.idx);
            }
            else {
                if (currentTag.isOpening) {
                    onOpenTag(currentTag.name, currentTag.idx);
                }
                if (currentTag.isClosing) { // note: self-closing tags will emit both opening and closing
                    onCloseTag(currentTag.name, currentTag.idx);
                }
            }
            // Since we just emitted a tag, reset to the data state for the next char
            resetToDataState();
            currentDataIdx = charIdx + 1;
        }
        function emitText() {
            var text = html.slice(currentDataIdx, charIdx);
            onText(text, currentDataIdx);
            currentDataIdx = charIdx + 1;
        }
        /**
         * Captures the tag name from the start of the tag to the current character
         * index, and converts it to lower case
         */
        function captureTagName() {
            var startIdx = currentTag.idx + (currentTag.isClosing ? 2 : 1);
            return html.slice(startIdx, charIdx).toLowerCase();
        }
        /**
         * Causes the main loop to re-consume the current character, such as after
         * encountering a "parse error" that changed state and needs to reconsume
         * the same character in that new state.
         */
        function reconsumeCurrentCharacter() {
            charIdx--;
        }
    }
    var CurrentTag = /** @class */ (function () {
        function CurrentTag(cfg) {
            if (cfg === void 0) { cfg = {}; }
            this.idx = cfg.idx !== undefined ? cfg.idx : -1;
            this.type = cfg.type || 'tag';
            this.name = cfg.name || '';
            this.isOpening = !!cfg.isOpening;
            this.isClosing = !!cfg.isClosing;
        }
        return CurrentTag;
    }());

    /**
     * @class Autolinker
     * @extends Object
     *
     * Utility class used to process a given string of text, and wrap the matches in
     * the appropriate anchor (&lt;a&gt;) tags to turn them into links.
     *
     * Any of the configuration options may be provided in an Object provided
     * to the Autolinker constructor, which will configure how the {@link #link link()}
     * method will process the links.
     *
     * For example:
     *
     *     var autolinker = new Autolinker( {
     *         newWindow : false,
     *         truncate  : 30
     *     } );
     *
     *     var html = autolinker.link( "Joe went to www.yahoo.com" );
     *     // produces: 'Joe went to <a href="http://www.yahoo.com">yahoo.com</a>'
     *
     *
     * The {@link #static-link static link()} method may also be used to inline
     * options into a single call, which may be more convenient for one-off uses.
     * For example:
     *
     *     var html = Autolinker.link( "Joe went to www.yahoo.com", {
     *         newWindow : false,
     *         truncate  : 30
     *     } );
     *     // produces: 'Joe went to <a href="http://www.yahoo.com">yahoo.com</a>'
     *
     *
     * ## Custom Replacements of Links
     *
     * If the configuration options do not provide enough flexibility, a {@link #replaceFn}
     * may be provided to fully customize the output of Autolinker. This function is
     * called once for each URL/Email/Phone#/Hashtag/Mention (Twitter, Instagram, Soundcloud)
     * match that is encountered.
     *
     * For example:
     *
     *     var input = "...";  // string with URLs, Email Addresses, Phone #s, Hashtags, and Mentions (Twitter, Instagram, Soundcloud)
     *
     *     var linkedText = Autolinker.link( input, {
     *         replaceFn : function( match ) {
     *             console.log( "href = ", match.getAnchorHref() );
     *             console.log( "text = ", match.getAnchorText() );
     *
     *             switch( match.getType() ) {
     *                 case 'url' :
     *                     console.log( "url: ", match.getUrl() );
     *
     *                     if( match.getUrl().indexOf( 'mysite.com' ) === -1 ) {
     *                         var tag = match.buildTag();  // returns an `Autolinker.HtmlTag` instance, which provides mutator methods for easy changes
     *                         tag.setAttr( 'rel', 'nofollow' );
     *                         tag.addClass( 'external-link' );
     *
     *                         return tag;
     *
     *                     } else {
     *                         return true;  // let Autolinker perform its normal anchor tag replacement
     *                     }
     *
     *                 case 'email' :
     *                     var email = match.getEmail();
     *                     console.log( "email: ", email );
     *
     *                     if( email === "my@own.address" ) {
     *                         return false;  // don't auto-link this particular email address; leave as-is
     *                     } else {
     *                         return;  // no return value will have Autolinker perform its normal anchor tag replacement (same as returning `true`)
     *                     }
     *
     *                 case 'phone' :
     *                     var phoneNumber = match.getPhoneNumber();
     *                     console.log( phoneNumber );
     *
     *                     return '<a href="http://newplace.to.link.phone.numbers.to/">' + phoneNumber + '</a>';
     *
     *                 case 'hashtag' :
     *                     var hashtag = match.getHashtag();
     *                     console.log( hashtag );
     *
     *                     return '<a href="http://newplace.to.link.hashtag.handles.to/">' + hashtag + '</a>';
     *
     *                 case 'mention' :
     *                     var mention = match.getMention();
     *                     console.log( mention );
     *
     *                     return '<a href="http://newplace.to.link.mention.to/">' + mention + '</a>';
     *             }
     *         }
     *     } );
     *
     *
     * The function may return the following values:
     *
     * - `true` (Boolean): Allow Autolinker to replace the match as it normally
     *   would.
     * - `false` (Boolean): Do not replace the current match at all - leave as-is.
     * - Any String: If a string is returned from the function, the string will be
     *   used directly as the replacement HTML for the match.
     * - An {@link Autolinker.HtmlTag} instance, which can be used to build/modify
     *   an HTML tag before writing out its HTML text.
     */
    var Autolinker = /** @class */ (function () {
        /**
         * @method constructor
         * @param {Object} [cfg] The configuration options for the Autolinker instance,
         *   specified in an Object (map).
         */
        function Autolinker(cfg) {
            if (cfg === void 0) { cfg = {}; }
            /**
             * The Autolinker version number exposed on the instance itself.
             *
             * Ex: 0.25.1
             */
            this.version = Autolinker.version;
            /**
             * @cfg {Boolean/Object} [urls]
             *
             * `true` if URLs should be automatically linked, `false` if they should not
             * be. Defaults to `true`.
             *
             * Examples:
             *
             *     urls: true
             *
             *     // or
             *
             *     urls: {
             *         schemeMatches : true,
             *         wwwMatches    : true,
             *         tldMatches    : true
             *     }
             *
             * As shown above, this option also accepts an Object form with 3 properties
             * to allow for more customization of what exactly gets linked. All default
             * to `true`:
             *
             * @cfg {Boolean} [urls.schemeMatches] `true` to match URLs found prefixed
             *   with a scheme, i.e. `http://google.com`, or `other+scheme://google.com`,
             *   `false` to prevent these types of matches.
             * @cfg {Boolean} [urls.wwwMatches] `true` to match urls found prefixed with
             *   `'www.'`, i.e. `www.google.com`. `false` to prevent these types of
             *   matches. Note that if the URL had a prefixed scheme, and
             *   `schemeMatches` is true, it will still be linked.
             * @cfg {Boolean} [urls.tldMatches] `true` to match URLs with known top
             *   level domains (.com, .net, etc.) that are not prefixed with a scheme or
             *   `'www.'`. This option attempts to match anything that looks like a URL
             *   in the given text. Ex: `google.com`, `asdf.org/?page=1`, etc. `false`
             *   to prevent these types of matches.
             */
            this.urls = {}; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [email=true]
             *
             * `true` if email addresses should be automatically linked, `false` if they
             * should not be.
             */
            this.email = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [phone=true]
             *
             * `true` if Phone numbers ("(555)555-5555") should be automatically linked,
             * `false` if they should not be.
             */
            this.phone = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean/String} [hashtag=false]
             *
             * A string for the service name to have hashtags (ex: "#myHashtag")
             * auto-linked to. The currently-supported values are:
             *
             * - 'twitter'
             * - 'facebook'
             * - 'instagram'
             *
             * Pass `false` to skip auto-linking of hashtags.
             */
            this.hashtag = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String/Boolean} [mention=false]
             *
             * A string for the service name to have mentions (ex: "@myuser")
             * auto-linked to. The currently supported values are:
             *
             * - 'twitter'
             * - 'instagram'
             * - 'soundcloud'
             *
             * Defaults to `false` to skip auto-linking of mentions.
             */
            this.mention = false; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [newWindow=true]
             *
             * `true` if the links should open in a new window, `false` otherwise.
             */
            this.newWindow = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean/Object} [stripPrefix=true]
             *
             * `true` if 'http://' (or 'https://') and/or the 'www.' should be stripped
             * from the beginning of URL links' text, `false` otherwise. Defaults to
             * `true`.
             *
             * Examples:
             *
             *     stripPrefix: true
             *
             *     // or
             *
             *     stripPrefix: {
             *         scheme : true,
             *         www    : true
             *     }
             *
             * As shown above, this option also accepts an Object form with 2 properties
             * to allow for more customization of what exactly is prevented from being
             * displayed. Both default to `true`:
             *
             * @cfg {Boolean} [stripPrefix.scheme] `true` to prevent the scheme part of
             *   a URL match from being displayed to the user. Example:
             *   `'http://google.com'` will be displayed as `'google.com'`. `false` to
             *   not strip the scheme. NOTE: Only an `'http://'` or `'https://'` scheme
             *   will be removed, so as not to remove a potentially dangerous scheme
             *   (such as `'file://'` or `'javascript:'`)
             * @cfg {Boolean} [stripPrefix.www] www (Boolean): `true` to prevent the
             *   `'www.'` part of a URL match from being displayed to the user. Ex:
             *   `'www.google.com'` will be displayed as `'google.com'`. `false` to not
             *   strip the `'www'`.
             */
            this.stripPrefix = { scheme: true, www: true }; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [stripTrailingSlash=true]
             *
             * `true` to remove the trailing slash from URL matches, `false` to keep
             *  the trailing slash.
             *
             *  Example when `true`: `http://google.com/` will be displayed as
             *  `http://google.com`.
             */
            this.stripTrailingSlash = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Boolean} [decodePercentEncoding=true]
             *
             * `true` to decode percent-encoded characters in URL matches, `false` to keep
             *  the percent-encoded characters.
             *
             *  Example when `true`: `https://en.wikipedia.org/wiki/San_Jos%C3%A9` will
             *  be displayed as `https://en.wikipedia.org/wiki/San_José`.
             */
            this.decodePercentEncoding = true; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Number/Object} [truncate=0]
             *
             * ## Number Form
             *
             * A number for how many characters matched text should be truncated to
             * inside the text of a link. If the matched text is over this number of
             * characters, it will be truncated to this length by adding a two period
             * ellipsis ('..') to the end of the string.
             *
             * For example: A url like 'http://www.yahoo.com/some/long/path/to/a/file'
             * truncated to 25 characters might look something like this:
             * 'yahoo.com/some/long/pat..'
             *
             * Example Usage:
             *
             *     truncate: 25
             *
             *
             *  Defaults to `0` for "no truncation."
             *
             *
             * ## Object Form
             *
             * An Object may also be provided with two properties: `length` (Number) and
             * `location` (String). `location` may be one of the following: 'end'
             * (default), 'middle', or 'smart'.
             *
             * Example Usage:
             *
             *     truncate: { length: 25, location: 'middle' }
             *
             * @cfg {Number} [truncate.length=0] How many characters to allow before
             *   truncation will occur. Defaults to `0` for "no truncation."
             * @cfg {"end"/"middle"/"smart"} [truncate.location="end"]
             *
             * - 'end' (default): will truncate up to the number of characters, and then
             *   add an ellipsis at the end. Ex: 'yahoo.com/some/long/pat..'
             * - 'middle': will truncate and add the ellipsis in the middle. Ex:
             *   'yahoo.com/s..th/to/a/file'
             * - 'smart': for URLs where the algorithm attempts to strip out unnecessary
             *   parts first (such as the 'www.', then URL scheme, hash, etc.),
             *   attempting to make the URL human-readable before looking for a good
             *   point to insert the ellipsis if it is still too long. Ex:
             *   'yahoo.com/some..to/a/file'. For more details, see
             *   {@link Autolinker.truncate.TruncateSmart}.
             */
            this.truncate = { length: 0, location: 'end' }; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {String} className
             *
             * A CSS class name to add to the generated links. This class will be added
             * to all links, as well as this class plus match suffixes for styling
             * url/email/phone/hashtag/mention links differently.
             *
             * For example, if this config is provided as "myLink", then:
             *
             * - URL links will have the CSS classes: "myLink myLink-url"
             * - Email links will have the CSS classes: "myLink myLink-email", and
             * - Phone links will have the CSS classes: "myLink myLink-phone"
             * - Hashtag links will have the CSS classes: "myLink myLink-hashtag"
             * - Mention links will have the CSS classes: "myLink myLink-mention myLink-[type]"
             *   where [type] is either "instagram", "twitter" or "soundcloud"
             */
            this.className = ''; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Function} replaceFn
             *
             * A function to individually process each match found in the input string.
             *
             * See the class's description for usage.
             *
             * The `replaceFn` can be called with a different context object (`this`
             * reference) using the {@link #context} cfg.
             *
             * This function is called with the following parameter:
             *
             * @cfg {Autolinker.match.Match} replaceFn.match The Match instance which
             *   can be used to retrieve information about the match that the `replaceFn`
             *   is currently processing. See {@link Autolinker.match.Match} subclasses
             *   for details.
             */
            this.replaceFn = null; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @cfg {Object} context
             *
             * The context object (`this` reference) to call the `replaceFn` with.
             *
             * Defaults to this Autolinker instance.
             */
            this.context = undefined; // default value just to get the above doc comment in the ES5 output and documentation generator
            /**
             * @private
             * @property {Autolinker.matcher.Matcher[]} matchers
             *
             * The {@link Autolinker.matcher.Matcher} instances for this Autolinker
             * instance.
             *
             * This is lazily created in {@link #getMatchers}.
             */
            this.matchers = null;
            /**
             * @private
             * @property {Autolinker.AnchorTagBuilder} tagBuilder
             *
             * The AnchorTagBuilder instance used to build match replacement anchor tags.
             * Note: this is lazily instantiated in the {@link #getTagBuilder} method.
             */
            this.tagBuilder = null;
            // Note: when `this.something` is used in the rhs of these assignments,
            //       it refers to the default values set above the constructor
            this.urls = this.normalizeUrlsCfg(cfg.urls);
            this.email = typeof cfg.email === 'boolean' ? cfg.email : this.email;
            this.phone = typeof cfg.phone === 'boolean' ? cfg.phone : this.phone;
            this.hashtag = cfg.hashtag || this.hashtag;
            this.mention = cfg.mention || this.mention;
            this.newWindow = typeof cfg.newWindow === 'boolean' ? cfg.newWindow : this.newWindow;
            this.stripPrefix = this.normalizeStripPrefixCfg(cfg.stripPrefix);
            this.stripTrailingSlash = typeof cfg.stripTrailingSlash === 'boolean' ? cfg.stripTrailingSlash : this.stripTrailingSlash;
            this.decodePercentEncoding = typeof cfg.decodePercentEncoding === 'boolean' ? cfg.decodePercentEncoding : this.decodePercentEncoding;
            // Validate the value of the `mention` cfg
            var mention = this.mention;
            if (mention !== false && mention !== 'twitter' && mention !== 'instagram' && mention !== 'soundcloud') {
                throw new Error("invalid `mention` cfg - see docs");
            }
            // Validate the value of the `hashtag` cfg
            var hashtag = this.hashtag;
            if (hashtag !== false && hashtag !== 'twitter' && hashtag !== 'facebook' && hashtag !== 'instagram') {
                throw new Error("invalid `hashtag` cfg - see docs");
            }
            this.truncate = this.normalizeTruncateCfg(cfg.truncate);
            this.className = cfg.className || this.className;
            this.replaceFn = cfg.replaceFn || this.replaceFn;
            this.context = cfg.context || this;
        }
        /**
         * Automatically links URLs, Email addresses, Phone Numbers, Twitter handles,
         * Hashtags, and Mentions found in the given chunk of HTML. Does not link URLs
         * found within HTML tags.
         *
         * For instance, if given the text: `You should go to http://www.yahoo.com`,
         * then the result will be `You should go to &lt;a href="http://www.yahoo.com"&gt;http://www.yahoo.com&lt;/a&gt;`
         *
         * Example:
         *
         *     var linkedText = Autolinker.link( "Go to google.com", { newWindow: false } );
         *     // Produces: "Go to <a href="http://google.com">google.com</a>"
         *
         * @static
         * @param {String} textOrHtml The HTML or text to find matches within (depending
         *   on if the {@link #urls}, {@link #email}, {@link #phone}, {@link #mention},
         *   {@link #hashtag}, and {@link #mention} options are enabled).
         * @param {Object} [options] Any of the configuration options for the Autolinker
         *   class, specified in an Object (map). See the class description for an
         *   example call.
         * @return {String} The HTML text, with matches automatically linked.
         */
        Autolinker.link = function (textOrHtml, options) {
            var autolinker = new Autolinker(options);
            return autolinker.link(textOrHtml);
        };
        /**
         * Parses the input `textOrHtml` looking for URLs, email addresses, phone
         * numbers, username handles, and hashtags (depending on the configuration
         * of the Autolinker instance), and returns an array of {@link Autolinker.match.Match}
         * objects describing those matches (without making any replacements).
         *
         * Note that if parsing multiple pieces of text, it is slightly more efficient
         * to create an Autolinker instance, and use the instance-level {@link #parse}
         * method.
         *
         * Example:
         *
         *     var matches = Autolinker.parse( "Hello google.com, I am asdf@asdf.com", {
         *         urls: true,
         *         email: true
         *     } );
         *
         *     console.log( matches.length );           // 2
         *     console.log( matches[ 0 ].getType() );   // 'url'
         *     console.log( matches[ 0 ].getUrl() );    // 'google.com'
         *     console.log( matches[ 1 ].getType() );   // 'email'
         *     console.log( matches[ 1 ].getEmail() );  // 'asdf@asdf.com'
         *
         * @static
         * @param {String} textOrHtml The HTML or text to find matches within
         *   (depending on if the {@link #urls}, {@link #email}, {@link #phone},
         *   {@link #hashtag}, and {@link #mention} options are enabled).
         * @param {Object} [options] Any of the configuration options for the Autolinker
         *   class, specified in an Object (map). See the class description for an
         *   example call.
         * @return {Autolinker.match.Match[]} The array of Matches found in the
         *   given input `textOrHtml`.
         */
        Autolinker.parse = function (textOrHtml, options) {
            var autolinker = new Autolinker(options);
            return autolinker.parse(textOrHtml);
        };
        /**
         * Normalizes the {@link #urls} config into an Object with 3 properties:
         * `schemeMatches`, `wwwMatches`, and `tldMatches`, all Booleans.
         *
         * See {@link #urls} config for details.
         *
         * @private
         * @param {Boolean/Object} urls
         * @return {Object}
         */
        Autolinker.prototype.normalizeUrlsCfg = function (urls) {
            if (urls == null)
                urls = true; // default to `true`
            if (typeof urls === 'boolean') {
                return { schemeMatches: urls, wwwMatches: urls, tldMatches: urls };
            }
            else { // object form
                return {
                    schemeMatches: typeof urls.schemeMatches === 'boolean' ? urls.schemeMatches : true,
                    wwwMatches: typeof urls.wwwMatches === 'boolean' ? urls.wwwMatches : true,
                    tldMatches: typeof urls.tldMatches === 'boolean' ? urls.tldMatches : true
                };
            }
        };
        /**
         * Normalizes the {@link #stripPrefix} config into an Object with 2
         * properties: `scheme`, and `www` - both Booleans.
         *
         * See {@link #stripPrefix} config for details.
         *
         * @private
         * @param {Boolean/Object} stripPrefix
         * @return {Object}
         */
        Autolinker.prototype.normalizeStripPrefixCfg = function (stripPrefix) {
            if (stripPrefix == null)
                stripPrefix = true; // default to `true`
            if (typeof stripPrefix === 'boolean') {
                return { scheme: stripPrefix, www: stripPrefix };
            }
            else { // object form
                return {
                    scheme: typeof stripPrefix.scheme === 'boolean' ? stripPrefix.scheme : true,
                    www: typeof stripPrefix.www === 'boolean' ? stripPrefix.www : true
                };
            }
        };
        /**
         * Normalizes the {@link #truncate} config into an Object with 2 properties:
         * `length` (Number), and `location` (String).
         *
         * See {@link #truncate} config for details.
         *
         * @private
         * @param {Number/Object} truncate
         * @return {Object}
         */
        Autolinker.prototype.normalizeTruncateCfg = function (truncate) {
            if (typeof truncate === 'number') {
                return { length: truncate, location: 'end' };
            }
            else { // object, or undefined/null
                return defaults(truncate || {}, {
                    length: Number.POSITIVE_INFINITY,
                    location: 'end'
                });
            }
        };
        /**
         * Parses the input `textOrHtml` looking for URLs, email addresses, phone
         * numbers, username handles, and hashtags (depending on the configuration
         * of the Autolinker instance), and returns an array of {@link Autolinker.match.Match}
         * objects describing those matches (without making any replacements).
         *
         * This method is used by the {@link #link} method, but can also be used to
         * simply do parsing of the input in order to discover what kinds of links
         * there are and how many.
         *
         * Example usage:
         *
         *     var autolinker = new Autolinker( {
         *         urls: true,
         *         email: true
         *     } );
         *
         *     var matches = autolinker.parse( "Hello google.com, I am asdf@asdf.com" );
         *
         *     console.log( matches.length );           // 2
         *     console.log( matches[ 0 ].getType() );   // 'url'
         *     console.log( matches[ 0 ].getUrl() );    // 'google.com'
         *     console.log( matches[ 1 ].getType() );   // 'email'
         *     console.log( matches[ 1 ].getEmail() );  // 'asdf@asdf.com'
         *
         * @param {String} textOrHtml The HTML or text to find matches within
         *   (depending on if the {@link #urls}, {@link #email}, {@link #phone},
         *   {@link #hashtag}, and {@link #mention} options are enabled).
         * @return {Autolinker.match.Match[]} The array of Matches found in the
         *   given input `textOrHtml`.
         */
        Autolinker.prototype.parse = function (textOrHtml) {
            var _this = this;
            var skipTagNames = ['a', 'style', 'script'], skipTagsStackCount = 0, // used to only Autolink text outside of anchor/script/style tags. We don't want to autolink something that is already linked inside of an <a> tag, for instance
            matches = [];
            // Find all matches within the `textOrHtml` (but not matches that are
            // already nested within <a>, <style> and <script> tags)
            parseHtml(textOrHtml, {
                onOpenTag: function (tagName) {
                    if (skipTagNames.indexOf(tagName) >= 0) {
                        skipTagsStackCount++;
                    }
                },
                onText: function (text, offset) {
                    // Only process text nodes that are not within an <a>, <style> or <script> tag
                    if (skipTagsStackCount === 0) {
                        // "Walk around" common HTML entities. An '&nbsp;' (for example)
                        // could be at the end of a URL, but we don't want to
                        // include the trailing '&' in the URL. See issue #76
                        // TODO: Handle HTML entities separately in parseHtml() and
                        // don't emit them as "text" except for &amp; entities
                        var htmlCharacterEntitiesRegex = /(&nbsp;|&#160;|&lt;|&#60;|&gt;|&#62;|&quot;|&#34;|&#39;)/gi;
                        var textSplit = splitAndCapture(text, htmlCharacterEntitiesRegex);
                        var currentOffset_1 = offset;
                        textSplit.forEach(function (splitText, i) {
                            // even number matches are text, odd numbers are html entities
                            if (i % 2 === 0) {
                                var textNodeMatches = _this.parseText(splitText, currentOffset_1);
                                matches.push.apply(matches, textNodeMatches);
                            }
                            currentOffset_1 += splitText.length;
                        });
                    }
                },
                onCloseTag: function (tagName) {
                    if (skipTagNames.indexOf(tagName) >= 0) {
                        skipTagsStackCount = Math.max(skipTagsStackCount - 1, 0); // attempt to handle extraneous </a> tags by making sure the stack count never goes below 0
                    }
                },
                onComment: function (offset) { },
                onDoctype: function (offset) { },
            });
            // After we have found all matches, remove subsequent matches that
            // overlap with a previous match. This can happen for instance with URLs,
            // where the url 'google.com/#link' would match '#link' as a hashtag.
            matches = this.compactMatches(matches);
            // And finally, remove matches for match types that have been turned
            // off. We needed to have all match types turned on initially so that
            // things like hashtags could be filtered out if they were really just
            // part of a URL match (for instance, as a named anchor).
            matches = this.removeUnwantedMatches(matches);
            return matches;
        };
        /**
         * After we have found all matches, we need to remove matches that overlap
         * with a previous match. This can happen for instance with URLs, where the
         * url 'google.com/#link' would match '#link' as a hashtag. Because the
         * '#link' part is contained in a larger match that comes before the HashTag
         * match, we'll remove the HashTag match.
         *
         * @private
         * @param {Autolinker.match.Match[]} matches
         * @return {Autolinker.match.Match[]}
         */
        Autolinker.prototype.compactMatches = function (matches) {
            // First, the matches need to be sorted in order of offset
            matches.sort(function (a, b) { return a.getOffset() - b.getOffset(); });
            for (var i = 0; i < matches.length - 1; i++) {
                var match = matches[i], offset = match.getOffset(), matchedTextLength = match.getMatchedText().length, endIdx = offset + matchedTextLength;
                if (i + 1 < matches.length) {
                    // Remove subsequent matches that equal offset with current match
                    if (matches[i + 1].getOffset() === offset) {
                        var removeIdx = matches[i + 1].getMatchedText().length > matchedTextLength ? i : i + 1;
                        matches.splice(removeIdx, 1);
                        continue;
                    }
                    // Remove subsequent matches that overlap with the current match
                    if (matches[i + 1].getOffset() < endIdx) {
                        matches.splice(i + 1, 1);
                    }
                }
            }
            return matches;
        };
        /**
         * Removes matches for matchers that were turned off in the options. For
         * example, if {@link #hashtag hashtags} were not to be matched, we'll
         * remove them from the `matches` array here.
         *
         * Note: we *must* use all Matchers on the input string, and then filter
         * them out later. For example, if the options were `{ url: false, hashtag: true }`,
         * we wouldn't want to match the text '#link' as a HashTag inside of the text
         * 'google.com/#link'. The way the algorithm works is that we match the full
         * URL first (which prevents the accidental HashTag match), and then we'll
         * simply throw away the URL match.
         *
         * @private
         * @param {Autolinker.match.Match[]} matches The array of matches to remove
         *   the unwanted matches from. Note: this array is mutated for the
         *   removals.
         * @return {Autolinker.match.Match[]} The mutated input `matches` array.
         */
        Autolinker.prototype.removeUnwantedMatches = function (matches) {
            if (!this.hashtag)
                remove(matches, function (match) { return match.getType() === 'hashtag'; });
            if (!this.email)
                remove(matches, function (match) { return match.getType() === 'email'; });
            if (!this.phone)
                remove(matches, function (match) { return match.getType() === 'phone'; });
            if (!this.mention)
                remove(matches, function (match) { return match.getType() === 'mention'; });
            if (!this.urls.schemeMatches) {
                remove(matches, function (m) { return m.getType() === 'url' && m.getUrlMatchType() === 'scheme'; });
            }
            if (!this.urls.wwwMatches) {
                remove(matches, function (m) { return m.getType() === 'url' && m.getUrlMatchType() === 'www'; });
            }
            if (!this.urls.tldMatches) {
                remove(matches, function (m) { return m.getType() === 'url' && m.getUrlMatchType() === 'tld'; });
            }
            return matches;
        };
        /**
         * Parses the input `text` looking for URLs, email addresses, phone
         * numbers, username handles, and hashtags (depending on the configuration
         * of the Autolinker instance), and returns an array of {@link Autolinker.match.Match}
         * objects describing those matches.
         *
         * This method processes a **non-HTML string**, and is used to parse and
         * match within the text nodes of an HTML string. This method is used
         * internally by {@link #parse}.
         *
         * @private
         * @param {String} text The text to find matches within (depending on if the
         *   {@link #urls}, {@link #email}, {@link #phone},
         *   {@link #hashtag}, and {@link #mention} options are enabled). This must be a non-HTML string.
         * @param {Number} [offset=0] The offset of the text node within the
         *   original string. This is used when parsing with the {@link #parse}
         *   method to generate correct offsets within the {@link Autolinker.match.Match}
         *   instances, but may be omitted if calling this method publicly.
         * @return {Autolinker.match.Match[]} The array of Matches found in the
         *   given input `text`.
         */
        Autolinker.prototype.parseText = function (text, offset) {
            if (offset === void 0) { offset = 0; }
            offset = offset || 0;
            var matchers = this.getMatchers(), matches = [];
            for (var i = 0, numMatchers = matchers.length; i < numMatchers; i++) {
                var textMatches = matchers[i].parseMatches(text);
                // Correct the offset of each of the matches. They are originally
                // the offset of the match within the provided text node, but we
                // need to correct them to be relative to the original HTML input
                // string (i.e. the one provided to #parse).
                for (var j = 0, numTextMatches = textMatches.length; j < numTextMatches; j++) {
                    textMatches[j].setOffset(offset + textMatches[j].getOffset());
                }
                matches.push.apply(matches, textMatches);
            }
            return matches;
        };
        /**
         * Automatically links URLs, Email addresses, Phone numbers, Hashtags,
         * and Mentions (Twitter, Instagram, Soundcloud) found in the given chunk of HTML. Does not link
         * URLs found within HTML tags.
         *
         * For instance, if given the text: `You should go to http://www.yahoo.com`,
         * then the result will be `You should go to
         * &lt;a href="http://www.yahoo.com"&gt;http://www.yahoo.com&lt;/a&gt;`
         *
         * This method finds the text around any HTML elements in the input
         * `textOrHtml`, which will be the text that is processed. Any original HTML
         * elements will be left as-is, as well as the text that is already wrapped
         * in anchor (&lt;a&gt;) tags.
         *
         * @param {String} textOrHtml The HTML or text to autolink matches within
         *   (depending on if the {@link #urls}, {@link #email}, {@link #phone}, {@link #hashtag}, and {@link #mention} options are enabled).
         * @return {String} The HTML, with matches automatically linked.
         */
        Autolinker.prototype.link = function (textOrHtml) {
            if (!textOrHtml) {
                return "";
            } // handle `null` and `undefined`
            var matches = this.parse(textOrHtml), newHtml = [], lastIndex = 0;
            for (var i = 0, len = matches.length; i < len; i++) {
                var match = matches[i];
                newHtml.push(textOrHtml.substring(lastIndex, match.getOffset()));
                newHtml.push(this.createMatchReturnVal(match));
                lastIndex = match.getOffset() + match.getMatchedText().length;
            }
            newHtml.push(textOrHtml.substring(lastIndex)); // handle the text after the last match
            return newHtml.join('');
        };
        /**
         * Creates the return string value for a given match in the input string.
         *
         * This method handles the {@link #replaceFn}, if one was provided.
         *
         * @private
         * @param {Autolinker.match.Match} match The Match object that represents
         *   the match.
         * @return {String} The string that the `match` should be replaced with.
         *   This is usually the anchor tag string, but may be the `matchStr` itself
         *   if the match is not to be replaced.
         */
        Autolinker.prototype.createMatchReturnVal = function (match) {
            // Handle a custom `replaceFn` being provided
            var replaceFnResult;
            if (this.replaceFn) {
                replaceFnResult = this.replaceFn.call(this.context, match); // Autolinker instance is the context
            }
            if (typeof replaceFnResult === 'string') {
                return replaceFnResult; // `replaceFn` returned a string, use that
            }
            else if (replaceFnResult === false) {
                return match.getMatchedText(); // no replacement for the match
            }
            else if (replaceFnResult instanceof HtmlTag) {
                return replaceFnResult.toAnchorString();
            }
            else { // replaceFnResult === true, or no/unknown return value from function
                // Perform Autolinker's default anchor tag generation
                var anchorTag = match.buildTag(); // returns an Autolinker.HtmlTag instance
                return anchorTag.toAnchorString();
            }
        };
        /**
         * Lazily instantiates and returns the {@link Autolinker.matcher.Matcher}
         * instances for this Autolinker instance.
         *
         * @private
         * @return {Autolinker.matcher.Matcher[]}
         */
        Autolinker.prototype.getMatchers = function () {
            if (!this.matchers) {
                var tagBuilder = this.getTagBuilder();
                var matchers = [
                    new HashtagMatcher({ tagBuilder: tagBuilder, serviceName: this.hashtag }),
                    new EmailMatcher({ tagBuilder: tagBuilder }),
                    new PhoneMatcher({ tagBuilder: tagBuilder }),
                    new MentionMatcher({ tagBuilder: tagBuilder, serviceName: this.mention }),
                    new UrlMatcher({ tagBuilder: tagBuilder, stripPrefix: this.stripPrefix, stripTrailingSlash: this.stripTrailingSlash, decodePercentEncoding: this.decodePercentEncoding })
                ];
                return (this.matchers = matchers);
            }
            else {
                return this.matchers;
            }
        };
        /**
         * Returns the {@link #tagBuilder} instance for this Autolinker instance,
         * lazily instantiating it if it does not yet exist.
         *
         * @private
         * @return {Autolinker.AnchorTagBuilder}
         */
        Autolinker.prototype.getTagBuilder = function () {
            var tagBuilder = this.tagBuilder;
            if (!tagBuilder) {
                tagBuilder = this.tagBuilder = new AnchorTagBuilder({
                    newWindow: this.newWindow,
                    truncate: this.truncate,
                    className: this.className
                });
            }
            return tagBuilder;
        };
        /**
         * @static
         * @property {String} version
         *
         * The Autolinker version number in the form major.minor.patch
         *
         * Ex: 0.25.1
         */
        Autolinker.version = '3.11.0';
        /**
         * For backwards compatibility with Autolinker 1.x, the AnchorTagBuilder
         * class is provided as a static on the Autolinker class.
         */
        Autolinker.AnchorTagBuilder = AnchorTagBuilder;
        /**
         * For backwards compatibility with Autolinker 1.x, the HtmlTag class is
         * provided as a static on the Autolinker class.
         */
        Autolinker.HtmlTag = HtmlTag;
        /**
         * For backwards compatibility with Autolinker 1.x, the Matcher classes are
         * provided as statics on the Autolinker class.
         */
        Autolinker.matcher = {
            Email: EmailMatcher,
            Hashtag: HashtagMatcher,
            Matcher: Matcher,
            Mention: MentionMatcher,
            Phone: PhoneMatcher,
            Url: UrlMatcher
        };
        /**
         * For backwards compatibility with Autolinker 1.x, the Match classes are
         * provided as statics on the Autolinker class.
         */
        Autolinker.match = {
            Email: EmailMatch,
            Hashtag: HashtagMatch,
            Match: Match,
            Mention: MentionMatch,
            Phone: PhoneMatch,
            Url: UrlMatch
        };
        return Autolinker;
    }());

    return Autolinker;

}));


//# sourceMappingURL=Autolinker.js.map

export default tmp.Autolinker;
