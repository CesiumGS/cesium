
    // Jasmine 2.1 requires that objects be constructed with the same constructor in
    // order to be considered equal.  The 'arguments' keyword looks like an array, but
    // it's actually (at least in Chrome and Firefox) constructed with a special
    // constructor, so it never compares Jasmine-equal to an array.  This function lets
    // us create an arguments array.

    /**
     * Jasmine 2.1 requires that objects be constructed with the same constructor in
     * order to be considered equal.  The 'arguments' keyword looks like an array, but
     * it's actually (at least in Chrome and Firefox) constructed with a special
     * constructor, so it never compares Jasmine-equal to an array.  This function lets
     * us create an arguments array.
     * @alias getArguments
     * @return {Array} The arguments passed to the function.
     */
    function getArguments() {
        return arguments;
    }
export default getArguments;
