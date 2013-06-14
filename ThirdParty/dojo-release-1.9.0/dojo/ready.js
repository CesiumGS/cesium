/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/ready",["./_base/kernel","./has","require","./domReady","./_base/lang"],function(_1,_2,_3,_4,_5){
var _6=0,_7=[],_8=0,_9=function(){
_6=1;
_1._postLoad=_1.config.afterOnLoad=true;
_a();
},_a=function(){
if(_8){
return;
}
_8=1;
while(_6&&(!_4||_4._Q.length==0)&&(_3.idle?_3.idle():true)&&_7.length){
var f=_7.shift();
try{
f();
}
catch(e){
e.info=e.message;
if(_3.signal){
_3.signal("error",e);
}else{
throw e;
}
}
}
_8=0;
};
_3.on&&_3.on("idle",_a);
if(_4){
_4._onQEmpty=_a;
}
var _b=_1.ready=_1.addOnLoad=function(_c,_d,_e){
var _f=_5._toArray(arguments);
if(typeof _c!="number"){
_e=_d;
_d=_c;
_c=1000;
}else{
_f.shift();
}
_e=_e?_5.hitch.apply(_1,_f):function(){
_d();
};
_e.priority=_c;
for(var i=0;i<_7.length&&_c>=_7[i].priority;i++){
}
_7.splice(i,0,_e);
_a();
};
1||_2.add("dojo-config-addOnLoad",1);
if(1){
var dca=_1.config.addOnLoad;
if(dca){
_b[(_5.isArray(dca)?"apply":"call")](_1,dca);
}
}
if(1&&_1.config.parseOnLoad&&!_1.isAsync){
_b(99,function(){
if(!_1.parser){
_1.deprecated("Add explicit require(['dojo/parser']);","","2.0");
_3(["dojo/parser"]);
}
});
}
if(_4){
_4(_9);
}else{
_9();
}
return _b;
});
