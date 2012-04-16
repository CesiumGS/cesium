/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx.text"]){
dojo._hasResource["dojox.fx.text"]=true;
dojo.provide("dojox.fx.text");
dojo.require("dojo.fx");
dojo.require("dojo.fx.easing");
dojox.fx.text._split=function(_1){
var _2=_1.node=dojo.byId(_1.node),s=_2.style,cs=dojo.getComputedStyle(_2),_3=dojo.coords(_2,true);
_1.duration=_1.duration||1000;
_1.words=_1.words||false;
var _4=(_1.text&&typeof (_1.text)=="string")?_1.text:_2.innerHTML,_5=s.height,_6=s.width,_7=[];
dojo.style(_2,{height:cs.height,width:cs.width});
var _8=/(<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>)/g;
var _9=(_1.words?/(<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>)\s*|([^\s<]+\s*)/g:/(<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>)\s*|([^\s<]\s*)/g);
var _a=(typeof _1.text=="string")?_1.text.match(_9):_2.innerHTML.match(_9);
var _b="";
var _c=0;
var _d=0;
for(var i=0;i<_a.length;i++){
var _e=_a[i];
if(!_e.match(_8)){
_b+="<span>"+_e+"</span>";
_c++;
}else{
_b+=_e;
}
}
_2.innerHTML=_b;
function _f(_10){
var _11=_10.nextSibling;
if(_10.tagName=="SPAN"&&_10.childNodes.length==1&&_10.firstChild.nodeType==3){
var _12=dojo.coords(_10,true);
_d++;
dojo.style(_10,{padding:0,margin:0,top:(_1.crop?"0px":_12.t+"px"),left:(_1.crop?"0px":_12.l+"px"),display:"inline"});
var _13=_1.pieceAnimation(_10,_12,_3,_d,_c);
if(dojo.isArray(_13)){
_7=_7.concat(_13);
}else{
_7[_7.length]=_13;
}
}else{
if(_10.firstChild){
_f(_10.firstChild);
}
}
if(_11){
_f(_11);
}
};
_f(_2.firstChild);
var _14=dojo.fx.combine(_7);
dojo.connect(_14,"onEnd",_14,function(){
_2.innerHTML=_4;
dojo.style(_2,{height:_5,width:_6});
});
if(_1.onPlay){
dojo.connect(_14,"onPlay",_14,_1.onPlay);
}
if(_1.onEnd){
dojo.connect(_14,"onEnd",_14,_1.onEnd);
}
return _14;
};
dojox.fx.text.explode=function(_15){
var _16=_15.node=dojo.byId(_15.node);
var s=_16.style;
_15.distance=_15.distance||1;
_15.duration=_15.duration||1000;
_15.random=_15.random||0;
if(typeof (_15.fade)=="undefined"){
_15.fade=true;
}
if(typeof (_15.sync)=="undefined"){
_15.sync=true;
}
_15.random=Math.abs(_15.random);
_15.pieceAnimation=function(_17,_18,_19,_1a,_1b){
var _1c=_18.h;
var _1d=_18.w;
var _1e=_15.distance*2;
var _1f=_15.duration;
var _20=parseFloat(_17.style.top);
var _21=parseFloat(_17.style.left);
var _22=0;
var _23=0;
var _24=0;
if(_15.random){
var _25=(Math.random()*_15.random)+Math.max(1-_15.random,0);
_1e*=_25;
_1f*=_25;
_22=((_15.unhide&&_15.sync)||(!_15.unhide&&!_15.sync))?(_15.duration-_1f):0;
_23=Math.random()-0.5;
_24=Math.random()-0.5;
}
var _26=((_19.h-_1c)/2-(_18.y-_19.y));
var _27=((_19.w-_1d)/2-(_18.x-_19.x));
var _28=Math.sqrt(Math.pow(_27,2)+Math.pow(_26,2));
var _29=_20-_26*_1e+_28*_24;
var _2a=_21-_27*_1e+_28*_23;
var _2b=dojo.animateProperty({node:_17,duration:_1f,delay:_22,easing:(_15.easing||(_15.unhide?dojo.fx.easing.sinOut:dojo.fx.easing.circOut)),beforeBegin:(_15.unhide?function(){
if(_15.fade){
dojo.style(_17,"opacity",0);
}
_17.style.position=_15.crop?"relative":"absolute";
_17.style.top=_29+"px";
_17.style.left=_2a+"px";
}:function(){
_17.style.position=_15.crop?"relative":"absolute";
}),properties:{top:(_15.unhide?{start:_29,end:_20}:{start:_20,end:_29}),left:(_15.unhide?{start:_2a,end:_21}:{start:_21,end:_2a})}});
if(_15.fade){
var _2c=dojo.animateProperty({node:_17,duration:_1f,delay:_22,easing:(_15.fadeEasing||dojo.fx.easing.quadOut),properties:{opacity:(_15.unhide?{start:0,end:1}:{end:0})}});
return (_15.unhide?[_2c,_2b]:[_2b,_2c]);
}else{
return _2b;
}
};
var _2d=dojox.fx.text._split(_15);
return _2d;
};
dojox.fx.text.converge=function(_2e){
_2e.unhide=true;
return dojox.fx.text.explode(_2e);
};
dojox.fx.text.disintegrate=function(_2f){
var _30=_2f.node=dojo.byId(_2f.node);
var s=_30.style;
_2f.duration=_2f.duration||1500;
_2f.distance=_2f.distance||1.5;
_2f.random=_2f.random||0;
if(!_2f.fade){
_2f.fade=true;
}
var _31=Math.abs(_2f.random);
_2f.pieceAnimation=function(_32,_33,_34,_35,_36){
var _37=_33.h;
var _38=_33.w;
var _39=_2f.interval||(_2f.duration/(1.5*_36));
var _3a=(_2f.duration-_36*_39);
var _3b=Math.random()*_36*_39;
var _3c=(_2f.reverseOrder||_2f.distance<0)?(_35*_39):((_36-_35)*_39);
var _3d=_3b*_31+Math.max(1-_31,0)*_3c;
var _3e={};
if(_2f.unhide){
_3e.top={start:(parseFloat(_32.style.top)-_34.h*_2f.distance),end:parseFloat(_32.style.top)};
if(_2f.fade){
_3e.opacity={start:0,end:1};
}
}else{
_3e.top={end:(parseFloat(_32.style.top)+_34.h*_2f.distance)};
if(_2f.fade){
_3e.opacity={end:0};
}
}
var _3f=dojo.animateProperty({node:_32,duration:_3a,delay:_3d,easing:(_2f.easing||(_2f.unhide?dojo.fx.easing.sinIn:dojo.fx.easing.circIn)),properties:_3e,beforeBegin:(_2f.unhide?function(){
if(_2f.fade){
dojo.style(_32,"opacity",0);
}
_32.style.position=_2f.crop?"relative":"absolute";
_32.style.top=_3e.top.start+"px";
}:function(){
_32.style.position=_2f.crop?"relative":"absolute";
})});
return _3f;
};
var _40=dojox.fx.text._split(_2f);
return _40;
};
dojox.fx.text.build=function(_41){
_41.unhide=true;
return dojox.fx.text.disintegrate(_41);
};
dojox.fx.text.blockFadeOut=function(_42){
var _43=_42.node=dojo.byId(_42.node);
var s=_43.style;
_42.duration=_42.duration||1000;
_42.random=_42.random||0;
var _44=Math.abs(_42.random);
_42.pieceAnimation=function(_45,_46,_47,_48,_49){
var _4a=_42.interval||(_42.duration/(1.5*_49));
var _4b=(_42.duration-_49*_4a);
var _4c=Math.random()*_49*_4a;
var _4d=(_42.reverseOrder)?((_49-_48)*_4a):(_48*_4a);
var _4e=_4c*_44+Math.max(1-_44,0)*_4d;
var _4f=dojo.animateProperty({node:_45,duration:_4b,delay:_4e,easing:(_42.easing||dojo.fx.easing.sinInOut),properties:{opacity:(_42.unhide?{start:0,end:1}:{end:0})},beforeBegin:(_42.unhide?function(){
dojo.style(_45,"opacity",0);
}:undefined)});
return _4f;
};
var _50=dojox.fx.text._split(_42);
return _50;
};
dojox.fx.text.blockFadeIn=function(_51){
_51.unhide=true;
return dojox.fx.text.blockFadeOut(_51);
};
dojox.fx.text.backspace=function(_52){
var _53=_52.node=dojo.byId(_52.node);
var s=_53.style;
_52.words=false;
_52.duration=_52.duration||2000;
_52.random=_52.random||0;
var _54=Math.abs(_52.random);
var _55=10;
_52.pieceAnimation=function(_56,_57,_58,_59,_5a){
var _5b=_52.interval||(_52.duration/(1.5*_5a)),_5c=("textContent" in _56)?_56.textContent:_56.innerText,_5d=_5c.match(/\s/g);
if(typeof (_52.wordDelay)=="undefined"){
_52.wordDelay=_5b*2;
}
if(!_52.unhide){
_55=(_5a-_59-1)*_5b;
}
var _5e,_5f;
if(_52.fixed){
if(_52.unhide){
var _5e=function(){
dojo.style(_56,"opacity",0);
};
}
}else{
if(_52.unhide){
var _5e=function(){
_56.style.display="none";
};
var _5f=function(){
_56.style.display="inline";
};
}else{
var _5f=function(){
_56.style.display="none";
};
}
}
var _60=dojo.animateProperty({node:_56,duration:1,delay:_55,easing:(_52.easing||dojo.fx.easing.sinInOut),properties:{opacity:(_52.unhide?{start:0,end:1}:{end:0})},beforeBegin:_5e,onEnd:_5f});
if(_52.unhide){
var _61=Math.random()*_5c.length*_5b;
var _62=_61*_54/2+Math.max(1-_54/2,0)*_52.wordDelay;
_55+=_61*_54+Math.max(1-_54,0)*_5b*_5c.length+(_62*(_5d&&_5c.lastIndexOf(_5d[_5d.length-1])==_5c.length-1));
}
return _60;
};
var _63=dojox.fx.text._split(_52);
return _63;
};
dojox.fx.text.type=function(_64){
_64.unhide=true;
return dojox.fx.text.backspace(_64);
};
}
