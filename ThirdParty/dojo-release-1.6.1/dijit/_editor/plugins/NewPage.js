/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.plugins.NewPage"]){
dojo._hasResource["dijit._editor.plugins.NewPage"]=true;
dojo.provide("dijit._editor.plugins.NewPage");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dojo.i18n");
dojo.requireLocalization("dijit._editor","commands",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit._editor.plugins.NewPage",dijit._editor._Plugin,{content:"<br>",_initButton:function(){
var _1=dojo.i18n.getLocalization("dijit._editor","commands"),_2=this.editor;
this.button=new dijit.form.Button({label:_1["newPage"],dir:_2.dir,lang:_2.lang,showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"NewPage",tabIndex:"-1",onClick:dojo.hitch(this,"_newPage")});
},setEditor:function(_3){
this.editor=_3;
this._initButton();
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},_newPage:function(){
this.editor.beginEditing();
this.editor.set("value",this.content);
this.editor.endEditing();
this.editor.focus();
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _4=o.args.name.toLowerCase();
if(_4==="newpage"){
o.plugin=new dijit._editor.plugins.NewPage({content:("content" in o.args)?o.args.content:"<br>"});
}
});
}
