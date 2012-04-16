/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.flash._base"]){
dojo._hasResource["dojox.flash._base"]=true;
dojo.provide("dojox.flash._base");
dojo.experimental("dojox.flash");
dojo.require("dojo.window");
dojox.flash=function(){
};
dojox.flash={ready:false,url:null,_visible:true,_loadedListeners:[],_installingListeners:[],setSwf:function(_1,_2){
this.url=_1;
this._visible=true;
if(_2!==null&&_2!==undefined){
this._visible=_2;
}
this._initialize();
},addLoadedListener:function(_3){
this._loadedListeners.push(_3);
},addInstallingListener:function(_4){
this._installingListeners.push(_4);
},loaded:function(){
dojox.flash.ready=true;
if(dojox.flash._loadedListeners.length){
for(var i=0;i<dojox.flash._loadedListeners.length;i++){
dojox.flash._loadedListeners[i].call(null);
}
}
},installing:function(){
if(dojox.flash._installingListeners.length){
for(var i=0;i<dojox.flash._installingListeners.length;i++){
dojox.flash._installingListeners[i].call(null);
}
}
},_initialize:function(){
var _5=new dojox.flash.Install();
dojox.flash.installer=_5;
if(_5.needed()){
_5.install();
}else{
dojox.flash.obj=new dojox.flash.Embed(this._visible);
dojox.flash.obj.write();
dojox.flash.comm=new dojox.flash.Communicator();
}
}};
dojox.flash.Info=function(){
this._detectVersion();
};
dojox.flash.Info.prototype={version:-1,versionMajor:-1,versionMinor:-1,versionRevision:-1,capable:false,installing:false,isVersionOrAbove:function(_6,_7,_8){
_8=parseFloat("."+_8);
if(this.versionMajor>=_6&&this.versionMinor>=_7&&this.versionRevision>=_8){
return true;
}else{
return false;
}
},_detectVersion:function(){
var _9;
for(var _a=25;_a>0;_a--){
if(dojo.isIE){
var _b;
try{
if(_a>6){
_b=new ActiveXObject("ShockwaveFlash.ShockwaveFlash."+_a);
}else{
_b=new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
}
if(typeof _b=="object"){
if(_a==6){
_b.AllowScriptAccess="always";
}
_9=_b.GetVariable("$version");
}
}
catch(e){
continue;
}
}else{
_9=this._JSFlashInfo(_a);
}
if(_9==-1){
this.capable=false;
return;
}else{
if(_9!=0){
var _c;
if(dojo.isIE){
var _d=_9.split(" ");
var _e=_d[1];
_c=_e.split(",");
}else{
_c=_9.split(".");
}
this.versionMajor=_c[0];
this.versionMinor=_c[1];
this.versionRevision=_c[2];
var _f=this.versionMajor+"."+this.versionRevision;
this.version=parseFloat(_f);
this.capable=true;
break;
}
}
}
},_JSFlashInfo:function(_10){
if(navigator.plugins!=null&&navigator.plugins.length>0){
if(navigator.plugins["Shockwave Flash 2.0"]||navigator.plugins["Shockwave Flash"]){
var _11=navigator.plugins["Shockwave Flash 2.0"]?" 2.0":"";
var _12=navigator.plugins["Shockwave Flash"+_11].description;
var _13=_12.split(" ");
var _14=_13[2].split(".");
var _15=_14[0];
var _16=_14[1];
var _17=(_13[3]||_13[4]).split("r");
var _18=_17[1]>0?_17[1]:0;
var _19=_15+"."+_16+"."+_18;
return _19;
}
}
return -1;
}};
dojox.flash.Embed=function(_1a){
this._visible=_1a;
};
dojox.flash.Embed.prototype={width:215,height:138,id:"flashObject",_visible:true,protocol:function(){
switch(window.location.protocol){
case "https:":
return "https";
break;
default:
return "http";
break;
}
},write:function(_1b){
var _1c;
var _1d=dojox.flash.url;
var _1e=_1d;
var _1f=_1d;
var _20=dojo.baseUrl;
var _21=document.location.protocol+"//"+document.location.host;
if(_1b){
var _22=escape(window.location);
document.title=document.title.slice(0,47)+" - Flash Player Installation";
var _23=escape(document.title);
_1e+="?MMredirectURL="+_22+"&MMplayerType=ActiveX"+"&MMdoctitle="+_23+"&baseUrl="+escape(_20)+"&xdomain="+escape(_21);
_1f+="?MMredirectURL="+_22+"&MMplayerType=PlugIn"+"&baseUrl="+escape(_20)+"&xdomain="+escape(_21);
}else{
_1e+="?cachebust="+new Date().getTime();
_1e+="&baseUrl="+escape(_20);
_1e+="&xdomain="+escape(_21);
}
if(_1f.indexOf("?")==-1){
_1f+="?baseUrl="+escape(_20);
}else{
_1f+="&baseUrl="+escape(_20);
}
_1f+="&xdomain="+escape(_21);
_1c="<object classid=\"clsid:d27cdb6e-ae6d-11cf-96b8-444553540000\" "+"codebase=\""+this.protocol()+"://fpdownload.macromedia.com/pub/shockwave/cabs/flash/"+"swflash.cab#version=8,0,0,0\"\n "+"width=\""+this.width+"\"\n "+"height=\""+this.height+"\"\n "+"id=\""+this.id+"\"\n "+"name=\""+this.id+"\"\n "+"align=\"middle\">\n "+"<param name=\"allowScriptAccess\" value=\"always\"></param>\n "+"<param name=\"movie\" value=\""+_1e+"\"></param>\n "+"<param name=\"quality\" value=\"high\"></param>\n "+"<param name=\"bgcolor\" value=\"#ffffff\"></param>\n "+"<embed src=\""+_1f+"\" "+"quality=\"high\" "+"bgcolor=\"#ffffff\" "+"width=\""+this.width+"\" "+"height=\""+this.height+"\" "+"id=\""+this.id+"Embed"+"\" "+"name=\""+this.id+"\" "+"swLiveConnect=\"true\" "+"align=\"middle\" "+"allowScriptAccess=\"always\" "+"type=\"application/x-shockwave-flash\" "+"pluginspage=\""+this.protocol()+"://www.macromedia.com/go/getflashplayer\" "+"></embed>\n"+"</object>\n";
dojo.connect(dojo,"loaded",dojo.hitch(this,function(){
var _24=this.id+"Container";
if(dojo.byId(_24)){
return;
}
var div=document.createElement("div");
div.id=this.id+"Container";
div.style.width=this.width+"px";
div.style.height=this.height+"px";
if(!this._visible){
div.style.position="absolute";
div.style.zIndex="10000";
div.style.top="-1000px";
}
div.innerHTML=_1c;
var _25=document.getElementsByTagName("body");
if(!_25||!_25.length){
throw new Error("No body tag for this page");
}
_25=_25[0];
_25.appendChild(div);
}));
},get:function(){
if(dojo.isIE||dojo.isWebKit){
return dojo.byId(this.id);
}else{
return document[this.id+"Embed"];
}
},setVisible:function(_26){
var _27=dojo.byId(this.id+"Container");
if(_26){
_27.style.position="absolute";
_27.style.visibility="visible";
}else{
_27.style.position="absolute";
_27.style.y="-1000px";
_27.style.visibility="hidden";
}
},center:function(){
var _28=this.width;
var _29=this.height;
var _2a=dojo.window.getBox();
var x=_2a.l+(_2a.w-_28)/2;
var y=_2a.t+(_2a.h-_29)/2;
var _2b=dojo.byId(this.id+"Container");
_2b.style.top=y+"px";
_2b.style.left=x+"px";
}};
dojox.flash.Communicator=function(){
};
dojox.flash.Communicator.prototype={_addExternalInterfaceCallback:function(_2c){
var _2d=dojo.hitch(this,function(){
var _2e=new Array(arguments.length);
for(var i=0;i<arguments.length;i++){
_2e[i]=this._encodeData(arguments[i]);
}
var _2f=this._execFlash(_2c,_2e);
_2f=this._decodeData(_2f);
return _2f;
});
this[_2c]=_2d;
},_encodeData:function(_30){
if(!_30||typeof _30!="string"){
return _30;
}
_30=_30.replace("\\","&custom_backslash;");
_30=_30.replace(/\0/g,"&custom_null;");
return _30;
},_decodeData:function(_31){
if(_31&&_31.length&&typeof _31!="string"){
_31=_31[0];
}
if(!_31||typeof _31!="string"){
return _31;
}
_31=_31.replace(/\&custom_null\;/g,"\x00");
_31=_31.replace(/\&custom_lt\;/g,"<").replace(/\&custom_gt\;/g,">").replace(/\&custom_backslash\;/g,"\\");
return _31;
},_execFlash:function(_32,_33){
var _34=dojox.flash.obj.get();
_33=(_33)?_33:[];
for(var i=0;i<_33;i++){
if(typeof _33[i]=="string"){
_33[i]=this._encodeData(_33[i]);
}
}
var _35=function(){
return eval(_34.CallFunction("<invoke name=\""+_32+"\" returntype=\"javascript\">"+__flash__argumentsToXML(_33,0)+"</invoke>"));
};
var _36=_35.call(_33);
if(typeof _36=="string"){
_36=this._decodeData(_36);
}
return _36;
}};
dojox.flash.Install=function(){
};
dojox.flash.Install.prototype={needed:function(){
if(!dojox.flash.info.capable){
return true;
}
if(!dojox.flash.info.isVersionOrAbove(8,0,0)){
return true;
}
return false;
},install:function(){
var _37;
dojox.flash.info.installing=true;
dojox.flash.installing();
if(dojox.flash.info.capable==false){
_37=new dojox.flash.Embed(false);
_37.write();
}else{
if(dojox.flash.info.isVersionOrAbove(6,0,65)){
_37=new dojox.flash.Embed(false);
_37.write(true);
_37.setVisible(true);
_37.center();
}else{
alert("This content requires a more recent version of the Macromedia "+" Flash Player.");
window.location.href=+dojox.flash.Embed.protocol()+"://www.macromedia.com/go/getflashplayer";
}
}
},_onInstallStatus:function(msg){
if(msg=="Download.Complete"){
dojox.flash._initialize();
}else{
if(msg=="Download.Cancelled"){
alert("This content requires a more recent version of the Macromedia "+" Flash Player.");
window.location.href=dojox.flash.Embed.protocol()+"://www.macromedia.com/go/getflashplayer";
}else{
if(msg=="Download.Failed"){
alert("There was an error downloading the Flash Player update. "+"Please try again later, or visit macromedia.com to download "+"the latest version of the Flash plugin.");
}
}
}
}};
dojox.flash.info=new dojox.flash.Info();
}
