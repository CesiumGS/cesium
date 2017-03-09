/*global define*/
define([
        './defaultValue',
        './defined',
        './defineProperties'
    ], function(
        defaultValue,
        defined,
        defineProperties) {
    'use strict';
    
    function ManagedArray(length) {
        length = defaultValue(length, 0);
        this._array = new Array(length);
        this._length = length;
    }
    
    defineProperties(ManagedArray.prototype, {
        length : {
            get : function() {
                return this._length;
            },
            
            set : function(length) {
                this._length = length;
                if (length > this._array.length) {
                    this._array.length = length;
                }
            }
        },
        
        internalData : {
            get : function() {
                return this._array;
            }
        }
    });
    
    ManagedArray.prototype.get = function(index) {
        return this._array[index];
    };
    
    ManagedArray.prototype.set = function(index, value) {
        if (index >= this.length) {
            this.length = index + 1;
        }
        this._array[index] = value;  
    };
    
    ManagedArray.prototype.push = function(element) {
        var index = this.length++;
        this._array[index] = element;
    };
    
    ManagedArray.prototype.pop = function() {
        return this._array[--this.length];  
    };
    
    ManagedArray.prototype.reserve = function(length) {
        if (length > this._array.length) {
            this._array.length = length;
        }  
    };
    
    ManagedArray.prototype.resize = function(length) {
        this.length = length;  
    };
    
    ManagedArray.prototype.trim = function(length) {
        length = defaultValue(length, this.length);
        this._array.length = length;  
    };
    
    return ManagedArray;
});
