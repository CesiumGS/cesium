/**
    @overview Builds a tree-like JSON string from the doclet data.
    @version 0.0.1
 */

(function() {

    /**
        @global
        @param {TAFFY} data
        @param {object} opts
     */
    publish = function(data, opts) {

        var root = {},
            docs;
        
        data.remove({undocumented: true});
        docs = data.get(); // <-- an array of Doclet objects

        graft(root, docs);
        
        if (opts.destination === 'console') {
            if (opts.query && opts.query.format === 'xml') {
                var xml = require('goessner/json2xml');
                console.log( '<jsdoc>\n' + xml.convert(root) + '\n</jsdoc>' );
            }
            else {
                console.log(root);
            }
        }
        else {
            console.log('The only -d destination option currently supported is "console"!');
        }
        
    }
    
    function graft(parentNode, childNodes, parentLongname, parentName) {
        childNodes
        .filter(function (element) {            
            return (element.memberof === parentLongname);
        })
        .forEach(function (element, i) {
            //console.log((i+1)+': '+element.kind+' '+element.longname+' ('+element.name+')');
            
            if (element.kind === 'namespace') {
                if (! parentNode.namespaces) {
                    parentNode.namespaces = { };
                }
                
                var thisNamespace = parentNode.namespaces[element.name] = {
                    'name': element.name,
                    'description': element.description || '',
                    'access': element.access || '',
                    'virtual': !!element.virtual
                };
                
                graft(thisNamespace, childNodes, element.longname, element.name);
            }
            else if (element.kind === 'mixin') {
                if (! parentNode.mixins) {
                    parentNode.mixins = { };
                }
                
                var thisMixin = parentNode.mixins[element.name] = {
                    'name': element.name,
                    'description': element.description || '',
                    'access': element.access || '',
                    'virtual': !!element.virtual
                };
                
                graft(thisMixin, childNodes, element.longname, element.name);
            }
            else if (element.kind === 'function') {
                if (! parentNode.functions) {
                    parentNode.functions = { };
                }
                
                var thisFunction = parentNode.functions[element.name] = {
                    'name': element.name,
                    'access': element.access || '',
                    'virtual': !!element.virtual,
                    'description': element.description || '',
                    'parameters': [ ]
                };
                
                if (element.returns) {
                    parentNode.functions[element.name].returns = {
                        'type': element.returns.type? (element.returns.type.names.length === 1? element.returns.type.names[0] : element.returns.type.names) : '',
                        'description': element.returns.description || ''
                    };
                }
                
                if (element.params) {
                    for (var i = 0, len = element.params.length; i < len; i++) {
                        thisFunction.parameters.push({
                            'name': element.params[i].name,
                            'type': element.params[i].type? (element.params[i].type.names.length === 1? element.params[i].type.names[0] : element.params[i].type.names) : '',
                            'description': element.params[i].description || '',
                            'default': element.params[i].defaultvalue || '',
                            'optional': typeof element.params[i].optional === 'boolean'? element.params[i].optional : '',
                            'nullable': typeof element.params[i].nullable === 'boolean'? element.params[i].nullable : ''
                        });
                    }
                }
            }
            else if (element.kind === 'property') {
                if (! parentNode.properties) {
                    parentNode.properties = { };
                }
                parentNode.properties[element.name] = {
                    'name': element.name,
                    'access': element.access || '',
                    'virtual': !!element.virtual,
                    'description': element.description || '',
                    'type': element.type? (element.type.length === 1? element.type[0] : element.type) : ''
                };
            }
            
            else if (element.kind === 'event') {
                if (! parentNode.events) {
                    parentNode.events = { };
                }
                
                var thisEvent = parentNode.events[element.name] = {
                    'name': element.name,
                    'access': element.access || '',
                    'virtual': !!element.virtual,
                    'description': element.description || '',
                    'parameters': [
                    ]
                };
                
                if (element.returns) {
                    parentNode.events[element.name].returns = {
                        'type': element.returns.type? (element.returns.type.names.length === 1? element.returns.type.names[0] : element.returns.type.names) : '',
                        'description': element.returns.description || ''
                    };
                }
                
                if (element.params) {
                    for (var i = 0, len = element.params.length; i < len; i++) {
                        thisEvent.parameters.push({
                            'name': element.params[i].name,
                            'type': element.params[i].type? (element.params[i].type.names.length === 1? element.params[i].type.names[0] : element.params[i].type.names) : '',
                            'description': element.params[i].description || '',
                            'default': element.params[i].defaultvalue || '',
                            'optional': typeof element.params[i].optional === 'boolean'? element.params[i].optional : '',
                            'nullable': typeof element.params[i].nullable === 'boolean'? element.params[i].nullable : ''
                        });
                    }
                }
            }
            else if (element.kind === 'class') {
                if (! parentNode.classes) {
                    parentNode.classes = { };
                }
                
                var thisClass = parentNode.classes[element.name] = {
                    'name': element.name,
                    'description': element.classdesc || '',
                    'extends': element.augments || [],
                    'access': element.access || '',
                    'virtual': !!element.virtual,
                    'fires': element.fires || '',
                    'constructor': {
                        'name': element.name,
                        'description': element.description || '',
                        'parameters': [
                        ]
                    }
                };
                
                if (element.params) {
                    for (var i = 0, len = element.params.length; i < len; i++) {
                        thisClass.constructor.parameters.push({
                            'name': element.params[i].name,
                            'type': element.params[i].type? (element.params[i].type.names.length === 1? element.params[i].type.names[0] : element.params[i].type.names) : '',
                            'description': element.params[i].description || '',
                            'default': element.params[i].defaultvalue || '',
                            'optional': typeof element.params[i].optional === 'boolean'? element.params[i].optional : '',
                            'nullable': typeof element.params[i].nullable === 'boolean'? element.params[i].nullable : ''
                        });
                    }
                }
                
                graft(thisClass, childNodes, element.longname, element.name);
           }
        });
    }

})();

