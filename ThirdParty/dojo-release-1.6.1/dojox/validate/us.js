/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.validate.us"]){
dojo._hasResource["dojox.validate.us"]=true;
dojo.provide("dojox.validate.us");
dojo.require("dojox.validate._base");
dojox.validate.us.isState=function(_1,_2){
var re=new RegExp("^"+dojox.validate.regexp.us.state(_2)+"$","i");
return re.test(_1);
};
dojox.validate.us.isPhoneNumber=function(_3){
var _4={format:["###-###-####","(###) ###-####","(###) ### ####","###.###.####","###/###-####","### ### ####","###-###-#### x#???","(###) ###-#### x#???","(###) ### #### x#???","###.###.#### x#???","###/###-#### x#???","### ### #### x#???","##########"]};
return dojox.validate.isNumberFormat(_3,_4);
};
dojox.validate.us.isSocialSecurityNumber=function(_5){
var _6={format:["###-##-####","### ## ####","#########"]};
return dojox.validate.isNumberFormat(_5,_6);
};
dojox.validate.us.isZipCode=function(_7){
var _8={format:["#####-####","##### ####","#########","#####"]};
return dojox.validate.isNumberFormat(_7,_8);
};
}
