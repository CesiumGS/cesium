/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.io.xhrWindowNamePlugin"]){
dojo._hasResource["dojox.io.xhrWindowNamePlugin"]=true;
dojo.provide("dojox.io.xhrWindowNamePlugin");
dojo.require("dojox.io.xhrPlugins");
dojo.require("dojox.io.windowName");
dojo.require("dojox.io.httpParse");
dojo.require("dojox.secure.capability");
dojox.io.xhrWindowNamePlugin=function(_1,_2,_3){
dojox.io.xhrPlugins.register("windowName",function(_4,_5){
return _5.sync!==true&&(_4=="GET"||_4=="POST"||_2)&&(_5.url.substring(0,_1.length)==_1);
},function(_6,_7,_8){
var _9=dojox.io.windowName.send;
var _a=_7.load;
_7.load=undefined;
var _b=(_2?_2(_9,true):_9)(_6,_7,_8);
_b.addCallback(function(_c){
var _d=_b.ioArgs;
_d.xhr={getResponseHeader:function(_e){
return dojo.queryToObject(_d.hash.match(/[^#]*$/)[0])[_e];
}};
if(_d.handleAs=="json"){
if(!_3){
dojox.secure.capability.validate(_c,["Date"],{});
}
return dojo.fromJson(_c);
}
return dojo._contentHandlers[_d.handleAs||"text"]({responseText:_c});
});
_7.load=_a;
if(_a){
_b.addCallback(_a);
}
return _b;
});
};
}
