/*global define*/
define(function() {
    "use strict";

    function DynamicObject(id) {
        //TODO Throw developer error on undefined id?
        this.id = id;
    }

    return DynamicObject;
});