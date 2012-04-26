/**
    Functions related to events. Designed to be mixed into other classes.
    @exports common/events
    @author Michael Mathews <micmath@gmail.com>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
*/
module.exports = {
    /**
        @param {string} type
        @param {function} handler
        @returns {this}
    */
    on: function(type, handler, context) {
        if ( !type ||  !handler ) {
            return;
        }
        if ( !context ) { context = this; }
        
        if ( !this.__bindings ) { this.__bindings = {}; }
        // TODO check here for hasOwnProperty?
        if ( !this.__bindings[type] ) { this.__bindings[type] = []; }
        
        var call = function(e) {
            return handler.call(context, e);
        };
        this.__bindings[type].push( {handler: handler, call: call} );
        
        return this; // chainable
    },
    
    /**
        @param {string} type
        @param {object} [eventData]
        @returns {this}
    */
    fire: function(eventType, eventData) {
        if ( !eventType || !this.__bindings || !this.__bindings[eventType] ) {
            return;
        }
        
        // run handlers in first-in-first-run order
        for (var i = 0, leni = this.__bindings[eventType].length; i < leni; i++) {
            if ( false === this.__bindings[eventType][i].call(eventData) ) {
                if (eventData) { eventData.defaultPrevented = true; }
            }
        }
        
        return this; // chainable
    },
    
    /**
        @param {string} type
        @param {function} handler
    */
    removeListener: function(type, handler) {
        if ( !type ||  !handler || !this.__bindings || !this.__bindings[type] ) {
            return;
        }
        
        var i = this.__bindings[type].length;
        while ( i-- ) {
            if ( this.__bindings[type][i].handler === handler ) {
                this.__bindings[type].splice(i, 1);
            }
        }
        
        if (this.__bindings[type].length === 0) {
            delete this.__bindings[type];
        }
    }
};