//>>built
define("dijit/_base/manager",["dojo/_base/array","dojo/_base/config","dojo/_base/lang","../registry","../main"],function(_1,_2,_3,_4,_5){
var _6={};
_1.forEach(["byId","getUniqueId","findWidgets","_destroyAll","byNode","getEnclosingWidget"],function(_7){
_6[_7]=_4[_7];
});
_3.mixin(_6,{defaultDuration:_2["defaultDuration"]||200});
_3.mixin(_5,_6);
return _5;
});
