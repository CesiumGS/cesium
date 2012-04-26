/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.html.styles"]){
dojo._hasResource["dojox.html.styles"]=true;
dojo.provide("dojox.html.styles");
(function(){
var _1={};
var _2={};
var _3=[];
var _4=[];
dojox.html.insertCssRule=function(_5,_6,_7){
var ss=dojox.html.getDynamicStyleSheet(_7);
var _8=_5+" {"+_6+"}";
if(dojo.isIE){
ss.cssText+=_8;
}else{
if(ss.sheet){
ss.sheet.insertRule(_8,ss._indicies.length);
}else{
ss.appendChild(dojo.doc.createTextNode(_8));
}
}
ss._indicies.push(_5+" "+_6);
return _5;
};
dojox.html.removeCssRule=function(_9,_a,_b){
var ss;
var _c=-1;
for(var nm in _1){
if(_b&&_b!=nm){
continue;
}
ss=_1[nm];
for(var i=0;i<ss._indicies.length;i++){
if(_9+" "+_a==ss._indicies[i]){
_c=i;
break;
}
}
if(_c>-1){
break;
}
}
if(!ss){
return false;
}
if(_c==-1){
return false;
}
ss._indicies.splice(_c,1);
if(dojo.isIE){
ss.removeRule(_c);
}else{
if(ss.sheet){
ss.sheet.deleteRule(_c);
}else{
if(document.styleSheets[0]){
}
}
}
return true;
};
dojox.html.getStyleSheet=function(_d){
if(_1[_d||"default"]){
return _1[_d||"default"];
}
if(!_d){
return false;
}
var _e=dojox.html.getStyleSheets();
if(_e[_d]){
return dojox.html.getStyleSheets()[_d];
}
for(var nm in _e){
if(_e[nm].href&&_e[nm].href.indexOf(_d)>-1){
return _e[nm];
}
}
return false;
};
dojox.html.getDynamicStyleSheet=function(_f){
if(!_f){
_f="default";
}
if(!_1[_f]){
if(dojo.doc.createStyleSheet){
_1[_f]=dojo.doc.createStyleSheet();
if(dojo.isIE<9){
_1[_f].title=_f;
}
}else{
_1[_f]=dojo.doc.createElement("style");
_1[_f].setAttribute("type","text/css");
dojo.doc.getElementsByTagName("head")[0].appendChild(_1[_f]);
}
_1[_f]._indicies=[];
}
return _1[_f];
};
dojox.html.enableStyleSheet=function(_10){
var ss=dojox.html.getStyleSheet(_10);
if(ss){
if(ss.sheet){
ss.sheet.disabled=false;
}else{
ss.disabled=false;
}
}
};
dojox.html.disableStyleSheet=function(_11){
var ss=dojox.html.getStyleSheet(_11);
if(ss){
if(ss.sheet){
ss.sheet.disabled=true;
}else{
ss.disabled=true;
}
}
};
dojox.html.activeStyleSheet=function(_12){
var _13=dojox.html.getToggledStyleSheets();
if(arguments.length==1){
dojo.forEach(_13,function(s){
s.disabled=(s.title==_12)?false:true;
});
}else{
for(var i=0;i<_13.length;i++){
if(_13[i].disabled==false){
return _13[i];
}
}
}
return true;
};
dojox.html.getPreferredStyleSheet=function(){
};
dojox.html.getToggledStyleSheets=function(){
if(!_3.length){
var _14=dojox.html.getStyleSheets();
for(var nm in _14){
if(_14[nm].title){
_3.push(_14[nm]);
}
}
}
return _3;
};
dojox.html.getStyleSheets=function(){
if(_2.collected){
return _2;
}
var _15=dojo.doc.styleSheets;
dojo.forEach(_15,function(n){
var s=(n.sheet)?n.sheet:n;
var _16=s.title||s.href;
if(dojo.isIE){
if(s.cssText.indexOf("#default#VML")==-1){
if(s.href){
_2[_16]=s;
}else{
if(s.imports.length){
dojo.forEach(s.imports,function(si){
_2[si.title||si.href]=si;
});
}else{
_2[_16]=s;
}
}
}
}else{
_2[_16]=s;
_2[_16].id=s.ownerNode.id;
dojo.forEach(s.cssRules,function(r){
if(r.href){
_2[r.href]=r.styleSheet;
_2[r.href].id=s.ownerNode.id;
}
});
}
});
_2.collected=true;
return _2;
};
})();
}
