/** @constructor */
function Thingy() {

    /** @access private */
    var foo = 0;
    
    /** @access protected */
    this._bar = 1;
    
    /** @access public */
    this.pez = 2;
    
}

// same as...

/** @constructor */
function OtherThingy() {

    /** @private */
    var foo = 0;
    
    /** @protected */
    this._bar = 1;
    
    /** @public */
    this.pez = 2;
    
}