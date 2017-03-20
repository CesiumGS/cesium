/*global define*/
define([
    '../Core/defined',
    '../Core/freezeObject'
], function(
    defined,
    freezeObject) {
        'use strict';

        /**
         * Returns frozen renderState as well as all of the object literal properties. This function is deep object freeze
         * function ignoring properties named "_applyFunctions".
         *
         * @exports freezeRenderState
         *
         * @param {Object} renderState
         * @returns {Object} Returns frozen renderState.
         *
         */
        function freezeRenderState(renderState) {
            if (typeof renderState !== 'object') {
                return renderState;
            }

            var i, propName, propNames = Object.keys(renderState);

            for (i = 0; i < propNames.length; i++) {
                propName = propNames[i];
                if (renderState.hasOwnProperty(propName) && propName !== '_applyFunctions') {
                    renderState[propName] = freezeRenderState(renderState[propName]);
                }
            }

            return freezeObject(renderState);
        }

        return freezeRenderState;
    });
