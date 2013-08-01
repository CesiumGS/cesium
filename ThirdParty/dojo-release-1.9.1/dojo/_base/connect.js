/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/connect",["./kernel","../on","../topic","../aspect","./event","../mouse","./sniff","./lang","../keys"],function(_1,on,_2,_3,_4,_5,_6,_7){
_6.add("events-keypress-typed",function(){
var _8={charCode:0};
try{
_8=document.createEvent("KeyboardEvent");
(_8.initKeyboardEvent||_8.initKeyEvent).call(_8,"keypress",true,true,null,false,false,false,false,9,3);
}
catch(e){
}
return _8.charCode==0&&!_6("opera");
});
function _9(_a,_b,_c,_d,_e){
_d=_7.hitch(_c,_d);
if(!_a||!(_a.addEventListener||_a.attachEvent)){
return _3.after(_a||_1.global,_b,_d,true);
}
if(typeof _b=="string"&&_b.substring(0,2)=="on"){
_b=_b.substring(2);
}
if(!_a){
_a=_1.global;
}
if(!_e){
switch(_b){
case "keypress":
_b=_f;
break;
case "mouseenter":
_b=_5.enter;
break;
case "mouseleave":
_b=_5.leave;
break;
}
}
return on(_a,_b,_d,_e);
};
var _10={106:42,111:47,186:59,187:43,188:44,189:45,190:46,191:47,192:96,219:91,220:92,221:93,222:39,229:113};
var _11=_6("mac")?"metaKey":"ctrlKey";
var _12=function(evt,_13){
var _14=_7.mixin({},evt,_13);
_15(_14);
_14.preventDefault=function(){
evt.preventDefault();
};
_14.stopPropagation=function(){
evt.stopPropagation();
};
return _14;
};
function _15(evt){
evt.keyChar=evt.charCode?String.fromCharCode(evt.charCode):"";
evt.charOrCode=evt.keyChar||evt.keyCode;
};
var _f;
if(_6("events-keypress-typed")){
var _16=function(e,_17){
try{
return (e.keyCode=_17);
}
catch(e){
return 0;
}
};
_f=function(_18,_19){
var _1a=on(_18,"keydown",function(evt){
var k=evt.keyCode;
var _1b=(k!=13)&&k!=32&&(k!=27||!_6("ie"))&&(k<48||k>90)&&(k<96||k>111)&&(k<186||k>192)&&(k<219||k>222)&&k!=229;
if(_1b||evt.ctrlKey){
var c=_1b?0:k;
if(evt.ctrlKey){
if(k==3||k==13){
return _19.call(evt.currentTarget,evt);
}else{
if(c>95&&c<106){
c-=48;
}else{
if((!evt.shiftKey)&&(c>=65&&c<=90)){
c+=32;
}else{
c=_10[c]||c;
}
}
}
}
var _1c=_12(evt,{type:"keypress",faux:true,charCode:c});
_19.call(evt.currentTarget,_1c);
if(_6("ie")){
_16(evt,_1c.keyCode);
}
}
});
var _1d=on(_18,"keypress",function(evt){
var c=evt.charCode;
c=c>=32?c:0;
evt=_12(evt,{charCode:c,faux:true});
return _19.call(this,evt);
});
return {remove:function(){
_1a.remove();
_1d.remove();
}};
};
}else{
if(_6("opera")){
_f=function(_1e,_1f){
return on(_1e,"keypress",function(evt){
var c=evt.which;
if(c==3){
c=99;
}
c=c<32&&!evt.shiftKey?0:c;
if(evt.ctrlKey&&!evt.shiftKey&&c>=65&&c<=90){
c+=32;
}
return _1f.call(this,_12(evt,{charCode:c}));
});
};
}else{
_f=function(_20,_21){
return on(_20,"keypress",function(evt){
_15(evt);
return _21.call(this,evt);
});
};
}
}
var _22={_keypress:_f,connect:function(obj,_23,_24,_25,_26){
var a=arguments,_27=[],i=0;
_27.push(typeof a[0]=="string"?null:a[i++],a[i++]);
var a1=a[i+1];
_27.push(typeof a1=="string"||typeof a1=="function"?a[i++]:null,a[i++]);
for(var l=a.length;i<l;i++){
_27.push(a[i]);
}
return _9.apply(this,_27);
},disconnect:function(_28){
if(_28){
_28.remove();
}
},subscribe:function(_29,_2a,_2b){
return _2.subscribe(_29,_7.hitch(_2a,_2b));
},publish:function(_2c,_2d){
return _2.publish.apply(_2,[_2c].concat(_2d));
},connectPublisher:function(_2e,obj,_2f){
var pf=function(){
_22.publish(_2e,arguments);
};
return _2f?_22.connect(obj,_2f,pf):_22.connect(obj,pf);
},isCopyKey:function(e){
return e[_11];
}};
_22.unsubscribe=_22.disconnect;
1&&_7.mixin(_1,_22);
return _22;
});
