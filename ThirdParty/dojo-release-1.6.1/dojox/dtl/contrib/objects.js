/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.contrib.objects"]){
dojo._hasResource["dojox.dtl.contrib.objects"]=true;
dojo.provide("dojox.dtl.contrib.objects");
dojo.mixin(dojox.dtl.contrib.objects,{key:function(_1,_2){
return _1[_2];
}});
dojox.dtl.register.filters("dojox.dtl.contrib",{"objects":["key"]});
}
