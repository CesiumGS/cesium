/** @class */
function Asset() {
    this._name = '';
}

/**
 *
 * Set the value of the name property.
 * @param {string} newName
 *
 *//**
 *
 * Get the value of the name property.
 * @returns {string}
 *
 */
Asset.prototype.name = function(newName) {
    if (newName) { this._name = newName; }
    else { return this._name; }
}