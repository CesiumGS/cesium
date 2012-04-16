/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.oo.general"]){
dojo._hasResource["dojox.lang.oo.general"]=true;
dojo.provide("dojox.lang.oo.general");
dojo.require("dojox.lang.oo.Decorator");
(function(){
var oo=dojox.lang.oo,md=oo.makeDecorator,_1=oo.general,_2=dojo.isFunction;
_1.augment=md(function(_3,_4,_5){
return typeof _5=="undefined"?_4:_5;
});
_1.override=md(function(_6,_7,_8){
return typeof _8!="undefined"?_7:_8;
});
_1.shuffle=md(function(_9,_a,_b){
return _2(_b)?function(){
return _b.apply(this,_a.apply(this,arguments));
}:_b;
});
_1.wrap=md(function(_c,_d,_e){
return function(){
return _d.call(this,_e,arguments);
};
});
_1.tap=md(function(_f,_10,_11){
return function(){
_10.apply(this,arguments);
return this;
};
});
_1.before=md(function(_12,_13,_14){
return _2(_14)?function(){
_13.apply(this,arguments);
return _14.apply(this,arguments);
}:_13;
});
_1.after=md(function(_15,_16,_17){
return _2(_17)?function(){
_17.apply(this,arguments);
return _16.apply(this,arguments);
}:_16;
});
})();
}
