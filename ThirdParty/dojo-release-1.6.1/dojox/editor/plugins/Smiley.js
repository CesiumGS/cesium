/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.Smiley"]){
dojo._hasResource["dojox.editor.plugins.Smiley"]=true;
dojo.provide("dojox.editor.plugins.Smiley");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.ToggleButton");
dojo.require("dijit.form.DropDownButton");
dojo.require("dojox.editor.plugins._SmileyPalette");
dojo.require("dojo.i18n");
dojo.require("dojox.html.format");
dojo.requireLocalization("dojox.editor.plugins","Smiley",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.editor.plugins.Smiley");
dojo.declare("dojox.editor.plugins.Smiley",dijit._editor._Plugin,{iconClassPrefix:"dijitAdditionalEditorIcon",emoticonMarker:"[]",emoticonImageClass:"dojoEditorEmoticon",_initButton:function(){
this.dropDown=new dojox.editor.plugins._SmileyPalette();
this.connect(this.dropDown,"onChange",function(_1){
this.button.closeDropDown();
this.editor.focus();
_1=this.emoticonMarker.charAt(0)+_1+this.emoticonMarker.charAt(1);
this.editor.execCommand("inserthtml",_1);
});
this.i18n=dojo.i18n.getLocalization("dojox.editor.plugins","Smiley");
this.button=new dijit.form.DropDownButton({label:this.i18n.smiley,showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"Smiley",tabIndex:"-1",dropDown:this.dropDown});
this.emoticonImageRegexp=new RegExp("class=(\"|')"+this.emoticonImageClass+"(\"|')");
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},setEditor:function(_2){
this.editor=_2;
this._initButton();
this.editor.contentPreFilters.push(dojo.hitch(this,this._preFilterEntities));
this.editor.contentPostFilters.push(dojo.hitch(this,this._postFilterEntities));
},_preFilterEntities:function(_3){
return _3.replace(/\[([^\]]*)\]/g,dojo.hitch(this,this._decode));
},_postFilterEntities:function(_4){
return _4.replace(/<img [^>]*>/gi,dojo.hitch(this,this._encode));
},_decode:function(_5,_6){
var _7=dojox.editor.plugins.Emoticon.fromAscii(_6);
return _7?_7.imgHtml(this.emoticonImageClass):_5;
},_encode:function(_8){
if(_8.search(this.emoticonImageRegexp)>-1){
return this.emoticonMarker.charAt(0)+_8.replace(/(<img [^>]*)alt="([^"]*)"([^>]*>)/,"$2")+this.emoticonMarker.charAt(1);
}else{
return _8;
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
if(o.args.name==="smiley"){
o.plugin=new dojox.editor.plugins.Smiley();
}
});
}
