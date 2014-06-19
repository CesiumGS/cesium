/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/NodeList-fx",["./query","./_base/lang","./aspect","./_base/fx","./fx"],function(_1,_2,_3,_4,_5){
var _6=_1.NodeList;
_2.extend(_6,{_anim:function(_7,_8,_9){
_9=_9||{};
var a=_5.combine(this.map(function(_a){
var _b={node:_a};
_2.mixin(_b,_9);
return _7[_8](_b);
}));
return _9.auto?a.play()&&this:a;
},wipeIn:function(_c){
return this._anim(_5,"wipeIn",_c);
},wipeOut:function(_d){
return this._anim(_5,"wipeOut",_d);
},slideTo:function(_e){
return this._anim(_5,"slideTo",_e);
},fadeIn:function(_f){
return this._anim(_4,"fadeIn",_f);
},fadeOut:function(_10){
return this._anim(_4,"fadeOut",_10);
},animateProperty:function(_11){
return this._anim(_4,"animateProperty",_11);
},anim:function(_12,_13,_14,_15,_16){
var _17=_5.combine(this.map(function(_18){
return _4.animateProperty({node:_18,properties:_12,duration:_13||350,easing:_14});
}));
if(_15){
_3.after(_17,"onEnd",_15,true);
}
return _17.play(_16||0);
}});
return _6;
});
