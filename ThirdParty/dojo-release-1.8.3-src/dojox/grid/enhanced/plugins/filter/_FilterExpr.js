define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/date",
	"./_DataExprs"
], function(declare, lang, date, exprs){
//This is the main file that should be 'required' if filter expression facility is necessary.

	/* Logic Operations */
	var LogicAND = declare("dojox.grid.enhanced.plugins.filter.LogicAND", exprs._BiOpExpr, {
		// summary:
		//		A logic AND condition expression.
		_name: "and",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var res = left_operand.applyRow(datarow, getter).getValue() &&
				right_operand.applyRow(datarow, getter).getValue();
			return new exprs.BooleanExpr(res);	//_ConditionExpr
		}
	});
	var LogicOR = declare("dojox.grid.enhanced.plugins.filter.LogicOR", exprs._BiOpExpr, {
		// summary:
		//		A logic OR condition expression.
		_name: "or",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var res = left_operand.applyRow(datarow, getter).getValue() ||
				right_operand.applyRow(datarow, getter).getValue();
			return new exprs.BooleanExpr(res);	//_ConditionExpr
		}
	});
	var LogicXOR = declare("dojox.grid.enhanced.plugins.filter.LogicXOR", exprs._BiOpExpr, {
		// summary:
		//		A logic XOR condition expression.
		_name: "xor",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var left_res = left_operand.applyRow(datarow, getter).getValue();
			var right_res = right_operand.applyRow(datarow, getter).getValue();
			return new exprs.BooleanExpr((!!left_res) != (!!right_res));	//_ConditionExpr
		}
	});
	var LogicNOT = declare("dojox.grid.enhanced.plugins.filter.LogicNOT", exprs._UniOpExpr, {
		// summary:
		//		A logic NOT condition expression.
		_name: "not",
		_calculate: function(/* _ConditionExpr */operand,/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _UniOpExpr
			return new exprs.BooleanExpr(!operand.applyRow(datarow, getter).getValue());	//_ConditionExpr
		}
	});
	var LogicALL = declare("dojox.grid.enhanced.plugins.filter.LogicALL", exprs._OperatorExpr, {
		// summary:
		//		A logic ALL condition expression, equals a sequence of logic ANDs
		_name: "all",
		applyRow: function(/* data item */datarow,/* function(row,colIdx) */ getter){
			// summary:
			//		Override from _ConditionExpr
			for(var i = 0, res = true; res && (this._operands[i] instanceof exprs._ConditionExpr); ++i){
				res = this._operands[i].applyRow(datarow,getter).getValue();
			}
			return new exprs.BooleanExpr(res);	//_ConditionExpr
		}
	});
	var LogicANY = declare("dojox.grid.enhanced.plugins.filter.LogicANY", exprs._OperatorExpr, {
		// summary:
		//		A logic ANY condition expression, equals a sequence of logic ORs
		_name: "any",
		applyRow: function(/* data item */datarow,/* function(row,colIdx) */ getter){
			for(var i = 0,res = false; !res && (this._operands[i] instanceof exprs._ConditionExpr); ++i){
				res = this._operands[i].applyRow(datarow,getter).getValue();
			}
			return new exprs.BooleanExpr(res);	//_ConditionExpr
		}
	});
	
	/* Comparison Operations */
	function compareFunc(left,right,row,getter){
		left = left.applyRow(row, getter);
		right = right.applyRow(row, getter);
		var left_res = left.getValue();
		var right_res = right.getValue();
		if(left instanceof exprs.TimeExpr){
			return date.compare(left_res,right_res,"time");
		}else if(left instanceof exprs.DateExpr){
			return date.compare(left_res,right_res,"date");
		}else{
			if(left instanceof exprs.StringExpr){
				left_res = left_res.toLowerCase();
				right_res = String(right_res).toLowerCase();
			}
			return left_res == right_res ? 0 : (left_res < right_res ? -1 : 1);
		}
	}
	var EqualTo = declare("dojox.grid.enhanced.plugins.filter.EqualTo", exprs._BiOpExpr, {
		// summary:
		//		An "equal to" condition expression.
		_name: "equal",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var res = compareFunc(left_operand,right_operand,datarow,getter);
			return new exprs.BooleanExpr(res === 0);	//_ConditionExpr
		}
	});
	var LessThan = declare("dojox.grid.enhanced.plugins.filter.LessThan", exprs._BiOpExpr, {
		// summary:
		//		A "less than" condition expression.
		_name: "less",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var res = compareFunc(left_operand,right_operand,datarow,getter);
			return new exprs.BooleanExpr(res < 0);	//_ConditionExpr
		}
	});
	var LessThanOrEqualTo = declare("dojox.grid.enhanced.plugins.filter.LessThanOrEqualTo", exprs._BiOpExpr, {
		// summary:
		//		A "less than or equal to" condition expression.
		_name: "lessEqual",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var res = compareFunc(left_operand,right_operand,datarow,getter);
			return new exprs.BooleanExpr(res <= 0);	//_ConditionExpr
		}
	});
	var LargerThan = declare("dojox.grid.enhanced.plugins.filter.LargerThan", exprs._BiOpExpr, {
		// summary:
		//		A "larger than" condition expression.
		_name: "larger",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var res = compareFunc(left_operand,right_operand,datarow,getter);
			return new exprs.BooleanExpr(res > 0);	//_ConditionExpr
		}
	});
	var LargerThanOrEqualTo = declare("dojox.grid.enhanced.plugins.filter.LargerThanOrEqualTo", exprs._BiOpExpr, {
		// summary:
		//		A "larger than or equal to" condition expression.
		_name: "largerEqual",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var res = compareFunc(left_operand,right_operand,datarow,getter);
			return new exprs.BooleanExpr(res >= 0);	//_ConditionExpr
		}
	});
	
	/* String Operations */
	var Contains = declare("dojox.grid.enhanced.plugins.filter.Contains", exprs._BiOpExpr, {
		// summary:
		//		A "contains" condition expression.
		_name: "contains",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var left_res = String(left_operand.applyRow(datarow, getter).getValue()).toLowerCase();
			var right_res = String(right_operand.applyRow(datarow, getter).getValue()).toLowerCase();
			return new exprs.BooleanExpr(left_res.indexOf(right_res) >= 0);	//_ConditionExpr
		}
	});
	var StartsWith = declare("dojox.grid.enhanced.plugins.filter.StartsWith", exprs._BiOpExpr, {
		// summary:
		//		A "starts with" condition expression.
		_name: "startsWith",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var left_res = String(left_operand.applyRow(datarow, getter).getValue()).toLowerCase();
			var right_res = String(right_operand.applyRow(datarow, getter).getValue()).toLowerCase();
			return new exprs.BooleanExpr(left_res.substring(0, right_res.length) == right_res);	//_ConditionExpr
		}
	});
	var EndsWith = declare("dojox.grid.enhanced.plugins.filter.EndsWith", exprs._BiOpExpr, {
		// summary:
		//		An "ends with" condition expression.
		_name: "endsWith",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var left_res = String(left_operand.applyRow(datarow, getter).getValue()).toLowerCase();
			var right_res = String(right_operand.applyRow(datarow, getter).getValue()).toLowerCase();
			return new exprs.BooleanExpr(left_res.substring(left_res.length - right_res.length) == right_res);	//_ConditionExpr
		}
	});
	var Matches = declare("dojox.grid.enhanced.plugins.filter.Matches", exprs._BiOpExpr, {
		// summary:
		//		A "regular expression match" condition expression.
		//		The second operand's value will be regarded as an regular expression string.
		_name: "matches",
		_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,
							/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var left_res = String(left_operand.applyRow(datarow, getter).getValue());
			var right_res = new RegExp(right_operand.applyRow(datarow, getter).getValue());
			return new exprs.BooleanExpr(left_res.search(right_res) >= 0);	//_ConditionExpr
		}
	});
	var IsEmpty = declare("dojox.grid.enhanced.plugins.filter.IsEmpty", exprs._UniOpExpr, {
		// summary:
		//		Check empty
		_name: "isEmpty",
		_calculate: function(/* _ConditionExpr */operand,/* data item*/datarow,/* function(row,colIdx) */getter){
			// summary:
			//		Override from _BiOpExpr
			var res = operand.applyRow(datarow, getter).getValue();
			return new exprs.BooleanExpr(res === "" || res == null);
		}
	});

	return lang.mixin({
		LogicAND: LogicAND,
		LogicOR: LogicOR,
		LogicXOR: LogicXOR,
		LogicNOT: LogicNOT,
		LogicALL: LogicALL,
		LogicANY: LogicANY,
		EqualTo: EqualTo,
		LessThan: LessThan,
		LessThanOrEqualTo: LessThanOrEqualTo,
		LargerThan: LargerThan,
		LargerThanOrEqualTo: LargerThanOrEqualTo,
		Contains: Contains,
		StartsWith: StartsWith,
		EndsWith: EndsWith,
		Matches: Matches,
		IsEmpty: IsEmpty
	}, exprs);
});
