/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.NodeList-manipulate"]){
dojo._hasResource["dojo.NodeList-manipulate"]=true;
dojo.provide("dojo.NodeList-manipulate");
(function(){
function _1(_2){
var _3="",ch=_2.childNodes;
for(var i=0,n;n=ch[i];i++){
if(n.nodeType!=8){
if(n.nodeType==1){
_3+=_1(n);
}else{
_3+=n.nodeValue;
}
}
}
return _3;
};
function _4(_5){
while(_5.childNodes[0]&&_5.childNodes[0].nodeType==1){
_5=_5.childNodes[0];
}
return _5;
};
function _6(_7,_8){
if(typeof _7=="string"){
_7=dojo._toDom(_7,(_8&&_8.ownerDocument));
if(_7.nodeType==11){
_7=_7.childNodes[0];
}
}else{
if(_7.nodeType==1&&_7.parentNode){
_7=_7.cloneNode(false);
}
}
return _7;
};
dojo.extend(dojo.NodeList,{_placeMultiple:function(_9,_a){
var _b=typeof _9=="string"||_9.nodeType?dojo.query(_9):_9;
var _c=[];
for(var i=0;i<_b.length;i++){
var _d=_b[i];
var _e=this.length;
for(var j=_e-1,_f;_f=this[j];j--){
if(i>0){
_f=this._cloneNode(_f);
_c.unshift(_f);
}
if(j==_e-1){
dojo.place(_f,_d,_a);
}else{
_d.parentNode.insertBefore(_f,_d);
}
_d=_f;
}
}
if(_c.length){
_c.unshift(0);
_c.unshift(this.length-1);
Array.prototype.splice.apply(this,_c);
}
return this;
},innerHTML:function(_10){
if(arguments.length){
return this.addContent(_10,"only");
}else{
return this[0].innerHTML;
}
},text:function(_11){
if(arguments.length){
for(var i=0,_12;_12=this[i];i++){
if(_12.nodeType==1){
dojo.empty(_12);
_12.appendChild(_12.ownerDocument.createTextNode(_11));
}
}
return this;
}else{
var _13="";
for(i=0;_12=this[i];i++){
_13+=_1(_12);
}
return _13;
}
},val:function(_14){
if(arguments.length){
var _15=dojo.isArray(_14);
for(var _16=0,_17;_17=this[_16];_16++){
var _18=_17.nodeName.toUpperCase();
var _19=_17.type;
var _1a=_15?_14[_16]:_14;
if(_18=="SELECT"){
var _1b=_17.options;
for(var i=0;i<_1b.length;i++){
var opt=_1b[i];
if(_17.multiple){
opt.selected=(dojo.indexOf(_14,opt.value)!=-1);
}else{
opt.selected=(opt.value==_1a);
}
}
}else{
if(_19=="checkbox"||_19=="radio"){
_17.checked=(_17.value==_1a);
}else{
_17.value=_1a;
}
}
}
return this;
}else{
_17=this[0];
if(!_17||_17.nodeType!=1){
return undefined;
}
_14=_17.value||"";
if(_17.nodeName.toUpperCase()=="SELECT"&&_17.multiple){
_14=[];
_1b=_17.options;
for(i=0;i<_1b.length;i++){
opt=_1b[i];
if(opt.selected){
_14.push(opt.value);
}
}
if(!_14.length){
_14=null;
}
}
return _14;
}
},append:function(_1c){
return this.addContent(_1c,"last");
},appendTo:function(_1d){
return this._placeMultiple(_1d,"last");
},prepend:function(_1e){
return this.addContent(_1e,"first");
},prependTo:function(_1f){
return this._placeMultiple(_1f,"first");
},after:function(_20){
return this.addContent(_20,"after");
},insertAfter:function(_21){
return this._placeMultiple(_21,"after");
},before:function(_22){
return this.addContent(_22,"before");
},insertBefore:function(_23){
return this._placeMultiple(_23,"before");
},remove:dojo.NodeList.prototype.orphan,wrap:function(_24){
if(this[0]){
_24=_6(_24,this[0]);
for(var i=0,_25;_25=this[i];i++){
var _26=this._cloneNode(_24);
if(_25.parentNode){
_25.parentNode.replaceChild(_26,_25);
}
var _27=_4(_26);
_27.appendChild(_25);
}
}
return this;
},wrapAll:function(_28){
if(this[0]){
_28=_6(_28,this[0]);
this[0].parentNode.replaceChild(_28,this[0]);
var _29=_4(_28);
for(var i=0,_2a;_2a=this[i];i++){
_29.appendChild(_2a);
}
}
return this;
},wrapInner:function(_2b){
if(this[0]){
_2b=_6(_2b,this[0]);
for(var i=0;i<this.length;i++){
var _2c=this._cloneNode(_2b);
this._wrap(dojo._toArray(this[i].childNodes),null,this._NodeListCtor).wrapAll(_2c);
}
}
return this;
},replaceWith:function(_2d){
_2d=this._normalize(_2d,this[0]);
for(var i=0,_2e;_2e=this[i];i++){
this._place(_2d,_2e,"before",i>0);
_2e.parentNode.removeChild(_2e);
}
return this;
},replaceAll:function(_2f){
var nl=dojo.query(_2f);
var _30=this._normalize(this,this[0]);
for(var i=0,_31;_31=nl[i];i++){
this._place(_30,_31,"before",i>0);
_31.parentNode.removeChild(_31);
}
return this;
},clone:function(){
var ary=[];
for(var i=0;i<this.length;i++){
ary.push(this._cloneNode(this[i]));
}
return this._wrap(ary,this,this._NodeListCtor);
}});
if(!dojo.NodeList.prototype.html){
dojo.NodeList.prototype.html=dojo.NodeList.prototype.innerHTML;
}
})();
}
