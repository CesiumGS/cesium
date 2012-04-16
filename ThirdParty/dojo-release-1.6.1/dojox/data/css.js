/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.css"]){
dojo._hasResource["dojox.data.css"]=true;
dojo.provide("dojox.data.css");
dojox.data.css.rules={};
dojox.data.css.rules.forEach=function(fn,_1,_2){
if(_2){
var _3=function(_4){
dojo.forEach(_4[_4.cssRules?"cssRules":"rules"],function(_5){
if(!_5.type||_5.type!==3){
var _6="";
if(_4&&_4.href){
_6=_4.href;
}
fn.call(_1?_1:this,_5,_4,_6);
}
});
};
dojo.forEach(_2,_3);
}
};
dojox.data.css.findStyleSheets=function(_7){
var _8=[];
var _9=function(_a){
var s=dojox.data.css.findStyleSheet(_a);
if(s){
dojo.forEach(s,function(_b){
if(dojo.indexOf(_8,_b)===-1){
_8.push(_b);
}
});
}
};
dojo.forEach(_7,_9);
return _8;
};
dojox.data.css.findStyleSheet=function(_c){
var _d=[];
if(_c.charAt(0)==="."){
_c=_c.substring(1);
}
var _e=function(_f){
if(_f.href&&_f.href.match(_c)){
_d.push(_f);
return true;
}
if(_f.imports){
return dojo.some(_f.imports,function(_10){
return _e(_10);
});
}
return dojo.some(_f[_f.cssRules?"cssRules":"rules"],function(_11){
if(_11.type&&_11.type===3&&_e(_11.styleSheet)){
return true;
}
return false;
});
};
dojo.some(document.styleSheets,_e);
return _d;
};
dojox.data.css.determineContext=function(_12){
var ret=[];
if(_12&&_12.length>0){
_12=dojox.data.css.findStyleSheets(_12);
}else{
_12=document.styleSheets;
}
var _13=function(_14){
ret.push(_14);
if(_14.imports){
dojo.forEach(_14.imports,function(_15){
_13(_15);
});
}
dojo.forEach(_14[_14.cssRules?"cssRules":"rules"],function(_16){
if(_16.type&&_16.type===3){
_13(_16.styleSheet);
}
});
};
dojo.forEach(_12,_13);
return ret;
};
}
