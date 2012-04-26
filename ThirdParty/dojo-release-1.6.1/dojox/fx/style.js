/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx.style"]){
dojo._hasResource["dojox.fx.style"]=true;
dojo.provide("dojox.fx.style");
dojo.experimental("dojox.fx.style");
dojo.require("dojo.fx");
(function(){
var d=dojo;
var _1=function(_2){
return d.map(dojox.fx._allowedProperties,function(_3){
return _2[_3];
});
};
var _4=function(_5,_6,_7){
_5=d.byId(_5);
var cs=d.getComputedStyle(_5);
var _8=_1(cs);
d[(_7?"addClass":"removeClass")](_5,_6);
var _9=_1(cs);
d[(_7?"removeClass":"addClass")](_5,_6);
var _a={},i=0;
d.forEach(dojox.fx._allowedProperties,function(_b){
if(_8[i]!=_9[i]){
_a[_b]=parseInt(_9[i]);
}
i++;
});
return _a;
};
d.mixin(dojox.fx,{addClass:function(_c,_d,_e){
_c=d.byId(_c);
var _f=(function(n){
return function(){
d.addClass(n,_d);
n.style.cssText=_10;
};
})(_c);
var _11=_4(_c,_d,true);
var _10=_c.style.cssText;
var _12=d.animateProperty(d.mixin({node:_c,properties:_11},_e));
d.connect(_12,"onEnd",_12,_f);
return _12;
},removeClass:function(_13,_14,_15){
_13=d.byId(_13);
var _16=(function(n){
return function(){
d.removeClass(n,_14);
n.style.cssText=_17;
};
})(_13);
var _18=_4(_13,_14);
var _17=_13.style.cssText;
var _19=d.animateProperty(d.mixin({node:_13,properties:_18},_15));
d.connect(_19,"onEnd",_19,_16);
return _19;
},toggleClass:function(_1a,_1b,_1c,_1d){
if(typeof _1c=="undefined"){
_1c=!d.hasClass(_1a,_1b);
}
return dojox.fx[(_1c?"addClass":"removeClass")](_1a,_1b,_1d);
},_allowedProperties:["width","height","left","top","backgroundColor","color","borderBottomWidth","borderTopWidth","borderLeftWidth","borderRightWidth","paddingLeft","paddingRight","paddingTop","paddingBottom","marginLeft","marginTop","marginRight","marginBottom","lineHeight","letterSpacing","fontSize"]});
})();
}
