/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dnd/Target",["../_base/declare","../dom-class","./Source"],function(_1,_2,_3){
return _1("dojo.dnd.Target",_3,{constructor:function(){
this.isSource=false;
_2.remove(this.node,"dojoDndSource");
}});
});
