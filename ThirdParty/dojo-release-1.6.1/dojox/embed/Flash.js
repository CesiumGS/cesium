/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.embed.Flash"]){
dojo._hasResource["dojox.embed.Flash"]=true;
dojo.provide("dojox.embed.Flash");
(function(){
var _1,_2;
var _3=9;
var _4="dojox-embed-flash-",_5=0;
var _6={expressInstall:false,width:320,height:240,swLiveConnect:"true",allowScriptAccess:"sameDomain",allowNetworking:"all",style:null,redirect:null};
function _7(_8){
_8=dojo.delegate(_6,_8);
if(!("path" in _8)){
console.error("dojox.embed.Flash(ctor):: no path reference to a Flash movie was provided.");
return null;
}
if(!("id" in _8)){
_8.id=(_4+_5++);
}
return _8;
};
if(dojo.isIE){
_1=function(_9){
_9=_7(_9);
if(!_9){
return null;
}
var p;
var _a=_9.path;
if(_9.vars){
var a=[];
for(p in _9.vars){
a.push(p+"="+_9.vars[p]);
}
_9.params.FlashVars=a.join("&");
delete _9.vars;
}
var s="<object id=\""+_9.id+"\" "+"classid=\"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000\" "+"width=\""+_9.width+"\" "+"height=\""+_9.height+"\""+((_9.style)?" style=\""+_9.style+"\"":"")+">"+"<param name=\"movie\" value=\""+_a+"\" />";
if(_9.params){
for(p in _9.params){
s+="<param name=\""+p+"\" value=\""+_9.params[p]+"\" />";
}
}
s+="</object>";
return {id:_9.id,markup:s};
};
_2=(function(){
var _b=10,_c=null;
while(!_c&&_b>7){
try{
_c=new ActiveXObject("ShockwaveFlash.ShockwaveFlash."+_b--);
}
catch(e){
}
}
if(_c){
var v=_c.GetVariable("$version").split(" ")[1].split(",");
return {major:(v[0]!=null)?parseInt(v[0]):0,minor:(v[1]!=null)?parseInt(v[1]):0,rev:(v[2]!=null)?parseInt(v[2]):0};
}
return {major:0,minor:0,rev:0};
})();
dojo.addOnUnload(function(){
var _d=function(){
};
var _e=dojo.query("object").reverse().style("display","none").forEach(function(i){
for(var p in i){
if((p!="FlashVars")&&dojo.isFunction(i[p])){
try{
i[p]=_d;
}
catch(e){
}
}
}
});
});
}else{
_1=function(_f){
_f=_7(_f);
if(!_f){
return null;
}
var p;
var _10=_f.path;
if(_f.vars){
var a=[];
for(p in _f.vars){
a.push(p+"="+_f.vars[p]);
}
_f.params.flashVars=a.join("&");
delete _f.vars;
}
var s="<embed type=\"application/x-shockwave-flash\" "+"src=\""+_10+"\" "+"id=\""+_f.id+"\" "+"width=\""+_f.width+"\" "+"height=\""+_f.height+"\""+((_f.style)?" style=\""+_f.style+"\" ":"")+"pluginspage=\""+window.location.protocol+"//www.adobe.com/go/getflashplayer\" ";
if(_f.params){
for(p in _f.params){
s+=" "+p+"=\""+_f.params[p]+"\"";
}
}
s+=" />";
return {id:_f.id,markup:s};
};
_2=(function(){
var _11=navigator.plugins["Shockwave Flash"];
if(_11&&_11.description){
var v=_11.description.replace(/([a-zA-Z]|\s)+/,"").replace(/(\s+r|\s+b[0-9]+)/,".").split(".");
return {major:(v[0]!=null)?parseInt(v[0]):0,minor:(v[1]!=null)?parseInt(v[1]):0,rev:(v[2]!=null)?parseInt(v[2]):0};
}
return {major:0,minor:0,rev:0};
})();
}
dojox.embed.Flash=function(_12,_13){
if(location.href.toLowerCase().indexOf("file://")>-1){
throw new Error("dojox.embed.Flash can't be run directly from a file. To instatiate the required SWF correctly it must be run from a server, like localHost.");
}
this.available=dojox.embed.Flash.available;
this.minimumVersion=_12.minimumVersion||_3;
this.id=null;
this.movie=null;
this.domNode=null;
if(_13){
_13=dojo.byId(_13);
}
setTimeout(dojo.hitch(this,function(){
if(_12.expressInstall||this.available&&this.available>=this.minimumVersion){
if(_12&&_13){
this.init(_12,_13);
}else{
this.onError("embed.Flash was not provided with the proper arguments.");
}
}else{
if(!this.available){
this.onError("Flash is not installed.");
}else{
this.onError("Flash version detected: "+this.available+" is out of date. Minimum required: "+this.minimumVersion);
}
}
}),100);
};
dojo.extend(dojox.embed.Flash,{onReady:function(_14){
console.warn("embed.Flash.movie.onReady:",_14);
},onLoad:function(_15){
console.warn("embed.Flash.movie.onLoad:",_15);
},onError:function(msg){
},_onload:function(){
clearInterval(this._poller);
delete this._poller;
delete this._pollCount;
delete this._pollMax;
this.onLoad(this.movie);
},init:function(_16,_17){
this.destroy();
_17=dojo.byId(_17||this.domNode);
if(!_17){
throw new Error("dojox.embed.Flash: no domNode reference has been passed.");
}
var p=0,_18=false;
this._poller=null;
this._pollCount=0;
this._pollMax=15;
this.pollTime=100;
if(dojox.embed.Flash.initialized){
this.id=dojox.embed.Flash.place(_16,_17);
this.domNode=_17;
setTimeout(dojo.hitch(this,function(){
this.movie=this.byId(this.id,_16.doc);
this.onReady(this.movie);
this._poller=setInterval(dojo.hitch(this,function(){
try{
p=this.movie.PercentLoaded();
}
catch(e){
console.warn("this.movie.PercentLoaded() failed");
}
if(p==100){
this._onload();
}else{
if(p==0&&this._pollCount++>this._pollMax){
clearInterval(this._poller);
throw new Error("Building SWF failed.");
}
}
}),this.pollTime);
}),1);
}
},_destroy:function(){
try{
this.domNode.removeChild(this.movie);
}
catch(e){
}
this.id=this.movie=this.domNode=null;
},destroy:function(){
if(!this.movie){
return;
}
var _19=dojo.delegate({id:true,movie:true,domNode:true,onReady:true,onLoad:true});
for(var p in this){
if(!_19[p]){
delete this[p];
}
}
if(this._poller){
dojo.connect(this,"onLoad",this,"_destroy");
}else{
this._destroy();
}
},byId:function(_1a,doc){
doc=doc||document;
if(doc.embeds[_1a]){
return doc.embeds[_1a];
}
if(doc[_1a]){
return doc[_1a];
}
if(window[_1a]){
return window[_1a];
}
if(document[_1a]){
return document[_1a];
}
return null;
}});
dojo.mixin(dojox.embed.Flash,{minSupported:8,available:_2.major,supported:(_2.major>=_2.required),minimumRequired:_2.required,version:_2,initialized:false,onInitialize:function(){
dojox.embed.Flash.initialized=true;
},__ie_markup__:function(_1b){
return _1(_1b);
},proxy:function(obj,_1c){
dojo.forEach((dojo.isArray(_1c)?_1c:[_1c]),function(_1d){
this[_1d]=dojo.hitch(this,function(){
return (function(){
return eval(this.movie.CallFunction("<invoke name=\""+_1d+"\" returntype=\"javascript\">"+"<arguments>"+dojo.map(arguments,function(_1e){
return __flash__toXML(_1e);
}).join("")+"</arguments>"+"</invoke>"));
}).apply(this,arguments||[]);
});
},obj);
}});
dojox.embed.Flash.place=function(_1f,_20){
var o=_1(_1f);
_20=dojo.byId(_20);
if(!_20){
_20=dojo.doc.createElement("div");
_20.id=o.id+"-container";
dojo.body().appendChild(_20);
}
if(o){
_20.innerHTML=o.markup;
return o.id;
}
return null;
};
dojox.embed.Flash.onInitialize();
})();
}
