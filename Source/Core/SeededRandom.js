/*global define*/
define(function() {
    "use strict";

    //http://michalbe.blogspot.com/2011/02/javascript-random-numbers-with-custom_23.html
    var SeededRandom = function(seed) {
        var constant = Math.pow(2, 13) + 1;
        var prime = 1987;
        var precision = 1000;

        return function() {
            seed *= constant;
            seed += prime;
            seed %= 1e15;
            return 0.2 + seed % precision / precision * 0.8;
        };
    };

    return SeededRandom;
});


