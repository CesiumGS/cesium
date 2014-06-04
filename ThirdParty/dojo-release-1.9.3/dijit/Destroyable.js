//>>built
define("dijit/Destroyable",["dojo/_base/array","dojo/aspect","dojo/_base/declare"],function(_1,_2,_3){
return _3("dijit.Destroyable",null,{destroy:function(_4){
this._destroyed=true;
},own:function(){
_1.forEach(arguments,function(_5){
var _6="destroyRecursive" in _5?"destroyRecursive":"destroy" in _5?"destroy":"remove";
var _7=_2.before(this,"destroy",function(_8){
_5[_6](_8);
});
var _9=_2.after(_5,_6,function(){
_7.remove();
_9.remove();
},true);
},this);
return arguments;
}});
});
