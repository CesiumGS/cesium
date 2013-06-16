//>>built
define("dijit/form/MappedTextBox",["dojo/_base/declare","dojo/sniff","dojo/dom-construct","./ValidationTextBox"],function(_1,_2,_3,_4){
return _1("dijit.form.MappedTextBox",_4,{postMixInProperties:function(){
this.inherited(arguments);
this.nameAttrSetting="";
},_setNameAttr:"valueNode",serialize:function(_5){
return _5.toString?_5.toString():"";
},toString:function(){
var _6=this.filter(this.get("value"));
return _6!=null?(typeof _6=="string"?_6:this.serialize(_6,this.constraints)):"";
},validate:function(){
this.valueNode.value=this.toString();
return this.inherited(arguments);
},buildRendering:function(){
this.inherited(arguments);
this.valueNode=_3.place("<input type='hidden'"+((this.name&&!_2("msapp"))?" name=\""+this.name.replace(/"/g,"&quot;")+"\"":"")+"/>",this.textbox,"after");
},reset:function(){
this.valueNode.value="";
this.inherited(arguments);
}});
});
