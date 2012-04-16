/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.util.common"]){
dojo._hasResource["dojox.drawing.util.common"]=true;
dojo.provide("dojox.drawing.util.common");
dojo.require("dojox.math.round");
(function(){
var _1={};
var _2=0;
dojox.drawing.util.common={radToDeg:function(n){
return (n*180)/Math.PI;
},degToRad:function(n){
return (n*Math.PI)/180;
},angle:function(_3,_4){
if(_4){
_4=_4/180;
var _5=this.radians(_3),_6=Math.PI*_4,_7=dojox.math.round(_5/_6),_8=_7*_6;
return dojox.math.round(this.radToDeg(_8));
}else{
return this.radToDeg(this.radians(_3));
}
},oppAngle:function(_9){
(_9+=180)>360?_9=_9-360:_9;
return _9;
},radians:function(o){
return Math.atan2(o.start.y-o.y,o.x-o.start.x);
},length:function(o){
return Math.sqrt(Math.pow(o.start.x-o.x,2)+Math.pow(o.start.y-o.y,2));
},lineSub:function(x1,y1,x2,y2,_a){
var _b=this.distance(this.argsToObj.apply(this,arguments));
_b=_b<_a?_a:_b;
var pc=(_b-_a)/_b;
var x=x1-(x1-x2)*pc;
var y=y1-(y1-y2)*pc;
return {x:x,y:y};
},argsToObj:function(){
var a=arguments;
if(a.length<4){
return a[0];
}
return {start:{x:a[0],y:a[1]},x:a[2],y:a[3]};
},distance:function(){
var o=this.argsToObj.apply(this,arguments);
return Math.abs(Math.sqrt(Math.pow(o.start.x-o.x,2)+Math.pow(o.start.y-o.y,2)));
},slope:function(p1,p2){
if(!(p1.x-p2.x)){
return 0;
}
return ((p1.y-p2.y)/(p1.x-p2.x));
},pointOnCircle:function(cx,cy,_c,_d){
var _e=_d*Math.PI/180;
var x=_c*Math.cos(_e);
var y=_c*Math.sin(_e);
return {x:cx+x,y:cy-y};
},constrainAngle:function(_f,min,max){
var _10=this.angle(_f);
if(_10>=min&&_10<=max){
return _f;
}
var _11=this.length(_f);
var _12=_10>max?max:min-_10<100?min:max;
return this.pointOnCircle(_f.start.x,_f.start.y,_11,_12);
},snapAngle:function(obj,ca){
var _13=this.radians(obj),_14=this.length(obj),seg=Math.PI*ca,rnd=Math.round(_13/seg),_15=rnd*seg,_16=this.radToDeg(_15),pt=this.pointOnCircle(obj.start.x,obj.start.y,_14,_16);
return pt;
},idSetStart:function(num){
_2=num;
},uid:function(str){
str=str||"shape";
_1[str]=_1[str]===undefined?_2:_1[str]+1;
return str+_1[str];
},abbr:function(_17){
return _17.substring(_17.lastIndexOf(".")+1).charAt(0).toLowerCase()+_17.substring(_17.lastIndexOf(".")+2);
},mixin:function(o1,o2){
},objects:{},register:function(obj){
this.objects[obj.id]=obj;
},byId:function(id){
return this.objects[id];
},attr:function(_18,_19,_1a,_1b){
if(!_18){
return false;
}
try{
if(_18.shape&&_18.util){
_18=_18.shape;
}
if(!_1a&&_19=="id"&&_18.target){
var n=_18.target;
while(!dojo.attr(n,"id")){
n=n.parentNode;
}
return dojo.attr(n,"id");
}
if(_18.rawNode||_18.target){
var _1c=Array.prototype.slice.call(arguments);
_1c[0]=_18.rawNode||_18.target;
return dojo.attr.apply(dojo,_1c);
}
return dojo.attr(_18,"id");
}
catch(e){
if(!_1b){
}
return false;
}
}};
})();
}
