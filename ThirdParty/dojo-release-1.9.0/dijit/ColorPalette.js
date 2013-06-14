//>>built
define("dijit/ColorPalette",["require","dojo/text!./templates/ColorPalette.html","./_Widget","./_TemplatedMixin","./_PaletteMixin","./hccss","dojo/i18n","dojo/_base/Color","dojo/_base/declare","dojo/dom-construct","dojo/string","dojo/i18n!dojo/nls/colors","dojo/colors"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b){
var _c=_9("dijit.ColorPalette",[_3,_4,_5],{palette:"7x10",_palettes:{"7x10":[["white","seashell","cornsilk","lemonchiffon","lightyellow","palegreen","paleturquoise","lightcyan","lavender","plum"],["lightgray","pink","bisque","moccasin","khaki","lightgreen","lightseagreen","lightskyblue","cornflowerblue","violet"],["silver","lightcoral","sandybrown","orange","palegoldenrod","chartreuse","mediumturquoise","skyblue","mediumslateblue","orchid"],["gray","red","orangered","darkorange","yellow","limegreen","darkseagreen","royalblue","slateblue","mediumorchid"],["dimgray","crimson","chocolate","coral","gold","forestgreen","seagreen","blue","blueviolet","darkorchid"],["darkslategray","firebrick","saddlebrown","sienna","olive","green","darkcyan","mediumblue","darkslateblue","darkmagenta"],["black","darkred","maroon","brown","darkolivegreen","darkgreen","midnightblue","navy","indigo","purple"]],"3x4":[["white","lime","green","blue"],["silver","yellow","fuchsia","navy"],["gray","red","purple","black"]]},templateString:_2,baseClass:"dijitColorPalette",_dyeFactory:function(_d,_e,_f,_10){
return new this._dyeClass(_d,_e,_f,_10);
},buildRendering:function(){
this.inherited(arguments);
this._dyeClass=_9(_c._Color,{palette:this.palette});
this._preparePalette(this._palettes[this.palette],_7.getLocalization("dojo","colors",this.lang));
}});
_c._Color=_9("dijit._Color",_8,{template:"<span class='dijitInline dijitPaletteImg'>"+"<img src='${blankGif}' alt='${alt}' title='${title}' class='dijitColorPaletteSwatch' style='background-color: ${color}'/>"+"</span>",hcTemplate:"<span class='dijitInline dijitPaletteImg' style='position: relative; overflow: hidden; height: 12px; width: 14px;'>"+"<img src='${image}' alt='${alt}' title='${title}' style='position: absolute; left: ${left}px; top: ${top}px; ${size}'/>"+"</span>",_imagePaths:{"7x10":_1.toUrl("./themes/a11y/colors7x10.png"),"3x4":_1.toUrl("./themes/a11y/colors3x4.png")},constructor:function(_11,row,col,_12){
this._title=_12;
this._row=row;
this._col=col;
this.setColor(_8.named[_11]);
},getValue:function(){
return this.toHex();
},fillCell:function(_13,_14){
var _15=_b.substitute(_6("highcontrast")?this.hcTemplate:this.template,{color:this.toHex(),blankGif:_14,alt:this._title,title:this._title,image:this._imagePaths[this.palette].toString(),left:this._col*-20-5,top:this._row*-20-5,size:this.palette=="7x10"?"height: 145px; width: 206px":"height: 64px; width: 86px"});
_a.place(_15,_13);
}});
return _c;
});
require({cache:{"url:dijit/templates/ColorPalette.html":"<div class=\"dijitInline dijitColorPalette\" role=\"grid\">\n\t<table dojoAttachPoint=\"paletteTableNode\" class=\"dijitPaletteTable\" cellSpacing=\"0\" cellPadding=\"0\" role=\"presentation\">\n\t\t<tbody data-dojo-attach-point=\"gridNode\"></tbody>\n\t</table>\n</div>\n"}});
