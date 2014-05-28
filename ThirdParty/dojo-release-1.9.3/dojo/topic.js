/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/topic",["./Evented"],function(_1){
var _2=new _1;
return {publish:function(_3,_4){
return _2.emit.apply(_2,arguments);
},subscribe:function(_5,_6){
return _2.on.apply(_2,arguments);
}};
});
