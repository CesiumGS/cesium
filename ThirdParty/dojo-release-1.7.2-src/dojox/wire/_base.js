dojo.provide("dojox.wire._base");

dojox.wire._defaultWireClass = "dojox.wire.Wire";

dojox.wire._wireClasses = {
	"attribute": "dojox.wire.DataWire",
	"path": "dojox.wire.XmlWire",
	"children": "dojox.wire.CompositeWire",
	"columns": "dojox.wire.TableAdapter",
	"nodes": "dojox.wire.TreeAdapter",
	"segments": "dojox.wire.TextAdapter"
};

dojox.wire.register = function(/*Function||String*/wireClass, /*String*/key){
	//	summary:
	//		Register a Wire class
	//	desription:
	//		The specified Wire class or a class name is registered with
	//		a key property of arguments to create a Wire
	//	wireClass:
	//		A class or full qualified class name
	//	key:
	//		A key property of arguments to create a Wire
	if(!wireClass || !key){
		return; //undefined
	}
	if(dojox.wire._wireClasses[key]){ // key already in use
		return; //undefined
	}
	dojox.wire._wireClasses[key] = wireClass;
};

dojox.wire._getClass = function(/*String*/name){
	//	summary:
	//		Returns a class
	//	description:
	//		The class is loaded by dojo.require() and returned
	//		by dojo.getObject().
	//	name:
	//		A class name
	//	returns:
	//		A class
	dojo["require"](name); // use dojo["require"] instead of dojo.require to avoid a build problem
	return dojo.getObject(name); //Function
};

dojox.wire.create = function(/*Object*/args){
	//	summary:
	//		Create a Wire from arguments
	//	description:
	//		If 'args' specifies 'wireClass', it is used as a class or full
	//		qualified class name to create a Wire with 'args' as arguments.
	//		Otherwise, a Wire class is determined by other proeprties of 'args'
	//		checking if 'args' specifies a key property for a Wire class.
	//		If no key property found, the default Wire class is used.
	//	args:
	//		Arguments to create a Wire
	//	returns:
	//		A Wire
	if(!args){
		args = {};
	}
	var wireClass = args.wireClass;
	if(wireClass){
		if(dojo.isString(wireClass)){
			wireClass = dojox.wire._getClass(wireClass);
		}
	}else{
		for(var key in args){
			if(!args[key]){
				continue;
			}
			wireClass = dojox.wire._wireClasses[key];
			if(wireClass){
				if(dojo.isString(wireClass)){
					wireClass = dojox.wire._getClass(wireClass);
					dojox.wire._wireClasses[key] = wireClass;
				}
				break;
			}
		}
	}
	if(!wireClass){
		if(dojo.isString(dojox.wire._defaultWireClass)){
			dojox.wire._defaultWireClass = dojox.wire._getClass(dojox.wire._defaultWireClass);
		}
		wireClass = dojox.wire._defaultWireClass;
	}
	return new wireClass(args); //Object
};

dojox.wire.isWire = function(/*Object*/wire){
	//	summary:
	//		Check if an object is a Wire
	//	description:
	//		If the specified object is a Wire, true is returned.
	//		Otherwise, false is returned.
	//	wire:
	//		An object to check
	//	returns:
	//		True if the object is a Wire, otherwise false
	return (wire && wire._wireClass); //Boolean
};

dojox.wire.transfer = function(/*Wire||Object*/source, /*Wire||Object*/target, /*Object?*/defaultObject, /*Object?*/defaultTargetObject){
	//	summary:
	//		Transfer a source value to a target value
	//	description:
	//		If 'source' and/or 'target' are not Wires, Wires are created with
	//		them as arguments.
	//		A value is got through the source Wire and set through the target
	//		Wire.
	//		'defaultObject' is passed to Wires as a default root object.
	//		If 'defaultTargetObject' is specified, it is passed to the target
	//		Wire as a default root object, instead of 'defaultObject'.
	//	source:
	//		A Wire or arguments to create a Wire for a source value
	//	target:
	//		A Wire or arguments to create a Wire for a target value
	//	defaultObject:
	//	defaultTargetObject;
	//		Optional default root objects passed to Wires
	if(!source || !target){
		return; //undefined
	}
	if(!dojox.wire.isWire(source)){
		source = dojox.wire.create(source);
	}
	if(!dojox.wire.isWire(target)){
		target = dojox.wire.create(target);
	}

	var value = source.getValue(defaultObject);
	target.setValue(value, (defaultTargetObject || defaultObject));
};

dojox.wire.connect = function(/*Object*/trigger, /*Wire||Object*/source, /*Wire||Object*/target){
	//	summary:
	//		Transfer a source value to a target value on a trigger event or
	//		topic
	//	description:
	//		If 'trigger' specifies 'topic', the topic is subscribed to transer
	//		a value on the topic.
	//		Otherwise, the event specified to 'event' of 'trigger' is listened
	//		to transfer a value.
	//		On the specified event or topic, transfer() is called with
	//		'source', 'target' and the arguments of the event or topic (as
	//		default root objects).
	//	trigger:
	//		An event or topic to trigger a transfer
	//	source:
	//		A Wire or arguments to create a Wire for a source value
	//	target:
	//		A Wire or arguments to create a Wire for a target value
	//	returns:
	//		A connection handle for disconnect()
	if(!trigger || !source || !target){
		return; //undefined
	}

	var connection = {topic: trigger.topic};
	if(trigger.topic){
		connection.handle = dojo.subscribe(trigger.topic, function(){
			dojox.wire.transfer(source, target, arguments);
		});
	}else if(trigger.event){
		connection.handle = dojo.connect(trigger.scope, trigger.event, function(){
			dojox.wire.transfer(source, target, arguments);
		});
	}
	return connection; //Object
};

dojox.wire.disconnect = function(/*Object*/connection){
	//	summary:
	//		Remove a connection or subscription for transfer
	//	description:
	//		If 'handle' has 'topic', the topic is unsubscribed.
	//		Otherwise, the listener to an event is removed.
	//	connection:
	//		A connection handle returned by connect()
	if(!connection || !connection.handle){
		return; //undefined
	}

	if(connection.topic){
		dojo.unsubscribe(connection.handle);
	}else{
		dojo.disconnect(connection.handle);
	}
};
