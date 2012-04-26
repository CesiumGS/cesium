/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl._Templated"]){
dojo._hasResource["dojox.dtl._Templated"]=true;
dojo.provide("dojox.dtl._Templated");
dojo.require("dijit._Templated");
dojo.require("dojox.dtl._base");
dojo.declare("dojox.dtl._Templated",dijit._Templated,{_dijitTemplateCompat:false,buildRendering:function(){
var _1;
if(this.domNode&&!this._template){
return;
}
if(!this._template){
var t=this.getCachedTemplate(this.templatePath,this.templateString,this._skipNodeCache);
if(t instanceof dojox.dtl.Template){
this._template=t;
}else{
_1=t;
}
}
if(!_1){
var _2=new dojox.dtl._Context(this);
if(!this._created){
delete _2._getter;
}
var _3=dojo._toDom(this._template.render(_2));
if(_3.nodeType!==1&&_3.nodeType!==3){
for(var i=0,l=_3.childNodes.length;i<l;++i){
_1=_3.childNodes[i];
if(_1.nodeType==1){
break;
}
}
}else{
_1=_3;
}
}
this._attachTemplateNodes(_1);
if(this.widgetsInTemplate){
var _4=dojo.parser,_5,_6;
if(_4._query!="[dojoType]"){
_5=_4._query;
_6=_4._attrName;
_4._query="[dojoType]";
_4._attrName="dojoType";
}
var cw=(this._startupWidgets=dojo.parser.parse(_1,{noStart:!this._earlyTemplatedStartup,inherited:{dir:this.dir,lang:this.lang}}));
if(_5){
_4._query=_5;
_4._attrName=_6;
}
this._supportingWidgets=dijit.findWidgets(_1);
this._attachTemplateNodes(cw,function(n,p){
return n[p];
});
}
if(this.domNode){
dojo.place(_1,this.domNode,"before");
this.destroyDescendants();
dojo.destroy(this.domNode);
}
this.domNode=_1;
this._fillContent(this.srcNodeRef);
},_templateCache:{},getCachedTemplate:function(_7,_8,_9){
var _a=this._templateCache;
var _b=_8||_7;
if(_a[_b]){
return _a[_b];
}
_8=dojo.string.trim(_8||dojo.cache(_7,{sanitize:true}));
if(this._dijitTemplateCompat&&(_9||_8.match(/\$\{([^\}]+)\}/g))){
_8=this._stringRepl(_8);
}
if(_9||!_8.match(/\{[{%]([^\}]+)[%}]\}/g)){
return _a[_b]=dojo._toDom(_8);
}else{
return _a[_b]=new dojox.dtl.Template(_8);
}
},render:function(){
this.buildRendering();
},startup:function(){
dojo.forEach(this._startupWidgets,function(w){
if(w&&!w._started&&w.startup){
w.startup();
}
});
this.inherited(arguments);
}});
}
