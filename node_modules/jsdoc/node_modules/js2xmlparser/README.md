# js2xmlparser #

## Overview ##

js2xmlparser is a Node.js module that parses JavaScript objects into XML.

## Features ##

Since XML is a data-interchange format, js2xmlparser is designed primarily for JSON-type objects, arrays and primitive
data types, like many of the other JavaScript to XML parsers currently available for Node.js.

However, js2xmlparser is capable of parsing any object, including native JavaScript objects such as Date and RegExp, by
taking advantage of each object's toString function. Functions are a special case where the return value of the function
itself is used instead of the toString function, if available.

js2xmlparser also supports a number of constructs unique to XML:

* attributes (through a unique attribute property in objects)
* mixed content (through a unique value property in objects)
* multiple elements with the same name (through arrays)

js2xmlparser can also pretty-print the XML it outputs with the option of customizing the indent string.

## Installation ##

The easiest way to install js2xmlparser is to use npm: `npm install js2xmlparser`.

Alternatively, you may download the source from GitHub and copy it to a folder named "js2xmlparser" within your
"node_modules" directory.

## Usage ##

The js2xmlparser module contains one function which takes the following arguments:

* `root` - the XML root element's name (string, mandatory)
* `data` - the data to be converted to XML; while the data object can contain arrays, it cannot itself be an array
  (object or JSON string, mandatory)
* `options` - module options (object, optional)
    * `declaration` - XML declaration options (object, optional)
        * `include` - specifies whether an XML declaration should be included (boolean, optional, default: true)
        * `encoding` - value of XML encoding attribute in declaration; a value of null represents no encoding attribute
          (string, optional, default: "UTF-8")
    * `attributeString` - the name of the property representing an element's attributes; note that any property with a
      name equal to the attribute string is ignored except in the context of XML attributes (string, optional, default:
      "@")
    * `valueString` - the name of the property representing an element's value; note that any property with a name equal
      to the value string is ignored except in the context of supplying a value for a tag containing attributes (string,
      optional, default: "#")
    * `aliasString` - the name of the property representing an element's alias; the name of the containing element will
      be replaced with the alias (string, optional, default: "=")
    * `prettyPrinting` - pretty-printing options (object, optional)
        * `enabled` - specifies whether pretty-printing is enabled (boolean, optional, default: true)
        * `indentString` - indent string (string, optional, default: "\t")
    * `convertMap` - maps object types (as given by the `Object.prototype.toString.call` method) to functions to convert
      those objects to a particular string representation; `*` can be used as a wildcard for all types of objects
      (object, optional, default: {})
    * `useCDATA` - specifies whether strings should be enclosed in CDATA tags; otherwise, illegal XML characters will
      be escaped (boolean, optional, default: false)

## Examples ##

The following example illustrates the basic usage of js2xmlparser:

    var js2xmlparser = require("js2xmlparser");

    var data = {
        "firstName": "John",
        "lastName": "Smith"
    };

    console.log(js2xmlparser("person", data));

    > <?xml version="1.0" encoding="UTF-8"?>
    > <person>
    >     <firstName>John</firstName>
    >     <lastName>Smith</lastName>
    > </person>

This is a more complex example that builds on the first:

    var js2xmlparser = require("js2xmlparser");

    var data = {
        "@": {
          "type": "individual"
        },
        "firstName": "John",
        "lastName": "Smith",
        "dateOfBirth": new Date(1964, 7, 26),
        "address": {
            "@": {
                "type": "home"
            },
            "streetAddress": "3212 22nd St",
            "city": "Chicago",
            "state": "Illinois",
            "zip": 10000
        },
        "phone": [
            {
                "@": {
                    "type": "home"
                },
                "#": "123-555-4567"
            },
            {
                "@": {
                    "type": "work"
                },
                "#": "789-555-4567"
            },
            {
                "@": {
                    "type": "cell"
                },
                "#": "456-555-7890"
            }
        ],
        "email": function() {
            return "john@smith.com";
        },
        "notes": "John's profile is not complete."
    };

    console.log(js2xmlparser("person", data));

    > <?xml version="1.0" encoding="UTF-8"?>
    > <person type="individual">
    >     <firstName>John</firstName>
    >     <lastName>Smith</lastName>
    >     <dateOfBirth>Wed Aug 26 1964 00:00:00 GMT-0400 (Eastern Daylight Time)</dateOfBirth>
    >     <address type="home">
    >         <streetAddress>3212 22nd St</streetAddress>
    >         <city>Chicago</city>
    >         <state>Illinois</state>
    >         <zip>10000</zip>
    >     </address>
    >     <phone type="home">123-555-4567</phone>
    >     <phone type="work">789-555-4567</telephone>
    >     <phone type="cell">456-555-7890</phone>
    >     <email>john@smith.com</email>
    >     <notes>John&apos;s profile is not complete.</notes>
    > </person>

This example uses the alias string feature:

    var js2xmlparser = require("js2xmlparser");

    var data = {
        "telephone": [
            "123-555-4567",
            {
                "#": "789-555-4567",
                "=": "fax"
            },
            "456-555-7890"
        ]
    };

    console.log(js2xmlparser("person", data));

    > <?xml version="1.0" encoding="UTF-8"?>
    > <person>
    >     <telephone>123-555-4567</telephone>
    >     <fax>789-555-4567</fax>
    >     <telephone>456-555-7890</telephone>
    > </person>

The following an example that uses the convert map feature:

    var js2xmlparser = require("js2xmlparser");

    var data = {
        "email": function() {
            return "john@smith.com";
        },
        "dateOfBirth": new Date(1964, 7, 26)
    }

    var options = {
        convertMap: {
            "[object Date]": function(date) {
                return date.toISOString();
            },
            "[object Function]": function(func) {
                return func.toString();
            }
        }
    };

    console.log(js2xmlparser("person", data, options));

    > <?xml version="1.0" encoding="UTF-8"?>
    > <person>
    > 	  <email>function () {
    >             return &quot;john@smith.com&quot;;
    >         }</email>
    > 	  <dateOfBirth>1964-08-26T05:00:00.000Z</dateOfBirth>
    > </person>

Here's an example that wraps strings in CDATA tags instead of escaping invalid characters:

    var js2xmlparser = require("js2xmlparser");

    var data = {
        "notes": {
            "@": {
                "type": "status"
            },
            "#": "John's profile is not complete."
        }
    };

    var options = {
        useCDATA: true
    };

    console.log(js2xmlparser("person", data, options));

    > <?xml version="1.0" encoding="UTF-8"?>
    > <person>
    >     <notes type="status"><![CDATA[John's profile is not complete.]]></notes>
    > </person>

## Tests ##

js2xmlparser comes with a set of tests that evaluate and verify the package's core functionality. To run the tests:

* Install the test dependencies with `npm install`.
* Run the tests with `mocha`.

## License ##

js2xmlparser is licensed under the [MIT license](http://opensource.org/licenses/MIT). Please see the LICENSE.md file
for more information.
