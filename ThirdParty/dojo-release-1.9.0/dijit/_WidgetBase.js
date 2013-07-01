//>>built
define("dijit/_WidgetBase",["require","dojo/_base/array","dojo/aspect","dojo/_base/config","dojo/_base/connect","dojo/_base/declare","dojo/dom","dojo/dom-attr","dojo/dom-class","dojo/dom-construct","dojo/dom-geometry","dojo/dom-style","dojo/has","dojo/_base/kernel","dojo/_base/lang","dojo/on","dojo/ready","dojo/Stateful","dojo/topic","dojo/_base/window","./Destroyable","dojo/has!dojo-bidi?./_BidiMixin","./registry"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d,_e,_f,on,_10,_11,_12,win,_13,_14,_15){
_d.add("dijit-legacy-requires",!_e.isAsync);
_d.add("dojo-bidi",false);
if(_d("dijit-legacy-requires")){
_10(0,function(){
var _16=["dijit/_base/manager"];
_1(_16);
});
}
var _17={};
function _18(obj){
var ret={};
for(var _19 in obj){
ret[_19.toLowerCase()]=true;
}
return ret;
};
function _1a(_1b){
return function(val){
_8[val?"set":"remove"](this.domNode,_1b,val);
this._set(_1b,val);
};
};
var _1c=_6("dijit._WidgetBase",[_11,_13],{id:"",_setIdAttr:"domNode",lang:"",_setLangAttr:_1a("lang"),dir:"",_setDirAttr:_1a("dir"),"class":"",_setClassAttr:{node:"domNode",type:"class"},style:"",title:"",tooltip:"",baseClass:"",srcNodeRef:null,domNode:null,containerNode:null,ownerDocument:null,_setOwnerDocumentAttr:function(val){
this._set("ownerDocument",val);
},attributeMap:{},_blankGif:_4.blankGif||_1.toUrl("dojo/resources/blank.gif"),_introspect:function(){
var _1d=this.constructor;
if(!_1d._setterAttrs){
var _1e=_1d.prototype,_1f=_1d._setterAttrs=[],_20=(_1d._onMap={});
for(var _21 in _1e.attributeMap){
_1f.push(_21);
}
for(_21 in _1e){
if(/^on/.test(_21)){
_20[_21.substring(2).toLowerCase()]=_21;
}
if(/^_set[A-Z](.*)Attr$/.test(_21)){
_21=_21.charAt(4).toLowerCase()+_21.substr(5,_21.length-9);
if(!_1e.attributeMap||!(_21 in _1e.attributeMap)){
_1f.push(_21);
}
}
}
}
},postscript:function(_22,_23){
this.create(_22,_23);
},create:function(_24,_25){
this._introspect();
this.srcNodeRef=_7.byId(_25);
this._connects=[];
this._supportingWidgets=[];
if(this.srcNodeRef&&(typeof this.srcNodeRef.id=="string")){
this.id=this.srcNodeRef.id;
}
if(_24){
this.params=_24;
_f.mixin(this,_24);
}
this.postMixInProperties();
if(!this.id){
this.id=_15.getUniqueId(this.declaredClass.replace(/\./g,"_"));
if(this.params){
delete this.params.id;
}
}
this.ownerDocument=this.ownerDocument||(this.srcNodeRef?this.srcNodeRef.ownerDocument:document);
this.ownerDocumentBody=win.body(this.ownerDocument);
_15.add(this);
this.buildRendering();
var _26;
if(this.domNode){
this._applyAttributes();
var _27=this.srcNodeRef;
if(_27&&_27.parentNode&&this.domNode!==_27){
_27.parentNode.replaceChild(this.domNode,_27);
_26=true;
}
this.domNode.setAttribute("widgetId",this.id);
}
this.postCreate();
if(_26){
delete this.srcNodeRef;
}
this._created=true;
},_applyAttributes:function(){
var _28={};
for(var key in this.params||{}){
_28[key]=this._get(key);
}
_2.forEach(this.constructor._setterAttrs,function(key){
if(!(key in _28)){
var val=this._get(key);
if(val){
this.set(key,val);
}
}
},this);
for(key in _28){
this.set(key,_28[key]);
}
},postMixInProperties:function(){
},buildRendering:function(){
if(!this.domNode){
this.domNode=this.srcNodeRef||this.ownerDocument.createElement("div");
}
if(this.baseClass){
var _29=this.baseClass.split(" ");
if(!this.isLeftToRight()){
_29=_29.concat(_2.map(_29,function(_2a){
return _2a+"Rtl";
}));
}
_9.add(this.domNode,_29);
}
},postCreate:function(){
},startup:function(){
if(this._started){
return;
}
this._started=true;
_2.forEach(this.getChildren(),function(obj){
if(!obj._started&&!obj._destroyed&&_f.isFunction(obj.startup)){
obj.startup();
obj._started=true;
}
});
},destroyRecursive:function(_2b){
this._beingDestroyed=true;
this.destroyDescendants(_2b);
this.destroy(_2b);
},destroy:function(_2c){
this._beingDestroyed=true;
this.uninitialize();
function _2d(w){
if(w.destroyRecursive){
w.destroyRecursive(_2c);
}else{
if(w.destroy){
w.destroy(_2c);
}
}
};
_2.forEach(this._connects,_f.hitch(this,"disconnect"));
_2.forEach(this._supportingWidgets,_2d);
if(this.domNode){
_2.forEach(_15.findWidgets(this.domNode,this.containerNode),_2d);
}
this.destroyRendering(_2c);
_15.remove(this.id);
this._destroyed=true;
},destroyRendering:function(_2e){
if(this.bgIframe){
this.bgIframe.destroy(_2e);
delete this.bgIframe;
}
if(this.domNode){
if(_2e){
_8.remove(this.domNode,"widgetId");
}else{
_a.destroy(this.domNode);
}
delete this.domNode;
}
if(this.srcNodeRef){
if(!_2e){
_a.destroy(this.srcNodeRef);
}
delete this.srcNodeRef;
}
},destroyDescendants:function(_2f){
_2.forEach(this.getChildren(),function(_30){
if(_30.destroyRecursive){
_30.destroyRecursive(_2f);
}
});
},uninitialize:function(){
return false;
},_setStyleAttr:function(_31){
var _32=this.domNode;
if(_f.isObject(_31)){
_c.set(_32,_31);
}else{
if(_32.style.cssText){
_32.style.cssText+="; "+_31;
}else{
_32.style.cssText=_31;
}
}
this._set("style",_31);
},_attrToDom:function(_33,_34,_35){
_35=arguments.length>=3?_35:this.attributeMap[_33];
_2.forEach(_f.isArray(_35)?_35:[_35],function(_36){
var _37=this[_36.node||_36||"domNode"];
var _38=_36.type||"attribute";
switch(_38){
case "attribute":
if(_f.isFunction(_34)){
_34=_f.hitch(this,_34);
}
var _39=_36.attribute?_36.attribute:(/^on[A-Z][a-zA-Z]*$/.test(_33)?_33.toLowerCase():_33);
if(_37.tagName){
_8.set(_37,_39,_34);
}else{
_37.set(_39,_34);
}
break;
case "innerText":
_37.innerHTML="";
_37.appendChild(this.ownerDocument.createTextNode(_34));
break;
case "innerHTML":
_37.innerHTML=_34;
break;
case "class":
_9.replace(_37,_34,this[_33]);
break;
}
},this);
},get:function(_3a){
var _3b=this._getAttrNames(_3a);
return this[_3b.g]?this[_3b.g]():this._get(_3a);
},set:function(_3c,_3d){
if(typeof _3c==="object"){
for(var x in _3c){
this.set(x,_3c[x]);
}
return this;
}
var _3e=this._getAttrNames(_3c),_3f=this[_3e.s];
if(_f.isFunction(_3f)){
var _40=_3f.apply(this,Array.prototype.slice.call(arguments,1));
}else{
var _41=this.focusNode&&!_f.isFunction(this.focusNode)?"focusNode":"domNode",tag=this[_41]&&this[_41].tagName,_42=tag&&(_17[tag]||(_17[tag]=_18(this[_41]))),map=_3c in this.attributeMap?this.attributeMap[_3c]:_3e.s in this?this[_3e.s]:((_42&&_3e.l in _42&&typeof _3d!="function")||/^aria-|^data-|^role$/.test(_3c))?_41:null;
if(map!=null){
this._attrToDom(_3c,_3d,map);
}
this._set(_3c,_3d);
}
return _40||this;
},_attrPairNames:{},_getAttrNames:function(_43){
var apn=this._attrPairNames;
if(apn[_43]){
return apn[_43];
}
var uc=_43.replace(/^[a-z]|-[a-zA-Z]/g,function(c){
return c.charAt(c.length-1).toUpperCase();
});
return (apn[_43]={n:_43+"Node",s:"_set"+uc+"Attr",g:"_get"+uc+"Attr",l:uc.toLowerCase()});
},_set:function(_44,_45){
var _46=this[_44];
this[_44]=_45;
if(this._created&&_45!==_46){
if(this._watchCallbacks){
this._watchCallbacks(_44,_46,_45);
}
this.emit("attrmodified-"+_44,{detail:{prevValue:_46,newValue:_45}});
}
},_get:function(_47){
return this[_47];
},emit:function(_48,_49,_4a){
_49=_49||{};
if(_49.bubbles===undefined){
_49.bubbles=true;
}
if(_49.cancelable===undefined){
_49.cancelable=true;
}
if(!_49.detail){
_49.detail={};
}
_49.detail.widget=this;
var ret,_4b=this["on"+_48];
if(_4b){
ret=_4b.apply(this,_4a?_4a:[_49]);
}
if(this._started&&!this._beingDestroyed){
on.emit(this.domNode,_48.toLowerCase(),_49);
}
return ret;
},on:function(_4c,_4d){
var _4e=this._onMap(_4c);
if(_4e){
return _3.after(this,_4e,_4d,true);
}
return this.own(on(this.domNode,_4c,_4d))[0];
},_onMap:function(_4f){
var _50=this.constructor,map=_50._onMap;
if(!map){
map=(_50._onMap={});
for(var _51 in _50.prototype){
if(/^on/.test(_51)){
map[_51.replace(/^on/,"").toLowerCase()]=_51;
}
}
}
return map[typeof _4f=="string"&&_4f.toLowerCase()];
},toString:function(){
return "[Widget "+this.declaredClass+", "+(this.id||"NO ID")+"]";
},getChildren:function(){
return this.containerNode?_15.findWidgets(this.containerNode):[];
},getParent:function(){
return _15.getEnclosingWidget(this.domNode.parentNode);
},connect:function(obj,_52,_53){
return this.own(_5.connect(obj,_52,this,_53))[0];
},disconnect:function(_54){
_54.remove();
},subscribe:function(t,_55){
return this.own(_12.subscribe(t,_f.hitch(this,_55)))[0];
},unsubscribe:function(_56){
_56.remove();
},isLeftToRight:function(){
return this.dir?(this.dir=="ltr"):_b.isBodyLtr(this.ownerDocument);
},isFocusable:function(){
return this.focus&&(_c.get(this.domNode,"display")!="none");
},placeAt:function(_57,_58){
var _59=!_57.tagName&&_15.byId(_57);
if(_59&&_59.addChild&&(!_58||typeof _58==="number")){
_59.addChild(this,_58);
}else{
var ref=_59?(_59.containerNode&&!/after|before|replace/.test(_58||"")?_59.containerNode:_59.domNode):_7.byId(_57,this.ownerDocument);
_a.place(this.domNode,ref,_58);
if(!this._started&&(this.getParent()||{})._started){
this.startup();
}
}
return this;
},defer:function(fcn,_5a){
var _5b=setTimeout(_f.hitch(this,function(){
if(!_5b){
return;
}
_5b=null;
if(!this._destroyed){
_f.hitch(this,fcn)();
}
}),_5a||0);
return {remove:function(){
if(_5b){
clearTimeout(_5b);
_5b=null;
}
return null;
}};
}});
if(_d("dojo-bidi")){
_1c.extend(_14);
}
return _1c;
});
