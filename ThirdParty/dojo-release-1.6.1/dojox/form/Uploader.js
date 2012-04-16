/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.Uploader"]){
dojo._hasResource["dojox.form.Uploader"]=true;
dojo.provide("dojox.form.Uploader");
dojo.experimental("dojox.form.Uploader");
dojo.require("dojox.form.uploader.Base");
dojo.require("dijit.form.Button");
dojo.declare("dojox.form.Uploader",[dojox.form.uploader.Base],{uploadOnSelect:false,tabIndex:0,multiple:false,label:"Upload...",url:"",name:"uploadedfile",flashFieldName:"",uploadType:"form",_nameIndex:0,widgetsInTemplate:true,templateString:"<div class=\"dojoxFileInput\"><div dojoType=\"dijit.form.Button\" dojoAttachPoint=\"button\">${label}</div></div>",postMixInProperties:function(){
this._inputs=[];
this._getButtonStyle(this.srcNodeRef);
this.inherited(arguments);
},postCreate:function(){
var _1=false;
var _2=this.domNode.parentNode;
var _3=this._getNodePosition(this.domNode);
if(!this.btnSize.w||!this.btnSize.h){
dojo.body().appendChild(this.domNode);
this._getButtonStyle(this.domNode);
_1=true;
}
this._setButtonStyle();
if(_1){
dojo.place(this.domNode,_3.node,_3.pos);
}
this.inherited(arguments);
},onChange:function(_4){
},onBegin:function(_5){
},onProgress:function(_6){
},onComplete:function(_7){
this.reset();
},onCancel:function(){
},onAbort:function(){
},onError:function(_8){
},upload:function(_9){
},submit:function(_a){
},reset:function(){
this._disconnectButton();
dojo.forEach(this._inputs,dojo.destroy,dojo);
this._inputs=[];
this._nameIndex=0;
this._createInput();
},getFileList:function(){
var _b=[];
if(this.supports("multiple")){
dojo.forEach(this.inputNode.files,function(f,i){
_b.push({index:i,name:f.name,size:f.size,type:f.type});
},this);
}else{
dojo.forEach(this._inputs,function(n,i){
_b.push({index:i,name:n.value.substring(n.value.lastIndexOf("\\")+1),size:0,type:n.value.substring(n.value.lastIndexOf(".")+1)});
},this);
}
return _b;
},_getValueAttr:function(){
return this.getFileList();
},_setValueAttr:function(_c){
console.error("Uploader value is read only");
},_getDisabledAttr:function(){
return this._disabled;
},_setDisabledAttr:function(_d){
if(this._disabled==_d){
return;
}
this.button.set("disabled",_d);
dojo.style(this.inputNode,"display",_d?"none":"block");
},_getNodePosition:function(_e){
if(_e.previousSibling){
return {node:_e.previousSibling,pos:"after"};
}
return {node:_e.nextSibling,pos:"before"};
},_getButtonStyle:function(_f){
if(!_f){
this.btnSize={w:200,h:25};
}else{
this.btnSize=dojo.marginBox(_f);
}
},_setButtonStyle:function(){
var _10=true;
if(!this.domNode.parentNode||!this.domNode.parentNode.tagName){
document.body.appendChild(this.domNode);
_10=false;
}
dojo.style(this.domNode,{width:this.btnSize.w+"px",height:(this.btnSize.h+4)+"px",overflow:"hidden",position:"relative"});
this.inputNodeFontSize=Math.max(2,Math.max(Math.ceil(this.btnSize.w/60),Math.ceil(this.btnSize.h/15)));
this._createInput();
dojo.style(this.button.domNode,{margin:"0px",display:"block",verticalAlign:"top"});
dojo.style(this.button.domNode.firstChild,{margin:"0px",display:"block"});
if(!_10){
document.body.removeChild(this.domNode);
}
},_createInput:function(){
if(this._inputs.length){
dojo.style(this.inputNode,{top:"500px"});
this._disconnectButton();
this._nameIndex++;
}
var _11;
if(this.supports("multiple")){
_11=this.name+"s[]";
}else{
_11=this.name+(this.multiple?this._nameIndex:"");
}
this.inputNode=dojo.create("input",{type:"file",name:_11,className:"dojoxInputNode"},this.domNode,"first");
if(this.supports("multiple")&&this.multiple){
dojo.attr(this.inputNode,"multiple",true);
}
this._inputs.push(this.inputNode);
dojo.style(this.inputNode,{fontSize:this.inputNodeFontSize+"em"});
var _12=dojo.marginBox(this.inputNode);
dojo.style(this.inputNode,{position:"absolute",top:"-2px",left:"-"+(_12.w-this.btnSize.w-2)+"px",opacity:0});
this._connectButton();
},_connectButton:function(){
this._cons=[];
var cs=dojo.hitch(this,function(nm){
this._cons.push(dojo.connect(this.inputNode,nm,this,function(evt){
this.button._cssMouseEvent({type:nm});
}));
});
cs("mouseover");
cs("mouseout");
cs("mousedown");
this._cons.push(dojo.connect(this.inputNode,"change",this,function(evt){
this.onChange(this.getFileList(evt));
if(!this.supports("multiple")&&this.multiple){
this._createInput();
}
}));
this.button.set("tabIndex",-1);
if(this.tabIndex>-1){
this.inputNode.tabIndex=this.tabIndex;
var _13=dojo.style(this.button.domNode.firstChild,"border");
this._cons.push(dojo.connect(this.inputNode,"focus",this,function(){
dojo.style(this.button.domNode.firstChild,"border","1px dashed #ccc");
}));
this._cons.push(dojo.connect(this.inputNode,"blur",this,function(){
dojo.style(this.button.domNode.firstChild,"border",_13);
}));
}
},_disconnectButton:function(){
dojo.forEach(this._cons,dojo.disconnect,dojo);
}});
(function(){
dojox.form.UploaderOrg=dojox.form.Uploader;
var _14=[dojox.form.UploaderOrg];
dojox.form.addUploaderPlugin=function(_15){
_14.push(_15);
dojo.declare("dojox.form.Uploader",_14,{});
};
})();
}
