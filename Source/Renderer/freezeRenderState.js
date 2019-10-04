import freezeObject from '../Core/freezeObject.js';

        /**
         * Returns frozen renderState as well as all of the object literal properties. This function is deep object freeze
         * function ignoring properties named "_applyFunctions".
         *
         * @private
         *
         * @param {Object} renderState
         * @returns {Object} Returns frozen renderState.
         *
         */
        function freezeRenderState(renderState) {
            if (typeof renderState !== 'object' || renderState === null) {
                return renderState;
            }

            var propName;
            var propNames = Object.keys(renderState);

            for (var i = 0; i < propNames.length; i++) {
                propName = propNames[i];
                if (renderState.hasOwnProperty(propName) && propName !== '_applyFunctions') {
                    renderState[propName] = freezeRenderState(renderState[propName]);
                }
            }
            return freezeObject(renderState);
        }
export default freezeRenderState;
