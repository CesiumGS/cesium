/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.data.api.Notification"]){
dojo._hasResource["dojo.data.api.Notification"]=true;
dojo.provide("dojo.data.api.Notification");
dojo.require("dojo.data.api.Read");
dojo.declare("dojo.data.api.Notification",dojo.data.api.Read,{getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Notification":true};
},onSet:function(_1,_2,_3,_4){
throw new Error("Unimplemented API: dojo.data.api.Notification.onSet");
},onNew:function(_5,_6){
throw new Error("Unimplemented API: dojo.data.api.Notification.onNew");
},onDelete:function(_7){
throw new Error("Unimplemented API: dojo.data.api.Notification.onDelete");
}});
}
