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
function _1c(a,b){
return a===b||(a!==a&&b!==b);
};
var _1d=_6("dijit._WidgetBase",[_11,_13],{id:"",_setIdAttr:"domNode",lang:"",_setLangAttr:_1a("lang"),dir:"",_setDirAttr:_1a("dir"),"class":"",_setClassAttr:{node:"domNode",type:"class"},style:"",title:"",tooltip:"",baseClass:"",srcNodeRef:null,domNode:null,containerNode:null,ownerDocument:null,_setOwnerDocumentAttr:function(val){
this._set("ownerDocument",val);
},attributeMap:{},_blankGif:_4.blankGif||_1.toUrl("dojo/resources/blank.gif"),_introspect:function(){
var _1e=this.constructor;
if(!_1e._setterAttrs){
var _1f=_1e.prototype,_20=_1e._setterAttrs=[],_21=(_1e._onMap={});
for(var _22 in _1f.attributeMap){
_20.push(_22);
}
for(_22 in _1f){
if(/^on/.test(_22)){
_21[_22.substring(2).toLowerCase()]=_22;
}
if(/^_set[A-Z](.*)Attr$/.test(_22)){
_22=_22.charAt(4).toLowerCase()+_22.substr(5,_22.length-9);
if(!_1f.attributeMap||!(_22 in _1f.attributeMap)){
_20.push(_22);
}
}
}
}
},postscript:function(_23,_24){
this.create(_23,_24);
},create:function(_25,_26){
this._introspect();
this.srcNodeRef=_7.byId(_26);
this._connects=[];
this._supportingWidgets=[];
if(this.srcNodeRef&&(typeof this.srcNodeRef.id=="string")){
this.id=this.srcNodeRef.id;
}
if(_25){
this.params=_25;
_f.mixin(this,_25);
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
var _27;
if(this.domNode){
this._applyAttributes();
var _28=this.srcNodeRef;
if(_28&&_28.parentNode&&this.domNode!==_28){
_28.parentNode.replaceChild(this.domNode,_28);
_27=true;
}
this.domNode.setAttribute("widgetId",this.id);
}
this.postCreate();
if(_27){
delete this.srcNodeRef;
}
this._created=true;
},_applyAttributes:function(){
var _29={};
for(var key in this.params||{}){
_29[key]=this._get(key);
}
_2.forEach(this.constructor._setterAttrs,function(key){
if(!(key in _29)){
var val=this._get(key);
if(val){
this.set(key,val);
}
}
},this);
for(key in _29){
this.set(key,_29[key]);
}
},postMixInProperties:function(){
},buildRendering:function(){
if(!this.domNode){
this.domNode=this.srcNodeRef||this.ownerDocument.createElement("div");
}
if(this.baseClass){
var _2a=this.baseClass.split(" ");
if(!this.isLeftToRight()){
_2a=_2a.concat(_2.map(_2a,function(_2b){
return _2b+"Rtl";
}));
}
_9.add(this.domNode,_2a);
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
},destroyRecursive:function(_2c){
this._beingDestroyed=true;
this.destroyDescendants(_2c);
this.destroy(_2c);
},destroy:function(_2d){
this._beingDestroyed=true;
this.uninitialize();
function _2e(w){
if(w.destroyRecursive){
w.destroyRecursive(_2d);
}else{
if(w.destroy){
w.destroy(_2d);
}
}
};
_2.forEach(this._connects,_f.hitch(this,"disconnect"));
_2.forEach(this._supportingWidgets,_2e);
if(this.domNode){
_2.forEach(_15.findWidgets(this.domNode,this.containerNode),_2e);
}
this.destroyRendering(_2d);
_15.remove(this.id);
this._destroyed=true;
},destroyRendering:function(_2f){
if(this.bgIframe){
this.bgIframe.destroy(_2f);
delete this.bgIframe;
}
if(this.domNode){
if(_2f){
_8.remove(this.domNode,"widgetId");
}else{
_a.destroy(this.domNode);
}
delete this.domNode;
}
if(this.srcNodeRef){
if(!_2f){
_a.destroy(this.srcNodeRef);
}
delete this.srcNodeRef;
}
},destroyDescendants:function(_30){
_2.forEach(this.getChildren(),function(_31){
if(_31.destroyRecursive){
_31.destroyRecursive(_30);
}
});
},uninitialize:function(){
return false;
},_setStyleAttr:function(_32){
var _33=this.domNode;
if(_f.isObject(_32)){
_c.set(_33,_32);
}else{
if(_33.style.cssText){
_33.style.cssText+="; "+_32;
}else{
_33.style.cssText=_32;
}
}
this._set("style",_32);
},_attrToDom:function(_34,_35,_36){
_36=arguments.length>=3?_36:this.attributeMap[_34];
_2.forEach(_f.isArray(_36)?_36:[_36],function(_37){
var _38=this[_37.node||_37||"domNode"];
var _39=_37.type||"attribute";
switch(_39){
case "attribute":
if(_f.isFunction(_35)){
_35=_f.hitch(this,_35);
}
var _3a=_37.attribute?_37.attribute:(/^on[A-Z][a-zA-Z]*$/.test(_34)?_34.toLowerCase():_34);
if(_38.tagName){
_8.set(_38,_3a,_35);
}else{
_38.set(_3a,_35);
}
break;
case "innerText":
_38.innerHTML="";
_38.appendChild(this.ownerDocument.createTextNode(_35));
break;
case "innerHTML":
_38.innerHTML=_35;
break;
case "class":
_9.replace(_38,_35,this[_34]);
break;
}
},this);
},get:function(_3b){
var _3c=this._getAttrNames(_3b);
return this[_3c.g]?this[_3c.g]():this._get(_3b);
},set:function(_3d,_3e){
if(typeof _3d==="object"){
for(var x in _3d){
this.set(x,_3d[x]);
}
return this;
}
var _3f=this._getAttrNames(_3d),_40=this[_3f.s];
if(_f.isFunction(_40)){
var _41=_40.apply(this,Array.prototype.slice.call(arguments,1));
}else{
var _42=this.focusNode&&!_f.isFunction(this.focusNode)?"focusNode":"domNode",tag=this[_42]&&this[_42].tagName,_43=tag&&(_17[tag]||(_17[tag]=_18(this[_42]))),map=_3d in this.attributeMap?this.attributeMap[_3d]:_3f.s in this?this[_3f.s]:((_43&&_3f.l in _43&&typeof _3e!="function")||/^aria-|^data-|^role$/.test(_3d))?_42:null;
if(map!=null){
this._attrToDom(_3d,_3e,map);
}
this._set(_3d,_3e);
}
return _41||this;
},_attrPairNames:{},_getAttrNames:function(_44){
var apn=this._attrPairNames;
if(apn[_44]){
return apn[_44];
}
var uc=_44.replace(/^[a-z]|-[a-zA-Z]/g,function(c){
return c.charAt(c.length-1).toUpperCase();
});
return (apn[_44]={n:_44+"Node",s:"_set"+uc+"Attr",g:"_get"+uc+"Attr",l:uc.toLowerCase()});
},_set:function(_45,_46){
var _47=this[_45];
this[_45]=_46;
if(this._created&&!_1c(_47,_46)){
if(this._watchCallbacks){
this._watchCallbacks(_45,_47,_46);
}
this.emit("attrmodified-"+_45,{detail:{prevValue:_47,newValue:_46}});
}
},_get:function(_48){
return this[_48];
},emit:function(_49,_4a,_4b){
_4a=_4a||{};
if(_4a.bubbles===undefined){
_4a.bubbles=true;
}
if(_4a.cancelable===undefined){
_4a.cancelable=true;
}
if(!_4a.detail){
_4a.detail={};
}
_4a.detail.widget=this;
var ret,_4c=this["on"+_49];
if(_4c){
ret=_4c.apply(this,_4b?_4b:[_4a]);
}
if(this._started&&!this._beingDestroyed){
on.emit(this.domNode,_49.toLowerCase(),_4a);
}
return ret;
},on:function(_4d,_4e){
var _4f=this._onMap(_4d);
if(_4f){
return _3.after(this,_4f,_4e,true);
}
return this.own(on(this.domNode,_4d,_4e))[0];
},_onMap:function(_50){
var _51=this.constructor,map=_51._onMap;
if(!map){
map=(_51._onMap={});
for(var _52 in _51.prototype){
if(/^on/.test(_52)){
map[_52.replace(/^on/,"").toLowerCase()]=_52;
}
}
}
return map[typeof _50=="string"&&_50.toLowerCase()];
},toString:function(){
return "[Widget "+this.declaredClass+", "+(this.id||"NO ID")+"]";
},getChildren:function(){
return this.containerNode?_15.findWidgets(this.containerNode):[];
},getParent:function(){
return _15.getEnclosingWidget(this.domNode.parentNode);
},connect:function(obj,_53,_54){
return this.own(_5.connect(obj,_53,this,_54))[0];
},disconnect:function(_55){
_55.remove();
},subscribe:function(t,_56){
return this.own(_12.subscribe(t,_f.hitch(this,_56)))[0];
},unsubscribe:function(_57){
_57.remove();
},isLeftToRight:function(){
return this.dir?(this.dir=="ltr"):_b.isBodyLtr(this.ownerDocument);
},isFocusable:function(){
return this.focus&&(_c.get(this.domNode,"display")!="none");
},placeAt:function(_58,_59){
var _5a=!_58.tagName&&_15.byId(_58);
if(_5a&&_5a.addChild&&(!_59||typeof _59==="number")){
_5a.addChild(this,_59);
}else{
var ref=_5a?(_5a.containerNode&&!/after|before|replace/.test(_59||"")?_5a.containerNode:_5a.domNode):_7.byId(_58,this.ownerDocument);
_a.place(this.domNode,ref,_59);
if(!this._started&&(this.getParent()||{})._started){
this.startup();
}
}
return this;
},defer:function(fcn,_5b){
var _5c=setTimeout(_f.hitch(this,function(){
if(!_5c){
return;
}
_5c=null;
if(!this._destroyed){
_f.hitch(this,fcn)();
}
}),_5b||0);
return {remove:function(){
if(_5c){
clearTimeout(_5c);
_5c=null;
}
return null;
}};
}});
if(_d("dojo-bidi")){
_1d.extend(_14);
}
return _1d;
});
