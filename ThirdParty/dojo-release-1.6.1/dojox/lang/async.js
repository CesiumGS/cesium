/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.async"]){
dojo._hasResource["dojox.lang.async"]=true;
dojo.provide("dojox.lang.async");
(function(){
var d=dojo,_1=d.Deferred,_2=d.forEach,_3=d.some,_4=dojox.lang.async,_5=Array.prototype.slice,_6=Object.prototype.toString;
_4.seq=function(x){
var fs=_6.call(x)=="[object Array]"?x:arguments;
return function(_7){
var x=new _1();
_2(fs,function(f){
x.addCallback(f);
});
x.callback(_7);
return x;
};
};
_4.par=function(x){
var fs=_6.call(x)=="[object Array]"?x:arguments;
return function(_8){
var _9=new Array(fs.length),_a=function(){
_2(_9,function(v){
if(v instanceof _1&&v.fired<0){
v.cancel();
}
});
},x=new _1(_a),_b=fs.length;
_2(fs,function(f,i){
var x;
try{
x=f(_8);
}
catch(e){
x=e;
}
_9[i]=x;
});
var _c=_3(_9,function(v){
if(v instanceof Error){
_a();
x.errback(v);
return true;
}
return false;
});
if(!_c){
_2(_9,function(v,i){
if(v instanceof _1){
v.addCallbacks(function(v){
_9[i]=v;
if(!--_b){
x.callback(_9);
}
},function(v){
_a();
x.errback(v);
});
}else{
--_b;
}
});
}
if(!_b){
x.callback(_9);
}
return x;
};
};
_4.any=function(x){
var fs=_6.call(x)=="[object Array]"?x:arguments;
return function(_d){
var _e=new Array(fs.length),_f=true;
cancel=function(_10){
_2(_e,function(v,i){
if(i!=_10&&v instanceof _1&&v.fired<0){
v.cancel();
}
});
},x=new _1(cancel);
_2(fs,function(f,i){
var x;
try{
x=f(_d);
}
catch(e){
x=e;
}
_e[i]=x;
});
var _11=_3(_e,function(v,i){
if(!(v instanceof _1)){
cancel(i);
x.callback(v);
return true;
}
return false;
});
if(!_11){
_2(_e,function(v,i){
v.addBoth(function(v){
if(_f){
_f=false;
cancel(i);
x.callback(v);
}
});
});
}
return x;
};
};
_4.select=function(_12,x){
var fs=_6.call(x)=="[object Array]"?x:_5.call(arguments,1);
return function(_13){
return new _1().addCallback(_12).addCallback(function(v){
if(typeof v=="number"&&v>=0&&v<fs.length){
return fs[v](_13);
}else{
return new Error("async.select: out of range");
}
}).callback(_13);
};
};
_4.ifThen=function(_14,_15,_16){
return function(_17){
return new _1().addCallback(_14).addCallback(function(v){
return (v?_15:_16)(_17);
}).callback(_17);
};
};
_4.loop=function(_18,_19){
return function(_1a){
var x,y=new _1(function(){
x.cancel();
});
function _1b(v){
y.errback(v);
};
function _1c(v){
if(v){
x.addCallback(_19).addCallback(_1d);
}else{
y.callback(v);
}
return v;
};
function _1d(_1e){
x=new _1().addCallback(_18).addCallback(_1c).addErrback(_1b);
x.callback(_1e);
};
_1d(_1a);
return y;
};
};
})();
}
