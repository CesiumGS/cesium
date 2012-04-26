/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.filter.integers"]){
dojo._hasResource["dojox.dtl.filter.integers"]=true;
dojo.provide("dojox.dtl.filter.integers");
dojo.mixin(dojox.dtl.filter.integers,{add:function(_1,_2){
_1=parseInt(_1,10);
_2=parseInt(_2,10);
return isNaN(_2)?_1:_1+_2;
},get_digit:function(_3,_4){
_3=parseInt(_3,10);
_4=parseInt(_4,10)-1;
if(_4>=0){
_3+="";
if(_4<_3.length){
_3=parseInt(_3.charAt(_4),10);
}else{
_3=0;
}
}
return (isNaN(_3)?0:_3);
}});
}
