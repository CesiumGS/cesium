/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.embed.Quicktime"]){
dojo._hasResource["dojox.embed.Quicktime"]=true;
dojo.provide("dojox.embed.Quicktime");
(function(d){
var _1,_2={major:0,minor:0,rev:0},_3,_4={width:320,height:240,redirect:null},_5="dojox-embed-quicktime-",_6=0,_7="This content requires the <a href=\"http://www.apple.com/quicktime/download/\" title=\"Download and install QuickTime.\">QuickTime plugin</a>.";
function _8(_9){
_9=d.mixin(d.clone(_4),_9||{});
if(!("path" in _9)&&!_9.testing){
console.error("dojox.embed.Quicktime(ctor):: no path reference to a QuickTime movie was provided.");
return null;
}
if(_9.testing){
_9.path="";
}
if(!("id" in _9)){
_9.id=_5+_6++;
}
return _9;
};
if(d.isIE){
_3=(function(){
try{
var o=new ActiveXObject("QuickTimeCheckObject.QuickTimeCheck.1");
if(o!==undefined){
var v=o.QuickTimeVersion.toString(16);
function p(i){
return (v.substring(i,i+1)-0)||0;
};
_2={major:p(0),minor:p(1),rev:p(2)};
return o.IsQuickTimeAvailable(0);
}
}
catch(e){
}
return false;
})();
_1=function(_a){
if(!_3){
return {id:null,markup:_7};
}
_a=_8(_a);
if(!_a){
return null;
}
var s="<object classid=\"clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B\" "+"codebase=\"http://www.apple.com/qtactivex/qtplugin.cab#version=6,0,2,0\" "+"id=\""+_a.id+"\" "+"width=\""+_a.width+"\" "+"height=\""+_a.height+"\">"+"<param name=\"src\" value=\""+_a.path+"\"/>";
for(var p in _a.params||{}){
s+="<param name=\""+p+"\" value=\""+_a.params[p]+"\"/>";
}
s+="</object>";
return {id:_a.id,markup:s};
};
}else{
_3=(function(){
for(var i=0,p=navigator.plugins,l=p.length;i<l;i++){
if(p[i].name.indexOf("QuickTime")>-1){
return true;
}
}
return false;
})();
_1=function(_b){
if(!_3){
return {id:null,markup:_7};
}
_b=_8(_b);
if(!_b){
return null;
}
var s="<embed type=\"video/quicktime\" src=\""+_b.path+"\" "+"id=\""+_b.id+"\" "+"name=\""+_b.id+"\" "+"pluginspage=\"www.apple.com/quicktime/download\" "+"enablejavascript=\"true\" "+"width=\""+_b.width+"\" "+"height=\""+_b.height+"\"";
for(var p in _b.params||{}){
s+=" "+p+"=\""+_b.params[p]+"\"";
}
s+="></embed>";
return {id:_b.id,markup:s};
};
}
dojox.embed.Quicktime=function(_c,_d){
return dojox.embed.Quicktime.place(_c,_d);
};
d.mixin(dojox.embed.Quicktime,{minSupported:6,available:_3,supported:_3,version:_2,initialized:false,onInitialize:function(){
dojox.embed.Quicktime.initialized=true;
},place:function(_e,_f){
var o=_1(_e);
if(!(_f=d.byId(_f))){
_f=d.create("div",{id:o.id+"-container"},d.body());
}
if(o){
_f.innerHTML=o.markup;
if(o.id){
return d.isIE?d.byId(o.id):document[o.id];
}
}
return null;
}});
if(!d.isIE){
var id="-qt-version-test",o=_1({testing:true,width:4,height:4}),c=10,top="-1000px",_10="1px";
function _11(){
setTimeout(function(){
var qt=document[o.id],n=d.byId(id);
if(qt){
try{
var v=qt.GetQuickTimeVersion().split(".");
dojox.embed.Quicktime.version={major:parseInt(v[0]||0),minor:parseInt(v[1]||0),rev:parseInt(v[2]||0)};
if(dojox.embed.Quicktime.supported=v[0]){
dojox.embed.Quicktime.onInitialize();
}
c=0;
}
catch(e){
if(c--){
_11();
}
}
}
if(!c&&n){
d.destroy(n);
}
},20);
};
if(d._initFired){
d.create("div",{innerHTML:o.markup,id:id,style:{top:top,left:0,width:_10,height:_10,overflow:"hidden",position:"absolute"}},d.body());
}else{
document.write("<div style=\"top:"+top+";left:0;width:"+_10+";height:"+_10+";overflow:hidden;position:absolute\" id=\""+id+"\">"+o.markup+"</div>");
}
_11();
}else{
if(d.isIE&&_3){
setTimeout(function(){
dojox.embed.Quicktime.onInitialize();
},10);
}
}
})(dojo);
}
