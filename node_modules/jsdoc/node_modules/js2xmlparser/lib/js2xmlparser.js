/* jshint node:true */

/**
 * js2xmlparser
 * Copyright © 2012 Michael Kourlas and other contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 * Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function () {
    "use strict";

    var xmlDeclaration = true;
    var xmlVersion = "1.0";
    var xmlEncoding = "UTF-8";
    var attributeString = "@";
    var aliasString = "=";
    var valueString = "#";
    var prettyPrinting = true;
    var indentString = "\t";
    var convertMap = {};
    var useCDATA = false;

    module.exports = function (root, data, options) {
        return toXML(init(root, data, options));
    };

    // Initialization
    var init = function (root, data, options) {
        // Set option defaults
        setOptionDefaults();

        // Error checking for root element
        if (typeof root !== "string") {
            throw new Error("root element must be a string");
        }
        else if (root === "") {
            throw new Error("root element cannot be empty");
        }

        // Error checking and variable initialization for options
        if (typeof options === "object" && options !== null) {
            if ("declaration" in options) {
                if ("include" in options.declaration) {
                    if (typeof options.declaration.include === "boolean") {
                        xmlDeclaration = options.declaration.include;
                    }
                    else {
                        throw new Error("declaration.include option must be a boolean");
                    }
                }

                if ("encoding" in options.declaration) {
                    if (typeof options.declaration.encoding === "string" || options.declaration.encoding === null) {
                        xmlEncoding = options.declaration.encoding;
                    }
                    else {
                        throw new Error("declaration.encoding option must be a string or null");
                    }
                }
            }
            if ("attributeString" in options) {
                if (typeof options.attributeString === "string") {
                    attributeString = options.attributeString;
                }
                else {
                    throw new Error("attributeString option must be a string");
                }
            }
            if ("valueString" in options) {
                if (typeof options.valueString === "string") {
                    valueString = options.valueString;
                }
                else {
                    throw new Error("valueString option must be a string");
                }
            }
            if ("aliasString" in options) {
                if (typeof options.aliasString === "string") {
                    aliasString = options.aliasString;
                }
                else {
                    throw new Error("aliasString option must be a string");
                }
            }
            if ("prettyPrinting" in options) {
                if ("enabled" in options.prettyPrinting) {
                    if (typeof options.prettyPrinting.enabled === "boolean") {
                        prettyPrinting = options.prettyPrinting.enabled;
                    }
                    else {
                        throw new Error("prettyPrinting.enabled option must be a boolean");
                    }
                }

                if ("indentString" in options.prettyPrinting) {
                    if (typeof options.prettyPrinting.indentString === "string") {
                        indentString = options.prettyPrinting.indentString;
                    }
                    else {
                        throw new Error("prettyPrinting.indentString option must be a string");
                    }
                }
            }
            if ("convertMap" in options) {
                if (Object.prototype.toString.call(options.convertMap) === "[object Object]") {
                    convertMap = options.convertMap;
                }
                else {
                    throw new Error("convertMap option must be an object");
                }
            }
            if ("useCDATA" in options) {
                if (typeof options.useCDATA === "boolean") {
                    useCDATA = options.useCDATA;
                }
                else {
                    throw new Error("useCDATA option must be a boolean");
                }
            }
        }

        // Error checking and variable initialization for data
        if (typeof data !== "string" && typeof data !== "object" && typeof data !== "number" &&
            typeof data !== "boolean" && data !== null) {
            throw new Error("data must be an object (excluding arrays) or a JSON string");
        }

        if (data === null) {
            throw new Error("data must be an object (excluding arrays) or a JSON string");
        }

        if (Object.prototype.toString.call(data) === "[object Array]") {
            throw new Error("data must be an object (excluding arrays) or a JSON string");
        }

        if (typeof data === "string") {
            data = JSON.parse(data);
        }

        var tempData = {};
        tempData[root] = data; // Add root element to object

        return tempData;
    };

    // Convert object to XML
    var toXML = function (object) {
        // Initialize arguments, if necessary
        var xml = arguments[1] || "";
        var level = arguments[2] || 0;

        var i = null;
        var tempObject = {};

        for (var property in object) {
            if (object.hasOwnProperty(property)) {
                // Element name cannot start with a number
                var elementName = property;
                if (/^\d/.test(property)) {
                    elementName = "_" + property;
                }

                // Skip alias string property
                if (elementName === aliasString) {
                    continue;
                }

                // When alias string property is present, use as alias for element name
                if (Object.prototype.toString.call(object[property]) === "[object Object]" &&
                    aliasString in object[property]) {
                    elementName = object[property][aliasString];
                }

                // Arrays
                if (Object.prototype.toString.call(object[property]) === "[object Array]") {
                    // Create separate XML elements for each array element
                    for (i = 0; i < object[property].length; i++) {
                        tempObject = {};
                        tempObject[property] = object[property][i];

                        xml = toXML(tempObject, xml, level);
                    }
                }
                // JSON-type objects with properties
                else if (Object.prototype.toString.call(object[property]) === "[object Object]") {
                    xml += addIndent("<" + elementName, level);

                    // Add attributes
                    var lengthExcludingAttributes = Object.keys(object[property]).length;
                    if (Object.prototype.toString.call(object[property][attributeString]) === "[object Object]") {
                        lengthExcludingAttributes -= 1;
                        for (var attribute in object[property][attributeString]) {
                            if (object[property][attributeString].hasOwnProperty(attribute)) {
                                xml += " " + attribute + "=\"" +
                                toString(object[property][attributeString][attribute], true) + "\"";
                            }
                        }
                    }
                    else if (typeof object[property][attributeString] !== "undefined") {
                        // Fix for the case where an object contains a single property with the attribute string as its
                        // name, but this property contains no attributes; in that case, lengthExcludingAttributes
                        // should be set to zero to ensure that the object is considered an empty object for the
                        // purposes of the following if statement.
                        lengthExcludingAttributes -= 1;
                    }

                    if (lengthExcludingAttributes === 0) { // Empty object
                        xml += addBreak("/>");
                    }
                    else if ((lengthExcludingAttributes === 1 ||
                        (lengthExcludingAttributes === 2 && aliasString in object[property])) &&
                        valueString in object[property]) { // Value string only
                        xml += addBreak(">" + toString(object[property][valueString], false) + "</" + elementName +
                        ">");
                    }
                    else { // Object with properties
                        xml += addBreak(">");

                        // Create separate object for each property and pass to this function
                        for (var subProperty in object[property]) {
                            if (object[property].hasOwnProperty(subProperty) && subProperty !== attributeString &&
                                subProperty !== valueString) {
                                tempObject = {};
                                tempObject[subProperty] = object[property][subProperty];

                                xml = toXML(tempObject, xml, level + 1);
                            }
                        }

                        xml += addBreak(addIndent("</" + elementName + ">", level));
                    }
                }
                // Everything else
                else {
                    xml += addBreak(addIndent("<" + elementName + ">" + toString(object[property], false) + "</" +
                    elementName + ">", level));
                }
            }
        }

        // Finalize XML at end of process
        if (level === 0) {
            // Strip trailing whitespace
            xml = xml.replace(/\s+$/g, "");

            // Add XML declaration
            if (xmlDeclaration) {
                if (xmlEncoding === null) {
                    xml = addBreak("<?xml version=\"" + xmlVersion + "\"?>") + xml;
                }
                else {
                    xml = addBreak("<?xml version=\"" + xmlVersion + "\" encoding=\"" + xmlEncoding + "\"?>") + xml;
                }
            }
        }

        return xml;
    };

    // Add indenting to data for pretty printing
    var addIndent = function (data, level) {
        if (prettyPrinting) {

            var indent = "";
            for (var i = 0; i < level; i++) {
                indent += indentString;
            }
            data = indent + data;
        }

        return data;
    };

    // Add line break to data for pretty printing
    var addBreak = function (data) {
        return prettyPrinting ? data + "\n" : data;
    };

    // Convert anything into a valid XML string representation
    var toString = function (data, isAttribute) {
        // Recursive function used to handle nested functions
        var functionHelper = function (data) {
            if (Object.prototype.toString.call(data) === "[object Function]") {
                return functionHelper(data());
            }
            else {
                return data;
            }
        };

        // Convert map
        if (Object.prototype.toString.call(data) in convertMap) {
            data = convertMap[Object.prototype.toString.call(data)](data);
        }
        else if ("*" in convertMap) {
            data = convertMap["*"](data);
        }
        // Functions
        else if (Object.prototype.toString.call(data) === "[object Function]") {
            data = functionHelper(data());
        }
        // Empty objects
        else if (Object.prototype.toString.call(data) === "[object Object]" && Object.keys(data).length === 0) {
            data = "";
        }

        // Cast data to string
        if (typeof data !== "string") {
            data = (data === null || typeof data === "undefined") ? "" : data.toString();
        }

        // Output as CDATA instead of escaping if option set (and only if not an attribute value)
        if (useCDATA && !isAttribute) {
            data = "<![CDATA[" + data.replace(/]]>/gm, "]]]]><![CDATA[>") + "]]>";
        }
        else {
            // Escape illegal XML characters
            data = data.replace(/&/gm, "&amp;")
                .replace(/</gm, "&lt;")
                .replace(/>/gm, "&gt;")
                .replace(/"/gm, "&quot;")
                .replace(/'/gm, "&apos;");
        }

        return data;
    };

    // Revert options back to their default settings
    var setOptionDefaults = function () {
        useCDATA = false;
        convertMap = {};
        xmlDeclaration = true;
        xmlVersion = "1.0";
        xmlEncoding = "UTF-8";
        attributeString = "@";
        aliasString = "=";
        valueString = "#";
        prettyPrinting = true;
        indentString = "\t";
    };
})();
