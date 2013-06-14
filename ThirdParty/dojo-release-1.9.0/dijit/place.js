//>>built
define("dijit/place",["dojo/_base/array","dojo/dom-geometry","dojo/dom-style","dojo/_base/kernel","dojo/_base/window","./Viewport","./main"],function(_1,_2,_3,_4,_5,_6,_7){
function _8(_9,_a,_b,_c){
var _d=_6.getEffectiveBox(_9.ownerDocument);
if(!_9.parentNode||String(_9.parentNode.tagName).toLowerCase()!="body"){
_5.body(_9.ownerDocument).appendChild(_9);
}
var _e=null;
_1.some(_a,function(_f){
var _10=_f.corner;
var pos=_f.pos;
var _11=0;
var _12={w:{"L":_d.l+_d.w-pos.x,"R":pos.x-_d.l,"M":_d.w}[_10.charAt(1)],h:{"T":_d.t+_d.h-pos.y,"B":pos.y-_d.t,"M":_d.h}[_10.charAt(0)]};
var s=_9.style;
s.left=s.right="auto";
if(_b){
var res=_b(_9,_f.aroundCorner,_10,_12,_c);
_11=typeof res=="undefined"?0:res;
}
var _13=_9.style;
var _14=_13.display;
var _15=_13.visibility;
if(_13.display=="none"){
_13.visibility="hidden";
_13.display="";
}
var bb=_2.position(_9);
_13.display=_14;
_13.visibility=_15;
var _16={"L":pos.x,"R":pos.x-bb.w,"M":Math.max(_d.l,Math.min(_d.l+_d.w,pos.x+(bb.w>>1))-bb.w)}[_10.charAt(1)],_17={"T":pos.y,"B":pos.y-bb.h,"M":Math.max(_d.t,Math.min(_d.t+_d.h,pos.y+(bb.h>>1))-bb.h)}[_10.charAt(0)],_18=Math.max(_d.l,_16),_19=Math.max(_d.t,_17),_1a=Math.min(_d.l+_d.w,_16+bb.w),_1b=Math.min(_d.t+_d.h,_17+bb.h),_1c=_1a-_18,_1d=_1b-_19;
_11+=(bb.w-_1c)+(bb.h-_1d);
if(_e==null||_11<_e.overflow){
_e={corner:_10,aroundCorner:_f.aroundCorner,x:_18,y:_19,w:_1c,h:_1d,overflow:_11,spaceAvailable:_12};
}
return !_11;
});
if(_e.overflow&&_b){
_b(_9,_e.aroundCorner,_e.corner,_e.spaceAvailable,_c);
}
var l=_2.isBodyLtr(_9.ownerDocument),top=_e.y,_1e=l?_e.x:_d.w-_e.x-_e.w;
if(/relative|absolute/.test(_3.get(_5.body(_9.ownerDocument),"position"))){
top-=_3.get(_5.body(_9.ownerDocument),"marginTop");
_1e-=(l?1:-1)*_3.get(_5.body(_9.ownerDocument),l?"marginLeft":"marginRight");
}
var s=_9.style;
s.top=top+"px";
s[l?"left":"right"]=_1e+"px";
s[l?"right":"left"]="auto";
return _e;
};
var _1f={"TL":"BR","TR":"BL","BL":"TR","BR":"TL"};
var _20={at:function(_21,pos,_22,_23,_24){
var _25=_1.map(_22,function(_26){
var c={corner:_26,aroundCorner:_1f[_26],pos:{x:pos.x,y:pos.y}};
if(_23){
c.pos.x+=_26.charAt(1)=="L"?_23.x:-_23.x;
c.pos.y+=_26.charAt(0)=="T"?_23.y:-_23.y;
}
return c;
});
return _8(_21,_25,_24);
},around:function(_27,_28,_29,_2a,_2b){
var _2c;
if(typeof _28=="string"||"offsetWidth" in _28){
_2c=_2.position(_28,true);
if(/^(above|below)/.test(_29[0])){
var _2d=_2.getBorderExtents(_28),_2e=_28.firstChild?_2.getBorderExtents(_28.firstChild):{t:0,l:0,b:0,r:0},_2f=_2.getBorderExtents(_27),_30=_27.firstChild?_2.getBorderExtents(_27.firstChild):{t:0,l:0,b:0,r:0};
_2c.y+=Math.min(_2d.t+_2e.t,_2f.t+_30.t);
_2c.h-=Math.min(_2d.t+_2e.t,_2f.t+_30.t)+Math.min(_2d.b+_2e.b,_2f.b+_30.b);
}
}else{
_2c=_28;
}
if(_28.parentNode){
var _31=_3.getComputedStyle(_28).position=="absolute";
var _32=_28.parentNode;
while(_32&&_32.nodeType==1&&_32.nodeName!="BODY"){
var _33=_2.position(_32,true),pcs=_3.getComputedStyle(_32);
if(/relative|absolute/.test(pcs.position)){
_31=false;
}
if(!_31&&/hidden|auto|scroll/.test(pcs.overflow)){
var _34=Math.min(_2c.y+_2c.h,_33.y+_33.h);
var _35=Math.min(_2c.x+_2c.w,_33.x+_33.w);
_2c.x=Math.max(_2c.x,_33.x);
_2c.y=Math.max(_2c.y,_33.y);
_2c.h=_34-_2c.y;
_2c.w=_35-_2c.x;
}
if(pcs.position=="absolute"){
_31=true;
}
_32=_32.parentNode;
}
}
var x=_2c.x,y=_2c.y,_36="w" in _2c?_2c.w:(_2c.w=_2c.width),_37="h" in _2c?_2c.h:(_4.deprecated("place.around: dijit/place.__Rectangle: { x:"+x+", y:"+y+", height:"+_2c.height+", width:"+_36+" } has been deprecated.  Please use { x:"+x+", y:"+y+", h:"+_2c.height+", w:"+_36+" }","","2.0"),_2c.h=_2c.height);
var _38=[];
function _39(_3a,_3b){
_38.push({aroundCorner:_3a,corner:_3b,pos:{x:{"L":x,"R":x+_36,"M":x+(_36>>1)}[_3a.charAt(1)],y:{"T":y,"B":y+_37,"M":y+(_37>>1)}[_3a.charAt(0)]}});
};
_1.forEach(_29,function(pos){
var ltr=_2a;
switch(pos){
case "above-centered":
_39("TM","BM");
break;
case "below-centered":
_39("BM","TM");
break;
case "after-centered":
ltr=!ltr;
case "before-centered":
_39(ltr?"ML":"MR",ltr?"MR":"ML");
break;
case "after":
ltr=!ltr;
case "before":
_39(ltr?"TL":"TR",ltr?"TR":"TL");
_39(ltr?"BL":"BR",ltr?"BR":"BL");
break;
case "below-alt":
ltr=!ltr;
case "below":
_39(ltr?"BL":"BR",ltr?"TL":"TR");
_39(ltr?"BR":"BL",ltr?"TR":"TL");
break;
case "above-alt":
ltr=!ltr;
case "above":
_39(ltr?"TL":"TR",ltr?"BL":"BR");
_39(ltr?"TR":"TL",ltr?"BR":"BL");
break;
default:
_39(pos.aroundCorner,pos.corner);
}
});
var _3c=_8(_27,_38,_2b,{w:_36,h:_37});
_3c.aroundNodePos=_2c;
return _3c;
}};
return _7.place=_20;
});
