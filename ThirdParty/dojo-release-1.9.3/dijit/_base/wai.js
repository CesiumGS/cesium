//>>built
define("dijit/_base/wai",["dojo/dom-attr","dojo/_base/lang","../main","../hccss"],function(_1,_2,_3){
var _4={hasWaiRole:function(_5,_6){
var _7=this.getWaiRole(_5);
return _6?(_7.indexOf(_6)>-1):(_7.length>0);
},getWaiRole:function(_8){
return _2.trim((_1.get(_8,"role")||"").replace("wairole:",""));
},setWaiRole:function(_9,_a){
_1.set(_9,"role",_a);
},removeWaiRole:function(_b,_c){
var _d=_1.get(_b,"role");
if(!_d){
return;
}
if(_c){
var t=_2.trim((" "+_d+" ").replace(" "+_c+" "," "));
_1.set(_b,"role",t);
}else{
_b.removeAttribute("role");
}
},hasWaiState:function(_e,_f){
return _e.hasAttribute?_e.hasAttribute("aria-"+_f):!!_e.getAttribute("aria-"+_f);
},getWaiState:function(_10,_11){
return _10.getAttribute("aria-"+_11)||"";
},setWaiState:function(_12,_13,_14){
_12.setAttribute("aria-"+_13,_14);
},removeWaiState:function(_15,_16){
_15.removeAttribute("aria-"+_16);
}};
_2.mixin(_3,_4);
return _3;
});
