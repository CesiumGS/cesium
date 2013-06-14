/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/unload",["./kernel","./lang","../on"],function(_1,_2,on){
var _3=window;
var _4={addOnWindowUnload:function(_5,_6){
if(!_1.windowUnloaded){
on(_3,"unload",(_1.windowUnloaded=function(){
}));
}
on(_3,"unload",_2.hitch(_5,_6));
},addOnUnload:function(_7,_8){
on(_3,"beforeunload",_2.hitch(_7,_8));
}};
_1.addOnWindowUnload=_4.addOnWindowUnload;
_1.addOnUnload=_4.addOnUnload;
return _4;
});
