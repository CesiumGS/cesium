To create or use your own template, create a folder, and give it the name of your template, for example "mycooltemplate". Within this folder create a file named "publish.js". That file must define a global method named "publish". For example:

````javascript
/**
 * Turn the data about your docs into file output.
 * @global
 * @param {TAFFY} data - A TaffyDB collection representing
 *                       all the symbols documented in your code.
 * @param {object} opts - An object with options information.
 */
function publish(data, opts) {
    // do stuff here to generate your output files
}
````

To invoke JSDoc 3 with your own template, use the `-t` command line option, giving it the path to your template folder.

````
./jsdoc mycode.js -t /path/to/mycooltemplate
````