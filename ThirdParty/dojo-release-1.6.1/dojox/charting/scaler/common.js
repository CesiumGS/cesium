/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.scaler.common"]){
dojo._hasResource["dojox.charting.scaler.common"]=true;
dojo.provide("dojox.charting.scaler.common");
(function(){
var eq=function(a,b){
return Math.abs(a-b)<=0.000001*(Math.abs(a)+Math.abs(b));
};
dojo.mixin(dojox.charting.scaler.common,{findString:function(_1,_2){
_1=_1.toLowerCase();
for(var i=0;i<_2.length;++i){
if(_1==_2[i]){
return true;
}
}
return false;
},getNumericLabel:function(_3,_4,_5){
var _6="";
if(dojo.number){
_6=(_5.fixed?dojo.number.format(_3,{places:_4<0?-_4:0}):dojo.number.format(_3))||"";
}else{
_6=_5.fixed?_3.toFixed(_4<0?-_4:0):_3.toString();
}
if(_5.labelFunc){
var r=_5.labelFunc(_6,_3,_4);
if(r){
return r;
}
}
if(_5.labels){
var l=_5.labels,lo=0,hi=l.length;
while(lo<hi){
var _7=Math.floor((lo+hi)/2),_8=l[_7].value;
if(_8<_3){
lo=_7+1;
}else{
hi=_7;
}
}
if(lo<l.length&&eq(l[lo].value,_3)){
return l[lo].text;
}
--lo;
if(lo>=0&&lo<l.length&&eq(l[lo].value,_3)){
return l[lo].text;
}
lo+=2;
if(lo<l.length&&eq(l[lo].value,_3)){
return l[lo].text;
}
}
return _6;
}});
})();
}
