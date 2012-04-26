/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.ShowBlockNodes"]){
dojo._hasResource["dojox.editor.plugins.ShowBlockNodes"]=true;
dojo.provide("dojox.editor.plugins.ShowBlockNodes");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","ShowBlockNodes",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.editor.plugins.ShowBlockNodes",dijit._editor._Plugin,{useDefaultCommand:false,iconClassPrefix:"dijitAdditionalEditorIcon",_styled:false,_initButton:function(){
var _1=dojo.i18n.getLocalization("dojox.editor.plugins","ShowBlockNodes");
this.button=new dijit.form.ToggleButton({label:_1["showBlockNodes"],showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"ShowBlockNodes",tabIndex:"-1",onChange:dojo.hitch(this,"_showBlocks")});
this.editor.addKeyHandler(dojo.keys.F9,true,true,dojo.hitch(this,this.toggle));
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},setEditor:function(_2){
this.editor=_2;
this._initButton();
},toggle:function(){
this.button.set("checked",!this.button.get("checked"));
},_showBlocks:function(_3){
var _4=this.editor.document;
if(!this._styled){
try{
this._styled=true;
var _5="";
var _6=["div","p","ul","ol","table","h1","h2","h3","h4","h5","h6","pre","dir","center","blockquote","form","fieldset","address","object","pre","hr","ins","noscript","li","map","button","dd","dt"];
var _7="@media screen {\n"+"\t.editorShowBlocks {TAG} {\n"+"\t\tbackground-image: url({MODURL}/images/blockelems/{TAG}.gif);\n"+"\t\tbackground-repeat: no-repeat;\n"+"\t\tbackground-position: top left;\n"+"\t\tborder-width: 1px;\n"+"\t\tborder-style: dashed;\n"+"\t\tborder-color: #D0D0D0;\n"+"\t\tpadding-top: 15px;\n"+"\t\tpadding-left: 15px;\n"+"\t}\n"+"}\n";
dojo.forEach(_6,function(_8){
_5+=_7.replace(/\{TAG\}/gi,_8);
});
var _9=dojo.moduleUrl(dojox._scopeName,"editor/plugins/resources").toString();
if(!(_9.match(/^https?:\/\//i))&&!(_9.match(/^file:\/\//i))){
var _a;
if(_9.charAt(0)==="/"){
var _b=dojo.doc.location.protocol;
var _c=dojo.doc.location.host;
_a=_b+"//"+_c;
}else{
_a=this._calcBaseUrl(dojo.global.location.href);
}
if(_a[_a.length-1]!=="/"&&_9.charAt(0)!=="/"){
_a+="/";
}
_9=_a+_9;
}
_5=_5.replace(/\{MODURL\}/gi,_9);
if(!dojo.isIE){
var _d=_4.createElement("style");
_d.appendChild(_4.createTextNode(_5));
_4.getElementsByTagName("head")[0].appendChild(_d);
}else{
var ss=_4.createStyleSheet("");
ss.cssText=_5;
}
}
catch(e){
console.warn(e);
}
}
if(_3){
dojo.addClass(this.editor.editNode,"editorShowBlocks");
}else{
dojo.removeClass(this.editor.editNode,"editorShowBlocks");
}
},_calcBaseUrl:function(_e){
var _f=null;
if(_e!==null){
var _10=_e.indexOf("?");
if(_10!=-1){
_e=_e.substring(0,_10);
}
_10=_e.lastIndexOf("/");
if(_10>0&&_10<_e.length){
_f=_e.substring(0,_10);
}else{
_f=_e;
}
}
return _f;
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _11=o.args.name.toLowerCase();
if(_11==="showblocknodes"){
o.plugin=new dojox.editor.plugins.ShowBlockNodes();
}
});
}
