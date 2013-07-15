/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/data/api/Identity",["../../_base/declare","./Read"],function(_1,_2){
return _1("dojo.data.api.Identity",_2,{getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
},getIdentity:function(_3){
throw new Error("Unimplemented API: dojo.data.api.Identity.getIdentity");
},getIdentityAttributes:function(_4){
throw new Error("Unimplemented API: dojo.data.api.Identity.getIdentityAttributes");
},fetchItemByIdentity:function(_5){
if(!this.isItemLoaded(_5.item)){
throw new Error("Unimplemented API: dojo.data.api.Identity.fetchItemByIdentity");
}
}});
});
