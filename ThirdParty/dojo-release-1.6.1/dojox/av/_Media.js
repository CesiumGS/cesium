/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.av._Media"]){
dojo._hasResource["dojox.av._Media"]=true;
dojo.provide("dojox.av._Media");
dojo.declare("dojox.av._Media",null,{mediaUrl:"",initialVolume:1,autoPlay:false,bufferTime:2000,minBufferTime:300,updateTime:100,id:"",isDebug:false,percentDownloaded:0,_flashObject:null,flashMedia:null,allowScriptAccess:"always",allowNetworking:"all",wmode:"transparent",allowFullScreen:true,_initStatus:function(){
this.status="ready";
this._positionHandle=dojo.connect(this,"onPosition",this,"_figureStatus");
},getTime:function(){
return this.flashMedia.getTime();
},onLoad:function(_1){
},onDownloaded:function(_2){
},onClick:function(_3){
},onSwfSized:function(_4){
},onMetaData:function(_5,_6){
this.duration=_5.duration;
},onPosition:function(_7){
},onStart:function(_8){
},onPlay:function(_9){
},onPause:function(_a){
},onEnd:function(_b){
},onStop:function(){
},onBuffer:function(_c){
this.isBuffering=_c;
},onError:function(_d,_e){
console.warn("ERROR-"+_d.type.toUpperCase()+":",_d.info.code," - URL:",_e);
},onStatus:function(_f){
},onPlayerStatus:function(_10){
},onResize:function(){
},_figureStatus:function(){
var pos=this.getTime();
if(this.status=="stopping"){
this.status="stopped";
this.onStop(this._eventFactory());
}else{
if(this.status=="ending"&&pos==this._prevPos){
this.status="ended";
this.onEnd(this._eventFactory());
}else{
if(this.duration&&pos>this.duration-0.5){
this.status="ending";
}else{
if(pos===0){
if(this.status=="ready"){
}else{
this.status="stopped";
if(this._prevStatus!="stopped"){
this.onStop(this._eventFactory());
}
}
}else{
if(this.status=="ready"){
this.status="started";
this.onStart(this._eventFactory());
this.onPlay(this._eventFactory());
}else{
if(this.isBuffering){
this.status="buffering";
}else{
if(this.status=="started"||(this.status=="playing"&&pos!=this._prevPos)){
this.status="playing";
}else{
if(!this.isStopped&&this.status=="playing"&&pos==this._prevPos){
this.status="paused";
console.warn("pause",pos,this._prevPos);
if(this.status!=this._prevStatus){
this.onPause(this._eventFactory());
}
}else{
if((this.status=="paused"||this.status=="stopped")&&pos!=this._prevPos){
this.status="started";
this.onPlay(this._eventFactory());
}
}
}
}
}
}
}
}
}
this._prevPos=pos;
this._prevStatus=this.status;
this.onStatus(this.status);
},_eventFactory:function(){
var evt={status:this.status};
return evt;
},_sub:function(_11,_12){
dojo.subscribe(this.id+"/"+_11,this,_12);
},_normalizeVolume:function(vol){
if(vol>1){
while(vol>1){
vol*=0.1;
}
}
return vol;
},_normalizeUrl:function(_13){
if(_13&&(_13.toLowerCase().indexOf("http")<0||_13.indexOf("/")==0)){
var loc=window.location.href.split("/");
loc.pop();
loc=loc.join("/")+"/";
_13=loc+_13;
}
return _13;
},destroy:function(){
if(!this.flashMedia){
this._cons.push(dojo.connect(this,"onLoad",this,"destroy"));
return;
}
dojo.forEach(this._subs,function(s){
dojo.unsubscribe(s);
});
dojo.forEach(this._cons,function(c){
dojo.disconnect(c);
});
this._flashObject.destroy();
}});
}
