/**
 * @overview Schema for validating JSDoc doclets.
 *
 * @author Michael Mathews <micmath@gmail.com>
 * @author Jeff Williams <jeffrey.l.williams@gmail.com>
 * @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 * @see <http://tools.ietf.org/html/draft-zyp-json-schema-03>
 */
'use strict';

// JSON schema types
var ARRAY = 'array';
var BOOLEAN = 'boolean';
var INTEGER = 'integer';
var NULL = 'null';
var NUMBER = 'number';
var OBJECT = 'object';
var STRING = 'string';
var UNDEFINED = 'undefined';

var BOOLEAN_OPTIONAL = [BOOLEAN, NULL, UNDEFINED];
var STRING_OPTIONAL = [STRING, NULL, UNDEFINED];

var EVENT_REGEXP = /event\:[\S]+/;
var PACKAGE_REGEXP = /package\:[\S]+/;

// information about the code associated with a doclet
var META_SCHEMA = exports.META_SCHEMA = {
    type: OBJECT,
    optional: true,
    additionalProperties: false,
    properties: {
        code: {
            type: OBJECT,
            additionalProperties: false,
            properties: {
                funcscope: {
                    type: STRING,
                    optional: true
                },
                id: {
                    type: STRING,
                    optional: true
                },
                name: {
                    type: STRING,
                    optional: true
                },
                node: {
                    type: OBJECT,
                    optional: true
                },
                paramnames: {
                    type: ARRAY,
                    optional: true,
                    uniqueItems: true,
                    items: {
                        type: STRING
                    }
                },
                type: {
                    type: STRING,
                    optional: true
                },
                value: {
                    optional: true
                }
            }
        },
        filename: {
            title: 'The name of the file that contains the code associated with this doclet.',
            type: STRING,
            optional: true
        },
        lineno: {
            title: 'The line number of the code associated with this doclet.',
            type: NUMBER,
            optional: true
        },
        path: {
            title: 'The path in which the code associated with this doclet is located.',
            type: STRING,
            optional: true
        },
        range: {
            title: 'The positions of the first and last characters of the code associated with ' +
                'this doclet.',
            type: ARRAY,
            optional: true,
            minItems: 2,
            maxItems: 2,
            items: {
                type: NUMBER
            }
        },
        vars: {
            type: OBJECT
        }
    }
};

// type property containing type names
var TYPE_PROPERTY_SCHEMA = exports.TYPE_PROPERTY_SCHEMA = {
    type: OBJECT,
    additionalProperties: false,
    properties: {
        names: {
            type: ARRAY,
            minItems: 1,
            items: {
                type: STRING
            }
        }
    }
};

// enumeration properties
var ENUM_PROPERTY_SCHEMA = exports.ENUM_PROPERTY_SCHEMA = {
    type: OBJECT,
    additionalProperties: false,
    properties: {
        comment: {
            type: STRING
        },
        defaultvalue: {
            type: STRING_OPTIONAL,
            optional: true
        },
        description: {
            type: STRING_OPTIONAL,
            optional: true
        },
        kind: {
            type: STRING,
            // TODO: get this from a real enum somewhere
            enum: ['member']
        },
        longname: {
            type: STRING
        },
        memberof: {
            type: STRING,
            optional: true
        },
        meta: META_SCHEMA,
        name: {
            type: STRING
        },
        // is this member nullable? (derived from the type expression)
        nullable: {
            type: BOOLEAN_OPTIONAL
        },
        // is this member optional? (derived from the type expression)
        optional: {
            type: BOOLEAN_OPTIONAL
        },
        scope: {
            type: STRING,
            // TODO: get this from a real enum somewhere
            enum: ['static']
        },
        type: TYPE_PROPERTY_SCHEMA,
        // can this member be provided more than once? (derived from the type expression)
        variable: {
            type: BOOLEAN_OPTIONAL
        }
    }
};

