/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx.scroll"]){
dojo._hasResource["dojox.fx.scroll"]=true;
dojo.provide("dojox.fx.scroll");
dojo.experimental("dojox.fx.scroll");
dojo.require("dojox.fx._core");
dojox.fx.smoothScroll=function(_1){
if(!_1.target){
_1.target=dojo.position(_1.node);
}
var _2=dojo[(dojo.isIE?"isObject":"isFunction")](_1["win"].scrollTo),_3={x:_1.target.x,y:_1.target.y};
if(!_2){
var _4=dojo.position(_1.win);
_3.x-=_4.x;
_3.y-=_4.y;
}
var _5=(_2)?(function(_6){
_1.win.scrollTo(_6[0],_6[1]);
}):(function(_7){
_1.win.scrollLeft=_7[0];
_1.win.scrollTop=_7[1];
});
var _8=new dojo.Animation(dojo.mixin({beforeBegin:function(){
if(this.curve){
delete this.curve;
}
var _9=_2?dojo._docScroll():{x:_1.win.scrollLeft,y:_1.win.scrollTop};
_8.curve=new dojox.fx._Line([_9.x,_9.y],[_9.x+_3.x,_9.y+_3.y]);
},onAnimate:_5},_1));
return _8;
};
}
