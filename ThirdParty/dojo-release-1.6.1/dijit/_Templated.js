/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._Templated"]){
dojo._hasResource["dijit._Templated"]=true;
dojo.provide("dijit._Templated");
dojo.require("dijit._Widget");
dojo.require("dojo.string");
dojo.require("dojo.parser");
dojo.require("dojo.cache");
dojo.declare("dijit._Templated",null,{templateString:null,templatePath:null,widgetsInTemplate:false,_skipNodeCache:false,_earlyTemplatedStartup:false,constructor:function(){
this._attachPoints=[];
this._attachEvents=[];
},_stringRepl:function(_1){
var _2=this.declaredClass,_3=this;
return dojo.string.substitute(_1,this,function(_4,_5){
if(_5.charAt(0)=="!"){
_4=dojo.getObject(_5.substr(1),false,_3);
}
if(typeof _4=="undefined"){
throw new Error(_2+" template:"+_5);
}
if(_4==null){
return "";
}
return _5.charAt(0)=="!"?_4:_4.toString().replace(/"/g,"&quot;");
},this);
},buildRendering:function(){
var _6=dijit._Templated.getCachedTemplate(this.templatePath,this.templateString,this._skipNodeCache);
var _7;
if(dojo.isString(_6)){
_7=dojo._toDom(this._stringRepl(_6));
if(_7.nodeType!=1){
throw new Error("Invalid template: "+_6);
}
}else{
_7=_6.cloneNode(true);
}
this.domNode=_7;
this.inherited(arguments);
this._attachTemplateNodes(_7);
if(this.widgetsInTemplate){
var cw=(this._startupWidgets=dojo.parser.parse(_7,{noStart:!this._earlyTemplatedStartup,template:true,inherited:{dir:this.dir,lang:this.lang},propsThis:this,scope:"dojo"}));
this._supportingWidgets=dijit.findWidgets(_7);
this._attachTemplateNodes(cw,function(n,p){
return n[p];
});
}
this._fillContent(this.srcNodeRef);
},_fillContent:function(_8){
var _9=this.containerNode;
if(_8&&_9){
while(_8.hasChildNodes()){
_9.appendChild(_8.firstChild);
}
}
},_attachTemplateNodes:function(_a,_b){
_b=_b||function(n,p){
return n.getAttribute(p);
};
var _c=dojo.isArray(_a)?_a:(_a.all||_a.getElementsByTagName("*"));
var x=dojo.isArray(_a)?0:-1;
for(;x<_c.length;x++){
var _d=(x==-1)?_a:_c[x];
if(this.widgetsInTemplate&&(_b(_d,"dojoType")||_b(_d,"data-dojo-type"))){
continue;
}
var _e=_b(_d,"dojoAttachPoint")||_b(_d,"data-dojo-attach-point");
if(_e){
var _f,_10=_e.split(/\s*,\s*/);
while((_f=_10.shift())){
if(dojo.isArray(this[_f])){
this[_f].push(_d);
}else{
this[_f]=_d;
}
this._attachPoints.push(_f);
}
}
var _11=_b(_d,"dojoAttachEvent")||_b(_d,"data-dojo-attach-event");
if(_11){
var _12,_13=_11.split(/\s*,\s*/);
var _14=dojo.trim;
while((_12=_13.shift())){
if(_12){
var _15=null;
if(_12.indexOf(":")!=-1){
var _16=_12.split(":");
_12=_14(_16[0]);
_15=_14(_16[1]);
}else{
_12=_14(_12);
}
if(!_15){
_15=_12;
}
this._attachEvents.push(this.connect(_d,_12,_15));
}
}
}
var _17=_b(_d,"waiRole");
if(_17){
dijit.setWaiRole(_d,_17);
}
var _18=_b(_d,"waiState");
if(_18){
dojo.forEach(_18.split(/\s*,\s*/),function(_19){
if(_19.indexOf("-")!=-1){
var _1a=_19.split("-");
dijit.setWaiState(_d,_1a[0],_1a[1]);
}
});
}
}
},startup:function(){
dojo.forEach(this._startupWidgets,function(w){
if(w&&!w._started&&w.startup){
w.startup();
}
});
this.inherited(arguments);
},destroyRendering:function(){
dojo.forEach(this._attachPoints,function(_1b){
delete this[_1b];
},this);
this._attachPoints=[];
dojo.forEach(this._attachEvents,this.disconnect,this);
this._attachEvents=[];
this.inherited(arguments);
}});
dijit._Templated._templateCache={};
dijit._Templated.getCachedTemplate=function(_1c,_1d,_1e){
var _1f=dijit._Templated._templateCache;
var key=_1d||_1c;
var _20=_1f[key];
if(_20){
try{
if(!_20.ownerDocument||_20.ownerDocument==dojo.doc){
return _20;
}
}
catch(e){
}
dojo.destroy(_20);
}
if(!_1d){
_1d=dojo.cache(_1c,{sanitize:true});
}
_1d=dojo.string.trim(_1d);
if(_1e||_1d.match(/\$\{([^\}]+)\}/g)){
return (_1f[key]=_1d);
}else{
var _21=dojo._toDom(_1d);
if(_21.nodeType!=1){
throw new Error("Invalid template: "+_1d);
}
return (_1f[key]=_21);
}
};
if(dojo.isIE){
dojo.addOnWindowUnload(function(){
var _22=dijit._Templated._templateCache;
for(var key in _22){
var _23=_22[key];
if(typeof _23=="object"){
dojo.destroy(_23);
}
delete _22[key];
}
});
}
dojo.extend(dijit._Widget,{dojoAttachEvent:"",dojoAttachPoint:"",waiRole:"",waiState:""});
}
