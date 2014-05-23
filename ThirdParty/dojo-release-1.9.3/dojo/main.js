/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/main",["./_base/kernel","./has","require","./sniff","./_base/lang","./_base/array","./_base/config","./ready","./_base/declare","./_base/connect","./_base/Deferred","./_base/json","./_base/Color","./has!dojo-firebug?./_firebug/firebug","./_base/browser","./_base/loader"],function(_1,_2,_3,_4,_5,_6,_7,_8){
if(_7.isDebug){
_3(["./_firebug/firebug"]);
}
1||_2.add("dojo-config-require",1);
if(1){
var _9=_7.require;
if(_9){
_9=_6.map(_5.isArray(_9)?_9:[_9],function(_a){
return _a.replace(/\./g,"/");
});
if(_1.isAsync){
_3(_9);
}else{
_8(1,function(){
_3(_9);
});
}
}
}
return _1;
});
