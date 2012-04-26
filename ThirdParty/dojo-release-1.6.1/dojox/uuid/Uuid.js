/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.uuid.Uuid"]){
dojo._hasResource["dojox.uuid.Uuid"]=true;
dojo.provide("dojox.uuid.Uuid");
dojo.require("dojox.uuid");
dojox.uuid.Uuid=function(_1){
this._uuidString=dojox.uuid.NIL_UUID;
if(_1){
dojox.uuid.assert(dojo.isString(_1));
this._uuidString=_1.toLowerCase();
dojox.uuid.assert(this.isValid());
}else{
var _2=dojox.uuid.Uuid.getGenerator();
if(_2){
this._uuidString=_2();
dojox.uuid.assert(this.isValid());
}
}
};
dojox.uuid.Uuid.compare=function(_3,_4){
var _5=_3.toString();
var _6=_4.toString();
if(_5>_6){
return 1;
}
if(_5<_6){
return -1;
}
return 0;
};
dojox.uuid.Uuid.setGenerator=function(_7){
dojox.uuid.assert(!_7||dojo.isFunction(_7));
dojox.uuid.Uuid._ourGenerator=_7;
};
dojox.uuid.Uuid.getGenerator=function(){
return dojox.uuid.Uuid._ourGenerator;
};
dojox.uuid.Uuid.prototype.toString=function(){
return this._uuidString;
};
dojox.uuid.Uuid.prototype.compare=function(_8){
return dojox.uuid.Uuid.compare(this,_8);
};
dojox.uuid.Uuid.prototype.isEqual=function(_9){
return (this.compare(_9)==0);
};
dojox.uuid.Uuid.prototype.isValid=function(){
return dojox.uuid.isValid(this);
};
dojox.uuid.Uuid.prototype.getVariant=function(){
return dojox.uuid.getVariant(this);
};
dojox.uuid.Uuid.prototype.getVersion=function(){
if(!this._versionNumber){
this._versionNumber=dojox.uuid.getVersion(this);
}
return this._versionNumber;
};
dojox.uuid.Uuid.prototype.getNode=function(){
if(!this._nodeString){
this._nodeString=dojox.uuid.getNode(this);
}
return this._nodeString;
};
dojox.uuid.Uuid.prototype.getTimestamp=function(_a){
if(!_a){
_a=null;
}
switch(_a){
case "string":
case String:
return this.getTimestamp(Date).toUTCString();
break;
case "hex":
if(!this._timestampAsHexString){
this._timestampAsHexString=dojox.uuid.getTimestamp(this,"hex");
}
return this._timestampAsHexString;
break;
case null:
case "date":
case Date:
if(!this._timestampAsDate){
this._timestampAsDate=dojox.uuid.getTimestamp(this,Date);
}
return this._timestampAsDate;
break;
default:
dojox.uuid.assert(false,"The getTimestamp() method dojox.uuid.Uuid was passed a bogus returnType: "+_a);
break;
}
};
}
