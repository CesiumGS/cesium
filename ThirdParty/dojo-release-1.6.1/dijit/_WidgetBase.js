/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._WidgetBase"]){
dojo._hasResource["dijit._WidgetBase"]=true;
dojo.provide("dijit._WidgetBase");
dojo.require("dijit._base.manager");
dojo.require("dojo.Stateful");
(function(){
dojo.declare("dijit._WidgetBase",dojo.Stateful,{id:"",lang:"",dir:"","class":"",style:"",title:"",tooltip:"",baseClass:"",srcNodeRef:null,domNode:null,containerNode:null,attributeMap:{id:"",dir:"",lang:"","class":"",style:"",title:""},_blankGif:(dojo.config.blankGif||dojo.moduleUrl("dojo","resources/blank.gif")).toString(),postscript:function(_1,_2){
this.create(_1,_2);
},create:function(_3,_4){
this.srcNodeRef=dojo.byId(_4);
this._connects=[];
this._subscribes=[];
if(this.srcNodeRef&&(typeof this.srcNodeRef.id=="string")){
this.id=this.srcNodeRef.id;
}
if(_3){
this.params=_3;
dojo._mixin(this,_3);
}
this.postMixInProperties();
if(!this.id){
this.id=dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
}
dijit.registry.add(this);
this.buildRendering();
if(this.domNode){
this._applyAttributes();
var _5=this.srcNodeRef;
if(_5&&_5.parentNode&&this.domNode!==_5){
_5.parentNode.replaceChild(this.domNode,_5);
}
}
if(this.domNode){
this.domNode.setAttribute("widgetId",this.id);
}
this.postCreate();
if(this.srcNodeRef&&!this.srcNodeRef.parentNode){
delete this.srcNodeRef;
}
this._created=true;
},_applyAttributes:function(){
var _6=function(_7,_8){
if((_8.params&&_7 in _8.params)||_8[_7]){
_8.set(_7,_8[_7]);
}
};
for(var _9 in this.attributeMap){
_6(_9,this);
}
dojo.forEach(this._getSetterAttributes(),function(a){
if(!(a in this.attributeMap)){
_6(a,this);
}
},this);
},_getSetterAttributes:function(){
var _a=this.constructor;
if(!_a._setterAttrs){
var r=(_a._setterAttrs=[]),_b,_c=_a.prototype;
for(var _d in _c){
if(dojo.isFunction(_c[_d])&&(_b=_d.match(/^_set([a-zA-Z]*)Attr$/))&&_b[1]){
r.push(_b[1].charAt(0).toLowerCase()+_b[1].substr(1));
}
}
}
return _a._setterAttrs;
},postMixInProperties:function(){
},buildRendering:function(){
if(!this.domNode){
this.domNode=this.srcNodeRef||dojo.create("div");
}
if(this.baseClass){
var _e=this.baseClass.split(" ");
if(!this.isLeftToRight()){
_e=_e.concat(dojo.map(_e,function(_f){
return _f+"Rtl";
}));
}
dojo.addClass(this.domNode,_e);
}
},postCreate:function(){
},startup:function(){
this._started=true;
},destroyRecursive:function(_10){
this._beingDestroyed=true;
this.destroyDescendants(_10);
this.destroy(_10);
},destroy:function(_11){
this._beingDestroyed=true;
this.uninitialize();
var d=dojo,dfe=d.forEach,dun=d.unsubscribe;
dfe(this._connects,function(_12){
dfe(_12,d.disconnect);
});
dfe(this._subscribes,function(_13){
dun(_13);
});
dfe(this._supportingWidgets||[],function(w){
if(w.destroyRecursive){
w.destroyRecursive();
}else{
if(w.destroy){
w.destroy();
}
}
});
this.destroyRendering(_11);
dijit.registry.remove(this.id);
this._destroyed=true;
},destroyRendering:function(_14){
if(this.bgIframe){
this.bgIframe.destroy(_14);
delete this.bgIframe;
}
if(this.domNode){
if(_14){
dojo.removeAttr(this.domNode,"widgetId");
}else{
dojo.destroy(this.domNode);
}
delete this.domNode;
}
if(this.srcNodeRef){
if(!_14){
dojo.destroy(this.srcNodeRef);
}
delete this.srcNodeRef;
}
},destroyDescendants:function(_15){
dojo.forEach(this.getChildren(),function(_16){
if(_16.destroyRecursive){
_16.destroyRecursive(_15);
}
});
},uninitialize:function(){
return false;
},_setClassAttr:function(_17){
var _18=this[this.attributeMap["class"]||"domNode"];
dojo.replaceClass(_18,_17,this["class"]);
this._set("class",_17);
},_setStyleAttr:function(_19){
var _1a=this[this.attributeMap.style||"domNode"];
if(dojo.isObject(_19)){
dojo.style(_1a,_19);
}else{
if(_1a.style.cssText){
_1a.style.cssText+="; "+_19;
}else{
_1a.style.cssText=_19;
}
}
this._set("style",_19);
},_attrToDom:function(_1b,_1c){
var _1d=this.attributeMap[_1b];
dojo.forEach(dojo.isArray(_1d)?_1d:[_1d],function(_1e){
var _1f=this[_1e.node||_1e||"domNode"];
var _20=_1e.type||"attribute";
switch(_20){
case "attribute":
if(dojo.isFunction(_1c)){
_1c=dojo.hitch(this,_1c);
}
var _21=_1e.attribute?_1e.attribute:(/^on[A-Z][a-zA-Z]*$/.test(_1b)?_1b.toLowerCase():_1b);
dojo.attr(_1f,_21,_1c);
break;
case "innerText":
_1f.innerHTML="";
_1f.appendChild(dojo.doc.createTextNode(_1c));
break;
case "innerHTML":
_1f.innerHTML=_1c;
break;
case "class":
dojo.replaceClass(_1f,_1c,this[_1b]);
break;
}
},this);
},get:function(_22){
var _23=this._getAttrNames(_22);
return this[_23.g]?this[_23.g]():this[_22];
},set:function(_24,_25){
if(typeof _24==="object"){
for(var x in _24){
this.set(x,_24[x]);
}
return this;
}
var _26=this._getAttrNames(_24);
if(this[_26.s]){
var _27=this[_26.s].apply(this,Array.prototype.slice.call(arguments,1));
}else{
if(_24 in this.attributeMap){
this._attrToDom(_24,_25);
}
this._set(_24,_25);
}
return _27||this;
},_attrPairNames:{},_getAttrNames:function(_28){
var apn=this._attrPairNames;
if(apn[_28]){
return apn[_28];
}
var uc=_28.charAt(0).toUpperCase()+_28.substr(1);
return (apn[_28]={n:_28+"Node",s:"_set"+uc+"Attr",g:"_get"+uc+"Attr"});
},_set:function(_29,_2a){
var _2b=this[_29];
this[_29]=_2a;
if(this._watchCallbacks&&this._created&&_2a!==_2b){
this._watchCallbacks(_29,_2b,_2a);
}
},toString:function(){
return "[Widget "+this.declaredClass+", "+(this.id||"NO ID")+"]";
},getDescendants:function(){
return this.containerNode?dojo.query("[widgetId]",this.containerNode).map(dijit.byNode):[];
},getChildren:function(){
return this.containerNode?dijit.findWidgets(this.containerNode):[];
},connect:function(obj,_2c,_2d){
var _2e=[dojo._connect(obj,_2c,this,_2d)];
this._connects.push(_2e);
return _2e;
},disconnect:function(_2f){
for(var i=0;i<this._connects.length;i++){
if(this._connects[i]==_2f){
dojo.forEach(_2f,dojo.disconnect);
this._connects.splice(i,1);
return;
}
}
},subscribe:function(_30,_31){
var _32=dojo.subscribe(_30,this,_31);
this._subscribes.push(_32);
return _32;
},unsubscribe:function(_33){
for(var i=0;i<this._subscribes.length;i++){
if(this._subscribes[i]==_33){
dojo.unsubscribe(_33);
this._subscribes.splice(i,1);
return;
}
}
},isLeftToRight:function(){
return this.dir?(this.dir=="ltr"):dojo._isBodyLtr();
},placeAt:function(_34,_35){
if(_34.declaredClass&&_34.addChild){
_34.addChild(this,_35);
}else{
dojo.place(this.domNode,_34,_35);
}
return this;
}});
})();
}
