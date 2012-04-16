/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.FileInput"]){
dojo._hasResource["dojox.form.FileInput"]=true;
dojo.provide("dojox.form.FileInput");
dojo.experimental("dojox.form.FileInput");
dojo.require("dijit.form._FormWidget");
dojo.require("dijit._Templated");
dojo.declare("dojox.form.FileInput",dijit.form._FormWidget,{label:"Browse ...",cancelText:"Cancel",name:"uploadFile",templateString:dojo.cache("dojox.form","resources/FileInput.html","<div class=\"dijitFileInput\">\n\t<input id=\"${id}\" class=\"dijitFileInputReal\" type=\"file\" dojoAttachPoint=\"fileInput\" name=\"${name}\" />\n\t<div class=\"dijitFakeInput\">\n\t\t<input class=\"dijitFileInputVisible\" type=\"text\" dojoAttachPoint=\"focusNode, inputNode\" />\n\t\t<div class=\"dijitInline dijitFileInputText\" dojoAttachPoint=\"titleNode\">${label}</div>\n\t\t<div class=\"dijitInline dijitFileInputButton\" dojoAttachPoint=\"cancelNode\" \n\t\t\tdojoAttachEvent=\"onclick:reset\">${cancelText}</div>\n\t</div>\n</div>\n"),startup:function(){
this._listener=this.connect(this.fileInput,"onchange","_matchValue");
this._keyListener=this.connect(this.fileInput,"onkeyup","_matchValue");
},postCreate:function(){
},_matchValue:function(){
this.inputNode.value=this.fileInput.value;
if(this.inputNode.value){
this.cancelNode.style.visibility="visible";
dojo.fadeIn({node:this.cancelNode,duration:275}).play();
}
},setLabel:function(_1,_2){
this.titleNode.innerHTML=_1;
},reset:function(e){
this.disconnect(this._listener);
this.disconnect(this._keyListener);
if(this.fileInput){
this.domNode.removeChild(this.fileInput);
}
dojo.fadeOut({node:this.cancelNode,duration:275}).play();
this.fileInput=document.createElement("input");
this.fileInput.setAttribute("type","file");
this.fileInput.setAttribute("id",this.id);
this.fileInput.setAttribute("name",this.name);
dojo.addClass(this.fileInput,"dijitFileInputReal");
this.domNode.appendChild(this.fileInput);
this._keyListener=this.connect(this.fileInput,"onkeyup","_matchValue");
this._listener=this.connect(this.fileInput,"onchange","_matchValue");
this.inputNode.value="";
}});
}
