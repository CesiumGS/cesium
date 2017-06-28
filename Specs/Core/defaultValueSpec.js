/*global defineSuite*/
defineSuite([
        'Core/defaultValue'
    ], function(
        defaultValue) {
    'use strict';

    it('Works with first parameter undefined', function() {
        expect(function(){
            defaultValue.defaultValue(undefined, 5);
        }).toEqual(5);
    });

    it('Works with first parameter null', function() {
        expect(function(){
            defaultValue.defaultValue(null, 5);
        }).toEqual(5);
    });

    it('Works with first parameter not undefined and not null', function() {
        expect(function(){
            defaultValue.defaultValue(1, 5);
        }).toEqual(1);
    });

});
