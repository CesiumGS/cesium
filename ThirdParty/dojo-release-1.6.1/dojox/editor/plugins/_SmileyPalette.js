/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins._SmileyPalette"]){
dojo._hasResource["dojox.editor.plugins._SmileyPalette"]=true;
dojo.provide("dojox.editor.plugins._SmileyPalette");
dojo.require("dijit._Widget");
dojo.require("dijit._PaletteMixin");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","Smiley",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.editor.plugins._SmileyPalette");
dojo.declare("dojox.editor.plugins._SmileyPalette",[dijit._Widget,dijit._Templated,dijit._PaletteMixin],{templateString:"<table class=\"dijitInline dijitEditorSmileyPalette dijitPaletteTable\""+" cellSpacing=0 cellPadding=0><tbody dojoAttachPoint=\"gridNode\"></tbody></table>",baseClass:"dijitEditorSmileyPalette",_palette:[["smile","laughing","wink","grin"],["cool","angry","half","eyebrow"],["frown","shy","goofy","oops"],["tongue","idea","angel","happy"],["yes","no","crying",""]],dyeClass:"dojox.editor.plugins.Emoticon",buildRendering:function(){
this.inherited(arguments);
var _1=dojo.i18n.getLocalization("dojox.editor.plugins","Smiley");
var _2={};
for(var _3 in _1){
if(_3.substr(0,8)=="emoticon"){
_2[_3.substr(8).toLowerCase()]=_1[_3];
}
}
this._preparePalette(this._palette,_2);
}});
dojo.declare("dojox.editor.plugins.Emoticon",null,{constructor:function(id){
this.id=id;
},getValue:function(){
return dojox.editor.plugins.Emoticon.ascii[this.id];
},imgHtml:function(_4){
var _5="emoticon"+this.id.substr(0,1).toUpperCase()+this.id.substr(1),_6=dojo.moduleUrl("dojox.editor.plugins","resources/emoticons/"+_5+".gif"),_7=dojo.i18n.getLocalization("dojox.editor.plugins","Smiley")[_5],_8=["<img src=\"",_6,"\" class=\"",_4,"\" alt=\"",this.getValue(),"\" title=\"",_7,"\">"];
return _8.join("");
},fillCell:function(_9,_a){
dojo.place(this.imgHtml("dijitPaletteImg"),_9);
}});
dojox.editor.plugins.Emoticon.ascii={smile:":-)",laughing:"lol",wink:";-)",grin:":-D",cool:"8-)",angry:":-@",half:":-/",eyebrow:"/:)",frown:":-(",shy:":-$",goofy:":-S",oops:":-O",tongue:":-P",idea:"(i)",yes:"(y)",no:"(n)",angel:"0:-)",crying:":'(",happy:"=)"};
dojox.editor.plugins.Emoticon.fromAscii=function(_b){
var _c=dojox.editor.plugins.Emoticon.ascii;
for(var i in _c){
if(_b==_c[i]){
return new dojox.editor.plugins.Emoticon(i);
}
}
return null;
};
}
