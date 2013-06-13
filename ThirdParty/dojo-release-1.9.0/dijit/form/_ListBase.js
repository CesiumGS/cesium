//>>built
define("dijit/form/_ListBase",["dojo/_base/declare","dojo/on","dojo/window"],function(_1,on,_2){
return _1("dijit.form._ListBase",null,{selected:null,_listConnect:function(_3,_4){
var _5=this;
return _5.own(on(_5.containerNode,on.selector(function(_6,_7,_8){
return _6.parentNode==_8;
},_3),function(_9){
_9.preventDefault();
_5[_4](_9,this);
}));
},selectFirstNode:function(){
var _a=this.containerNode.firstChild;
while(_a&&_a.style.display=="none"){
_a=_a.nextSibling;
}
this._setSelectedAttr(_a);
},selectLastNode:function(){
var _b=this.containerNode.lastChild;
while(_b&&_b.style.display=="none"){
_b=_b.previousSibling;
}
this._setSelectedAttr(_b);
},selectNextNode:function(){
var _c=this.selected;
if(!_c){
this.selectFirstNode();
}else{
var _d=_c.nextSibling;
while(_d&&_d.style.display=="none"){
_d=_d.nextSibling;
}
if(!_d){
this.selectFirstNode();
}else{
this._setSelectedAttr(_d);
}
}
},selectPreviousNode:function(){
var _e=this.selected;
if(!_e){
this.selectLastNode();
}else{
var _f=_e.previousSibling;
while(_f&&_f.style.display=="none"){
_f=_f.previousSibling;
}
if(!_f){
this.selectLastNode();
}else{
this._setSelectedAttr(_f);
}
}
},_setSelectedAttr:function(_10){
if(this.selected!=_10){
var _11=this.selected;
if(_11){
this.onDeselect(_11);
}
if(_10){
_2.scrollIntoView(_10);
this.onSelect(_10);
}
this._set("selected",_10);
}else{
if(_10){
this.onSelect(_10);
}
}
}});
});
