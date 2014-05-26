/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/config",["../has","require"],function(_1,_2){
var _3={};
if(1){
var _4=_2.rawConfig,p;
for(p in _4){
_3[p]=_4[p];
}
}else{
var _5=function(_6,_7,_8){
for(p in _6){
p!="has"&&_1.add(_7+p,_6[p],0,_8);
}
};
_3=1?_2.rawConfig:this.dojoConfig||this.djConfig||{};
_5(_3,"config",1);
_5(_3.has,"",1);
}
if(!_3.locale&&typeof navigator!="undefined"){
_3.locale=(navigator.language||navigator.userLanguage).toLowerCase();
}
return _3;
});
