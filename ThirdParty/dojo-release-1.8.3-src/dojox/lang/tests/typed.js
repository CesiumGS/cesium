dojo.provide("dojox.lang.tests.typed");
dojo.config.typeCheckAllClasses = true;
dojo.require("dojox.lang.typed");
(function(){
	
	dojox.lang.typed(
		dojo.declare("dojox.lang.tests.TypedClass", null, {
			constructor: function(makeDefaults){
				if(makeDefaults){
					this.aString = "start";
					this.self = this;
				}
			},
			add: function(a, b){
				return a + b;
			},
			withCallback: function(callback, param){
				callback(param);
			}
	}));
	var TypedClass = dojox.lang.tests.TypedClass;
	TypedClass.properties = {
		aString:String,
		self: TypedClass,
		anInt: {type:"integer", maximum: 100, optional: true}
	};
	TypedClass.methods = {
		add: {
			parameters:[
				{type:"number"},
				{type:"number"}
			],
			returns: {type:"string"}
		},
		withCallback:{
			parameters:[
				{type:"function", parameters:[Number]}
			]
		}
	}
	var hasGetters = {}.__defineGetter__;
	if(!hasGetters){
		console.warn("This platform does not support getters, property type checking will not be tested");
	}
	function mustThrow(testFunc){
		try{
			testFunc();
		}catch(e){
			return;
		}
		throw new Error("No exception was thrown where an exception was required");
	}
	tests.register("dojox.lang.tests.typed", [
		function typedConstructor(){
			mustThrow(function(){
				typedInstance = new TypedClass();
			});
		},
		function typedProperties(t){
			typedInstance = new TypedClass(true);
			t.is(typedInstance.aString, "start");
			typedInstance.aString = "hi";
			if(hasGetters){
				mustThrow(function(){
					typedInstance.aString = 44;
				});
			}
			typedInstance.anInt = 22;
			if(hasGetters){
				mustThrow(function(){
					typedInstance.anInt = "hello";
				});
			}
			if(hasGetters){
				mustThrow(function(){
					typedInstance.anInt = 44.33;
				});
			}
			if(hasGetters){
				mustThrow(function(){
					typedInstance.anInt = 144;
				});
			}
			typedInstance.self = typedInstance;
			if(hasGetters){
				mustThrow(function(){
					typedInstance.self = {};
				});
			}
		},
		function typedMethods(){
			typedInstance = new TypedClass(true);
			mustThrow(function(){
				typedInstance.add("hi",33);
			});
			mustThrow(function(){
				typedInstance.add(22,33);
			});
			mustThrow(function(){
				typedInstance.withCallback(22,33);
			});
			mustThrow(function(){
				typedInstance.withCallback(function(){},"hi");
			});
			TypedClass.methods.add.returns.type = "number";
			typedInstance.add(22,33);
			typedInstance.withCallback(function(){},44);
			
		},
		function typedDeclares(){
			dojo.declare("dojox.lang.tests.AutoTypedClass", null, {
				constructor: function(){
					this.foo = "bar";
				},
				subtract: function(a, b){
					return a - b;
				}
			});
			var AutoTypedClass = dojox.lang.tests.AutoTypedClass;
			AutoTypedClass.properties = {
				foo:{type:"string"}
			};
			AutoTypedClass.methods = {
				subtract: {
					parameters:[
						{type:"number"},
						{type:"number"}
					]
				}
			};
			typedInstance = new AutoTypedClass(true);
			if(hasGetters){
				mustThrow(function(){
					typedInstance.foo = 33;
				});
			}
			typedInstance.foo = "baz";
			mustThrow(function(){
				typedInstance.subtract("hi",33);
			});
			typedInstance.subtract(22,33);
		}
	]);
})();
