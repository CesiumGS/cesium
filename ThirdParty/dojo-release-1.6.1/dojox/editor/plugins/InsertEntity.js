/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.InsertEntity"]){
dojo._hasResource["dojox.editor.plugins.InsertEntity"]=true;
dojo.provide("dojox.editor.plugins.InsertEntity");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dojox.html.entities");
dojo.require("dojox.editor.plugins.EntityPalette");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","InsertEntity",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.editor.plugins.InsertEntity",dijit._editor._Plugin,{iconClassPrefix:"dijitAdditionalEditorIcon",_initButton:function(){
this.dropDown=new dojox.editor.plugins.EntityPalette({showCode:this.showCode,showEntityName:this.showEntityName});
this.connect(this.dropDown,"onChange",function(_1){
this.button.closeDropDown();
this.editor.focus();
this.editor.execCommand("inserthtml",_1);
});
var _2=dojo.i18n.getLocalization("dojox.editor.plugins","InsertEntity");
this.button=new dijit.form.DropDownButton({label:_2["insertEntity"],showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"InsertEntity",tabIndex:"-1",dropDown:this.dropDown});
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},setEditor:function(_3){
this.editor=_3;
this._initButton();
this.editor.addKeyHandler("s",true,true,dojo.hitch(this,function(){
this.button.openDropDown();
this.dropDown.focus();
}));
_3.contentPreFilters.push(this._preFilterEntities);
_3.contentPostFilters.push(this._postFilterEntities);
},_preFilterEntities:function(s){
return dojox.html.entities.decode(s,dojox.html.entities.latin);
},_postFilterEntities:function(s){
return dojox.html.entities.encode(s,dojox.html.entities.latin);
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _4=o.args.name?o.args.name.toLowerCase():"";
if(_4==="insertentity"){
o.plugin=new dojox.editor.plugins.InsertEntity({showCode:("showCode" in o.args)?o.args.showCode:false,showEntityName:("showEntityName" in o.args)?o.args.showEntityName:false});
}
});
}
