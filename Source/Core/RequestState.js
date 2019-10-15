import freezeObject from '../Core/freezeObject.js';

    /**
     * State of the request.
     *
     * @exports RequestState
     */
    var RequestState = {
        /**
         * Initial unissued state.
         *
         * @type Number
         * @constant
         */
        UNISSUED : 0,

        /**
         * Issued but not yet active. Will become active when open slots are available.
         *
         * @type Number
         * @constant
         */
        ISSUED : 1,

        /**
         * Actual http request has been sent.
         *
         * @type Number
         * @constant
         */
        ACTIVE : 2,

        /**
         * Request completed successfully.
         *
         * @type Number
         * @constant
         */
        RECEIVED : 3,

        /**
         * Request was cancelled, either explicitly or automatically because of low priority.
         *
         * @type Number
         * @constant
         */
        CANCELLED : 4,

        /**
         * Request failed.
         *
         * @type Number
         * @constant
         */
        FAILED : 5
    };
export default freezeObject(RequestState);