// function parameter, or object property defined with @property tag
var PARAM_SCHEMA = exports.PARAM_SCHEMA = {
    type: OBJECT,
    additionalProperties: false,
    properties: {
        // what is the default value for this parameter?
        defaultvalue: {
            type: STRING_OPTIONAL,
            optional: true
        },
        // a description of the parameter
        description: {
            type: STRING_OPTIONAL,
            optional: true
        },
        // what name does this parameter have within the function?
        name: {
            type: STRING
        },
        // can the value for this parameter be null?
        nullable: {
            type: BOOLEAN_OPTIONAL,
            optional: true
        },
        // is a value for this parameter optional?
        optional: {
            type: BOOLEAN_OPTIONAL,
            optional: true
        },
        // what are the types of value expected for this parameter?
        type: TYPE_PROPERTY_SCHEMA,
        // can this parameter be repeated?
        variable: {
            type: BOOLEAN_OPTIONAL,
            optional: true
        }
    }
};

var DOCLET_SCHEMA = exports.DOCLET_SCHEMA = {
    type: OBJECT,
    additionalProperties: false,
    properties: {
        // what access privileges are allowed
        access: {
            type: STRING,
            optional: true,
            // TODO: define this as an enumeration elsewhere
            enum: [
                'private',
                'protected'
            ]
        },
        alias: {
            type: STRING,
            optional: true
        },
        augments: {
            type: ARRAY,
            optional: true,
            uniqueItems: true,
            items: {
                type: STRING
            }
        },
        author: {
            type: ARRAY,
            optional: true,
            items: {
                type: STRING
            }
        },
        borrowed: {
            type: ARRAY,
            optional: true,
            uniqueItems: true,
            items: {
                type: OBJECT,
                additionalProperties: false,
                properties: {
                    // name of the target
                    as: {
                        type: STRING,
                        optional: true
                    },
                    // name of the source
                    from: {
                        type: STRING
                    }
                }
            }
        },
        // a description of the class that this constructor belongs to
        classdesc: {
            type: STRING,
            optional: true
        },
        comment: {
            type: STRING
        },
        copyright: {
            type: STRING,
            optional: true
        },
        defaultvalue: {
            optional: true
        },
        defaultvaluetype: {
            type: STRING,
            optional: true,
            enum: [OBJECT, ARRAY]
        },
        // is usage of this symbol deprecated?
        deprecated: {
            type: [STRING, BOOLEAN],
            optional: true
        },
        // a description
        description: {
            type: STRING_OPTIONAL,
            optional: true
        },
        // something else to consider
        examples: {
            type: ARRAY,
            optional: true,
            items: {
                type: STRING
            }
        },
        exceptions: {
            type: ARRAY,
            optional: true,
            items: PARAM_SCHEMA
        },
        // the path to another constructor
        extends: {
            type: ARRAY,
            optional: true,
            uniqueItems: true,
            items: {
                type: STRING
            }
        },
        // the path to another doc object
        fires: {
            type: ARRAY,
            optional: true,
            uniqueItems: true,
            items: {
                type: STRING,
                pattern: EVENT_REGEXP
            }
        },
        forceMemberof: {
            type: BOOLEAN_OPTIONAL,
            optional: true
        },
        ignore: {
            type: BOOLEAN,
            optional: true
        },
        implements: {
            type: ARRAY,
            optional: true,
            uniqueItems: true,
            items: {
                type: STRING
            }
        },
        inherited: {
            type: BOOLEAN,
            optional: true
        },
        inherits: {
            type: STRING,
            optional: true,
            dependency: {
                inherited: true
            }
        },
        isEnum: {
            type: BOOLEAN,
            optional: true
        },
        // what kind of symbol is this?
        kind: {
            type: STRING,
            // TODO: define this as an enumeration elsewhere
            enum: [
                'class',
                'constant',
                'event',
                'external',
                'file',
                'function',
                'member',
                'mixin',
                'module',
                'namespace',
                'package',
                'param',
                'typedef'
            ]
        },
        license: {
            type: STRING,
            optional: true
        },
        listens: {
            type: ARRAY,
            optional: true,
            uniqueItems: true,
            items: {
                type: STRING,
                pattern: EVENT_REGEXP
            }
        },
        longname: {
            type: STRING
        },
        // probably a leading substring of the path
        memberof: {
            type: STRING,
            optional: true
        },
        // information about this doc
        meta: META_SCHEMA,
        mixes: {
            type: ARRAY,
            optional: true,
            uniqueItems: true,
            items: {
                type: STRING
            }
        },
        // probably a trailing substring of the path
        name: {
            type: STRING
        },
        // is this member nullable? (derived from the type expression)
        nullable: {
            type: BOOLEAN_OPTIONAL
        },
        // is this member optional? (derived from the type expression)
        optional: {
            type: BOOLEAN_OPTIONAL
        },
        // are there function parameters associated with this doc?
        params: {
            type: ARRAY,
            optional: true,
            uniqueItems: true,
            items: PARAM_SCHEMA
        },
        preserveName: {
            type: BOOLEAN,
            optional: true
        },
        properties: {
            type: ARRAY,
            optional: true,
            uniqueItems: true,
            minItems: 1,
            items: {
                anyOf: [ENUM_PROPERTY_SCHEMA, PARAM_SCHEMA]
            }
        },
        readonly: {
            type: BOOLEAN,
            optional: true
        },
        // the symbol being documented requires another symbol
        requires: {
            type: ARRAY,
            optional: true,
            uniqueItems: true,
            minItems: 1,
            items: {
                type: STRING
            }
        },
        returns: {
            type: ARRAY,
            optional: true,
            minItems: 1,
            items: PARAM_SCHEMA
        },
        // what sort of parent scope does this symbol have?
        scope: {
            type: STRING,
            enum: [
                // TODO: make these an enumeration
                'global',
                'inner',
                'instance',
                'static'
            ]
        },
        // something else to consider
        see: {
            type: ARRAY,
            optional: true,
            minItems: 1,
            items: {
                type: STRING
            }
        },
        // at what previous version was this doc added?
        since: {
            type: STRING,
            optional: true
        },
        summary: {
            type: STRING,
            optional: true
        },
        // arbitrary tags associated with this doc
        tags: {
            type: ARRAY,
            optional: true,
            minItems: 1,
            items: {
                type: OBJECT,
                additionalProperties: false,
                properties: {
                    originalTitle: {
                        type: STRING
                    },
                    text: {
                        type: STRING,
                        optional: true
                    },
                    title: {
                        type: STRING
                    },
                    value: {
                        type: [STRING, OBJECT],
                        optional: true,
                        properties: PARAM_SCHEMA
                    }
                }
            }
        },
        'this': {
            type: STRING,
            optional: true
        },
        todo: {
            type: ARRAY,
            optional: true,
            minItems: 1,
            items: {
                type: STRING
            }
        },
        // extended tutorials
        tutorials: {
            type: ARRAY,
            optional: true,
            minItems: 1,
            items: {
                type: STRING
            }
        },
        // what type is the value that this doc is associated with, like `number`
        type: TYPE_PROPERTY_SCHEMA,
        undocumented: {
            type: BOOLEAN,
            optional: true
        },
        // can this member be provided more than once? (derived from the type expression)
        variable: {
            type: BOOLEAN_OPTIONAL
        },
        variation: {
            type: STRING,
            optional: true
        },
        // what is the version of this doc
        version: {
            type: STRING,
            optional: true
        },
        // is a member left to be implemented during inheritance?
        virtual: {
            type: BOOLEAN,
            optional: true
        }
    }
};

var PACKAGE_SCHEMA = exports.PACKAGE_SCHEMA = {
    type: OBJECT,
    additionalProperties: false,
    properties: {
        description: {
            type: STRING,
            optional: true
        },
        files: {
            type: ARRAY,
            uniqueItems: true,
            minItems: 1,
            items: {
                type: STRING
            }
        },
        kind: {
            type: STRING,
            enum: ['package']
        },
        licenses: {
            type: ARRAY,
            optional: true,
            minItems: 1,
            items: {
                type: OBJECT,
                additionalProperties: false,
                properties: {
                    type: {
                        type: STRING,
                        optional: true
                    },
                    url: {
                        type: STRING,
                        optional: true,
                        format: 'uri'
                    }
                }
            }
        },
        longname: {
            type: STRING,
            optional: true,
            pattern: PACKAGE_REGEXP
        },
        name: {
            type: STRING,
            optional: true
        },
        version: {
            type: STRING,
            optional: true
        }
    }
};

var DOCLETS_SCHEMA = exports.DOCLETS_SCHEMA = {
    type: ARRAY,
    uniqueItems: true,
    items: {
        anyOf: [DOCLET_SCHEMA, PACKAGE_SCHEMA]
    }
};
