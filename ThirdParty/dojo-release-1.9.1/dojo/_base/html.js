/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/html",["./kernel","../dom","../dom-style","../dom-attr","../dom-prop","../dom-class","../dom-construct","../dom-geometry"],function(_1,_2,_3,_4,_5,_6,_7,_8){
_1.byId=_2.byId;
_1.isDescendant=_2.isDescendant;
_1.setSelectable=_2.setSelectable;
_1.getAttr=_4.get;
_1.setAttr=_4.set;
_1.hasAttr=_4.has;
_1.removeAttr=_4.remove;
_1.getNodeProp=_4.getNodeProp;
_1.attr=function(_9,_a,_b){
if(arguments.length==2){
return _4[typeof _a=="string"?"get":"set"](_9,_a);
}
return _4.set(_9,_a,_b);
};
_1.hasClass=_6.contains;
_1.addClass=_6.add;
_1.removeClass=_6.remove;
_1.toggleClass=_6.toggle;
_1.replaceClass=_6.replace;
_1._toDom=_1.toDom=_7.toDom;
_1.place=_7.place;
_1.create=_7.create;
_1.empty=function(_c){
_7.empty(_c);
};
_1._destroyElement=_1.destroy=function(_d){
_7.destroy(_d);
};
_1._getPadExtents=_1.getPadExtents=_8.getPadExtents;
_1._getBorderExtents=_1.getBorderExtents=_8.getBorderExtents;
_1._getPadBorderExtents=_1.getPadBorderExtents=_8.getPadBorderExtents;
_1._getMarginExtents=_1.getMarginExtents=_8.getMarginExtents;
_1._getMarginSize=_1.getMarginSize=_8.getMarginSize;
_1._getMarginBox=_1.getMarginBox=_8.getMarginBox;
_1.setMarginBox=_8.setMarginBox;
_1._getContentBox=_1.getContentBox=_8.getContentBox;
_1.setContentSize=_8.setContentSize;
_1._isBodyLtr=_1.isBodyLtr=_8.isBodyLtr;
_1._docScroll=_1.docScroll=_8.docScroll;
_1._getIeDocumentElementOffset=_1.getIeDocumentElementOffset=_8.getIeDocumentElementOffset;
_1._fixIeBiDiScrollLeft=_1.fixIeBiDiScrollLeft=_8.fixIeBiDiScrollLeft;
_1.position=_8.position;
_1.marginBox=function marginBox(_e,_f){
return _f?_8.setMarginBox(_e,_f):_8.getMarginBox(_e);
};
_1.contentBox=function contentBox(_10,box){
return box?_8.setContentSize(_10,box):_8.getContentBox(_10);
};
_1.coords=function(_11,_12){
_1.deprecated("dojo.coords()","Use dojo.position() or dojo.marginBox().");
_11=_2.byId(_11);
var s=_3.getComputedStyle(_11),mb=_8.getMarginBox(_11,s);
var abs=_8.position(_11,_12);
mb.x=abs.x;
mb.y=abs.y;
return mb;
};
_1.getProp=_5.get;
_1.setProp=_5.set;
_1.prop=function(_13,_14,_15){
if(arguments.length==2){
return _5[typeof _14=="string"?"get":"set"](_13,_14);
}
return _5.set(_13,_14,_15);
};
_1.getStyle=_3.get;
_1.setStyle=_3.set;
_1.getComputedStyle=_3.getComputedStyle;
_1.__toPixelValue=_1.toPixelValue=_3.toPixelValue;
_1.style=function(_16,_17,_18){
switch(arguments.length){
case 1:
return _3.get(_16);
case 2:
return _3[typeof _17=="string"?"get":"set"](_16,_17);
}
return _3.set(_16,_17,_18);
};
return _1;
});
