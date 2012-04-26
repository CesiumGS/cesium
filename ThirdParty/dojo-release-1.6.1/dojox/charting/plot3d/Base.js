/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot3d.Base"]){
dojo._hasResource["dojox.charting.plot3d.Base"]=true;
dojo.provide("dojox.charting.plot3d.Base");
dojo.require("dojox.charting.Chart3D");
dojo.declare("dojox.charting.plot3d.Base",null,{constructor:function(_1,_2,_3){
this.width=_1;
this.height=_2;
},setData:function(_4){
this.data=_4?_4:[];
return this;
},getDepth:function(){
return this.depth;
},generate:function(_5,_6){
}});
}
