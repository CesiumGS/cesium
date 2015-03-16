/* jshint node:true */

/* globals describe, it */

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

    var js2xmlparser = require("../lib/js2xmlparser");
    var should = require("should");
    var util = require("util");

    var defaultRoot = "base";
    var defaultData = {
        hello: "world"
    };
    var defaultOptions = {
        declaration: {
            include: false
        },
        prettyPrinting: {
            enabled: false
        }
    };

    describe("js2xmlparser", function () {
        describe("root", function () {
            it("should raise an error when root is undefined", function () {
                var res;
                try {
                    res = js2xmlparser(undefined, defaultData, defaultOptions);
                } catch (e) {
                    e.should.match(/root element must be a string/);
                }
                should.not.exist(res);
            });

            it("should raise an error when root is null", function () {
                var res;
                try {
                    res = js2xmlparser(null, defaultData, defaultOptions);
                } catch (e) {
                    e.should.match(/root element must be a string/);
                }
                should.not.exist(res);
            });

            it("should raise an error when root is an object", function () {
                var res;
                try {
                    res = js2xmlparser({}, defaultData, defaultOptions);
                } catch (e) {
                    e.should.match(/root element must be a string/);
                }
                should.not.exist(res);
            });

            it("should raise an error when root is an array", function () {
                var res;
                try {
                    res = js2xmlparser([], defaultData, defaultOptions);
                } catch (e) {
                    e.should.match(/root element must be a string/);
                }
                should.not.exist(res);
            });

            it("should raise an error when root is a boolean", function () {
                var res;
                try {
                    res = js2xmlparser(true, defaultData, defaultOptions);
                } catch (e) {
                    e.should.match(/root element must be a string/);
                }
                should.not.exist(res);
            });

            it("should raise an error when root is a number", function () {
                var res;
                try {
                    res = js2xmlparser(2, defaultData, defaultOptions);
                } catch (e) {
                    e.should.match(/root element must be a string/);
                }
                should.not.exist(res);
            });

            it("should raise an error when root is an empty string", function () {
                var res;
                try {
                    res = js2xmlparser("", defaultData, defaultOptions);
                } catch (e) {
                    e.should.match(/root element cannot be empty/);
                }
                should.not.exist(res);
            });

            it("should create XML with 'base' as the root element when root is 'base'", function () {
                var res = js2xmlparser(defaultRoot, defaultData, defaultOptions);
                res.should.startWith("<base>");
            });
        });

        describe("options", function () {
            describe("declaration", function () {
                describe("include", function () {
                    it("should raise an error when options.declaration is defined and options.declaration.include is undefined", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    include: undefined
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.include option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.declaration is defined and options.declaration.include is null", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    include: null
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.include option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.declaration is defined and options.declaration.include is an object", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    include: {}
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.include option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.declaration is defined and options.declaration.include is an array", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    include: []
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.include option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.declaration is defined and options.declaration.include is a number", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    include: 2
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.include option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.declaration is defined and options.declaration.include is a string", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    include: "string"
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.include option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should create XML with declaration when options.declaration.include is not specified", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {});
                        res.should.startWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
                    });

                    it("should create XML with declaration when options.declaration.include is true", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: true
                            }
                        });
                        res.should.startWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
                    });

                    it("should create XML without declaration when options.declaration.include is false", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: false
                            }
                        });
                        res.should.startWith("<base>");
                    });
                });

                describe("encoding", function () {
                    it("should raise an error when options.declaration is defined and options.declaration.encoding is undefined", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    encoding: undefined
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.encoding option must be a string or null/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.declaration is defined and options.declaration.encoding is an object", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    encoding: {}
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.encoding option must be a string or null/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.declaration is defined and options.declaration.encoding is an array", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    encoding: []
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.encoding option must be a string or null/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.declaration is defined and options.declaration.encoding is a number", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    encoding: 2
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.encoding option must be a string or null/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.declaration is defined and options.declaration.encoding is a boolean", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                declaration: {
                                    encoding: true
                                }
                            });
                        } catch (e) {
                            e.should.match(/declaration.encoding option must be a string or null/);
                        }
                        should.not.exist(res);
                    });

                    it("should create XML declaration with encoding 'UTF-8' when options.declaration.encoding is not specified", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {});
                        res.should.startWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
                    });

                    it("should create XML declaration with encoding 'UTF-16' when options.declaration.encoding is 'UTF-16'", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                encoding: "UTF-16"
                            }
                        });
                        res.should.startWith("<?xml version=\"1.0\" encoding=\"UTF-16\"?>");
                    });

                    it("should create XML declaration without encoding attribute when options.declaration.encoding is null", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                encoding: null
                            }
                        });
                        res.should.startWith("<?xml version=\"1.0\"?>");
                    });
                });
            });

            describe("attributeString", function () {
                it("should raise an error when options is defined and options.attributeString is undefined", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            attributeString: undefined
                        });
                    } catch (e) {
                        e.should.match(/attributeString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.attributeString is an object", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            attributeString: {}
                        });
                    } catch (e) {
                        e.should.match(/attributeString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.attributeString is an array", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            attributeString: []
                        });
                    } catch (e) {
                        e.should.match(/attributeString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.attributeString is a number", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            attributeString: 2
                        });
                    } catch (e) {
                        e.should.match(/attributeString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.attributeString is a boolean", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            attributeString: true
                        });
                    } catch (e) {
                        e.should.match(/attributeString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should create XML with attribute string '@' when options.attributeString is not specified", function () {
                    var res = js2xmlparser(defaultRoot, {
                        a: {
                            "@": {
                                b: "c"
                            }
                        }
                    }, defaultOptions);
                    res.should.equal("<base><a b=\"c\"/></base>");
                });

                it("should create XML with attribute string '__attr' when options.attributeString is '__attr'", function () {
                    var res = js2xmlparser(defaultRoot, {
                        a: {
                            "__attr": {
                                b: "c"
                            }
                        }
                    }, {
                        declaration: {
                            include: false
                        },
                        prettyPrinting: {
                            enabled: false
                        },
                        attributeString: "__attr"
                    });
                    res.should.equal("<base><a b=\"c\"/></base>");
                });
            });

            describe("valueString", function () {
                it("should raise an error when options is defined and options.valueString is undefined", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            valueString: undefined
                        });
                    } catch (e) {
                        e.should.match(/valueString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.valueString is an object", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            valueString: {}
                        });
                    } catch (e) {
                        e.should.match(/valueString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.valueString is an array", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            valueString: []
                        });
                    } catch (e) {
                        e.should.match(/valueString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.valueString is a number", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            valueString: 2
                        });
                    } catch (e) {
                        e.should.match(/valueString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.valueString is a boolean", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            valueString: true
                        });
                    } catch (e) {
                        e.should.match(/valueString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should create XML with value string '@' when options.valueString is not specified", function () {
                    var res = js2xmlparser(defaultRoot, {
                        a: {
                            "@": {
                                b: "c"
                            },
                            "#": "d"
                        }
                    }, defaultOptions);
                    res.should.equal("<base><a b=\"c\">d</a></base>");
                });

                it("should create XML with value string '__val' when options.valueString is '__val'", function () {
                    var res = js2xmlparser(defaultRoot, {
                        a: {
                            "@": {
                                b: "c"
                            },
                            "__val": "d"
                        }
                    }, {
                        declaration: {
                            include: false
                        },
                        prettyPrinting: {
                            enabled: false
                        },
                        valueString: "__val"
                    });
                    res.should.equal("<base><a b=\"c\">d</a></base>");
                });
            });

            describe("prettyPrinting", function () {
                describe("enabled", function () {
                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.enabled is undefined", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    enabled: undefined
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.enabled option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.enabled is null", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    enabled: null
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.enabled option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.enabled is an object", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    enabled: {}
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.enabled option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.enabled is an array", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    enabled: []
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.enabled option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.enabled is a number", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    enabled: 2
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.enabled option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.enabled is a string", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    enabled: "string"
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.enabled option must be a boolean/);
                        }
                        should.not.exist(res);
                    });

                    it("should create XML with pretty printing when options.prettyPrinting.enabled is not specified", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: false
                            }
                        });
                        res.should.equal("<base>\n\t<hello>world</hello>\n</base>");
                    });

                    it("should create XML with pretty printing when options.prettyPrinting.enabled is true", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {
                            prettyPrinting: {
                                enabled: true
                            },
                            declaration: {
                                include: false
                            }
                        });
                        res.should.equal("<base>\n\t<hello>world</hello>\n</base>");
                    });

                    it("should create XML without pretty printing when options.prettyPrinting.enabled is false", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {
                            prettyPrinting: {
                                enabled: false
                            },
                            declaration: {
                                include: false
                            }
                        });
                        res.should.equal("<base><hello>world</hello></base>");
                    });
                });

                describe("indentString", function () {
                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.indentString is undefined", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    indentString: undefined
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.indentString option must be a string/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.indentString is an object", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    indentString: {}
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.indentString option must be a string/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.indentString is an array", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    indentString: []
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.indentString option must be a string/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.indentString is a number", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    indentString: 2
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.indentString option must be a string/);
                        }
                        should.not.exist(res);
                    });

                    it("should raise an error when options.prettyPrinting is defined and options.prettyPrinting.indentString is a boolean", function () {
                        var res;
                        try {
                            res = js2xmlparser(defaultRoot, defaultData, {
                                prettyPrinting: {
                                    indentString: true
                                }
                            });
                        } catch (e) {
                            e.should.match(/prettyPrinting.indentString option must be a string/);
                        }
                        should.not.exist(res);
                    });

                    it("should pretty print with indent string '\t' when options.prettyPrinting.indentString is not specified", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: false
                            }
                        });
                        res.should.equal("<base>\n\t<hello>world</hello>\n</base>");
                    });

                    it("should pretty print with indent string '  ' when options.valueString is '  '", function () {
                        var res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: false
                            },
                            prettyPrinting: {
                                indentString: '  '
                            }
                        });
                        res.should.equal("<base>\n  <hello>world</hello>\n</base>");
                    });
                });
            });

            describe("convertMap", function () {
                it("should raise an error when options is defined and options.convertMap is undefined", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: false
                            },
                            prettyPrinting: {
                                enabled: false
                            },
                            convertMap: undefined
                        });
                    } catch (e) {
                        e.should.match(/convertMap option must be an object/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.convertMap is null", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: false
                            },
                            prettyPrinting: {
                                enabled: false
                            },
                            convertMap: null
                        });
                    } catch (e) {
                        e.should.match(/convertMap option must be an object/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.convertMap is an array", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: false
                            },
                            prettyPrinting: {
                                enabled: false
                            },
                            convertMap: []
                        });
                    } catch (e) {
                        e.should.match(/convertMap option must be an object/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.convertMap is a boolean", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: false
                            },
                            prettyPrinting: {
                                enabled: false
                            },
                            convertMap: true
                        });
                    } catch (e) {
                        e.should.match(/convertMap option must be an object/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.convertMap is a number", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: false
                            },
                            prettyPrinting: {
                                enabled: false
                            },
                            convertMap: 2
                        });
                    } catch (e) {
                        e.should.match(/convertMap option must be an object/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.convertMap is a string", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            declaration: {
                                include: false
                            },
                            prettyPrinting: {
                                enabled: false
                            },
                            convertMap: "test"
                        });
                    } catch (e) {
                        e.should.match(/convertMap option must be an object/);
                    }
                    should.not.exist(res);
                });

                it("should correctly parse XML using convert maps", function () {
                    var res = js2xmlparser(defaultRoot, {
                        "a": "b",
                        "c": 1
                    }, {
                        declaration: {
                            include: false
                        },
                        prettyPrinting: {
                            enabled: false
                        },
                        convertMap: {
                            "[object Number]": function (num) {
                                return num + 1;
                            },
                            "[object String]": function (str) {
                                return str + "a";
                            }
                        }
                    });
                    res.should.equal("<base><a>ba</a><c>2</c></base>");
                });
            });

            describe("useCDATA", function () {
                it("should raise an error when options is defined and options.useCDATA is undefined", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            useCDATA: undefined
                        });
                    } catch (e) {
                        e.should.match(/useCDATA option must be a boolean/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.useCDATA is null", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            useCDATA: null
                        });
                    } catch (e) {
                        e.should.match(/useCDATA option must be a boolean/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.useCDATA is an object", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            useCDATA: {}
                        });
                    } catch (e) {
                        e.should.match(/useCDATA option must be a boolean/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.useCDATA is an array", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            useCDATA: []
                        });
                    } catch (e) {
                        e.should.match(/useCDATA option must be a boolean/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.useCDATA is a number", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            useCDATA: 2
                        });
                    } catch (e) {
                        e.should.match(/useCDATA option must be a boolean/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.useCDATA is a string", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            useCDATA: "string"
                        });
                    } catch (e) {
                        e.should.match(/useCDATA option must be a boolean/);
                    }
                    should.not.exist(res);
                });

                it("should create XML without CDATA strings when options.CDATA is not specified", function () {
                    var res = js2xmlparser(defaultRoot, {
                        "a": "b'c"
                    }, defaultOptions);
                    res.should.equal("<base><a>b&apos;c</a></base>");
                });

                it("should create XML without CDATA strings when options.CDATA is false", function () {
                    var res = js2xmlparser(defaultRoot, {
                        "a": "b'c"
                    }, {
                        useCDATA: false,
                        declaration: {
                            include: false
                        },
                        prettyPrinting: {
                            enabled: false
                        }
                    });
                    res.should.equal("<base><a>b&apos;c</a></base>");
                });

                it("should create XML without CDATA strings when options.CDATA is true", function () {
                    var res = js2xmlparser(defaultRoot, {
                        "a": "b'c"
                    }, {
                        useCDATA: true,
                        declaration: {
                            include: false
                        },
                        prettyPrinting: {
                            enabled: false
                        }
                    });
                    res.should.equal("<base><a><![CDATA[b'c]]></a></base>");
                });
            });

            describe("aliasString", function () {

                it("should raise an error when options is defined and options.aliasString is undefined", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            aliasString: undefined
                        });
                    } catch (e) {
                        e.should.match(/aliasString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.aliasString is an object", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            aliasString: {}
                        });
                    } catch (e) {
                        e.should.match(/aliasString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.aliasString is an array", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            aliasString: []
                        });
                    } catch (e) {
                        e.should.match(/aliasString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.aliasString is a number", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            aliasString: 2
                        });
                    } catch (e) {
                        e.should.match(/aliasString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should raise an error when options is defined and options.aliasString is a boolean", function () {
                    var res;
                    try {
                        res = js2xmlparser(defaultRoot, defaultData, {
                            aliasString: true
                        });
                    } catch (e) {
                        e.should.match(/aliasString option must be a string/);
                    }
                    should.not.exist(res);
                });

                it("should create XML with alias string '=' when options.aliasString is not specified", function () {
                    var res = js2xmlparser(defaultRoot, {
                        a: {
                            "=": "b"
                        }
                    }, defaultOptions);
                    res.should.equal("<base><b></b></base>");
                });

                it("should create XML with alias string '__alias' when options.aliasString is '__alias'", function () {
                    var res = js2xmlparser(defaultRoot, {
                        a: {
                            "__alias": "b"
                        }
                    }, {
                        declaration: {
                            include: false
                        },
                        prettyPrinting: {
                            enabled: false
                        },
                        aliasString: "__alias"
                    });
                    res.should.equal("<base><b></b></base>");
                });

                it("should create XML with options.aliasString and data is an array", function () {
                    var res = js2xmlparser(defaultRoot, {
                        a: [{
                            "=": "b"
                        }, {
                            "=": "c"
                        }]
                    }, defaultOptions);
                    res.should.equal("<base><b></b><c></c></base>");
                });

            });
        });

        describe("data", function () {
            it("should raise an error when data is undefined", function () {
                var res;
                try {
                    res = js2xmlparser(defaultRoot, undefined, defaultOptions);
                } catch (e) {
                    e.should.match(/data must be an object (excluding arrays) or a JSON string/);
                }
                should.not.exist(res);
            });

            it("should raise an error when data is null", function () {
                var res;
                try {
                    res = js2xmlparser(defaultRoot, null, defaultOptions);
                } catch (e) {
                    e.should.match(/data must be an object (excluding arrays) or a JSON string/);
                }
                should.not.exist(res);
            });

            it("should raise an error when data is an array", function () {
                var res;
                try {
                    res = js2xmlparser(defaultRoot, [], defaultOptions);
                } catch (e) {
                    e.should.match(/data must be an object (excluding arrays) or a JSON string/);
                }
                should.not.exist(res);
            });

            it("should raise an error when data is a non-JSON string", function () {
                var res;
                try {
                    res = js2xmlparser(defaultRoot, "test", defaultOptions);
                } catch (e) {
                    e.should.match(/data must be an object (excluding arrays) or a JSON string/);
                }
                should.not.exist(res);
            });

            it("should correctly parse a number", function () {
                var res = js2xmlparser(defaultRoot, 2, defaultOptions);
                res.should.equal("<base>2</base>");
            });

            it("should correctly parse a boolean", function () {
                var res = js2xmlparser(defaultRoot, true, defaultOptions);
                res.should.equal("<base>true</base>");
            });

            it("should correctly parse a JSON string", function () {
                var res = js2xmlparser(defaultRoot, "{\"hello\":\"world\"}", defaultOptions);
                res.should.equal("<base><hello>world</hello></base>");
            });

            it("should correctly parse an empty object", function () {
                var res = js2xmlparser(defaultRoot, {}, defaultOptions);
                res.should.equal("<base/>");
            });

            it("should correctly parse a simple object", function () {
                var res = js2xmlparser(defaultRoot, {
                    a: "b",
                    c: "d"
                }, defaultOptions);
                res.should.equal("<base><a>b</a><c>d</c></base>");
            });

            it("should correctly parse attributes", function () {
                var res = js2xmlparser(defaultRoot, {
                    "@": {
                        a: "b",
                        "@": "c"
                    },
                    d: {
                        "@": {
                            e: "f"
                        }
                    },
                    g: {
                        "@": {
                            h: "i"
                        },
                        j: "k",
                        l: {
                            "@": "m"
                        }
                    }
                }, defaultOptions);
                res.should.equal("<base a=\"b\" @=\"c\"><d e=\"f\"/><g h=\"i\"><j>k</j><l/></g></base>");
            });

            it("should correctly parse value strings", function () {
                var res = js2xmlparser(defaultRoot, {
                    "#": "1",
                    a: {
                        "#": "b"
                    },
                    c: {
                        "#": "d",
                        e: {
                            f: "g"
                        },
                        "h": {
                            "#": {
                                "i": "j",
                                "#": "k"
                            }
                        }
                    },
                    l: {
                        "@": {
                            m: "n"
                        },
                        "#": "o"
                    }
                }, {
                    declaration: {
                        include: false
                    },
                    prettyPrinting: {
                        enabled: false
                    }
                });
                res.should.equal("<base><a>b</a><c><e><f>g</f></e><h>[object Object]</h></c><l m=\"n\">o</l></base>");
            });

            it("should correctly parse arrays", function () {
                var res = js2xmlparser(defaultRoot, {
                    a: ["b", "c", "d"],
                    e: ["f", "g", ["h", "i"], "j"],
                    k: {
                        l: ["m", "n", "o"]
                    }
                }, defaultOptions);
                res.should.equal("<base><a>b</a><a>c</a><a>d</a><e>f</e><e>g</e><e>h</e><e>i</e><e>j</e><k><l>m</l>" +
                "<l>n</l><l>o</l></k></base>");
            });

            it("should correctly parse example 1", function () {
                var res = js2xmlparser("person", {
                    "firstName": "John",
                    "lastName": "Smith"
                }, defaultOptions);
                res.should.equal("<person><firstName>John</firstName><lastName>Smith</lastName></person>");
            });

            it("should correctly parse example 2", function () {
                var res = js2xmlparser("person", {
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
                            "#": "123-555-4567"
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
                    "notes": "John's profile is not complete."
                }, defaultOptions);
                res.should.equal("<person type=\"individual\"><firstName>John</firstName><lastName>Smith</lastName>" +
                "<dateOfBirth>" + new Date(1964, 7, 26) + "</dateOfBirth><address " +
                "type=\"home\"><streetAddress>3212 22nd St</streetAddress><city>Chicago</city><state>Illinois" +
                "</state><zip>10000</zip></address><phone type=\"home\">123-555-4567</phone><phone " +
                "type=\"work\">123-555-4567</phone><phone type=\"cell\">456-555-7890</phone><email>" +
                "john@smith.com</email><notes>John&apos;s profile is not complete.</notes></person>");
            });

            it("should correctly parse example 2 with pretty printing", function () {
                var res = js2xmlparser("person", {
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
                            "#": "123-555-4567"
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
                    "notes": "John's profile is not complete."
                }, {
                    declaration: {
                        include: false
                    }
                });
                res.should.equal("<person type=\"individual\">\n\t<firstName>John</firstName>\n\t<lastName>Smith" +
                "</lastName>\n\t<dateOfBirth>" + new Date(1964, 7, 26) +
                "</dateOfBirth>\n\t<address type=\"home\">\n\t\t<streetAddress>3212 22nd St</streetAddress>" +
                "\n\t\t<city>Chicago</city>\n\t\t<state>Illinois</state>\n\t\t<zip>10000</zip>\n\t</address>" +
                "\n\t<phone type=\"home\">123-555-4567</phone>\n\t<phone type=\"work\">123-555-4567" +
                "</phone>\n\t<phone type=\"cell\">456-555-7890</phone>\n\t<email>john@smith.com</email>\n\t" +
                "<notes>John&apos;s profile is not complete.</notes>\n</person>");
            });

            it("should correctly parse example 3", function () {
                var res = js2xmlparser("person", {
                    "telephone": [
                        "123-555-4567",
                        {
                            "#": "789-555-4567",
                            "=": "fax"
                        },
                        "456-555-7890"
                    ]
                }, {
                    declaration: {
                        include: false
                    },
                    prettyPrinting: {
                        enabled: false
                    }
                });
                res.should.equal("<person><telephone>123-555-4567</telephone><fax>789-555-4567</fax><telephone>" +
                "456-555-7890</telephone></person>");
            });

            it("should correctly parse example 4", function () {
                var res = js2xmlparser("person", {
                    "email": function () {
                        return "john@smith.com";
                    },
                    "dateOfBirth": new Date(Date.UTC(1964, 7, 26))
                }, {
                    declaration: {
                        include: false
                    },
                    prettyPrinting: {
                        enabled: false
                    },
                    convertMap: {
                        "[object Date]": function (date) {
                            return date.toISOString();
                        },
                        "[object Function]": function (func) {
                            return func.toString();
                        }
                    }
                });
                res.should.equal("<person><email>function () {\r\n                        return &quot;john@smith.com" +
                "&quot;;\r\n                    }</email><dateOfBirth>1964-08-26T00:00:00.000Z</dateOfBirth></person>");
            });

            it("should correctly parse example 5", function () {
                var res = js2xmlparser("person", {
                    "notes": {
                        "@": {
                            "type": "status"
                        },
                        "#": "John's profile is not complete."
                    }
                }, {
                    declaration: {
                        include: false
                    },
                    prettyPrinting: {
                        enabled: false
                    },
                    useCDATA: true
                });
                res.should.equal("<person><notes type=\"status\"><![CDATA[John's profile is not complete.]]></notes>" +
                "</person>");
            });
        });
    });
})();
