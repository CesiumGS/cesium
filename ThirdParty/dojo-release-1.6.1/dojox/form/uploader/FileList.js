/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.uploader.FileList"]){
dojo._hasResource["dojox.form.uploader.FileList"]=true;
dojo.provide("dojox.form.uploader.FileList");
dojo.require("dojox.form.uploader.Base");
dojo.declare("dojox.form.uploader.FileList",[dojox.form.uploader.Base],{uploaderId:"",uploader:null,headerIndex:"#",headerType:"Type",headerFilename:"File Name",headerFilesize:"Size",_upCheckCnt:0,rowAmt:0,templateString:"<div class=\"dojoxUploaderFileList\">"+"<div dojoAttachPoint=\"progressNode\" class=\"dojoxUploaderFileListProgress\"><div dojoAttachPoint=\"percentBarNode\" class=\"dojoxUploaderFileListProgressBar\"></div><div dojoAttachPoint=\"percentTextNode\" class=\"dojoxUploaderFileListPercentText\">0%</div></div>"+"<table class=\"dojoxUploaderFileListTable\">"+"<tr class=\"dojoxUploaderFileListHeader\"><th class=\"dojoxUploaderIndex\">${headerIndex}</th><th class=\"dojoxUploaderIcon\">${headerType}</th><th class=\"dojoxUploaderFileName\">${headerFilename}</th><th class=\"dojoxUploaderFileSize\">${headerFilesize}</th></tr>"+"<tr ><td colSpan=\"4\" class=\"dojoxUploaderFileListContainer\" dojoAttachPoint=\"containerNode\">"+"<table class=\"dojoxUploaderFileListContent\" dojoAttachPoint=\"listNode\"></table>"+"</td><tr>"+"</table>"+"<div>",postCreate:function(){
this.setUploader();
this.hideProgress();
},reset:function(){
for(var i=0;i<this.rowAmt;i++){
this.listNode.deleteRow(0);
}
this.rowAmt=0;
},setUploader:function(){
if(!this.uploaderId&&!this.uploader){
console.warn("uploaderId not passed to UploaderFileList");
}else{
if(this.uploaderId&&!this.uploader){
this.uploader=dijit.byId(this.uploaderId);
}else{
if(this._upCheckCnt>4){
console.warn("uploader not found for ID ",this.uploaderId);
return;
}
}
}
if(this.uploader){
this.connect(this.uploader,"onChange","_onUploaderChange");
this.connect(this.uploader,"reset","reset");
this.connect(this.uploader,"onBegin",function(){
this.showProgress(true);
});
this.connect(this.uploader,"onProgress","_progress");
this.connect(this.uploader,"onComplete",function(){
setTimeout(dojo.hitch(this,function(){
this.hideProgress(true);
}),1250);
});
}else{
this._upCheckCnt++;
setTimeout(dojo.hitch(this,"setUploader"),250);
}
},hideProgress:function(_1){
var o=_1?{ani:true,endDisp:"none",beg:15,end:0}:{endDisp:"none",ani:false};
this._hideShowProgress(o);
},showProgress:function(_2){
var o=_2?{ani:true,endDisp:"block",beg:0,end:15}:{endDisp:"block",ani:false};
this._hideShowProgress(o);
},_progress:function(_3){
this.percentTextNode.innerHTML=_3.percent;
dojo.style(this.percentBarNode,"width",_3.percent);
},_hideShowProgress:function(o){
var _4=this.progressNode;
var _5=function(){
dojo.style(_4,"display",o.endDisp);
};
if(o.ani){
dojo.style(_4,"display","block");
dojo.animateProperty({node:_4,properties:{height:{start:o.beg,end:o.end,units:"px"}},onEnd:_5}).play();
}else{
_5();
}
},_onUploaderChange:function(_6){
this.reset();
dojo.forEach(_6,function(f,i){
this._addRow(i+1,this.getFileType(f.name),f.name,f.size);
},this);
},_addRow:function(_7,_8,_9,_a){
var c,r=this.listNode.insertRow(-1);
c=r.insertCell(-1);
dojo.addClass(c,"dojoxUploaderIndex");
c.innerHTML=_7;
c=r.insertCell(-1);
dojo.addClass(c,"dojoxUploaderIcon");
c.innerHTML=_8;
c=r.insertCell(-1);
dojo.addClass(c,"dojoxUploaderFileName");
c.innerHTML=_9;
c=r.insertCell(-1);
dojo.addClass(c,"dojoxUploaderSize");
c.innerHTML=this.convertBytes(_a).value;
this.rowAmt++;
}});
}
