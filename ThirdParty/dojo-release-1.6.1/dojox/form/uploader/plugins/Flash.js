/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.uploader.plugins.Flash"]){
dojo._hasResource["dojox.form.uploader.plugins.Flash"]=true;
dojo.provide("dojox.form.uploader.plugins.Flash");
dojo.require("dojox.form.uploader.plugins.HTML5");
dojo.require("dojox.embed.flashVars");
dojo.require("dojox.embed.Flash");
dojo.declare("dojox.form.uploader.plugins.Flash",[],{swfPath:dojo.config.uploaderPath||dojo.moduleUrl("dojox.form","resources/uploader.swf"),skipServerCheck:true,serverTimeout:2000,isDebug:false,devMode:false,deferredUploading:0,force:"",postMixInProperties:function(){
if(!this.supports("multiple")){
this.uploadType="flash";
this._files=[];
this._fileMap={};
this._createInput=this._createFlashUploader;
this.getFileList=this.getFlashFileList;
this.reset=this.flashReset;
this.upload=this.uploadFlash;
this.submit=this.submitFlash;
this.fieldname="flashUploadFiles";
}
this.inherited(arguments);
},onReady:function(_1){
},onLoad:function(_2){
},onFileChange:function(_3){
},onFileProgress:function(_4){
},getFlashFileList:function(){
return this._files;
},flashReset:function(){
this.flashMovie.reset();
this._files=[];
},uploadFlash:function(){
this.onBegin(this.getFileList());
this.flashMovie.doUpload();
},submitFlash:function(_5){
this.onBegin(this.getFileList());
this.flashMovie.doUpload(_5);
},_change:function(_6){
this._files=this._files.concat(_6);
dojo.forEach(_6,function(f){
f.bytesLoaded=0;
f.bytesTotal=f.size;
this._fileMap[f.name+"_"+f.size]=f;
},this);
this.onChange(this._files);
this.onFileChange(_6);
},_complete:function(_7){
var o=this._getCustomEvent();
o.type="load";
this.onComplete(_7);
},_progress:function(f){
this._fileMap[f.name+"_"+f.bytesTotal].bytesLoaded=f.bytesLoaded;
var o=this._getCustomEvent();
this.onFileProgress(f);
this.onProgress(o);
},_error:function(_8){
this.onError(_8);
},_onFlashBlur:function(_9){
},_getCustomEvent:function(){
var o={bytesLoaded:0,bytesTotal:0,type:"progress",timeStamp:new Date().getTime()};
for(var nm in this._fileMap){
o.bytesTotal+=this._fileMap[nm].bytesTotal;
o.bytesLoaded+=this._fileMap[nm].bytesLoaded;
}
o.decimal=o.bytesLoaded/o.bytesTotal;
o.percent=Math.ceil((o.bytesLoaded/o.bytesTotal)*100)+"%";
return o;
},_connectFlash:function(){
this._subs=[];
this._cons=[];
var _a=dojo.hitch(this,function(s,_b){
this._subs.push(dojo.subscribe(this.id+s,this,_b));
});
_a("/filesSelected","_change");
_a("/filesUploaded","_complete");
_a("/filesProgress","_progress");
_a("/filesError","_error");
_a("/filesCanceled","onCancel");
_a("/stageBlur","_onFlashBlur");
var cs=dojo.hitch(this,function(s,nm){
this._cons.push(dojo.subscribe(this.id+s,this,function(_c){
this.button._cssMouseEvent({type:nm});
}));
});
cs("/up","mouseup");
cs("/down","mousedown");
cs("/over","mouseover");
cs("/out","mouseout");
this.connect(this.domNode,"focus",function(){
this.flashMovie.focus();
this.flashMovie.doFocus();
});
if(this.tabIndex>=0){
dojo.attr(this.domNode,"tabIndex",this.tabIndex);
}
},_createFlashUploader:function(){
var _d=this.getUrl();
if(_d){
if(_d.toLowerCase().indexOf("http")<0&&_d.indexOf("/")!=0){
var _e=window.location.href.split("/");
_e.pop();
_e=_e.join("/")+"/";
_d=_e+_d;
}
}else{
console.warn("Warning: no uploadUrl provided.");
}
this.inputNode=dojo.create("div",{className:"dojoxFlashNode"},this.domNode,"first");
dojo.style(this.inputNode,{position:"absolute",top:"-2px",width:this.btnSize.w+"px",height:this.btnSize.h+"px",opacity:0});
var w=this.btnSize.w;
var h=this.btnSize.h;
var _f={expressInstall:true,path:(this.swfPath.uri||this.swfPath)+"?cb_"+(new Date().getTime()),width:w,height:h,allowScriptAccess:"always",allowNetworking:"all",vars:{uploadDataFieldName:this.flashFieldName||this.name+"Flash",uploadUrl:_d,uploadOnSelect:this.uploadOnSelect,deferredUploading:this.deferredUploading||0,selectMultipleFiles:this.multiple,id:this.id,isDebug:this.isDebug,noReturnCheck:this.skipServerCheck,serverTimeout:this.serverTimeout},params:{scale:"noscale",wmode:"transparent",wmode:"opaque",allowScriptAccess:"always",allowNetworking:"all"}};
this.flashObject=new dojox.embed.Flash(_f,this.inputNode);
this.flashObject.onError=dojo.hitch(function(msg){
console.error("Flash Error: "+msg);
});
this.flashObject.onReady=dojo.hitch(this,function(){
this.onReady(this);
});
this.flashObject.onLoad=dojo.hitch(this,function(mov){
this.flashMovie=mov;
this.flashReady=true;
this.onLoad(this);
});
this._connectFlash();
}});
dojox.form.addUploaderPlugin(dojox.form.uploader.plugins.Flash);
}
