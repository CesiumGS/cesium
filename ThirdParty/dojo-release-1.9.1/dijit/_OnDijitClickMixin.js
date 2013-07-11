//>>built
define("dijit/_OnDijitClickMixin",["dojo/on","dojo/_base/array","dojo/keys","dojo/_base/declare","dojo/has","./a11yclick"],function(on,_1,_2,_3,_4,_5){
var _6=_3("dijit._OnDijitClickMixin",null,{connect:function(_7,_8,_9){
return this.inherited(arguments,[_7,_8=="ondijitclick"?_5:_8,_9]);
}});
_6.a11yclick=_5;
return _6;
});
