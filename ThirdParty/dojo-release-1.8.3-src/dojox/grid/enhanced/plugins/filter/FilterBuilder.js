define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"./_FilterExpr"
], function(declare, array, lang, exprs){

var bdr = function(opCls){
		return lang.partial(function(cls,operands){
			return new exprs[cls](operands);
		},opCls);
	},
	bdr_not = function(opCls){
		return lang.partial(function(cls,operands){
			return new exprs.LogicNOT(new exprs[cls](operands));
		},opCls);
	};
return declare("dojox.grid.enhanced.plugins.filter.FilterBuilder", null, {
	// summary:
	//		Create filter expression from a JSON object.
	buildExpression: function(def){
		if("op" in def){
			return this.supportedOps[def.op.toLowerCase()](array.map(def.data, this.buildExpression, this));
		}else{
			var args = lang.mixin(this.defaultArgs[def.datatype], def.args || {});
			return new this.supportedTypes[def.datatype](def.data, def.isColumn, args);
		}
	},
	supportedOps: {
	// summary:
	//		The builders of all supported operations
		"equalto": bdr("EqualTo"),
		"lessthan": bdr("LessThan"),
		"lessthanorequalto": bdr("LessThanOrEqualTo"),
		"largerthan": bdr("LargerThan"),
		"largerthanorequalto": bdr("LargerThanOrEqualTo"),
		"contains": bdr("Contains"),
		"startswith": bdr("StartsWith"),
		"endswith": bdr("EndsWith"),
		"notequalto": bdr_not("EqualTo"),
		"notcontains": bdr_not("Contains"),
		"notstartswith": bdr_not("StartsWith"),
		"notendswith": bdr_not("EndsWith"),
		"isempty": bdr("IsEmpty"),
		"range": function(operands){
			return new exprs.LogicALL(
				new exprs.LargerThanOrEqualTo(operands.slice(0,2)),
				new exprs.LessThanOrEqualTo(operands[0], operands[2])
			);
		},
		"logicany": bdr("LogicANY"),
		"logicall": bdr("LogicALL")
	},
	supportedTypes: {
		"number": exprs.NumberExpr,
		"string": exprs.StringExpr,
		"boolean": exprs.BooleanExpr,
		"date": exprs.DateExpr,
		"time": exprs.TimeExpr
	},
	defaultArgs: {
		"boolean": {
			"falseValue": "false",
			"convert": function(dataValue, args){
				var falseValue = args.falseValue;
				var trueValue = args.trueValue;
				if(lang.isString(dataValue)){
					if(trueValue && dataValue.toLowerCase() == trueValue){
						return true;
					}
					if(falseValue && dataValue.toLowerCase() == falseValue){
						return false;
					}
				}
				return !!dataValue;
			}
		}
	}
});
});
