/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.sql._base"]){
dojo._hasResource["dojox.sql._base"]=true;
dojo.provide("dojox.sql._base");
dojo.require("dojox.sql._crypto");
dojo.mixin(dojox.sql,{dbName:null,debug:(dojo.exists("dojox.sql.debug")?dojox.sql.debug:false),open:function(_1){
if(this._dbOpen&&(!_1||_1==this.dbName)){
return;
}
if(!this.dbName){
this.dbName="dot_store_"+window.location.href.replace(/[^0-9A-Za-z_]/g,"_");
if(this.dbName.length>63){
this.dbName=this.dbName.substring(0,63);
}
}
if(!_1){
_1=this.dbName;
}
try{
this._initDb();
this.db.open(_1);
this._dbOpen=true;
}
catch(exp){
throw exp.message||exp;
}
},close:function(_2){
if(dojo.isIE){
return;
}
if(!this._dbOpen&&(!_2||_2==this.dbName)){
return;
}
if(!_2){
_2=this.dbName;
}
try{
this.db.close(_2);
this._dbOpen=false;
}
catch(exp){
throw exp.message||exp;
}
},_exec:function(_3){
try{
this._initDb();
if(!this._dbOpen){
this.open();
this._autoClose=true;
}
var _4=null;
var _5=null;
var _6=null;
var _7=dojo._toArray(_3);
_4=_7.splice(0,1)[0];
if(this._needsEncrypt(_4)||this._needsDecrypt(_4)){
_5=_7.splice(_7.length-1,1)[0];
_6=_7.splice(_7.length-1,1)[0];
}
if(this.debug){
this._printDebugSQL(_4,_7);
}
var _8;
if(this._needsEncrypt(_4)){
_8=new dojox.sql._SQLCrypto("encrypt",_4,_6,_7,_5);
return null;
}else{
if(this._needsDecrypt(_4)){
_8=new dojox.sql._SQLCrypto("decrypt",_4,_6,_7,_5);
return null;
}
}
var rs=this.db.execute(_4,_7);
rs=this._normalizeResults(rs);
if(this._autoClose){
this.close();
}
return rs;
}
catch(exp){
exp=exp.message||exp;
if(this._autoClose){
try{
this.close();
}
catch(e){
}
}
throw exp;
}
return null;
},_initDb:function(){
if(!this.db){
try{
this.db=google.gears.factory.create("beta.database","1.0");
}
catch(exp){
dojo.setObject("google.gears.denied",true);
if(dojox.off){
dojox.off.onFrameworkEvent("coreOperationFailed");
}
throw "Google Gears must be allowed to run";
}
}
},_printDebugSQL:function(_9,_a){
var _b="dojox.sql(\""+_9+"\"";
for(var i=0;i<_a.length;i++){
if(typeof _a[i]=="string"){
_b+=", \""+_a[i]+"\"";
}else{
_b+=", "+_a[i];
}
}
_b+=")";
},_normalizeResults:function(rs){
var _c=[];
if(!rs){
return [];
}
while(rs.isValidRow()){
var _d={};
for(var i=0;i<rs.fieldCount();i++){
var _e=rs.fieldName(i);
var _f=rs.field(i);
_d[_e]=_f;
}
_c.push(_d);
rs.next();
}
rs.close();
return _c;
},_needsEncrypt:function(sql){
return /encrypt\([^\)]*\)/i.test(sql);
},_needsDecrypt:function(sql){
return /decrypt\([^\)]*\)/i.test(sql);
}});
dojo.declare("dojox.sql._SQLCrypto",null,{constructor:function(_10,sql,_11,_12,_13){
if(_10=="encrypt"){
this._execEncryptSQL(sql,_11,_12,_13);
}else{
this._execDecryptSQL(sql,_11,_12,_13);
}
},_execEncryptSQL:function(sql,_14,_15,_16){
var _17=this._stripCryptoSQL(sql);
var _18=this._flagEncryptedArgs(sql,_15);
var _19=this;
this._encrypt(_17,_14,_15,_18,function(_1a){
var _1b=false;
var _1c=[];
var exp=null;
try{
_1c=dojox.sql.db.execute(_17,_1a);
}
catch(execError){
_1b=true;
exp=execError.message||execError;
}
if(exp!=null){
if(dojox.sql._autoClose){
try{
dojox.sql.close();
}
catch(e){
}
}
_16(null,true,exp.toString());
return;
}
_1c=dojox.sql._normalizeResults(_1c);
if(dojox.sql._autoClose){
dojox.sql.close();
}
if(dojox.sql._needsDecrypt(sql)){
var _1d=_19._determineDecryptedColumns(sql);
_19._decrypt(_1c,_1d,_14,function(_1e){
_16(_1e,false,null);
});
}else{
_16(_1c,false,null);
}
});
},_execDecryptSQL:function(sql,_1f,_20,_21){
var _22=this._stripCryptoSQL(sql);
var _23=this._determineDecryptedColumns(sql);
var _24=false;
var _25=[];
var exp=null;
try{
_25=dojox.sql.db.execute(_22,_20);
}
catch(execError){
_24=true;
exp=execError.message||execError;
}
if(exp!=null){
if(dojox.sql._autoClose){
try{
dojox.sql.close();
}
catch(e){
}
}
_21(_25,true,exp.toString());
return;
}
_25=dojox.sql._normalizeResults(_25);
if(dojox.sql._autoClose){
dojox.sql.close();
}
this._decrypt(_25,_23,_1f,function(_26){
_21(_26,false,null);
});
},_encrypt:function(sql,_27,_28,_29,_2a){
this._totalCrypto=0;
this._finishedCrypto=0;
this._finishedSpawningCrypto=false;
this._finalArgs=_28;
for(var i=0;i<_28.length;i++){
if(_29[i]){
var _2b=_28[i];
var _2c=i;
this._totalCrypto++;
dojox.sql._crypto.encrypt(_2b,_27,dojo.hitch(this,function(_2d){
this._finalArgs[_2c]=_2d;
this._finishedCrypto++;
if(this._finishedCrypto>=this._totalCrypto&&this._finishedSpawningCrypto){
_2a(this._finalArgs);
}
}));
}
}
this._finishedSpawningCrypto=true;
},_decrypt:function(_2e,_2f,_30,_31){
this._totalCrypto=0;
this._finishedCrypto=0;
this._finishedSpawningCrypto=false;
this._finalResultSet=_2e;
for(var i=0;i<_2e.length;i++){
var row=_2e[i];
for(var _32 in row){
if(_2f=="*"||_2f[_32]){
this._totalCrypto++;
var _33=row[_32];
this._decryptSingleColumn(_32,_33,_30,i,function(_34){
_31(_34);
});
}
}
}
this._finishedSpawningCrypto=true;
},_stripCryptoSQL:function(sql){
sql=sql.replace(/DECRYPT\(\*\)/ig,"*");
var _35=sql.match(/ENCRYPT\([^\)]*\)/ig);
if(_35!=null){
for(var i=0;i<_35.length;i++){
var _36=_35[i];
var _37=_36.match(/ENCRYPT\(([^\)]*)\)/i)[1];
sql=sql.replace(_36,_37);
}
}
_35=sql.match(/DECRYPT\([^\)]*\)/ig);
if(_35!=null){
for(i=0;i<_35.length;i++){
var _38=_35[i];
var _39=_38.match(/DECRYPT\(([^\)]*)\)/i)[1];
sql=sql.replace(_38,_39);
}
}
return sql;
},_flagEncryptedArgs:function(sql,_3a){
var _3b=new RegExp(/([\"][^\"]*\?[^\"]*[\"])|([\'][^\']*\?[^\']*[\'])|(\?)/ig);
var _3c;
var _3d=0;
var _3e=[];
while((_3c=_3b.exec(sql))!=null){
var _3f=RegExp.lastMatch+"";
if(/^[\"\']/.test(_3f)){
continue;
}
var _40=false;
if(/ENCRYPT\([^\)]*$/i.test(RegExp.leftContext)){
_40=true;
}
_3e[_3d]=_40;
_3d++;
}
return _3e;
},_determineDecryptedColumns:function(sql){
var _41={};
if(/DECRYPT\(\*\)/i.test(sql)){
_41="*";
}else{
var _42=/DECRYPT\((?:\s*\w*\s*\,?)*\)/ig;
var _43=_42.exec(sql);
while(_43){
var _44=new String(RegExp.lastMatch);
var _45=_44.replace(/DECRYPT\(/i,"");
_45=_45.replace(/\)/,"");
_45=_45.split(/\s*,\s*/);
dojo.forEach(_45,function(_46){
if(/\s*\w* AS (\w*)/i.test(_46)){
_46=_46.match(/\s*\w* AS (\w*)/i)[1];
}
_41[_46]=true;
});
_43=_42.exec(sql);
}
}
return _41;
},_decryptSingleColumn:function(_47,_48,_49,_4a,_4b){
dojox.sql._crypto.decrypt(_48,_49,dojo.hitch(this,function(_4c){
this._finalResultSet[_4a][_47]=_4c;
this._finishedCrypto++;
if(this._finishedCrypto>=this._totalCrypto&&this._finishedSpawningCrypto){
_4b(this._finalResultSet);
}
}));
}});
(function(){
var _4d=dojox.sql;
dojox.sql=new Function("return dojox.sql._exec(arguments);");
dojo.mixin(dojox.sql,_4d);
})();
}
