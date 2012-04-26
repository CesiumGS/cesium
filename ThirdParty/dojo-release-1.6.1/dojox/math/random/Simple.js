/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.math.random.Simple"]){
dojo._hasResource["dojox.math.random.Simple"]=true;
dojo.provide("dojox.math.random.Simple");
dojo.declare("dojox.math.random.Simple",null,{destroy:function(){
},nextBytes:function(_1){
for(var i=0,l=_1.length;i<l;++i){
_1[i]=Math.floor(256*Math.random());
}
}});
}
