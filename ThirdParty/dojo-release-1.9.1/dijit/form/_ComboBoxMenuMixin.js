//>>built
define("dijit/form/_ComboBoxMenuMixin",["dojo/_base/array","dojo/_base/declare","dojo/dom-attr","dojo/has","dojo/i18n","dojo/i18n!./nls/ComboBox"],function(_1,_2,_3,_4,_5){
var _6=_2("dijit.form._ComboBoxMenuMixin"+(_4("dojo-bidi")?"_NoBidi":""),null,{_messages:null,postMixInProperties:function(){
this.inherited(arguments);
this._messages=_5.getLocalization("dijit.form","ComboBox",this.lang);
},buildRendering:function(){
this.inherited(arguments);
this.previousButton.innerHTML=this._messages["previousMessage"];
this.nextButton.innerHTML=this._messages["nextMessage"];
},_setValueAttr:function(_7){
this._set("value",_7);
this.onChange(_7);
},onClick:function(_8){
if(_8==this.previousButton){
this._setSelectedAttr(null);
this.onPage(-1);
}else{
if(_8==this.nextButton){
this._setSelectedAttr(null);
this.onPage(1);
}else{
this.onChange(_8);
}
}
},onChange:function(){
},onPage:function(){
},onClose:function(){
this._setSelectedAttr(null);
},_createOption:function(_9,_a){
var _b=this._createMenuItem();
var _c=_a(_9);
if(_c.html){
_b.innerHTML=_c.label;
}else{
_b.appendChild(_b.ownerDocument.createTextNode(_c.label));
}
if(_b.innerHTML==""){
_b.innerHTML="&#160;";
}
return _b;
},createOptions:function(_d,_e,_f){
this.items=_d;
this.previousButton.style.display=(_e.start==0)?"none":"";
_3.set(this.previousButton,"id",this.id+"_prev");
_1.forEach(_d,function(_10,i){
var _11=this._createOption(_10,_f);
_11.setAttribute("item",i);
_3.set(_11,"id",this.id+i);
this.nextButton.parentNode.insertBefore(_11,this.nextButton);
},this);
var _12=false;
if(_d.total&&!_d.total.then&&_d.total!=-1){
if((_e.start+_e.count)<_d.total){
_12=true;
}else{
if((_e.start+_e.count)>_d.total&&_e.count==_d.length){
_12=true;
}
}
}else{
if(_e.count==_d.length){
_12=true;
}
}
this.nextButton.style.display=_12?"":"none";
_3.set(this.nextButton,"id",this.id+"_next");
},clearResultList:function(){
var _13=this.containerNode;
while(_13.childNodes.length>2){
_13.removeChild(_13.childNodes[_13.childNodes.length-2]);
}
this._setSelectedAttr(null);
},highlightFirstOption:function(){
this.selectFirstNode();
},highlightLastOption:function(){
this.selectLastNode();
},selectFirstNode:function(){
this.inherited(arguments);
if(this.getHighlightedOption()==this.previousButton){
this.selectNextNode();
}
},selectLastNode:function(){
this.inherited(arguments);
if(this.getHighlightedOption()==this.nextButton){
this.selectPreviousNode();
}
},getHighlightedOption:function(){
return this.selected;
}});
if(_4("dojo-bidi")){
_6=_2("dijit.form._ComboBoxMenuMixin",_6,{_createOption:function(){
var _14=this.inherited(arguments);
this.applyTextDir(_14);
return _14;
}});
}
return _6;
});
