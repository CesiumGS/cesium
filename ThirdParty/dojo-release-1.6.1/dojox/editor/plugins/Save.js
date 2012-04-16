/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.Save"]){
dojo._hasResource["dojox.editor.plugins.Save"]=true;
dojo.provide("dojox.editor.plugins.Save");
dojo.require("dijit.form.Button");
dojo.require("dijit._editor._Plugin");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","Save",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.editor.plugins.Save",dijit._editor._Plugin,{iconClassPrefix:"dijitAdditionalEditorIcon",url:"",logResults:true,_initButton:function(){
var _1=dojo.i18n.getLocalization("dojox.editor.plugins","Save");
this.button=new dijit.form.Button({label:_1["save"],showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"Save",tabIndex:"-1",onClick:dojo.hitch(this,"_save")});
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},setEditor:function(_2){
this.editor=_2;
this._initButton();
},_save:function(){
var _3=this.editor.get("value");
this.save(_3);
},save:function(_4){
var _5={"Content-Type":"text/html"};
if(this.url){
var _6={url:this.url,postData:_4,headers:_5,handleAs:"text"};
this.button.set("disabled",true);
var _7=dojo.xhrPost(_6);
_7.addCallback(dojo.hitch(this,this.onSuccess));
_7.addErrback(dojo.hitch(this,this.onError));
}else{
}
},onSuccess:function(_8,_9){
this.button.set("disabled",false);
if(this.logResults){
}
},onError:function(_a,_b){
this.button.set("disabled",false);
if(this.logResults){
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _c=o.args.name.toLowerCase();
if(_c==="save"){
o.plugin=new dojox.editor.plugins.Save({url:("url" in o.args)?o.args.url:"",logResults:("logResults" in o.args)?o.args.logResults:true});
}
});
}
