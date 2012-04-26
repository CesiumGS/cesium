/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.EntityPalette"]){
dojo._hasResource["dojox.editor.plugins.EntityPalette"]=true;
dojo.provide("dojox.editor.plugins.EntityPalette");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._PaletteMixin");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","latinEntities",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.editor.plugins.EntityPalette");
dojo.declare("dojox.editor.plugins.EntityPalette",[dijit._Widget,dijit._Templated,dijit._PaletteMixin],{templateString:"<div class=\"dojoxEntityPalette\">\n"+"\t<table>\n"+"\t\t<tbody>\n"+"\t\t\t<tr>\n"+"\t\t\t\t<td>\n"+"\t\t\t\t\t<table class=\"dijitPaletteTable\">\n"+"\t\t\t\t\t\t<tbody dojoAttachPoint=\"gridNode\"></tbody>\n"+"\t\t\t\t   </table>\n"+"\t\t\t\t</td>\n"+"\t\t\t</tr>\n"+"\t\t\t<tr>\n"+"\t\t\t\t<td>\n"+"\t\t\t\t\t<table dojoAttachPoint=\"previewPane\" class=\"dojoxEntityPalettePreviewTable\">\n"+"\t\t\t\t\t\t<tbody>\n"+"\t\t\t\t\t\t\t<tr>\n"+"\t\t\t\t\t\t\t\t<th class=\"dojoxEntityPalettePreviewHeader\">Preview</th>\n"+"\t\t\t\t\t\t\t\t<th class=\"dojoxEntityPalettePreviewHeader\" dojoAttachPoint=\"codeHeader\">Code</th>\n"+"\t\t\t\t\t\t\t\t<th class=\"dojoxEntityPalettePreviewHeader\" dojoAttachPoint=\"entityHeader\">Name</th>\n"+"\t\t\t\t\t\t\t\t<th class=\"dojoxEntityPalettePreviewHeader\">Description</th>\n"+"\t\t\t\t\t\t\t</tr>\n"+"\t\t\t\t\t\t\t<tr>\n"+"\t\t\t\t\t\t\t\t<td class=\"dojoxEntityPalettePreviewDetailEntity\" dojoAttachPoint=\"previewNode\"></td>\n"+"\t\t\t\t\t\t\t\t<td class=\"dojoxEntityPalettePreviewDetail\" dojoAttachPoint=\"codeNode\"></td>\n"+"\t\t\t\t\t\t\t\t<td class=\"dojoxEntityPalettePreviewDetail\" dojoAttachPoint=\"entityNode\"></td>\n"+"\t\t\t\t\t\t\t\t<td class=\"dojoxEntityPalettePreviewDetail\" dojoAttachPoint=\"descNode\"></td>\n"+"\t\t\t\t\t\t\t</tr>\n"+"\t\t\t\t\t\t</tbody>\n"+"\t\t\t\t\t</table>\n"+"\t\t\t\t</td>\n"+"\t\t\t</tr>\n"+"\t\t</tbody>\n"+"\t</table>\n"+"</div>",baseClass:"dojoxEntityPalette",showPreview:true,showCode:false,showEntityName:false,palette:"latin",dyeClass:"dojox.editor.plugins.LatinEntity",paletteClass:"editorLatinEntityPalette",cellClass:"dojoxEntityPaletteCell",postMixInProperties:function(){
var _1=dojo.i18n.getLocalization("dojox.editor.plugins","latinEntities");
var _2=0;
var _3;
for(_3 in _1){
_2++;
}
var _4=Math.floor(Math.sqrt(_2));
var _5=_4;
var _6=0;
var _7=[];
var _8=[];
for(_3 in _1){
_6++;
_8.push(_3);
if(_6%_5===0){
_7.push(_8);
_8=[];
}
}
if(_8.length>0){
_7.push(_8);
}
this._palette=_7;
},buildRendering:function(){
this.inherited(arguments);
var _9=dojo.i18n.getLocalization("dojox.editor.plugins","latinEntities");
this._preparePalette(this._palette,_9);
var _a=dojo.query(".dojoxEntityPaletteCell",this.gridNode);
dojo.forEach(_a,function(_b){
this.connect(_b,"onmouseenter","_onCellMouseEnter");
},this);
},_onCellMouseEnter:function(e){
this._displayDetails(e.target);
},postCreate:function(){
this.inherited(arguments);
dojo.style(this.codeHeader,"display",this.showCode?"":"none");
dojo.style(this.codeNode,"display",this.showCode?"":"none");
dojo.style(this.entityHeader,"display",this.showEntityName?"":"none");
dojo.style(this.entityNode,"display",this.showEntityName?"":"none");
if(!this.showPreview){
dojo.style(this.previewNode,"display","none");
}
},_setCurrent:function(_c){
this.inherited(arguments);
if(this.showPreview){
this._displayDetails(_c);
}
},_displayDetails:function(_d){
var _e=this._getDye(_d);
if(_e){
var _f=_e.getValue();
var _10=_e._alias;
this.previewNode.innerHTML=_f;
this.codeNode.innerHTML="&amp;#"+parseInt(_f.charCodeAt(0),10)+";";
this.entityNode.innerHTML="&amp;"+_10+";";
var _11=dojo.i18n.getLocalization("dojox.editor.plugins","latinEntities");
this.descNode.innerHTML=_11[_10].replace("\n","<br>");
}else{
this.previewNode.innerHTML="";
this.codeNode.innerHTML="";
this.entityNode.innerHTML="";
this.descNode.innerHTML="";
}
}});
dojo.declare("dojox.editor.plugins.LatinEntity",null,{constructor:function(_12){
this._alias=_12;
},getValue:function(){
return "&"+this._alias+";";
},fillCell:function(_13){
_13.innerHTML=this.getValue();
}});
}
