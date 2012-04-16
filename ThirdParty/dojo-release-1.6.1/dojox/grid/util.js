/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.util"]){
dojo._hasResource["dojox.grid.util"]=true;
dojo.provide("dojox.grid.util");
(function(){
var _1=dojox.grid.util;
_1.na="...";
_1.rowIndexTag="gridRowIndex";
_1.gridViewTag="gridView";
_1.fire=function(ob,ev,_2){
var fn=ob&&ev&&ob[ev];
return fn&&(_2?fn.apply(ob,_2):ob[ev]());
};
_1.setStyleHeightPx=function(_3,_4){
if(_4>=0){
var s=_3.style;
var v=_4+"px";
if(_3&&s["height"]!=v){
s["height"]=v;
}
}
};
_1.mouseEvents=["mouseover","mouseout","mousedown","mouseup","click","dblclick","contextmenu"];
_1.keyEvents=["keyup","keydown","keypress"];
_1.funnelEvents=function(_5,_6,_7,_8){
var _9=(_8?_8:_1.mouseEvents.concat(_1.keyEvents));
for(var i=0,l=_9.length;i<l;i++){
_6.connect(_5,"on"+_9[i],_7);
}
};
_1.removeNode=function(_a){
_a=dojo.byId(_a);
_a&&_a.parentNode&&_a.parentNode.removeChild(_a);
return _a;
};
_1.arrayCompare=function(_b,_c){
for(var i=0,l=_b.length;i<l;i++){
if(_b[i]!=_c[i]){
return false;
}
}
return (_b.length==_c.length);
};
_1.arrayInsert=function(_d,_e,_f){
if(_d.length<=_e){
_d[_e]=_f;
}else{
_d.splice(_e,0,_f);
}
};
_1.arrayRemove=function(_10,_11){
_10.splice(_11,1);
};
_1.arraySwap=function(_12,inI,inJ){
var _13=_12[inI];
_12[inI]=_12[inJ];
_12[inJ]=_13;
};
})();
}
