/**
	@overview Schema for validating JSON produced by JSDoc Toolkit.
	@author Michael Mathews <micmath@gmail.com>
	@license Apache License 2.0 - See file 'LICENSE.md' in this project.
	@see <http://tools.ietf.org/html/draft-zyp-json-schema-02>
 */

exports.jsdocSchema = {
   "properties": {
        "doc": {
            "type": "array",
            "items": {
                "type": "object",
				"additionalProperties": false,
                "properties": {
                	"author": {
                        "type": ["string", "array"],
                        "optional": true,
                        "items": {
                            "type": "string"
                        }
                    },
                    "path": { // unique identifier for each doc
                        "type": "string",
                        "maxItems": 1
                    },
                    "description": { // a description
                        "type": "string",
                        "optional": true,
                        "maxItems": 1
                    },
                    "classdesc": { // a description of the class that this constructor belongs to
                        "type": "string",
                        "optional": true,
                        "maxItems": 1
                    },
                    "name": { // probably a trailing substring of the path
                        "type": "string",
                        "maxItems": 1
                    },
                    "version": { // what is the version of this doc
                        "type": "string",
                        "optional": true,
                        "maxItems": 1
                    },
                    "since": { // at what previous version was this doc added?
                        "type": "string",
                        "optional": true,
                        "maxItems": 1
                    },
                    "see": { // some thing else to consider
                        "type": ["string", "array"],
                        "optional": true,
                        "items": {
                            "type": "string"
                        }
                    },
                    "tutorials": { // extended tutorials
                        "type": ["string", "array"],
                        "optional": true,
                        "items": {
                            "type": "string"
                        }
                    },
					"deprecated": { // is usage of this symbol deprecated?
						"type": ["string", "boolean"],
						"optional": true
					},
                    "scope": { // how is this symbol attached to it's enclosing scope?
                        "type": "string",
                        "maxItems": 1,
                        "enum": ["global", "static", "instance", "inner"]
                    },
                    "memberof": { // probably a leading substring of the path
                        "type": "string",
                        "optional": true,
                        "maxItems": 1
                    },
                    "extends": { // the path to another constructor
                        "type": ["string", "array"],
                        "optional": true,
                        "items": {
                            "type": "string"
                        }
                    },
                    "fires": { // the path to another doc object
                        "type": ["string", "array"],
                        "optional": true,
                        "items": {
                            "type": "string"
                        }
                    },
                    "requires": { // the symbol being documented requires another symbol
                        "type": ["string", "array"],
                        "optional": true,
                        "items": {
                            "type": "string"
                        }
                    },
                    "implements": {
                    	"type": ["string", "array"],
                        "optional": true,
                        "items": {
                            "type": "string"
                        }
                    },
                    "kind": { // what kind of symbol is this?
                        "type": "string",
                        "maxItems": 1,
                        "enum": ["constructor", "module", "event", "namespace", "method", "member", "enum", "class", "interface", "constant", "mixin", "file", "version"]
                    },
                    "refersto": { // the path to another doc: this doc is simply a renamed alias to that
                        "type": "string",
                        "optional": true,
                        "maxItems": 1
                    },
                    "access": { // what access priviledges are allowed
                        "type": "string",
                        "optional": true,
                        "maxItems": 1,
                        "enum": ["private", "protected", "public"]
                    },
                    "virtual": { // is a member left to be implemented during inheritance?
                        "type": "boolean",
                        "optional": true,
                        "default": false
                    },
                    "attrib": { // other attributes, like "readonly"
                        "type": "string",
                        "optional": true
                    },
                    "type": { // what type is the value that this doc is associated with, like "number"
                        "type": ["string", "array"],
                        "optional": true,
                        "items": {
                            "type": "string"
                        }
                    },
                    "exception" : {
                    	"optional": true,
                    	"type": "object",
						"properties": {
							"type": { // what is the type of the value thrown?
								"type": "array",
								"optional": true,
								"items": {
									"type": "string"
								}
							},
							"description": { // a description of the thrown value
								"type": "string",
								"optional": true
							}
						},
						"additionalProperties": false
                    },
                    "returns" : {
                    	"optional": true,
                    	"type": "object",
						"properties": {
							"type": { // what is the type of the value returned?
								"type": ["string", "array"],
								"optional": true,
								"items": {
									"type": "string"
								}
							},
							"description": { // a description of the returned value
								"type": "string",
								"optional": true
							}
						},
						"additionalProperties": false
                    },
                    "param" : { // are there function parameters associated with this doc?
                        "type": "array",
                        "optional": true,
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": { // what are the types of value expected for this parameter?
                                    "type": ["string", "array"],
                                    "optional": true,
                                    "items": {
                                        "type": "string"
                                    }
                                },
                                "optional": { // is a value for this parameter optional?
                                    "type": "boolean",
                                    "optional": true,
                                    "default": true
                                },
                                "nullable": { // can the value for this parameter be null?
                                    "type": "boolean",
                                    "optional": true,
                                    "default": true
                                },
                                "defaultvalue": { // what is the default value for this parameter?
                                    "type": "string",
                                    "optional": true
                                },
                                "name": { // what name does this parameter have within the function?
                                    "type": "string"
                                },
                                "description": { // a description of the parameter
                                    "type": "string",
                                    "optional": true
                                }
                            },
							"additionalProperties": false
                        }
                    },
                    "thisobj": {
                    	"type": ["string", "array"],
                        "optional": true,
                        "items": {
                            "type": "string"
                        }
                    },
                    "example": { // some thing else to consider
                        "type": ["string", "array"],
                        "optional": true,
                        "items": {
                            "type": "string"
                        }
                    },
                    "tags": { // arbitrary tags associated with this doc
                        "type": "array",
                        "optional": true,
                        "additionalProperties": false,
                        "items": {
                            "type": "string"
                        }
                    },
                    "meta": { // information about this doc
                        "type": "object",
                        "optional": true,
                        "maxItems": 1,
                        "properties": {
							"file": { // what is the name of the file this doc appears in?
								"type": "string",
								"optional": true,
								"maxItems": 1
							},
							"line": { // on what line of the file does this doc appear?
								"type": "number",
								"optional": true,
								"maxItems": 1
							}
						},
						"additionalProperties": false
                    }
                }
            }
        },
        "meta": { // information about the generation for all the docs
            "type": "object",
            "optional": true,
            "maxItems": 1,
            "properties": {
				"project": { // to what project does this doc belong?
					"type": "object",
					"optional": true,
					"maxItems": 1,
					"properties": {
						"name": { // the name of the project
							"type": "string",
							"maxItems": 1
						},
						"uri": { // the URI of the project
							"type": "string",
							"maxItems": 1,
							"format": "uri"
						},
						"version": { // the version of the project
							"type": "string",
							"maxItems": 1
						},
						"lang": { // the programming language used in the project
							"type": "string",
							"maxItems": 1
						}
					},
					"additionalProperties": false
				},
				"generated": { // some information about the running of the doc generator
					"type": "object",
					"optional": true,
					"maxItems": 1,
					"properties": {
						"date": { // on what date and time was the doc generated?
							"type": "string",
							"maxItems": 1,
							"optional": true,
							"format": "date-time"
						},
						"parser": { // what tool was used to generate the doc?
							"type": "string",
							"maxItems": 1,
							"optional": true
						}
					},
					"additionalProperties": false
				}
			}
        }
    }
};