/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/NodeList-manipulate",["./query","./_base/lang","./_base/array","./dom-construct","./NodeList-dom"],function(_1,_2,_3,_4){
var _5=_1.NodeList;
function _6(_7){
var _8="",ch=_7.childNodes;
for(var i=0,n;n=ch[i];i++){
if(n.nodeType!=8){
if(n.nodeType==1){
_8+=_6(n);
}else{
_8+=n.nodeValue;
}
}
}
return _8;
};
function _9(_a){
while(_a.childNodes[0]&&_a.childNodes[0].nodeType==1){
_a=_a.childNodes[0];
}
return _a;
};
function _b(_c,_d){
if(typeof _c=="string"){
_c=_4.toDom(_c,(_d&&_d.ownerDocument));
if(_c.nodeType==11){
_c=_c.childNodes[0];
}
}else{
if(_c.nodeType==1&&_c.parentNode){
_c=_c.cloneNode(false);
}
}
return _c;
};
_2.extend(_5,{_placeMultiple:function(_e,_f){
var nl2=typeof _e=="string"||_e.nodeType?_1(_e):_e;
var _10=[];
for(var i=0;i<nl2.length;i++){
var _11=nl2[i];
var _12=this.length;
for(var j=_12-1,_13;_13=this[j];j--){
if(i>0){
_13=this._cloneNode(_13);
_10.unshift(_13);
}
if(j==_12-1){
_4.place(_13,_11,_f);
}else{
_11.parentNode.insertBefore(_13,_11);
}
_11=_13;
}
}
if(_10.length){
_10.unshift(0);
_10.unshift(this.length-1);
Array.prototype.splice.apply(this,_10);
}
return this;
},innerHTML:function(_14){
if(arguments.length){
return this.addContent(_14,"only");
}else{
return this[0].innerHTML;
}
},text:function(_15){
if(arguments.length){
for(var i=0,_16;_16=this[i];i++){
if(_16.nodeType==1){
_4.empty(_16);
_16.appendChild(_16.ownerDocument.createTextNode(_15));
}
}
return this;
}else{
var _17="";
for(i=0;_16=this[i];i++){
_17+=_6(_16);
}
return _17;
}
},val:function(_18){
if(arguments.length){
var _19=_2.isArray(_18);
for(var _1a=0,_1b;_1b=this[_1a];_1a++){
var _1c=_1b.nodeName.toUpperCase();
var _1d=_1b.type;
var _1e=_19?_18[_1a]:_18;
if(_1c=="SELECT"){
var _1f=_1b.options;
for(var i=0;i<_1f.length;i++){
var opt=_1f[i];
if(_1b.multiple){
opt.selected=(_3.indexOf(_18,opt.value)!=-1);
}else{
opt.selected=(opt.value==_1e);
}
}
}else{
if(_1d=="checkbox"||_1d=="radio"){
_1b.checked=(_1b.value==_1e);
}else{
_1b.value=_1e;
}
}
}
return this;
}else{
_1b=this[0];
if(!_1b||_1b.nodeType!=1){
return undefined;
}
_18=_1b.value||"";
if(_1b.nodeName.toUpperCase()=="SELECT"&&_1b.multiple){
_18=[];
_1f=_1b.options;
for(i=0;i<_1f.length;i++){
opt=_1f[i];
if(opt.selected){
_18.push(opt.value);
}
}
if(!_18.length){
_18=null;
}
}
return _18;
}
},append:function(_20){
return this.addContent(_20,"last");
},appendTo:function(_21){
return this._placeMultiple(_21,"last");
},prepend:function(_22){
return this.addContent(_22,"first");
},prependTo:function(_23){
return this._placeMultiple(_23,"first");
},after:function(_24){
return this.addContent(_24,"after");
},insertAfter:function(_25){
return this._placeMultiple(_25,"after");
},before:function(_26){
return this.addContent(_26,"before");
},insertBefore:function(_27){
return this._placeMultiple(_27,"before");
},remove:_5.prototype.orphan,wrap:function(_28){
if(this[0]){
_28=_b(_28,this[0]);
for(var i=0,_29;_29=this[i];i++){
var _2a=this._cloneNode(_28);
if(_29.parentNode){
_29.parentNode.replaceChild(_2a,_29);
}
var _2b=_9(_2a);
_2b.appendChild(_29);
}
}
return this;
},wrapAll:function(_2c){
if(this[0]){
_2c=_b(_2c,this[0]);
this[0].parentNode.replaceChild(_2c,this[0]);
var _2d=_9(_2c);
for(var i=0,_2e;_2e=this[i];i++){
_2d.appendChild(_2e);
}
}
return this;
},wrapInner:function(_2f){
if(this[0]){
_2f=_b(_2f,this[0]);
for(var i=0;i<this.length;i++){
var _30=this._cloneNode(_2f);
this._wrap(_2._toArray(this[i].childNodes),null,this._NodeListCtor).wrapAll(_30);
}
}
return this;
},replaceWith:function(_31){
_31=this._normalize(_31,this[0]);
for(var i=0,_32;_32=this[i];i++){
this._place(_31,_32,"before",i>0);
_32.parentNode.removeChild(_32);
}
return this;
},replaceAll:function(_33){
var nl=_1(_33);
var _34=this._normalize(this,this[0]);
for(var i=0,_35;_35=nl[i];i++){
this._place(_34,_35,"before",i>0);
_35.parentNode.removeChild(_35);
}
return this;
},clone:function(){
var ary=[];
for(var i=0;i<this.length;i++){
ary.push(this._cloneNode(this[i]));
}
return this._wrap(ary,this,this._NodeListCtor);
}});
if(!_5.prototype.html){
_5.prototype.html=_5.prototype.innerHTML;
}
return _5;
});
