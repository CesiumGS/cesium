define([
	"dojo/_base/connect", // connect.connect
	"dojo/_base/declare", // declare
	"dojo/_base/lang", // lang.mixin, lang.hitch
	"../Destroyable",
	"../form/Button"
], function(connect, declare, lang, Destroyable, Button){

	// module:
	//		dijit/_editor/_Plugin

	var _Plugin = declare("dijit._editor._Plugin", Destroyable, {
		// summary:
		//		Base class for a "plugin" to the editor, which is usually
		//		a single button on the Toolbar and some associated code

		constructor: function(args){
			// summary:
			//		Create the plugin.
			// args: Object?
			//		Initial settings for any of the attributes.

			this.params = args || {};
			lang.mixin(this, this.params);
			this._attrPairNames = {};
		},

		// editor: [const] dijit.Editor
		//		Points to the parent editor
		editor: null,

		// iconClassPrefix: [const] String
		//		The CSS class name for the button node is formed from `iconClassPrefix` and `command`
		iconClassPrefix: "dijitEditorIcon",

		// button: dijit/_WidgetBase?
		//		Pointer to `dijit/form/Button` or other widget (ex: `dijit/form/FilteringSelect`)
		//		that is added to the toolbar to control this plugin.
		//		If not specified, will be created on initialization according to `buttonClass`
		button: null,

		// command: String
		//		String like "insertUnorderedList", "outdent", "justifyCenter", etc. that represents an editor command.
		//		Passed to editor.execCommand() if `useDefaultCommand` is true.
		command: "",

		// useDefaultCommand: Boolean
		//		If true, this plugin executes by calling Editor.execCommand() with the argument specified in `command`.
		useDefaultCommand: true,

		// buttonClass: Widget Class
		//		Class of widget (ex: dijit.form.Button or dijit/form/FilteringSelect)
		//		that is added to the toolbar to control this plugin.
		//		This is used to instantiate the button, unless `button` itself is specified directly.
		buttonClass: Button,

		// disabled: Boolean
		//		Flag to indicate if this plugin has been disabled and should do nothing
		//		helps control button state, among other things.  Set via the setter api.
		disabled: false,

		getLabel: function(/*String*/key){
			// summary:
			//		Returns the label to use for the button
			// tags:
			//		private
			return this.editor.commands[key];		// String
		},

		_initButton: function(){
			// summary:
			//		Initialize the button or other widget that will control this plugin.
			//		This code only works for plugins controlling built-in commands in the editor.
			// tags:
			//		protected extension
			if(this.command.length){
				var label = this.getLabel(this.command),
					editor = this.editor,
					className = this.iconClassPrefix + " " + this.iconClassPrefix + this.command.charAt(0).toUpperCase() + this.command.substr(1);
				if(!this.button){
					var props = lang.mixin({
						label: label,
						ownerDocument: editor.ownerDocument,
						dir: editor.dir,
						lang: editor.lang,
						showLabel: false,
						iconClass: className,
						dropDown: this.dropDown,
						tabIndex: "-1"
					}, this.params || {});

					// Avoid creating Button with a name like "dijit/editor/_plugins/ToggleDir", since that name becomes
					// a global object, and then if the ToggleDir plugin is referenced again, _Plugin.js will
					// find the <input> rather than the ToggleDir module.
					// Not necessary in 2.0 once the getObject() call is removed from _Plugin.js.
					delete props.name;

					this.button = new this.buttonClass(props);
				}
			}
			if(this.get("disabled") && this.button){
				this.button.set("disabled", this.get("disabled"));
			}
		},

		destroy: function(){
			if(this.dropDown){
				this.dropDown.destroyRecursive();
			}

			this.inherited(arguments);
		},

		connect: function(o, f, tf){
			// summary:
			//		Deprecated.  Use this.own() with dojo/on or dojo/aspect.instead.
			//
			//		Make a connect.connect() that is automatically disconnected when this plugin is destroyed.
			//		Similar to `dijit/_Widget.connect()`.
			// tags:
			//		protected deprecated

			this.own(connect.connect(o, f, this, tf));
		},

		updateState: function(){
			// summary:
			//		Change state of the plugin to respond to events in the editor.
			// description:
			//		This is called on meaningful events in the editor, such as change of selection
			//		or caret position (but not simple typing of alphanumeric keys).   It gives the
			//		plugin a chance to update the CSS of its button.
			//
			//		For example, the "bold" plugin will highlight/unhighlight the bold button depending on whether the
			//		characters next to the caret are bold or not.
			//
			//		Only makes sense when `useDefaultCommand` is true, as it calls Editor.queryCommandEnabled(`command`).
			var e = this.editor,
				c = this.command,
				checked, enabled;
			if(!e || !e.isLoaded || !c.length){
				return;
			}
			var disabled = this.get("disabled");
			if(this.button){
				try{
					enabled = !disabled && e.queryCommandEnabled(c);
					if(this.enabled !== enabled){
						this.enabled = enabled;
						this.button.set('disabled', !enabled);
					}
					if(enabled){
						if(typeof this.button.checked == 'boolean'){
							checked = e.queryCommandState(c);
							if(this.checked !== checked){
								this.checked = checked;
								this.button.set('checked', e.queryCommandState(c));
							}
						}
					}
				}catch(e){
					console.log(e); // FIXME: we shouldn't have debug statements in our code.  Log as an error?
				}
			}
		},

		setEditor: function(/*dijit/Editor*/ editor){
			// summary:
			//		Tell the plugin which Editor it is associated with.

			// TODO: refactor code to just pass editor to constructor.

			// FIXME: detach from previous editor!!
			this.editor = editor;

			// FIXME: prevent creating this if we don't need to (i.e., editor can't handle our command)
			this._initButton();

			// Processing for buttons that execute by calling editor.execCommand()
			if(this.button && this.useDefaultCommand){
				if(this.editor.queryCommandAvailable(this.command)){
					this.own(this.button.on("click",
						lang.hitch(this.editor, "execCommand", this.command, this.commandArg)
					));
				}else{
					// hide button because editor doesn't support command (due to browser limitations)
					this.button.domNode.style.display = "none";
				}
			}

			this.own(this.editor.on("NormalizedDisplayChanged", lang.hitch(this, "updateState")));
		},

		setToolbar: function(/*dijit/Toolbar*/ toolbar){
			// summary:
			//		Tell the plugin to add it's controller widget (often a button)
			//		to the toolbar.  Does nothing if there is no controller widget.

			// TODO: refactor code to just pass toolbar to constructor.

			if(this.button){
				toolbar.addChild(this.button);
			}
			// console.debug("adding", this.button, "to:", toolbar);
		},

		set: function(/* attribute */ name, /* anything */ value){
			// summary:
			//		Set a property on a plugin
			// name:
			//		The property to set.
			// value:
			//		The value to set in the property.
			// description:
			//		Sets named properties on a plugin which may potentially be handled by a
			//		setter in the plugin.
			//		For example, if the plugin has a properties "foo"
			//		and "bar" and a method named "_setFooAttr", calling:
			//	|	plugin.set("foo", "Howdy!");
			//		would be equivalent to writing:
			//	|	plugin._setFooAttr("Howdy!");
			//		and:
			//	|	plugin.set("bar", 3);
			//		would be equivalent to writing:
			//	|	plugin.bar = 3;
			//
			//		set() may also be called with a hash of name/value pairs, ex:
			//	|	plugin.set({
			//	|		foo: "Howdy",
			//	|		bar: 3
			//	|	})
			//		This is equivalent to calling set(foo, "Howdy") and set(bar, 3)
			if(typeof name === "object"){
				for(var x in name){
					this.set(x, name[x]);
				}
				return this;
			}
			var names = this._getAttrNames(name);
			if(this[names.s]){
				// use the explicit setter
				var result = this[names.s].apply(this, Array.prototype.slice.call(arguments, 1));
			}else{
				this._set(name, value);
			}
			return result || this;
		},

		get: function(name){
			// summary:
			//		Get a property from a plugin.
			// name:
			//		The property to get.
			// description:
			//		Get a named property from a plugin. The property may
			//		potentially be retrieved via a getter method. If no getter is defined, this
			//		just retrieves the object's property.
			//		For example, if the plugin has a properties "foo"
			//		and "bar" and a method named "_getFooAttr", calling:
			//	|	plugin.get("foo");
			//		would be equivalent to writing:
			//	|	plugin._getFooAttr();
			//		and:
			//	|	plugin.get("bar");
			//		would be equivalent to writing:
			//	|	plugin.bar;
			var names = this._getAttrNames(name);
			return this[names.g] ? this[names.g]() : this[name];
		},

		_setDisabledAttr: function(disabled){
			// summary:
			//		Function to set the plugin state and call updateState to make sure the
			//		button is updated appropriately.
			this._set("disabled", disabled);
			this.updateState();
		},

		_getAttrNames: function(name){
			// summary:
			//		Helper function for get() and set().
			//		Caches attribute name values so we don't do the string ops every time.
			// tags:
			//		private

			var apn = this._attrPairNames;
			if(apn[name]){
				return apn[name];
			}
			var uc = name.charAt(0).toUpperCase() + name.substr(1);
			return (apn[name] = {
				s: "_set" + uc + "Attr",
				g: "_get" + uc + "Attr"
			});
		},

		_set: function(/*String*/ name, /*anything*/ value){
			// summary:
			//		Helper function to set new value for specified attribute
			this[name] = value;
		}
	});

	// Hash mapping plugin name to factory, used for registering plugins
	_Plugin.registry = {};

	return _Plugin;
});
