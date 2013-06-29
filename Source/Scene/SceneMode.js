/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports SceneMode
     */
    var SceneMode = {
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        SCENE2D : new Enumeration(0, 'SCENE2D', {
            morphTime : 0.0
        }),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        COLUMBUS_VIEW : new Enumeration(1, 'COLUMBUS_VIEW', {
            morphTime : 0.0
        }),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        SCENE3D : new Enumeration(2, 'SCENE3D', {
            morphTime : 1.0
        }),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 3
         */
        MORPHING : new Enumeration(3, 'MORPHING')
    };

    return SceneMode;
});
