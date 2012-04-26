/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.ColorPalette"]){
dojo._hasResource["dijit.ColorPalette"]=true;
dojo.provide("dijit.ColorPalette");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.colors");
dojo.require("dojo.i18n");
dojo.require("dojo.string");
dojo.require("dijit._PaletteMixin");
dojo.requireLocalization("dojo","colors",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit.ColorPalette",[dijit._Widget,dijit._Templated,dijit._PaletteMixin],{palette:"7x10",_palettes:{"7x10":[["white","seashell","cornsilk","lemonchiffon","lightyellow","palegreen","paleturquoise","lightcyan","lavender","plum"],["lightgray","pink","bisque","moccasin","khaki","lightgreen","lightseagreen","lightskyblue","cornflowerblue","violet"],["silver","lightcoral","sandybrown","orange","palegoldenrod","chartreuse","mediumturquoise","skyblue","mediumslateblue","orchid"],["gray","red","orangered","darkorange","yellow","limegreen","darkseagreen","royalblue","slateblue","mediumorchid"],["dimgray","crimson","chocolate","coral","gold","forestgreen","seagreen","blue","blueviolet","darkorchid"],["darkslategray","firebrick","saddlebrown","sienna","olive","green","darkcyan","mediumblue","darkslateblue","darkmagenta"],["black","darkred","maroon","brown","darkolivegreen","darkgreen","midnightblue","navy","indigo","purple"]],"3x4":[["white","lime","green","blue"],["silver","yellow","fuchsia","navy"],["gray","red","purple","black"]]},templateString:dojo.cache("dijit","templates/ColorPalette.html","<div class=\"dijitInline dijitColorPalette\">\n\t<table class=\"dijitPaletteTable\" cellSpacing=\"0\" cellPadding=\"0\">\n\t\t<tbody dojoAttachPoint=\"gridNode\"></tbody>\n\t</table>\n</div>\n"),baseClass:"dijitColorPalette",buildRendering:function(){
this.inherited(arguments);
this._preparePalette(this._palettes[this.palette],dojo.i18n.getLocalization("dojo","colors",this.lang),dojo.declare(dijit._Color,{hc:dojo.hasClass(dojo.body(),"dijit_a11y"),palette:this.palette}));
}});
dojo.declare("dijit._Color",dojo.Color,{template:"<span class='dijitInline dijitPaletteImg'>"+"<img src='${blankGif}' alt='${alt}' class='dijitColorPaletteSwatch' style='background-color: ${color}'/>"+"</span>",hcTemplate:"<span class='dijitInline dijitPaletteImg' style='position: relative; overflow: hidden; height: 12px; width: 14px;'>"+"<img src='${image}' alt='${alt}' style='position: absolute; left: ${left}px; top: ${top}px; ${size}'/>"+"</span>",_imagePaths:{"7x10":dojo.moduleUrl("dijit.themes","a11y/colors7x10.png"),"3x4":dojo.moduleUrl("dijit.themes","a11y/colors3x4.png")},constructor:function(_1,_2,_3){
this._alias=_1;
this._row=_2;
this._col=_3;
this.setColor(dojo.Color.named[_1]);
},getValue:function(){
return this.toHex();
},fillCell:function(_4,_5){
var _6=dojo.string.substitute(this.hc?this.hcTemplate:this.template,{color:this.toHex(),blankGif:_5,alt:this._alias,image:this._imagePaths[this.palette].toString(),left:this._col*-20-5,top:this._row*-20-5,size:this.palette=="7x10"?"height: 145px; width: 206px":"height: 64px; width: 86px"});
dojo.place(_6,_4);
}});
}
