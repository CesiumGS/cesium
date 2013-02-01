define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/date/locale",
	"./_ConditionExpr"
], function(declare, lang, dateLocale, exprs){

	var BooleanExpr = declare("dojox.grid.enhanced.plugins.filter.BooleanExpr", exprs._DataExpr, {
		// summary:
		//		A condition expression wrapper for boolean values
		_name: "bool",
		_convertData: function(/* anything */dataValue){
			// summary:
			//		override from _DataExpr
			return !!dataValue;	//Boolean
		}
	});
	var StringExpr = declare("dojox.grid.enhanced.plugins.filter.StringExpr", exprs._DataExpr, {
		// summary:
		//		A condition expression wrapper for string values
		_name: "string",
		_convertData: function(/* anything */dataValue){
			// summary:
			//		override from _DataExpr
			return String(dataValue);	//String
		}
	});
	var NumberExpr = declare("dojox.grid.enhanced.plugins.filter.NumberExpr", exprs._DataExpr, {
		// summary:
		//		A condition expression wrapper for number values
		_name: "number",
		_convertDataToExpr: function(/* anything */dataValue){
			// summary:
			//		override from _DataExpr
			return parseFloat(dataValue);	//Number
		}
	});
	var DateExpr = declare("dojox.grid.enhanced.plugins.filter.DateExpr", exprs._DataExpr, {
		// summary:
		//		A condition expression wrapper for date values
		_name: "date",
		_convertData: function(/* anything */dataValue){
			// summary:
			//		override from _DataExpr
			if(dataValue instanceof Date){
				return dataValue;
			}else if(typeof dataValue == "number"){
				return new Date(dataValue);
			}else{
				var res = dateLocale.parse(String(dataValue), lang.mixin({selector: this._name}, this._convertArgs));
				if(!res){
					throw new Error("Datetime parse failed: " + dataValue);
				}
				return res;
			}
		},
		toObject: function(){
			// summary:
			//		Overrided from _DataExpr.toObject
			if(this._value instanceof Date){
				var tmp = this._value;
				this._value = this._value.valueOf();
				var res = this.inherited(arguments);
				this._value = tmp;
				return res;
			}else{
				return this.inherited(arguments);
			}
		}
	});
	var TimeExpr = declare("dojox.grid.enhanced.plugins.filter.TimeExpr", DateExpr, {
		// summary:
		//		A condition expression wrapper for time values
		_name: "time"
	});

	return lang.mixin({
		BooleanExpr: BooleanExpr,
		StringExpr: StringExpr,
		NumberExpr: NumberExpr,
		DateExpr: DateExpr,
		TimeExpr: TimeExpr
	}, exprs);
});
