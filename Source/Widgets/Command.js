import DeveloperError from '../Core/DeveloperError.js';

    /**
     * A Command is a function with an extra <code>canExecute</code> observable property to determine
     * whether the command can be executed.  When executed, a Command function will check the
     * value of <code>canExecute</code> and throw if false.
     *
     * This type describes an interface and is not intended to be instantiated directly.
     * See {@link createCommand} to create a command from a function.
     *
     * @alias Command
     * @constructor
     */
    function Command() {
        /**
         * Gets whether this command can currently be executed.  This property is observable.
         * @type {Boolean}
         * @default undefined
         */
        this.canExecute = undefined;

        /**
         * Gets an event which is raised before the command executes, the event
         * is raised with an object containing two properties: a <code>cancel</code> property,
         * which if set to false by the listener will prevent the command from being executed, and
         * an <code>args</code> property, which is the array of arguments being passed to the command.
         * @type {Event}
         * @default undefined
         */
        this.beforeExecute = undefined;

        /**
         * Gets an event which is raised after the command executes, the event
         * is raised with the return value of the command as its only parameter.
         * @type {Event}
         * @default undefined
         */
        this.afterExecute = undefined;

        DeveloperError.throwInstantiationError();
    }
export default Command;
