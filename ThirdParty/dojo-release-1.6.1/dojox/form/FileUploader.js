/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.FileUploader"]){
dojo._hasResource["dojox.form.FileUploader"]=true;
dojo.provide("dojox.form.FileUploader");
dojo.require("dojox.embed.Flash");
dojo.require("dojo.io.iframe");
dojo.require("dojox.html.styles");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.embed.flashVars");
dojo.require("dijit._Contained");
console.warn("DEPRECATED: dojox.form.FileUploader is no longer supported and will be removed in 2.0. Suggested that you use dojox.form.Uploader instead.");
dojo.declare("dojox.form.FileUploader",[dijit._Widget,dijit._Templated,dijit._Contained],{swfPath:dojo.config.uploaderPath||dojo.moduleUrl("dojox.form","resources/fileuploader.swf"),templateString:"<div><div dojoAttachPoint=\"progNode\"><div dojoAttachPoint=\"progTextNode\"></div></div><div dojoAttachPoint=\"insideNode\" class=\"uploaderInsideNode\"></div></div>",uploadUrl:"",isDebug:false,devMode:false,baseClass:"dojoxUploaderNorm",hoverClass:"dojoxUploaderHover",activeClass:"dojoxUploaderActive",disabledClass:"dojoxUploaderDisabled",force:"",uploaderType:"",flashObject:null,flashMovie:null,insideNode:null,deferredUploading:1,fileListId:"",uploadOnChange:false,selectMultipleFiles:true,htmlFieldName:"uploadedfile",flashFieldName:"flashUploadFiles",fileMask:null,minFlashVersion:9,tabIndex:-1,showProgress:false,progressMessage:"Loading",progressBackgroundUrl:dojo.moduleUrl("dijit","themes/tundra/images/buttonActive.png"),progressBackgroundColor:"#ededed",progressWidgetId:"",skipServerCheck:false,serverTimeout:5000,log:function(){
if(this.isDebug){
console["log"](Array.prototype.slice.call(arguments).join(" "));
}
},constructor:function(){
this._subs=[];
},postMixInProperties:function(){
this.fileList=[];
this._cons=[];
this.fileMask=this.fileMask||[];
this.fileInputs=[];
this.fileCount=0;
this.flashReady=false;
this._disabled=false;
this.force=this.force.toLowerCase();
this.uploaderType=((dojox.embed.Flash.available>=this.minFlashVersion||this.force=="flash")&&this.force!="html")?"flash":"html";
this.deferredUploading=this.deferredUploading===true?1:this.deferredUploading;
this._refNode=this.srcNodeRef;
this.getButtonStyle();
},startup:function(){
},postCreate:function(){
this.inherited(arguments);
this.setButtonStyle();
var _1;
if(this.uploaderType=="flash"){
_1="createFlashUploader";
}else{
this.uploaderType="html";
_1="createHtmlUploader";
}
this[_1]();
if(this.fileListId){
this.connect(dojo.byId(this.fileListId),"click",function(_2){
var p=_2.target.parentNode.parentNode.parentNode;
if(p.id&&p.id.indexOf("file_")>-1){
this.removeFile(p.id.split("file_")[1]);
}
});
}
dojo.addOnUnload(this,this.destroy);
},getHiddenWidget:function(){
var _3=this.domNode.parentNode;
while(_3){
var id=_3.getAttribute&&_3.getAttribute("widgetId");
if(id&&dijit.byId(id).onShow){
return dijit.byId(id);
}
_3=_3.parentNode;
}
return null;
},getHiddenNode:function(_4){
if(!_4){
return null;
}
var _5=null;
var p=_4.parentNode;
while(p&&p.tagName.toLowerCase()!="body"){
var d=dojo.style(p,"display");
if(d=="none"){
_5=p;
break;
}
p=p.parentNode;
}
return _5;
},getButtonStyle:function(){
var _6=this.srcNodeRef;
this._hiddenNode=this.getHiddenNode(_6);
if(this._hiddenNode){
dojo.style(this._hiddenNode,"display","block");
}
if(!_6&&this.button&&this.button.domNode){
var _7=true;
var _8=this.button.domNode.className+" dijitButtonNode";
var _9=this.getText(dojo.query(".dijitButtonText",this.button.domNode)[0]);
var _a="<button id=\""+this.button.id+"\" class=\""+_8+"\">"+_9+"</button>";
_6=dojo.place(_a,this.button.domNode,"after");
this.srcNodeRef=_6;
this.button.destroy();
this.baseClass="dijitButton";
this.hoverClass="dijitButtonHover";
this.pressClass="dijitButtonActive";
this.disabledClass="dijitButtonDisabled";
}else{
if(!this.srcNodeRef&&this.button){
_6=this.button;
}
}
if(dojo.attr(_6,"class")){
this.baseClass+=" "+dojo.attr(_6,"class");
}
dojo.attr(_6,"class",this.baseClass);
this.norm=this.getStyle(_6);
this.width=this.norm.w;
this.height=this.norm.h;
if(this.uploaderType=="flash"){
this.over=this.getTempNodeStyle(_6,this.baseClass+" "+this.hoverClass,_7);
this.down=this.getTempNodeStyle(_6,this.baseClass+" "+this.activeClass,_7);
this.dsbl=this.getTempNodeStyle(_6,this.baseClass+" "+this.disabledClass,_7);
this.fhtml={cn:this.getText(_6),nr:this.norm,ov:this.over,dn:this.down,ds:this.dsbl};
}else{
this.fhtml={cn:this.getText(_6),nr:this.norm};
if(this.norm.va=="middle"){
this.norm.lh=this.norm.h;
}
}
if(this.devMode){
this.log("classes - base:",this.baseClass," hover:",this.hoverClass,"active:",this.activeClass);
this.log("fhtml:",this.fhtml);
this.log("norm:",this.norm);
this.log("over:",this.over);
this.log("down:",this.down);
}
},setButtonStyle:function(){
dojo.style(this.domNode,{width:this.fhtml.nr.w+"px",height:(this.fhtml.nr.h)+"px",padding:"0px",lineHeight:"normal",position:"relative"});
if(this.uploaderType=="html"&&this.norm.va=="middle"){
dojo.style(this.domNode,"lineHeight",this.norm.lh+"px");
}
if(this.showProgress){
this.progTextNode.innerHTML=this.progressMessage;
dojo.style(this.progTextNode,{width:this.fhtml.nr.w+"px",height:(this.fhtml.nr.h+0)+"px",padding:"0px",margin:"0px",left:"0px",lineHeight:(this.fhtml.nr.h+0)+"px",position:"absolute"});
dojo.style(this.progNode,{width:this.fhtml.nr.w+"px",height:(this.fhtml.nr.h+0)+"px",padding:"0px",margin:"0px",left:"0px",position:"absolute",display:"none",backgroundImage:"url("+this.progressBackgroundUrl+")",backgroundPosition:"bottom",backgroundRepeat:"repeat-x",backgroundColor:this.progressBackgroundColor});
}else{
dojo.destroy(this.progNode);
}
dojo.style(this.insideNode,{position:"absolute",top:"0px",left:"0px",display:""});
dojo.addClass(this.domNode,this.srcNodeRef.className);
if(this.fhtml.nr.d.indexOf("inline")>-1){
dojo.addClass(this.domNode,"dijitInline");
}
try{
this.insideNode.innerHTML=this.fhtml.cn;
}
catch(e){
if(this.uploaderType=="flash"){
this.insideNode=this.insideNode.parentNode.removeChild(this.insideNode);
dojo.body().appendChild(this.insideNode);
this.insideNode.innerHTML=this.fhtml.cn;
var c=dojo.connect(this,"onReady",this,function(){
dojo.disconnect(c);
this.insideNode=this.insideNode.parentNode.removeChild(this.insideNode);
this.domNode.appendChild(this.insideNode);
});
}else{
this.insideNode.appendChild(document.createTextNode(this.fhtml.cn));
}
}
if(this._hiddenNode){
dojo.style(this._hiddenNode,"display","none");
}
},onChange:function(_b){
},onProgress:function(_c){
},onComplete:function(_d){
},onCancel:function(){
},onError:function(_e){
},onReady:function(_f){
},onLoad:function(_10){
},submit:function(_11){
var _12=_11?dojo.formToObject(_11):null;
this.upload(_12);
return false;
},upload:function(_13){
if(!this.fileList.length){
return false;
}
if(!this.uploadUrl){
console.warn("uploadUrl not provided. Aborting.");
return false;
}
if(!this.showProgress){
this.set("disabled",true);
}
if(this.progressWidgetId){
var _14=dijit.byId(this.progressWidgetId).domNode;
if(dojo.style(_14,"display")=="none"){
this.restoreProgDisplay="none";
dojo.style(_14,"display","block");
}
if(dojo.style(_14,"visibility")=="hidden"){
this.restoreProgDisplay="hidden";
dojo.style(_14,"visibility","visible");
}
}
if(_13&&!_13.target){
this.postData=_13;
}
this.log("upload type:",this.uploaderType," - postData:",this.postData);
for(var i=0;i<this.fileList.length;i++){
var f=this.fileList[i];
f.bytesLoaded=0;
f.bytesTotal=f.size||100000;
f.percent=0;
}
if(this.uploaderType=="flash"){
this.uploadFlash();
}else{
this.uploadHTML();
}
return false;
},removeFile:function(_15,_16){
var i;
for(i=0;i<this.fileList.length;i++){
if(this.fileList[i].name==_15){
if(!_16){
this.fileList.splice(i,1);
}
break;
}
}
if(this.uploaderType=="flash"){
this.flashMovie.removeFile(_15);
}else{
if(!_16){
dojo.destroy(this.fileInputs[i]);
this.fileInputs.splice(i,1);
this._renumberInputs();
}
}
if(this.fileListId){
dojo.destroy("file_"+_15);
}
},destroy:function(){
if(this.uploaderType=="flash"&&!this.flashMovie){
this._cons.push(dojo.connect(this,"onLoad",this,"destroy"));
return;
}
dojo.forEach(this._subs,dojo.unsubscribe,dojo);
dojo.forEach(this._cons,dojo.disconnect,dojo);
if(this.scrollConnect){
dojo.disconnect(this.scrollConnect);
}
if(this.uploaderType=="flash"){
this.flashObject.destroy();
delete this.flashObject;
}else{
dojo.destroy(this._fileInput);
dojo.destroy(this._formNode);
}
this.inherited(arguments);
},_displayProgress:function(_17){
if(_17===true){
if(this.uploaderType=="flash"){
dojo.style(this.insideNode,"top","-2500px");
}else{
dojo.style(this.insideNode,"display","none");
}
dojo.style(this.progNode,"display","");
}else{
if(_17===false){
dojo.style(this.insideNode,{display:"",left:"0px"});
dojo.style(this.progNode,"display","none");
}else{
var w=_17*this.fhtml.nr.w;
dojo.style(this.progNode,"width",w+"px");
}
}
},_animateProgress:function(){
this._displayProgress(true);
var _18=false;
var c=dojo.connect(this,"_complete",function(){
dojo.disconnect(c);
_18=true;
});
var w=0;
var _19=setInterval(dojo.hitch(this,function(){
w+=5;
if(w>this.fhtml.nr.w){
w=0;
_18=true;
}
this._displayProgress(w/this.fhtml.nr.w);
if(_18){
clearInterval(_19);
setTimeout(dojo.hitch(this,function(){
this._displayProgress(false);
}),500);
}
}),50);
},_error:function(evt){
if(typeof (evt)=="string"){
evt=new Error(evt);
}
this.onError(evt);
},_addToFileList:function(){
if(this.fileListId){
var str="";
dojo.forEach(this.fileList,function(d){
str+="<table id=\"file_"+d.name+"\" class=\"fileToUpload\"><tr><td class=\"fileToUploadClose\"></td><td class=\"fileToUploadName\">"+d.name+"</td><td class=\"fileToUploadSize\">"+(d.size?Math.ceil(d.size*0.001)+"kb":"")+"</td></tr></table>";
},this);
dojo.byId(this.fileListId).innerHTML=str;
}
},_change:function(_1a){
if(dojo.isIE){
dojo.forEach(_1a,function(f){
f.name=f.name.split("\\")[f.name.split("\\").length-1];
});
}
if(this.selectMultipleFiles){
this.fileList=this.fileList.concat(_1a);
}else{
if(this.fileList[0]){
this.removeFile(this.fileList[0].name,true);
}
this.fileList=_1a;
}
this._addToFileList();
this.onChange(_1a);
if(this.uploadOnChange){
if(this.uploaderType=="html"){
this._buildFileInput();
}
this.upload();
}else{
if(this.uploaderType=="html"&&this.selectMultipleFiles){
this._buildFileInput();
this._connectInput();
}
}
},_complete:function(_1b){
_1b=dojo.isArray(_1b)?_1b:[_1b];
dojo.forEach(_1b,function(f){
if(f.ERROR){
this._error(f.ERROR);
}
},this);
dojo.forEach(this.fileList,function(f){
f.bytesLoaded=1;
f.bytesTotal=1;
f.percent=100;
this._progress(f);
},this);
dojo.forEach(this.fileList,function(f){
this.removeFile(f.name,true);
},this);
this.onComplete(_1b);
this.fileList=[];
this._resetHTML();
this.set("disabled",false);
if(this.restoreProgDisplay){
setTimeout(dojo.hitch(this,function(){
dojo.style(dijit.byId(this.progressWidgetId).domNode,this.restoreProgDisplay=="none"?"display":"visibility",this.restoreProgDisplay);
}),500);
}
},_progress:function(_1c){
var _1d=0;
var _1e=0;
for(var i=0;i<this.fileList.length;i++){
var f=this.fileList[i];
if(f.name==_1c.name){
f.bytesLoaded=_1c.bytesLoaded;
f.bytesTotal=_1c.bytesTotal;
f.percent=Math.ceil(f.bytesLoaded/f.bytesTotal*100);
this.log(f.name,"percent:",f.percent);
}
_1e+=Math.ceil(0.001*f.bytesLoaded);
_1d+=Math.ceil(0.001*f.bytesTotal);
}
var _1f=Math.ceil(_1e/_1d*100);
if(this.progressWidgetId){
dijit.byId(this.progressWidgetId).update({progress:_1f+"%"});
}
if(this.showProgress){
this._displayProgress(_1f*0.01);
}
this.onProgress(this.fileList);
},_getDisabledAttr:function(){
return this._disabled;
},_setDisabledAttr:function(_20){
if(this._disabled==_20){
return;
}
if(this.uploaderType=="flash"){
if(!this.flashReady){
var _21=dojo.connect(this,"onLoad",this,function(){
dojo.disconnect(_21);
this._setDisabledAttr(_20);
});
return;
}
this._disabled=_20;
this.flashMovie.doDisable(_20);
}else{
this._disabled=_20;
dojo.style(this._fileInput,"display",this._disabled?"none":"");
}
dojo.toggleClass(this.domNode,this.disabledClass,_20);
},_onFlashBlur:function(){
this.flashMovie.blur();
if(!this.nextFocusObject&&this.tabIndex){
var _22=dojo.query("[tabIndex]");
for(var i=0;i<_22.length;i++){
if(_22[i].tabIndex>=Number(this.tabIndex)+1){
this.nextFocusObject=_22[i];
break;
}
}
}
this.nextFocusObject.focus();
},_disconnect:function(){
dojo.forEach(this._cons,dojo.disconnect,dojo);
},uploadHTML:function(){
if(this.selectMultipleFiles){
dojo.destroy(this._fileInput);
}
this._setHtmlPostData();
if(this.showProgress){
this._animateProgress();
}
var dfd=dojo.io.iframe.send({url:this.uploadUrl.toString(),form:this._formNode,handleAs:"json",error:dojo.hitch(this,function(err){
this._error("HTML Upload Error:"+err.message);
}),load:dojo.hitch(this,function(_23,_24,_25){
this._complete(_23);
})});
},createHtmlUploader:function(){
this._buildForm();
this._setFormStyle();
this._buildFileInput();
this._connectInput();
this._styleContent();
dojo.style(this.insideNode,"visibility","visible");
this.onReady();
},_connectInput:function(){
this._disconnect();
this._cons.push(dojo.connect(this._fileInput,"mouseover",this,function(evt){
dojo.addClass(this.domNode,this.hoverClass);
this.onMouseOver(evt);
}));
this._cons.push(dojo.connect(this._fileInput,"mouseout",this,function(evt){
setTimeout(dojo.hitch(this,function(){
dojo.removeClass(this.domNode,this.activeClass);
dojo.removeClass(this.domNode,this.hoverClass);
this.onMouseOut(evt);
this._checkHtmlCancel("off");
}),0);
}));
this._cons.push(dojo.connect(this._fileInput,"mousedown",this,function(evt){
dojo.addClass(this.domNode,this.activeClass);
dojo.removeClass(this.domNode,this.hoverClass);
this.onMouseDown(evt);
}));
this._cons.push(dojo.connect(this._fileInput,"mouseup",this,function(evt){
dojo.removeClass(this.domNode,this.activeClass);
this.onMouseUp(evt);
this.onClick(evt);
this._checkHtmlCancel("up");
}));
this._cons.push(dojo.connect(this._fileInput,"change",this,function(){
this._checkHtmlCancel("change");
this._change([{name:this._fileInput.value,type:"",size:0}]);
}));
if(this.tabIndex>=0){
dojo.attr(this.domNode,"tabIndex",this.tabIndex);
}
},_checkHtmlCancel:function(_26){
if(_26=="change"){
this.dialogIsOpen=false;
}
if(_26=="up"){
this.dialogIsOpen=true;
}
if(_26=="off"){
if(this.dialogIsOpen){
this.onCancel();
}
this.dialogIsOpen=false;
}
},_styleContent:function(){
var o=this.fhtml.nr;
dojo.style(this.insideNode,{width:o.w+"px",height:o.va=="middle"?o.h+"px":"auto",textAlign:o.ta,paddingTop:o.p[0]+"px",paddingRight:o.p[1]+"px",paddingBottom:o.p[2]+"px",paddingLeft:o.p[3]+"px"});
try{
dojo.style(this.insideNode,"lineHeight","inherit");
}
catch(e){
}
},_resetHTML:function(){
if(this.uploaderType=="html"&&this._formNode){
this.fileInputs=[];
dojo.query("*",this._formNode).forEach(function(n){
dojo.destroy(n);
});
this.fileCount=0;
this._buildFileInput();
this._connectInput();
}
},_buildForm:function(){
if(this._formNode){
return;
}
if(dojo.isIE<9||(dojo.isIE&&dojo.isQuirks)){
this._formNode=document.createElement("<form enctype=\"multipart/form-data\" method=\"post\">");
this._formNode.encoding="multipart/form-data";
this._formNode.id=dijit.getUniqueId("FileUploaderForm");
this.domNode.appendChild(this._formNode);
}else{
this._formNode=dojo.create("form",{enctype:"multipart/form-data",method:"post",id:dijit.getUniqueId("FileUploaderForm")},this.domNode);
}
},_buildFileInput:function(){
if(this._fileInput){
this._disconnect();
this._fileInput.id=this._fileInput.id+this.fileCount;
dojo.style(this._fileInput,"display","none");
}
this._fileInput=document.createElement("input");
this.fileInputs.push(this._fileInput);
var nm=this.htmlFieldName;
var _27=this.id;
if(this.selectMultipleFiles){
nm+=this.fileCount;
_27+=this.fileCount;
this.fileCount++;
}
dojo.attr(this._fileInput,{id:this.id,name:nm,type:"file"});
dojo.addClass(this._fileInput,"dijitFileInputReal");
this._formNode.appendChild(this._fileInput);
var _28=dojo.marginBox(this._fileInput);
dojo.style(this._fileInput,{position:"relative",left:(this.fhtml.nr.w-_28.w)+"px",opacity:0});
},_renumberInputs:function(){
if(!this.selectMultipleFiles){
return;
}
var nm;
this.fileCount=0;
dojo.forEach(this.fileInputs,function(inp){
nm=this.htmlFieldName+this.fileCount;
this.fileCount++;
dojo.attr(inp,"name",nm);
},this);
},_setFormStyle:function(){
var _29=Math.max(2,Math.max(Math.ceil(this.fhtml.nr.w/60),Math.ceil(this.fhtml.nr.h/15)));
dojox.html.insertCssRule("#"+this._formNode.id+" input","font-size:"+_29+"em");
dojo.style(this.domNode,{overflow:"hidden",position:"relative"});
dojo.style(this.insideNode,"position","absolute");
},_setHtmlPostData:function(){
if(this.postData){
for(var nm in this.postData){
dojo.create("input",{type:"hidden",name:nm,value:this.postData[nm]},this._formNode);
}
}
},uploadFlash:function(){
try{
if(this.showProgress){
this._displayProgress(true);
var c=dojo.connect(this,"_complete",this,function(){
dojo.disconnect(c);
this._displayProgress(false);
});
}
var o={};
for(var nm in this.postData){
o[nm]=this.postData[nm];
}
this.flashMovie.doUpload(o);
}
catch(err){
this._error("FileUploader - Sorry, the SWF failed to initialize."+err);
}
},createFlashUploader:function(){
this.uploadUrl=this.uploadUrl.toString();
if(this.uploadUrl){
if(this.uploadUrl.toLowerCase().indexOf("http")<0&&this.uploadUrl.indexOf("/")!=0){
var loc=window.location.href.split("/");
loc.pop();
loc=loc.join("/")+"/";
this.uploadUrl=loc+this.uploadUrl;
this.log("SWF Fixed - Relative loc:",loc," abs loc:",this.uploadUrl);
}else{
this.log("SWF URL unmodified:",this.uploadUrl);
}
}else{
console.warn("Warning: no uploadUrl provided.");
}
var w=this.fhtml.nr.w;
var h=this.fhtml.nr.h;
var _2a={expressInstall:true,path:this.swfPath.uri||this.swfPath,width:w,height:h,allowScriptAccess:"always",allowNetworking:"all",vars:{uploadDataFieldName:this.flashFieldName,uploadUrl:this.uploadUrl,uploadOnSelect:this.uploadOnChange,deferredUploading:this.deferredUploading||0,selectMultipleFiles:this.selectMultipleFiles,id:this.id,isDebug:this.isDebug,devMode:this.devMode,flashButton:dojox.embed.flashVars.serialize("fh",this.fhtml),fileMask:dojox.embed.flashVars.serialize("fm",this.fileMask),noReturnCheck:this.skipServerCheck,serverTimeout:this.serverTimeout},params:{scale:"noscale",wmode:"opaque",allowScriptAccess:"always",allowNetworking:"all"}};
this.flashObject=new dojox.embed.Flash(_2a,this.insideNode);
this.flashObject.onError=dojo.hitch(function(msg){
this._error("Flash Error: "+msg);
});
this.flashObject.onReady=dojo.hitch(this,function(){
dojo.style(this.insideNode,"visibility","visible");
this.log("FileUploader flash object ready");
this.onReady(this);
});
this.flashObject.onLoad=dojo.hitch(this,function(mov){
this.flashMovie=mov;
this.flashReady=true;
this.onLoad(this);
});
this._connectFlash();
},_connectFlash:function(){
this._doSub("/filesSelected","_change");
this._doSub("/filesUploaded","_complete");
this._doSub("/filesProgress","_progress");
this._doSub("/filesError","_error");
this._doSub("/filesCanceled","onCancel");
this._doSub("/stageBlur","_onFlashBlur");
this._doSub("/up","onMouseUp");
this._doSub("/down","onMouseDown");
this._doSub("/over","onMouseOver");
this._doSub("/out","onMouseOut");
this.connect(this.domNode,"focus",function(){
this.flashMovie.focus();
this.flashMovie.doFocus();
});
if(this.tabIndex>=0){
dojo.attr(this.domNode,"tabIndex",this.tabIndex);
}
},_doSub:function(_2b,_2c){
this._subs.push(dojo.subscribe(this.id+_2b,this,_2c));
},urlencode:function(url){
if(!url||url=="none"){
return false;
}
return url.replace(/:/g,"||").replace(/\./g,"^^").replace("url(","").replace(")","").replace(/'/g,"").replace(/"/g,"");
},isButton:function(_2d){
var tn=_2d.tagName.toLowerCase();
return tn=="button"||tn=="input";
},getTextStyle:function(_2e){
var o={};
o.ff=dojo.style(_2e,"fontFamily");
if(o.ff){
o.ff=o.ff.replace(", ",",");
o.ff=o.ff.replace(/\"|\'/g,"");
o.ff=o.ff=="sans-serif"?"Arial":o.ff;
o.fw=dojo.style(_2e,"fontWeight");
o.fi=dojo.style(_2e,"fontStyle");
o.fs=parseInt(dojo.style(_2e,"fontSize"),10);
if(dojo.style(_2e,"fontSize").indexOf("%")>-1){
var n=_2e;
while(n.tagName){
if(dojo.style(n,"fontSize").indexOf("%")==-1){
o.fs=parseInt(dojo.style(n,"fontSize"),10);
break;
}
if(n.tagName.toLowerCase()=="body"){
o.fs=16*0.01*parseInt(dojo.style(n,"fontSize"),10);
}
n=n.parentNode;
}
}
o.fc=new dojo.Color(dojo.style(_2e,"color")).toHex();
o.fc=parseInt(o.fc.substring(1,Infinity),16);
}
o.lh=dojo.style(_2e,"lineHeight");
o.ta=dojo.style(_2e,"textAlign");
o.ta=o.ta=="start"||!o.ta?"left":o.ta;
o.va=this.isButton(_2e)?"middle":o.lh==o.h?"middle":dojo.style(_2e,"verticalAlign");
return o;
},getText:function(_2f){
var cn=dojo.trim(_2f.innerHTML);
if(cn.indexOf("<")>-1){
cn=escape(cn);
}
return cn;
},getStyle:function(_30){
var o={};
var dim=dojo.contentBox(_30);
var pad=dojo._getPadExtents(_30);
o.p=[pad.t,pad.w-pad.l,pad.h-pad.t,pad.l];
o.w=dim.w+pad.w;
o.h=dim.h+pad.h;
o.d=dojo.style(_30,"display");
var clr=new dojo.Color(dojo.style(_30,"backgroundColor"));
o.bc=clr.a==0?"#ffffff":clr.toHex();
o.bc=parseInt(o.bc.substring(1,Infinity),16);
var url=this.urlencode(dojo.style(_30,"backgroundImage"));
if(url){
o.bi={url:url,rp:dojo.style(_30,"backgroundRepeat"),pos:escape(dojo.style(_30,"backgroundPosition"))};
if(!o.bi.pos){
var rx=dojo.style(_30,"backgroundPositionX");
var ry=dojo.style(_30,"backgroundPositionY");
rx=(rx=="left")?"0%":(rx=="right")?"100%":rx;
ry=(ry=="top")?"0%":(ry=="bottom")?"100%":ry;
o.bi.pos=escape(rx+" "+ry);
}
}
return dojo.mixin(o,this.getTextStyle(_30));
},getTempNodeStyle:function(_31,_32,_33){
var _34,_35;
if(_33){
_34=dojo.place("<"+_31.tagName+"><span>"+_31.innerHTML+"</span></"+_31.tagName+">",_31.parentNode);
var _36=_34.firstChild;
dojo.addClass(_36,_31.className);
dojo.addClass(_34,_32);
_35=this.getStyle(_36);
}else{
_34=dojo.place("<"+_31.tagName+">"+_31.innerHTML+"</"+_31.tagName+">",_31.parentNode);
dojo.addClass(_34,_31.className);
dojo.addClass(_34,_32);
_34.id=_31.id;
_35=this.getStyle(_34);
}
dojo.destroy(_34);
return _35;
}});
}
