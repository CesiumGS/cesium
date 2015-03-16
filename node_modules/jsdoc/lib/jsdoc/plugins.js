/*global app: true */
/**
 * Utility functions to support the JSDoc plugin framework.
 * @module jsdoc/plugins
 */
'use strict';

var logger = require('jsdoc/util/logger');
var path = require('jsdoc/path');

function addHandlers(handlers, parser) {
    Object.keys(handlers).forEach(function(eventName) {
        parser.on(eventName, handlers[eventName]);
    });
}

exports.installPlugins = function(plugins, parser) {
    var dictionary = require('jsdoc/tag/dictionary');

    var eventName;
    var plugin;

    for (var i = 0, l = plugins.length; i < l; i++) {
        plugin = require(plugins[i]);

        // allow user-defined plugins to...
        //...register event handlers
        if (plugin.handlers) {
            addHandlers(plugin.handlers, parser);
        }

        //...define tags
        if (plugin.defineTags) {
            plugin.defineTags(dictionary);
        }

        //...add a Rhino node visitor (deprecated in JSDoc 3.3)
        if (plugin.nodeVisitor) {
            if ( !parser.addNodeVisitor ) {
                logger.error('Unable to add the Rhino node visitor from %s, because JSDoc ' +
                    'is not using the Rhino JavaScript parser.', plugins[i]);
            }
            else {
                parser.addNodeVisitor(plugin.nodeVisitor);
            }
        }

        //...add a Mozilla Parser API node visitor
        if (plugin.astNodeVisitor) {
            parser.addAstNodeVisitor(plugin.astNodeVisitor);
        }
    }
};
