/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.scaler.primitive"]){
dojo._hasResource["dojox.charting.scaler.primitive"]=true;
dojo.provide("dojox.charting.scaler.primitive");
dojox.charting.scaler.primitive={buildScaler:function(_1,_2,_3,_4){
if(_1==_2){
_1-=0.5;
_2+=0.5;
}
return {bounds:{lower:_1,upper:_2,from:_1,to:_2,scale:_3/(_2-_1),span:_3},scaler:dojox.charting.scaler.primitive};
},buildTicks:function(_5,_6){
return {major:[],minor:[],micro:[]};
},getTransformerFromModel:function(_7){
var _8=_7.bounds.from,_9=_7.bounds.scale;
return function(x){
return (x-_8)*_9;
};
},getTransformerFromPlot:function(_a){
var _b=_a.bounds.from,_c=_a.bounds.scale;
return function(x){
return x/_c+_b;
};
}};
}
