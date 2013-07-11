/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/domReady",["./has"],function(_1){
var _2=this,_3=document,_4={"loaded":1,"complete":1},_5=typeof _3.readyState!="string",_6=!!_4[_3.readyState],_7=[],_8;
function _9(_a){
_7.push(_a);
if(_6){
_b();
}
};
_9.load=function(id,_c,_d){
_9(_d);
};
_9._Q=_7;
_9._onQEmpty=function(){
};
if(_5){
_3.readyState="loading";
}
function _b(){
if(_8){
return;
}
_8=true;
while(_7.length){
try{
(_7.shift())(_3);
}
catch(err){
}
}
_8=false;
_9._onQEmpty();
};
if(!_6){
var _e=[],_f=function(evt){
evt=evt||_2.event;
if(_6||(evt.type=="readystatechange"&&!_4[_3.readyState])){
return;
}
if(_5){
_3.readyState="complete";
}
_6=1;
_b();
},on=function(_10,_11){
_10.addEventListener(_11,_f,false);
_7.push(function(){
_10.removeEventListener(_11,_f,false);
});
};
if(!_1("dom-addeventlistener")){
on=function(_12,_13){
_13="on"+_13;
_12.attachEvent(_13,_f);
_7.push(function(){
_12.detachEvent(_13,_f);
});
};
var div=_3.createElement("div");
try{
if(div.doScroll&&_2.frameElement===null){
_e.push(function(){
try{
div.doScroll("left");
return 1;
}
catch(e){
}
});
}
}
catch(e){
}
}
on(_3,"DOMContentLoaded");
on(_2,"load");
if("onreadystatechange" in _3){
on(_3,"readystatechange");
}else{
if(!_5){
_e.push(function(){
return _4[_3.readyState];
});
}
}
if(_e.length){
var _14=function(){
if(_6){
return;
}
var i=_e.length;
while(i--){
if(_e[i]()){
_f("poller");
return;
}
}
setTimeout(_14,30);
};
_14();
}
}
return _9;
});
