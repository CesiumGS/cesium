/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.uploader.plugins.HTML5"]){
dojo._hasResource["dojox.form.uploader.plugins.HTML5"]=true;
dojo.provide("dojox.form.uploader.plugins.HTML5");
dojo.declare("dojox.form.uploader.plugins.HTML5",[],{errMsg:"Error uploading files. Try checking permissions",uploadType:"html5",postCreate:function(){
this.connectForm();
this.inherited(arguments);
if(this.uploadOnSelect){
this.connect(this,"onChange","upload");
}
},upload:function(_1){
this.onBegin(this.getFileList());
if(this.supports("FormData")){
this.uploadWithFormData(_1);
}else{
if(this.supports("sendAsBinary")){
this.sendAsBinary(_1);
}
}
},submit:function(_2){
_2=!!_2?_2.tagName?_2:this.getForm():this.getForm();
var _3=dojo.formToObject(_2);
this.upload(_3);
},sendAsBinary:function(_4){
if(!this.getUrl()){
console.error("No upload url found.",this);
return;
}
var _5="---------------------------"+(new Date).getTime();
var _6=this.createXhr();
_6.setRequestHeader("Content-Type","multipart/form-data; boundary="+_5);
var _7=this._buildRequestBody(_4,_5);
if(!_7){
this.onError(this.errMsg);
}else{
_6.sendAsBinary(_7);
}
},uploadWithFormData:function(_8){
if(!this.getUrl()){
console.error("No upload url found.",this);
return;
}
var fd=new FormData();
dojo.forEach(this.inputNode.files,function(f,i){
fd.append(this.name+"s[]",f);
},this);
if(_8){
for(var nm in _8){
fd.append(nm,_8[nm]);
}
}
var _9=this.createXhr();
_9.send(fd);
},_xhrProgress:function(_a){
if(_a.lengthComputable){
var o={bytesLoaded:_a.loaded,bytesTotal:_a.total,type:_a.type,timeStamp:_a.timeStamp};
if(_a.type=="load"){
o.percent="100%",o.decimal=1;
}else{
o.decimal=_a.loaded/_a.total;
o.percent=Math.ceil((_a.loaded/_a.total)*100)+"%";
}
this.onProgress(o);
}
},createXhr:function(){
var _b=new XMLHttpRequest();
var _c;
_b.upload.addEventListener("progress",dojo.hitch(this,"_xhrProgress"),false);
_b.addEventListener("load",dojo.hitch(this,"_xhrProgress"),false);
_b.addEventListener("error",dojo.hitch(this,function(_d){
this.onError(_d);
clearInterval(_c);
}),false);
_b.addEventListener("abort",dojo.hitch(this,function(_e){
this.onAbort(_e);
clearInterval(_c);
}),false);
_b.onreadystatechange=dojo.hitch(this,function(){
if(_b.readyState===4){
clearInterval(_c);
this.onComplete(dojo.eval(_b.responseText));
}
});
_b.open("POST",this.getUrl());
_c=setInterval(dojo.hitch(this,function(){
try{
if(typeof (_b.statusText)){
}
}
catch(e){
clearInterval(_c);
}
}),250);
return _b;
},_buildRequestBody:function(_f,_10){
var EOL="\r\n";
var _11="";
_10="--"+_10;
var _12=[];
dojo.forEach(this.inputNode.files,function(f,i){
var _13=this.name+"s[]";
var _14=this.inputNode.files[i].fileName;
var _15;
try{
_15=this.inputNode.files[i].getAsBinary()+EOL;
_11+=_10+EOL;
_11+="Content-Disposition: form-data; ";
_11+="name=\""+_13+"\"; ";
_11+="filename=\""+_14+"\""+EOL;
_11+="Content-Type: "+this.getMimeType()+EOL+EOL;
_11+=_15;
}
catch(e){
_12.push({index:i,name:_14});
}
},this);
if(_12.length){
if(_12.length>=this.inputNode.files.length){
this.onError({message:this.errMsg,filesInError:_12});
_11=false;
}
}
if(!_11){
return false;
}
if(_f){
for(var nm in _f){
_11+=_10+EOL;
_11+="Content-Disposition: form-data; ";
_11+="name=\""+nm+"\""+EOL+EOL;
_11+=_f[nm]+EOL;
}
}
_11+=_10+"--"+EOL;
return _11;
}});
dojox.form.addUploaderPlugin(dojox.form.uploader.plugins.HTML5);
}
