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

    var js2xmlparser = require("../lib/js2xmlparser.js");

    console.log("EXAMPLE 1");
    console.log("=========");

    var example1 = {
        "firstName": "John",
        "lastName": "Smith"
    };

    console.log(js2xmlparser("person", example1));
    console.log();

    console.log("EXAMPLE 2");
    console.log("=========");

    var example2 = {
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
        "email": function () {
            return "john@smith.com";
        },
        "comment": "John's profile is not complete."
    };

    console.log(js2xmlparser("person", example2));
    console.log();

    console.log("EXAMPLE 3");
    console.log("=========");

    var example3 = {
        "telephone": [
            "123-555-4567",
            {
                "#": "789-555-4567",
                "=": "fax"
            },
            "456-555-7890"
        ]
    };

    console.log(js2xmlparser("person", example3));
    console.log();

    console.log("EXAMPLE 4");
    console.log("=========");

    var example4 = {
        "email": function () {
            return "john@smith.com";
        },
        "dateOfBirth": new Date(1964, 7, 26)
    };

    var example4Options = {
        convertMap: {
            "[object Date]": function (date) {
                return date.toISOString();
            },
            "[object Function]": function (func) {
                return func.toString();
            }
        }
    };

    console.log(js2xmlparser("person", example4, example4Options));
    console.log();

    console.log("EXAMPLE 5");
    console.log("=========");

    var example5 = {
        "comment": {
            "@": {
                "type": "status"
            },
            "#": "John's profile is not complete."
        }
    };

    var example5Options = {
        useCDATA: true
    };

    console.log(js2xmlparser("person", example5, example5Options));
})();
