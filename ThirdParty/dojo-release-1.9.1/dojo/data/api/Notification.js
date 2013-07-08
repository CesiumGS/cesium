/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/data/api/Notification",["../../_base/declare","./Read"],function(_1,_2){
return _1("dojo.data.api.Notification",_2,{getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Notification":true};
},onSet:function(_3,_4,_5,_6){
throw new Error("Unimplemented API: dojo.data.api.Notification.onSet");
},onNew:function(_7,_8){
throw new Error("Unimplemented API: dojo.data.api.Notification.onNew");
},onDelete:function(_9){
throw new Error("Unimplemented API: dojo.data.api.Notification.onDelete");
}});
});
