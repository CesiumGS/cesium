//>>built
define("dijit/layout/utils",["dojo/_base/array","dojo/dom-class","dojo/dom-geometry","dojo/dom-style","dojo/_base/lang"],function(_1,_2,_3,_4,_5){
function _6(_7){
return _7.substring(0,1).toUpperCase()+_7.substring(1);
};
function _8(_9,_a){
var _b=_9.resize?_9.resize(_a):_3.setMarginBox(_9.domNode,_a);
if(_b){
_5.mixin(_9,_b);
}else{
_5.mixin(_9,_3.getMarginBox(_9.domNode));
_5.mixin(_9,_a);
}
};
var _c={marginBox2contentBox:function(_d,mb){
var cs=_4.getComputedStyle(_d);
var me=_3.getMarginExtents(_d,cs);
var pb=_3.getPadBorderExtents(_d,cs);
return {l:_4.toPixelValue(_d,cs.paddingLeft),t:_4.toPixelValue(_d,cs.paddingTop),w:mb.w-(me.w+pb.w),h:mb.h-(me.h+pb.h)};
},layoutChildren:function(_e,_f,_10,_11,_12){
_f=_5.mixin({},_f);
_2.add(_e,"dijitLayoutContainer");
_10=_1.filter(_10,function(_13){
return _13.region!="center"&&_13.layoutAlign!="client";
}).concat(_1.filter(_10,function(_14){
return _14.region=="center"||_14.layoutAlign=="client";
}));
_1.forEach(_10,function(_15){
var elm=_15.domNode,pos=(_15.region||_15.layoutAlign);
if(!pos){
throw new Error("No region setting for "+_15.id);
}
var _16=elm.style;
_16.left=_f.l+"px";
_16.top=_f.t+"px";
_16.position="absolute";
_2.add(elm,"dijitAlign"+_6(pos));
var _17={};
if(_11&&_11==_15.id){
_17[_15.region=="top"||_15.region=="bottom"?"h":"w"]=_12;
}
if(pos=="leading"){
pos=_15.isLeftToRight()?"left":"right";
}
if(pos=="trailing"){
pos=_15.isLeftToRight()?"right":"left";
}
if(pos=="top"||pos=="bottom"){
_17.w=_f.w;
_8(_15,_17);
_f.h-=_15.h;
if(pos=="top"){
_f.t+=_15.h;
}else{
_16.top=_f.t+_f.h+"px";
}
}else{
if(pos=="left"||pos=="right"){
_17.h=_f.h;
_8(_15,_17);
_f.w-=_15.w;
if(pos=="left"){
_f.l+=_15.w;
}else{
_16.left=_f.l+_f.w+"px";
}
}else{
if(pos=="client"||pos=="center"){
_8(_15,_f);
}
}
}
});
}};
_5.setObject("dijit.layout.utils",_c);
return _c;
});
