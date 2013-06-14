/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/html",["./_base/kernel","./_base/lang","./_base/array","./_base/declare","./dom","./dom-construct","./parser"],function(_1,_2,_3,_4,_5,_6,_7){
var _8={};
_2.setObject("dojo.html",_8);
var _9=0;
_8._secureForInnerHtml=function(_a){
return _a.replace(/(?:\s*<!DOCTYPE\s[^>]+>|<title[^>]*>[\s\S]*?<\/title>)/ig,"");
};
_8._emptyNode=_6.empty;
_8._setNodeContent=function(_b,_c){
_6.empty(_b);
if(_c){
if(typeof _c=="string"){
_c=_6.toDom(_c,_b.ownerDocument);
}
if(!_c.nodeType&&_2.isArrayLike(_c)){
for(var _d=_c.length,i=0;i<_c.length;i=_d==_c.length?i+1:0){
_6.place(_c[i],_b,"last");
}
}else{
_6.place(_c,_b,"last");
}
}
return _b;
};
_8._ContentSetter=_4("dojo.html._ContentSetter",null,{node:"",content:"",id:"",cleanContent:false,extractContent:false,parseContent:false,parserScope:_1._scopeName,startup:true,constructor:function(_e,_f){
_2.mixin(this,_e||{});
_f=this.node=_5.byId(this.node||_f);
if(!this.id){
this.id=["Setter",(_f)?_f.id||_f.tagName:"",_9++].join("_");
}
},set:function(_10,_11){
if(undefined!==_10){
this.content=_10;
}
if(_11){
this._mixin(_11);
}
this.onBegin();
this.setContent();
var ret=this.onEnd();
if(ret&&ret.then){
return ret;
}else{
return this.node;
}
},setContent:function(){
var _12=this.node;
if(!_12){
throw new Error(this.declaredClass+": setContent given no node");
}
try{
_12=_8._setNodeContent(_12,this.content);
}
catch(e){
var _13=this.onContentError(e);
try{
_12.innerHTML=_13;
}
catch(e){
console.error("Fatal "+this.declaredClass+".setContent could not change content due to "+e.message,e);
}
}
this.node=_12;
},empty:function(){
if(this.parseDeferred){
if(!this.parseDeferred.isResolved()){
this.parseDeferred.cancel();
}
delete this.parseDeferred;
}
if(this.parseResults&&this.parseResults.length){
_3.forEach(this.parseResults,function(w){
if(w.destroy){
w.destroy();
}
});
delete this.parseResults;
}
_6.empty(this.node);
},onBegin:function(){
var _14=this.content;
if(_2.isString(_14)){
if(this.cleanContent){
_14=_8._secureForInnerHtml(_14);
}
if(this.extractContent){
var _15=_14.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
if(_15){
_14=_15[1];
}
}
}
this.empty();
this.content=_14;
return this.node;
},onEnd:function(){
if(this.parseContent){
this._parse();
}
return this.node;
},tearDown:function(){
delete this.parseResults;
delete this.parseDeferred;
delete this.node;
delete this.content;
},onContentError:function(err){
return "Error occurred setting content: "+err;
},onExecError:function(err){
return "Error occurred executing scripts: "+err;
},_mixin:function(_16){
var _17={},key;
for(key in _16){
if(key in _17){
continue;
}
this[key]=_16[key];
}
},_parse:function(){
var _18=this.node;
try{
var _19={};
_3.forEach(["dir","lang","textDir"],function(_1a){
if(this[_1a]){
_19[_1a]=this[_1a];
}
},this);
var _1b=this;
this.parseDeferred=_7.parse({rootNode:_18,noStart:!this.startup,inherited:_19,scope:this.parserScope}).then(function(_1c){
return _1b.parseResults=_1c;
},function(e){
_1b._onError("Content",e,"Error parsing in _ContentSetter#"+this.id);
});
}
catch(e){
this._onError("Content",e,"Error parsing in _ContentSetter#"+this.id);
}
},_onError:function(_1d,err,_1e){
var _1f=this["on"+_1d+"Error"].call(this,err);
if(_1e){
console.error(_1e,err);
}else{
if(_1f){
_8._setNodeContent(this.node,_1f,true);
}
}
}});
_8.set=function(_20,_21,_22){
if(undefined==_21){
console.warn("dojo.html.set: no cont argument provided, using empty string");
_21="";
}
if(!_22){
return _8._setNodeContent(_20,_21,true);
}else{
var op=new _8._ContentSetter(_2.mixin(_22,{content:_21,node:_20}));
return op.set();
}
};
return _8;
});
