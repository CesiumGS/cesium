/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.fx"]){
dojo._hasResource["dojo.fx"]=true;
dojo.provide("dojo.fx");
dojo.require("dojo.fx.Toggler");
(function(){
var d=dojo,_1={_fire:function(_2,_3){
if(this[_2]){
this[_2].apply(this,_3||[]);
}
return this;
}};
var _4=function(_5){
this._index=-1;
this._animations=_5||[];
this._current=this._onAnimateCtx=this._onEndCtx=null;
this.duration=0;
d.forEach(this._animations,function(a){
this.duration+=a.duration;
if(a.delay){
this.duration+=a.delay;
}
},this);
};
d.extend(_4,{_onAnimate:function(){
this._fire("onAnimate",arguments);
},_onEnd:function(){
d.disconnect(this._onAnimateCtx);
d.disconnect(this._onEndCtx);
this._onAnimateCtx=this._onEndCtx=null;
if(this._index+1==this._animations.length){
this._fire("onEnd");
}else{
this._current=this._animations[++this._index];
this._onAnimateCtx=d.connect(this._current,"onAnimate",this,"_onAnimate");
this._onEndCtx=d.connect(this._current,"onEnd",this,"_onEnd");
this._current.play(0,true);
}
},play:function(_6,_7){
if(!this._current){
this._current=this._animations[this._index=0];
}
if(!_7&&this._current.status()=="playing"){
return this;
}
var _8=d.connect(this._current,"beforeBegin",this,function(){
this._fire("beforeBegin");
}),_9=d.connect(this._current,"onBegin",this,function(_a){
this._fire("onBegin",arguments);
}),_b=d.connect(this._current,"onPlay",this,function(_c){
this._fire("onPlay",arguments);
d.disconnect(_8);
d.disconnect(_9);
d.disconnect(_b);
});
if(this._onAnimateCtx){
d.disconnect(this._onAnimateCtx);
}
this._onAnimateCtx=d.connect(this._current,"onAnimate",this,"_onAnimate");
if(this._onEndCtx){
d.disconnect(this._onEndCtx);
}
this._onEndCtx=d.connect(this._current,"onEnd",this,"_onEnd");
this._current.play.apply(this._current,arguments);
return this;
},pause:function(){
if(this._current){
var e=d.connect(this._current,"onPause",this,function(_d){
this._fire("onPause",arguments);
d.disconnect(e);
});
this._current.pause();
}
return this;
},gotoPercent:function(_e,_f){
this.pause();
var _10=this.duration*_e;
this._current=null;
d.some(this._animations,function(a){
if(a.duration<=_10){
this._current=a;
return true;
}
_10-=a.duration;
return false;
});
if(this._current){
this._current.gotoPercent(_10/this._current.duration,_f);
}
return this;
},stop:function(_11){
if(this._current){
if(_11){
for(;this._index+1<this._animations.length;++this._index){
this._animations[this._index].stop(true);
}
this._current=this._animations[this._index];
}
var e=d.connect(this._current,"onStop",this,function(arg){
this._fire("onStop",arguments);
d.disconnect(e);
});
this._current.stop();
}
return this;
},status:function(){
return this._current?this._current.status():"stopped";
},destroy:function(){
if(this._onAnimateCtx){
d.disconnect(this._onAnimateCtx);
}
if(this._onEndCtx){
d.disconnect(this._onEndCtx);
}
}});
d.extend(_4,_1);
dojo.fx.chain=function(_12){
return new _4(_12);
};
var _13=function(_14){
this._animations=_14||[];
this._connects=[];
this._finished=0;
this.duration=0;
d.forEach(_14,function(a){
var _15=a.duration;
if(a.delay){
_15+=a.delay;
}
if(this.duration<_15){
this.duration=_15;
}
this._connects.push(d.connect(a,"onEnd",this,"_onEnd"));
},this);
this._pseudoAnimation=new d.Animation({curve:[0,1],duration:this.duration});
var _16=this;
d.forEach(["beforeBegin","onBegin","onPlay","onAnimate","onPause","onStop","onEnd"],function(evt){
_16._connects.push(d.connect(_16._pseudoAnimation,evt,function(){
_16._fire(evt,arguments);
}));
});
};
d.extend(_13,{_doAction:function(_17,_18){
d.forEach(this._animations,function(a){
a[_17].apply(a,_18);
});
return this;
},_onEnd:function(){
if(++this._finished>this._animations.length){
this._fire("onEnd");
}
},_call:function(_19,_1a){
var t=this._pseudoAnimation;
t[_19].apply(t,_1a);
},play:function(_1b,_1c){
this._finished=0;
this._doAction("play",arguments);
this._call("play",arguments);
return this;
},pause:function(){
this._doAction("pause",arguments);
this._call("pause",arguments);
return this;
},gotoPercent:function(_1d,_1e){
var ms=this.duration*_1d;
d.forEach(this._animations,function(a){
a.gotoPercent(a.duration<ms?1:(ms/a.duration),_1e);
});
this._call("gotoPercent",arguments);
return this;
},stop:function(_1f){
this._doAction("stop",arguments);
this._call("stop",arguments);
return this;
},status:function(){
return this._pseudoAnimation.status();
},destroy:function(){
d.forEach(this._connects,dojo.disconnect);
}});
d.extend(_13,_1);
dojo.fx.combine=function(_20){
return new _13(_20);
};
dojo.fx.wipeIn=function(_21){
var _22=_21.node=d.byId(_21.node),s=_22.style,o;
var _23=d.animateProperty(d.mixin({properties:{height:{start:function(){
o=s.overflow;
s.overflow="hidden";
if(s.visibility=="hidden"||s.display=="none"){
s.height="1px";
s.display="";
s.visibility="";
return 1;
}else{
var _24=d.style(_22,"height");
return Math.max(_24,1);
}
},end:function(){
return _22.scrollHeight;
}}}},_21));
d.connect(_23,"onEnd",function(){
s.height="auto";
s.overflow=o;
});
return _23;
};
dojo.fx.wipeOut=function(_25){
var _26=_25.node=d.byId(_25.node),s=_26.style,o;
var _27=d.animateProperty(d.mixin({properties:{height:{end:1}}},_25));
d.connect(_27,"beforeBegin",function(){
o=s.overflow;
s.overflow="hidden";
s.display="";
});
d.connect(_27,"onEnd",function(){
s.overflow=o;
s.height="auto";
s.display="none";
});
return _27;
};
dojo.fx.slideTo=function(_28){
var _29=_28.node=d.byId(_28.node),top=null,_2a=null;
var _2b=(function(n){
return function(){
var cs=d.getComputedStyle(n);
var pos=cs.position;
top=(pos=="absolute"?n.offsetTop:parseInt(cs.top)||0);
_2a=(pos=="absolute"?n.offsetLeft:parseInt(cs.left)||0);
if(pos!="absolute"&&pos!="relative"){
var ret=d.position(n,true);
top=ret.y;
_2a=ret.x;
n.style.position="absolute";
n.style.top=top+"px";
n.style.left=_2a+"px";
}
};
})(_29);
_2b();
var _2c=d.animateProperty(d.mixin({properties:{top:_28.top||0,left:_28.left||0}},_28));
d.connect(_2c,"beforeBegin",_2c,_2b);
return _2c;
};
})();
}
