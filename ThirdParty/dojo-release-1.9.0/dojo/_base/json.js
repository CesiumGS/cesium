/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/json",["./kernel","../json"],function(_1,_2){
_1.fromJson=function(js){
return eval("("+js+")");
};
_1._escapeString=_2.stringify;
_1.toJsonIndentStr="\t";
_1.toJson=function(it,_3){
return _2.stringify(it,function(_4,_5){
if(_5){
var tf=_5.__json__||_5.json;
if(typeof tf=="function"){
return tf.call(_5);
}
}
return _5;
},_3&&_1.toJsonIndentStr);
};
return _1;
});
