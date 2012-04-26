/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.plugins.drawing.GreekPalette"]){
dojo._hasResource["dojox.drawing.plugins.drawing.GreekPalette"]=true;
dojo.provide("dojox.drawing.plugins.drawing.GreekPalette");
dojo.require("dojox.drawing.library.greek");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._PaletteMixin");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","latinEntities",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.drawing.plugins.drawing.GreekPalette",[dijit._Widget,dijit._Templated,dijit._PaletteMixin],{postMixInProperties:function(){
var _1=dojox.drawing.library.greek;
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
},onChange:function(_9){
var _a=this._textBlock;
dijit.popup.close(this);
_a.insertText(this._pushChangeTo,_9);
_a._dropMode=false;
},onCancel:function(_b){
dijit.popup.close(this);
this._textBlock._dropMode=false;
},id:"dropdown",templateString:"<div class=\"dojoxEntityPalette\">\n"+"\t<table>\n"+"\t\t<tbody>\n"+"\t\t\t<tr>\n"+"\t\t\t\t<td>\n"+"\t\t\t\t\t<table class=\"dijitPaletteTable\">\n"+"\t\t\t\t\t\t<tbody dojoAttachPoint=\"gridNode\"></tbody>\n"+"\t\t\t\t   </table>\n"+"\t\t\t\t</td>\n"+"\t\t\t</tr>\n"+"\t\t\t<tr>\n"+"\t\t\t\t<td>\n"+"\t\t\t\t\t<table dojoAttachPoint=\"previewPane\" class=\"dojoxEntityPalettePreviewTable\">\n"+"\t\t\t\t\t\t<tbody>\n"+"\t\t\t\t\t\t\t<tr>\n"+"\t\t\t\t\t\t\t\t<td class=\"dojoxEntityPalettePreviewDetailEntity\">Type: <span class=\"dojoxEntityPalettePreviewDetail\" dojoAttachPoint=\"previewNode\"></span></td>\n"+"\t\t\t\t\t\t\t</tr>\n"+"\t\t\t\t\t\t</tbody>\n"+"\t\t\t\t\t</table>\n"+"\t\t\t\t</td>\n"+"\t\t\t</tr>\n"+"\t\t</tbody>\n"+"\t</table>\n"+"</div>",baseClass:"dojoxEntityPalette",showPreview:true,dyeClass:"dojox.drawing.plugins.Greeks",paletteClass:"editorLatinEntityPalette",cellClass:"dojoxEntityPaletteCell",buildRendering:function(){
this.inherited(arguments);
var _c=dojo.i18n.getLocalization("dojox.editor.plugins","latinEntities");
this._preparePalette(this._palette,_c);
var _d=dojo.query(".dojoxEntityPaletteCell",this.gridNode);
dojo.forEach(_d,function(_e){
this.connect(_e,"onmouseenter","_onCellMouseEnter");
},this);
},_onCellMouseEnter:function(e){
if(this.showPreview){
this._displayDetails(e.target);
}
},_onCellClick:function(_f){
var _10=_f.type=="click"?_f.currentTarget:this._currentFocus,_11=this._getDye(_10).getValue();
this._setCurrent(_10);
setTimeout(dojo.hitch(this,function(){
dijit.focus(_10);
this._setValueAttr(_11,true);
}));
dojo.removeClass(_10,"dijitPaletteCellHover");
dojo.stopEvent(_f);
},postCreate:function(){
this.inherited(arguments);
if(!this.showPreview){
dojo.style(this.previewNode,"display","none");
}
},_setCurrent:function(_12){
if("_currentFocus" in this){
dojo.attr(this._currentFocus,"tabIndex","-1");
dojo.removeClass(this._currentFocus,"dojoxEntityPaletteCellHover");
}
this._currentFocus=_12;
if(_12){
dojo.attr(_12,"tabIndex",this.tabIndex);
dojo.addClass(this._currentFocus,"dojoxEntityPaletteCellHover");
}
if(this.showPreview){
this._displayDetails(_12);
}
},_displayDetails:function(_13){
var dye=this._getDye(_13);
if(dye){
var _14=dye.getValue();
var _15=dye._alias;
this.previewNode.innerHTML=_14;
}else{
this.previewNode.innerHTML="";
this.descNode.innerHTML="";
}
},_preparePalette:function(_16,_17){
this._cells=[];
var url=this._blankGif;
var _18=dojo.getObject(this.dyeClass);
for(var row=0;row<_16.length;row++){
var _19=dojo.create("tr",{tabIndex:"-1"},this.gridNode);
for(var col=0;col<_16[row].length;col++){
var _1a=_16[row][col];
if(_1a){
var _1b=new _18(_1a);
var _1c=dojo.create("td",{"class":this.cellClass,tabIndex:"-1",title:_17[_1a]});
_1b.fillCell(_1c,url);
this.connect(_1c,"ondijitclick","_onCellClick");
this._trackMouseState(_1c,this.cellClass);
dojo.place(_1c,_19);
_1c.index=this._cells.length;
this._cells.push({node:_1c,dye:_1b});
}
}
}
this._xDim=_16[0].length;
this._yDim=_16.length;
},_navigateByArrow:function(evt){
var _1d={38:-this._xDim,40:this._xDim,39:this.isLeftToRight()?1:-1,37:this.isLeftToRight()?-1:1};
var _1e=_1d[evt.keyCode];
var _1f=this._currentFocus.index+_1e;
if(_1f<this._cells.length&&_1f>-1){
var _20=this._cells[_1f].node;
this._setCurrent(_20);
}
}});
dojo.declare("dojox.drawing.plugins.Greeks",null,{constructor:function(_21){
this._alias=_21;
},getValue:function(){
return this._alias;
},fillCell:function(_22){
_22.innerHTML="&"+this._alias+";";
}});
}
