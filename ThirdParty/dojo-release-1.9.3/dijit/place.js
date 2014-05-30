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
var top=_e.y,_1e=_e.x,_1f=_5.body(_9.ownerDocument);
if(/relative|absolute/.test(_3.get(_1f,"position"))){
top-=_3.get(_1f,"marginTop");
_1e-=_3.get(_1f,"marginLeft");
}
var s=_9.style;
s.top=top+"px";
s.left=_1e+"px";
s.right="auto";
return _e;
};
var _20={"TL":"BR","TR":"BL","BL":"TR","BR":"TL"};
var _21={at:function(_22,pos,_23,_24,_25){
var _26=_1.map(_23,function(_27){
var c={corner:_27,aroundCorner:_20[_27],pos:{x:pos.x,y:pos.y}};
if(_24){
c.pos.x+=_27.charAt(1)=="L"?_24.x:-_24.x;
c.pos.y+=_27.charAt(0)=="T"?_24.y:-_24.y;
}
return c;
});
return _8(_22,_26,_25);
},around:function(_28,_29,_2a,_2b,_2c){
var _2d;
if(typeof _29=="string"||"offsetWidth" in _29){
_2d=_2.position(_29,true);
if(/^(above|below)/.test(_2a[0])){
var _2e=_2.getBorderExtents(_29),_2f=_29.firstChild?_2.getBorderExtents(_29.firstChild):{t:0,l:0,b:0,r:0},_30=_2.getBorderExtents(_28),_31=_28.firstChild?_2.getBorderExtents(_28.firstChild):{t:0,l:0,b:0,r:0};
_2d.y+=Math.min(_2e.t+_2f.t,_30.t+_31.t);
_2d.h-=Math.min(_2e.t+_2f.t,_30.t+_31.t)+Math.min(_2e.b+_2f.b,_30.b+_31.b);
}
}else{
_2d=_29;
}
if(_29.parentNode){
var _32=_3.getComputedStyle(_29).position=="absolute";
var _33=_29.parentNode;
while(_33&&_33.nodeType==1&&_33.nodeName!="BODY"){
var _34=_2.position(_33,true),pcs=_3.getComputedStyle(_33);
if(/relative|absolute/.test(pcs.position)){
_32=false;
}
if(!_32&&/hidden|auto|scroll/.test(pcs.overflow)){
var _35=Math.min(_2d.y+_2d.h,_34.y+_34.h);
var _36=Math.min(_2d.x+_2d.w,_34.x+_34.w);
_2d.x=Math.max(_2d.x,_34.x);
_2d.y=Math.max(_2d.y,_34.y);
_2d.h=_35-_2d.y;
_2d.w=_36-_2d.x;
}
if(pcs.position=="absolute"){
_32=true;
}
_33=_33.parentNode;
}
}
var x=_2d.x,y=_2d.y,_37="w" in _2d?_2d.w:(_2d.w=_2d.width),_38="h" in _2d?_2d.h:(_4.deprecated("place.around: dijit/place.__Rectangle: { x:"+x+", y:"+y+", height:"+_2d.height+", width:"+_37+" } has been deprecated.  Please use { x:"+x+", y:"+y+", h:"+_2d.height+", w:"+_37+" }","","2.0"),_2d.h=_2d.height);
var _39=[];
function _3a(_3b,_3c){
_39.push({aroundCorner:_3b,corner:_3c,pos:{x:{"L":x,"R":x+_37,"M":x+(_37>>1)}[_3b.charAt(1)],y:{"T":y,"B":y+_38,"M":y+(_38>>1)}[_3b.charAt(0)]}});
};
_1.forEach(_2a,function(pos){
var ltr=_2b;
switch(pos){
case "above-centered":
_3a("TM","BM");
break;
case "below-centered":
_3a("BM","TM");
break;
case "after-centered":
ltr=!ltr;
case "before-centered":
_3a(ltr?"ML":"MR",ltr?"MR":"ML");
break;
case "after":
ltr=!ltr;
case "before":
_3a(ltr?"TL":"TR",ltr?"TR":"TL");
_3a(ltr?"BL":"BR",ltr?"BR":"BL");
break;
case "below-alt":
ltr=!ltr;
case "below":
_3a(ltr?"BL":"BR",ltr?"TL":"TR");
_3a(ltr?"BR":"BL",ltr?"TR":"TL");
break;
case "above-alt":
ltr=!ltr;
case "above":
_3a(ltr?"TL":"TR",ltr?"BL":"BR");
_3a(ltr?"TR":"TL",ltr?"BR":"BL");
break;
default:
_3a(pos.aroundCorner,pos.corner);
}
});
var _3d=_8(_28,_39,_2c,{w:_37,h:_38});
_3d.aroundNodePos=_2d;
return _3d;
}};
return _7.place=_21;
});
