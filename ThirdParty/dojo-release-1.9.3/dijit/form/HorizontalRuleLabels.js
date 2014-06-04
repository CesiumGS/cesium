//>>built
define("dijit/form/HorizontalRuleLabels",["dojo/_base/declare","dojo/has","dojo/number","dojo/query","dojo/_base/lang","./HorizontalRule"],function(_1,_2,_3,_4,_5,_6){
var _7=_1("dijit.form.HorizontalRuleLabels",_6,{templateString:"<div class=\"dijitRuleContainer dijitRuleContainerH dijitRuleLabelsContainer dijitRuleLabelsContainerH\"></div>",labelStyle:"",labels:[],numericMargin:0,minimum:0,maximum:1,constraints:{pattern:"#%"},_positionPrefix:"<div class=\"dijitRuleLabelContainer dijitRuleLabelContainerH\" style=\"left:",_labelPrefix:"\"><div class=\"dijitRuleLabel dijitRuleLabelH\">",_suffix:"</div></div>",_calcPosition:function(_8){
return _8;
},_genHTML:function(_9,_a){
var _b=this.labels[_a];
return this._positionPrefix+this._calcPosition(_9)+this._positionSuffix+this.labelStyle+this._genDirectionHTML(_b)+this._labelPrefix+_b+this._suffix;
},_genDirectionHTML:function(_c){
return "";
},getLabels:function(){
var _d=this.labels;
if(!_d.length&&this.srcNodeRef){
_d=_4("> li",this.srcNodeRef).map(function(_e){
return String(_e.innerHTML);
});
}
if(!_d.length&&this.count>1){
var _f=this.minimum;
var inc=(this.maximum-_f)/(this.count-1);
for(var i=0;i<this.count;i++){
_d.push((i<this.numericMargin||i>=(this.count-this.numericMargin))?"":_3.format(_f,this.constraints));
_f+=inc;
}
}
return _d;
},postMixInProperties:function(){
this.inherited(arguments);
this.labels=this.getLabels();
this.count=this.labels.length;
}});
if(_2("dojo-bidi")){
_7.extend({_setTextDirAttr:function(_10){
if(this.textDir!=_10){
this._set("textDir",_10);
_4(".dijitRuleLabelContainer",this.domNode).forEach(_5.hitch(this,function(_11){
_11.style.direction=this.getTextDir(_11.innerText||_11.textContent||"");
}));
}
},_genDirectionHTML:function(_12){
return (this.textDir?("direction:"+this.getTextDir(_12)+";"):"");
}});
}
return _7;
});
