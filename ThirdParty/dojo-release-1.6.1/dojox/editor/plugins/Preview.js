/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.Preview"]){
dojo._hasResource["dojox.editor.plugins.Preview"]=true;
dojo.provide("dojox.editor.plugins.Preview");
dojo.require("dijit.form.Button");
dojo.require("dijit._editor._Plugin");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","Preview",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.editor.plugins.Preview",dijit._editor._Plugin,{useDefaultCommand:false,styles:"",stylesheets:null,iconClassPrefix:"dijitAdditionalEditorIcon",_initButton:function(){
this._nlsResources=dojo.i18n.getLocalization("dojox.editor.plugins","Preview");
this.button=new dijit.form.Button({label:this._nlsResources["preview"],showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"Preview",tabIndex:"-1",onClick:dojo.hitch(this,"_preview")});
},setEditor:function(_1){
this.editor=_1;
this._initButton();
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},_preview:function(){
try{
var _2=this.editor.get("value");
var _3="\t\t<meta http-equiv='Content-Type' content='text/html; charset='UTF-8'>\n";
var i;
if(this.stylesheets){
for(i=0;i<this.stylesheets.length;i++){
_3+="\t\t<link rel='stylesheet' type='text/css' href='"+this.stylesheets[i]+"'>\n";
}
}
if(this.styles){
_3+=("\t\t<style>"+this.styles+"</style>\n");
}
_2="<html>\n\t<head>\n"+_3+"\t</head>\n\t<body>\n"+_2+"\n\t</body>\n</html>";
var _4=window.open("javascript: ''",this._nlsResources["preview"],"status=1,menubar=0,location=0,toolbar=0");
_4.document.open();
_4.document.write(_2);
_4.document.close();
}
catch(e){
console.warn(e);
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _5=o.args.name.toLowerCase();
if(_5==="preview"){
o.plugin=new dojox.editor.plugins.Preview({styles:("styles" in o.args)?o.args.styles:"",stylesheets:("stylesheets" in o.args)?o.args.stylesheets:null});
}
});
}
