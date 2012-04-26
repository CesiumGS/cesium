/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.filter.dates"]){
dojo._hasResource["dojox.dtl.filter.dates"]=true;
dojo.provide("dojox.dtl.filter.dates");
dojo.require("dojox.dtl.utils.date");
(function(){
var _1=dojox.dtl.filter.dates;
dojo.mixin(_1,{_toDate:function(_2){
if(_2 instanceof Date){
return _2;
}
_2=new Date(_2);
if(_2.getTime()==new Date(0).getTime()){
return "";
}
return _2;
},date:function(_3,_4){
_3=_1._toDate(_3);
if(!_3){
return "";
}
_4=_4||"N j, Y";
return dojox.dtl.utils.date.format(_3,_4);
},time:function(_5,_6){
_5=_1._toDate(_5);
if(!_5){
return "";
}
_6=_6||"P";
return dojox.dtl.utils.date.format(_5,_6);
},timesince:function(_7,_8){
_7=_1._toDate(_7);
if(!_7){
return "";
}
var _9=dojox.dtl.utils.date.timesince;
if(_8){
return _9(_8,_7);
}
return _9(_7);
},timeuntil:function(_a,_b){
_a=_1._toDate(_a);
if(!_a){
return "";
}
var _c=dojox.dtl.utils.date.timesince;
if(_b){
return _c(_b,_a);
}
return _c(new Date(),_a);
}});
})();
}
