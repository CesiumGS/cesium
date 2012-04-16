/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


define(["dojo"],function(_1){
var _2=/(^.*(^|\/)nls(\/|$))([^\/]*)\/?([^\/]*)/,_3=function(_4,_5,_6,_7){
for(var _8=[_6+_7],_9=_5.split("-"),_a="",i=0;i<_9.length;i++){
_a+=_9[i];
if(_4[_a]){
_8.push(_6+_a+"/"+_7);
}
}
return _8;
},_b={};
return {load:function(id,_c,_d){
var _e=_2.exec(id),_f=(_c.toAbsMid&&_c.toAbsMid(_e[1]))||_e[1],_10=_e[5]||_e[4],_11=_f+_10,_12=(_e[5]&&_e[4])||_1.locale,_13=_11+"/"+_12;
if(_b[_13]){
_d(_b[_13]);
return;
}
_c([_11],function(_14){
var _15=_b[_11+"/"]=_1.clone(_14.root),_16=_3(_14,_12,_f,_10);
_c(_16,function(){
for(var i=1;i<_16.length;i++){
_b[_11+"/"+_16[i]]=_15=_1.mixin(_1.clone(_15),arguments[i]);
}
_b[_13]=_15;
_d(_15);
});
});
},cache:function(mid,_17){
_b[mid]=_17;
}};
});
