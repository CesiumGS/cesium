/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.plugins.Print"]){
dojo._hasResource["dijit._editor.plugins.Print"]=true;
dojo.provide("dijit._editor.plugins.Print");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dojo.i18n");
dojo.requireLocalization("dijit._editor","commands",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit._editor.plugins.Print",dijit._editor._Plugin,{_initButton:function(){
var _1=dojo.i18n.getLocalization("dijit._editor","commands"),_2=this.editor;
this.button=new dijit.form.Button({label:_1["print"],dir:_2.dir,lang:_2.lang,showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"Print",tabIndex:"-1",onClick:dojo.hitch(this,"_print")});
},setEditor:function(_3){
this.editor=_3;
this._initButton();
this.editor.onLoadDeferred.addCallback(dojo.hitch(this,function(){
if(!this.editor.iframe.contentWindow["print"]){
this.button.set("disabled",true);
}
}));
},updateState:function(){
var _4=this.get("disabled");
if(!this.editor.iframe.contentWindow["print"]){
_4=true;
}
this.button.set("disabled",_4);
},_print:function(){
var _5=this.editor.iframe;
if(_5.contentWindow["print"]){
if(!dojo.isOpera&&!dojo.isChrome){
dijit.focus(_5);
_5.contentWindow.print();
}else{
var _6=this.editor.document;
var _7=this.editor.get("value");
_7="<html><head><meta http-equiv='Content-Type' "+"content='text/html; charset='UTF-8'></head><body>"+_7+"</body></html>";
var _8=window.open("javascript: ''","","status=0,menubar=0,location=0,toolbar=0,"+"width=1,height=1,resizable=0,scrollbars=0");
_8.document.open();
_8.document.write(_7);
_8.document.close();
var _9=[];
var _a=_6.getElementsByTagName("style");
if(_a){
var i;
for(i=0;i<_a.length;i++){
var _b=_a[i].innerHTML;
var _c=_8.document.createElement("style");
_c.appendChild(_8.document.createTextNode(_b));
_8.document.getElementsByTagName("head")[0].appendChild(_c);
}
}
_8.print();
_8.close();
}
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _d=o.args.name.toLowerCase();
if(_d==="print"){
o.plugin=new dijit._editor.plugins.Print({command:"print"});
}
});
}
