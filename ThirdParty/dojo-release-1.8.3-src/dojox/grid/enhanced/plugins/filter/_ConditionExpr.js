define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array"
], function(declare, lang, array){
	
var _ConditionExpr = declare("dojox.grid.enhanced.plugins.filter._ConditionExpr", null, {
	// summary:
	//		The most abstract class for all condition expressions.
	//		A condition expression can be applied on a data row (e.g. an item in a store)
	//		and generate a result condition expression.
	// tags:
	//		abstract
	
	_name: "expr",

	applyRow: function(/* data item */datarow,/* function(row,colArg) */getter){
		// summary:
		//		*Unimplemented Interface*
		//		Apply this condition expression on the given datarow, return a result expression.
		// taqs:
		//		public extension
		// datarow: object
		//		A data item of a store.
		// getter: function(datarow, colArg)
		//		A user defined function that extract cell data from *datarow*.
		//		*colArg* is an argument that provides a kind of column information.
		//		It is defined by user in the constructor of a _DataExpr object.
		// returns:
		//		MUST return a _ConditionExpr object
		throw new Error("_ConditionExpr.applyRow: unimplemented interface");
	},

	toObject: function(){
		// summary:
		//		Convert this data expression to a simple object. Mainly used for serialization.
		// tags:
		//		public extension
		// returns:
		//		An object for serialization.
		return {};	//Object
	},

	getName: function(){
		// summary:
		//		Get the name of this kind of expression.
		// tags:
		//		public extension
		// returns:
		//		the name of this kind of expression
		return this._name;	//String
	}
});

var _DataExpr = declare("dojox.grid.enhanced.plugins.filter._DataExpr", _ConditionExpr, {
	// summary:
	//		The most abstract class for all data expressions.
	//		A _DataExpr is a condition expression for a single data value.
	//		If the data value to be represent is a pure value (literal value, like string/number/Date/...)
	//		this _DataExpr is nothing more than a simple wrapper.
	//		If the data value to be represent is in a store, then _DataExpr is responsible to extract it
	//		from the store when this condition is applied to a data row.
	// _value: [private] anything
	// _colArg: [private] anything
	_name: "data",

	constructor: function(/* anything */dataValue,/* bool */isColumn, /* object */convertArgs){
		// summary:
		//		If a _DataExpr is constructed with only one argument, this argument is regarded as a pure value.
		//		If the second argument is exactly a boolean true (no implict type transformation,
		//		so as to allow derived classes accept more arguments while retain *isColumn* to be optional),
		//		then this _DataExpr represents a column, and it's applyRow method is not a no-op.
		// dataValue: anything
		//		If *isColumn* is a boolean true, then it should be a kind of column information, like field name
		//		or column index. Otherwise, it is regarded as a pure value, and the getValue method will simply
		//		return it.
		// isColumn: boolean?
		//		Optional. To specify whether this _DataExpr represents a column or a pure value.
		this._convertArgs = convertArgs || {};
		if(lang.isFunction(this._convertArgs.convert)){
			this._convertData = lang.hitch(this._convertArgs.scope, this._convertArgs.convert);
		}
		if(isColumn){
			this._colArg = dataValue;
		}else{
			this._value = this._convertData(dataValue, this._convertArgs);
		}
	},

	getValue: function(){
		// summary:
		//		If this is a pure value wrapper, simply return the value.
		//		Otherwise (it's a column), return is undefined.
		// tags:
		//		public
		// returns:
		//		the value of this data expression.
		return this._value;	//String
	},

	applyRow: function(/* data item */datarow,/* function(row,colIdx) */getter){
		// summary:
		//		Implement _ConditionExpr.applyRow.
		//		If this is a pure value, simply return self.
		//		Otherwise, extract the cell data from datarow using the given getter function,
		//		and then convert this cell data to a _DataExpr and return the expression.
		return typeof this._colArg == "undefined" ? this :			//_ConditionExpr
			new (lang.getObject(this.declaredClass))(
				this._convertData(getter(datarow, this._colArg), this._convertArgs)
			);
	},

	_convertData: function(/* anything */dataValue){
		// tags:
		//		protected extension
		// dataValue: anything
		//		This argument should come from a store.
		return dataValue;
	},

	toObject: function(){
		// summary:
		//		Overrided from _ConditionExpr.toObject
		return {															//String
			op: this.getName(),
			data: this._colArg === undefined ? this._value : this._colArg,
			isCol: this._colArg !== undefined
		};
	}
});

var _OperatorExpr = declare("dojox.grid.enhanced.plugins.filter._OperatorExpr", _ConditionExpr, {
	// summary:
	//		The most abstract class for all operator expressions.
	//		An operator expression is a _ConditionExpr that represents an operation.
	_name: "operator",

	constructor: function(/* Array|operand1,operand2,... */){
		// summary:
		//		The arguments are operands (or an array of operands, if the first argument
		//		is an Array) of this operator, ordering from left to right.
		//		Every operand should be a _ConditionExpr.
		if(lang.isArray(arguments[0])){
			this._operands = arguments[0];
		}else{
			this._operands = [];
			for(var i = 0; i < arguments.length; ++i){
				this._operands.push(arguments[i]);
			}
		}
	},
	toObject: function(){
		// summary:
		//		Overrided from _ConditionExpr.toObject
		return {											//Object
			op: this.getName(),
			data: array.map(this._operands,function(operand){
				return operand.toObject();
			})
		};
	}
});

var _UniOpExpr = declare("dojox.grid.enhanced.plugins.filter._UniOpExpr", _OperatorExpr, {
	// summary:
	//		The most abstract class for all uni-operator expressions.
	//		A uni-operator expression is an _OperatorExpr that only allow one operand.
	_name: "uniOperator",

	applyRow: function(/* data item */datarow,/* function(row,colArg) */getter){
		// summary:
		//		Implement _ConditionExpr.applyRow.
		//		Apply the restriction of "only one operand" and confirm the operand is a valid _ConditionExpr.
		//		Then do the calculation of this operator.
		if(!(this._operands[0] instanceof _ConditionExpr)){
			throw new Error("_UniOpExpr: operand is not expression.");
		}
		return this._calculate(this._operands[0],datarow,getter);	//_ConditionExpr
	},

	_calculate: function(/* _ConditionExpr */operand,/* data item*/datarow,/* function(row,colArg) */getter){
		// summary:
		//		*Unimplemented Interface*
		//		Do the actrual work of applyRow here.
		// tags:
		//		protected extension
		// operand: _ConditionExpr
		// datarow: object
		// getter: function(row,colArg)
		// returns:
		//		MUST return a _ConditionExpr object.
		throw new Error("_UniOpExpr._calculate: unimplemented interface");
	}
});

var _BiOpExpr = declare("dojox.grid.enhanced.plugins.filter._BiOpExpr", _OperatorExpr, {
	// summary:
	//		The most abstract class for all bi-operator expressions.
	//		A bi-operator expression is an _OperatorExpr that allow and only allow two operands.
	_name: "biOperator",

	applyRow: function(/* data item */datarow,/* function(row,colArg) */getter){
		// summary:
		//		Implement _ConditionExpr.applyRow.
		//		Apply the restriction of "two operands" and confirm operands are valid _ConditionExpr's.
		if(!(this._operands[0] instanceof _ConditionExpr)){
			throw new Error("_BiOpExpr: left operand is not expression.");
		}else if(!(this._operands[1] instanceof _ConditionExpr)){
			throw new Error("_BiOpExpr: right operand is not expression.");
		}
		return this._calculate(this._operands[0],this._operands[1],datarow,getter);
	},

	_calculate: function(/* _ConditionExpr */left_operand,/* _ConditionExpr */right_operand,/* data item*/datarow,/* function(row,colArg) */getter){
		// summary:
		//		*Unimplemented Interface*
		//		Do the actrual work of applyRow here.
		// tags:
		//		protected extension
		// left_operand: _ConditionExpr
		// right_operand: _ConditionExpr
		// datarow: object
		// getter: function(row,colArg)
		// returns:
		//		MUST return a _ConditionExpr object.
		throw new Error("_BiOpExpr._calculate: unimplemented interface");
	}
});

return {
	_ConditionExpr: _ConditionExpr,
	_DataExpr: _DataExpr,
	_OperatorExpr: _OperatorExpr,
	_UniOpExpr: _UniOpExpr,
	_BiOpExpr: _BiOpExpr
};

});
