Adding a Plugin
----

There are two steps required to install a new plugin:

1. Create a JavaScript module to contain your plugin code.
2. Include the name of that module in the "plugins" array of `conf.json`.

For example, if your plugin source code was saved in the  "plugins/shout.js"
file, you would include it in conf.json like so:
    
    {
        "plugins": [
            "plugins/shout"
        ]
    }

Authoring JSDoc 3 Plugins
----

The plugin system for JSDoc 3 is pretty powerful and provides plugin authors
multiple methods, from high-level to low-level, of affecting document generation:

- Defining event handlers
- Defining tags
- Defining a parse tree node processor

### Event Handlers

At the highest level, a plugin may register handlers for specific named-events
that occur in the documentation generation process. JSDoc will pass the handler 
an event object containing pertinent information.  Your plugin module should 
export a _handlers_ object that contains your handler, like so:

    exports.handlers = {
        newDoclet: function(e) {
            //Do something when we see a new doclet
        }
    }

#### Event: fileBegin

This is triggered when the parser has started on a new file.  You might use this
to do any per-file initialization your plugin needs to do.  

The event object will contain the following properties:

- filename: the name of the file

#### Event: beforeParse

This is triggered before parsing has begun.  You can use this method to modify
the source code that will be parsed.  For instance, you might add some virtual
doclets so they get added to the documentation.

The event object will contain the following properties:

- filename: the name of the file
- source: the contents of the file

Below is an example that adds a virtual doclet for a function to the source so 
that it will get parsed and added to the documentation.  This might be done to 
document methods that will be present for end-user use, but might not be in the
source code being documented, like methods provided by a third-party superclass:

    exports.handlers = {
        beforeParse: function(e) {
            var extraDoc = ["",
                "/**",
                "Here's a description of this function",
                "@name superFunc",
                "@memberof ui.mywidget",
                "@function",
                "*/", ""];
            e.source += extraDoc.join("\n");
        }
    }

#### Event: jsDocCommentFound

This is fired whenever a jsdoc comment is found.  It may or may not be associated
with any code.  You might use this to modify the contents of a comment before it
is processed.

The event object will contain the following properties:

- filename: the name of the file
- comment: the text of the comment
- lineno: the line number the comment was found on

#### Event: symbolFound

This is fired when the parser comes across a symbol in the code it thinks is
important.  This usually means things that one might want to document --
variables, functions, object literals, object property definitions,
assignments, etc., but the symbols the parser finds can be modified by a plugin
(see "Node Visitors" below).

The event object will contain the following properties:

- filename: the name of the file
- comment: the comment associated with the symbol, if any
- id: the unique id of the symbol
- lineno: the line number the symbols was found on
- astnode: the node of the parse tree
- code: information about the code.  This usually contains "name", "type", and 
  "node" properties and might also have "value", "paramnames", or "funcscope"
   properties depending on the symbol.

#### Event: newDoclet

This is the highest level event and is fired when a new doclet has been created.
This means that a jsdoc or a symbol has been processed and the actual doclet
that will be passed to the template has been created.

The event object will contain the following properties:

- doclet: the new doclet that was created

The properties of the doclet can vary depending on the comment or symbol used to 
create it.  Additionally, tag definitions (See "Tag Definitions" below) can
modify the doclet.  Some common properties you're likely to see include:

- comment: the text of the comment (may be empty if symbol is undocumented)
- meta: some information about the doclet, like filename, line number, etc.
- description
- kind
- name
- longname: the fully qualified name, including memberof info
- memberof: the function/class/namespace that this is a member of
- scope: (global|static|instance|inner)
- undocumented: true if the symbol didn't have a jsdoc comment
- defaultvalue: the specified default value for a property/variable
- type: the specified type of parameter/property/function return (e.g. Boolean)
- params: an object containing the list of parameters to a function
- tags: an object containing the set of tags not handled by the parser (note:
  this is only available if ```allowUnknownTags``` is set to true in the conf.json
  file for JSDoc3) 

Below is an example of a newDoclet handler that shouts the descriptions:

    exports.handlers = {
        newDoclet: function(e) {
            // e.doclet will refer to the newly created doclet
            // you can read and modify properties of that doclet if you wish
            if (typeof e.doclet.description === 'string') {
                e.doclet.description = e.doclet.description.toUpperCase();
            }
        }
    };

#### Event: fileComplete

This is fired when the parser is done with a file.  You might use this to
perform some cleanup for your plugin.

The event object will contain the following properties:

- filename: the name of the file
- source: the contents of the file

### Tag Definitions

Adding tags to the tag dictionary is a mid-level way to affect documentation
generation.  Before a newDoclet event is triggered, jsdoc comment blocks are
parsed to determine the description and any jsdoc tags that may be present.  When
a tag is found, if it has been defined in the tag dictionary, it is given a 
chance to modify the doclet.

Plugins can define tags by exporting a _defineTags_ function.  That function will
be passed a dictionary that can be used to define tags, like so:

    exports.defineTags = function(dictionary) {
        //define tags here
    }
    
#### The Dictionary

The dictionary provides the following methods:

1.  defineTag(title, opts)
    Used to define tags.
    The first parameter is the name of the tag (e.g. "param" or "overview").  the
    second is an object containing options for the tag.  The options can be the 
    following:
  - mustHaveValue (Boolean): whether or not the tag must have a value
    (e.g "@name TheName")
  - mustNotHaveValue (Boolean): whether or not the tag must not have a value
  - canHaveType (Boolean): Whether or not the tag can have a type
    (e.g. "@param **{String}** name the description of name")
  - canHaveName (Boolean): Whether or not the tag can have a name
    (e.g. "@param {String} **name** the description of name")
  - isNamespace (Boolean): Whether or not the tag marks a doclet as representing
    a namespace. The "@module" tag, for instance, sets this to true.
  - onTagged (Function): A callback function executed when the tag is found. The
    function is passed two parameters: the doclet and the tag.  Here's an example:

            dictionary.defineTag('instance', {
                onTagged: function(doclet, tag) {
                    doclet.scope = "instance";  
                }
            });
    The defineTag method returns a Tag.  The Tag object has a method "synonym"
    that can be used to declare synonyms to the tag.  For example:

            dictionary.defineTag('exception', {
                <options for exception tag>
            })
            .synonym('throws');
2.  lookUp(title)
    Used to lookup a tag.  Returns either the tag or false if it's not defined
3.  isNamespace(kind)
    Used to determine if a particular doclet type represents a namespace
4.  normalise(title)
    Used to find the canonical name of a tag.  The name passed in might be that
    name or a synonym

### Node Visitors

At the lowest level, plugin authors can process each node in the parse tree by 
defining a node visitor that will visit each node, creating an opportunity to
do things like modify comments and trigger parser events for any arbitrary piece
of code.

Plugins can define a node visitor by exporting a ```nodeVisitor``` object that
contains a ```visitNode``` function, like so:

    exports.nodeVisitor = {
        visitNode: function(node, e, parser, currentSourceName) {
            //do all sorts of crazy things here
        }
    }

The function is called on each node with the following parameters:

- node: the node of the parse tree
- e: the event.  If the node is one that the parser handles, this will already
  be populated with the same things described in the _symbolFound_ event above.
  Otherwise, it will be an empty object on which to set various properties.
- parser: the parser
- currentSourceName: the name of the file being parsed

#### Making things happen

The primary reasons to implement a node visitor are to be able to document
things that aren't normally documented (like function calls that create classes)
or to auto generate documentation for code that isn't documented.  For instance,
a plugin might look for calls to a "_trigger" method since it knows that means
an event is fired and then generate documentation for the event.

To make things happen, the ```visitNode``` function should modify properties
of the event parameter. In general the goal is to construct a comment and then
get an event to fire.  After the parser lets all of the node visitors have a
look at the node, it looks to see if the event object has a ```comment```
property and an ```event``` property.  If it has both, the event named in the event
property is fired.  The event is usually "symbolFound" or "jsDocCommentFound",
but theoretically, a plugin could define its own events and handle them.

#### Example

Below is an example of what a plugin for documenting jQuery UI widgets might do.
jQuery UI uses a factory function call to create widget classes.  The plugin
looks for that function call and creates a symbol with documentation.  It also
looks for any "this._trigger" function calls and automatically creates
documentation for the events that are triggered:

    exports.nodeVisitor = {
        visitNode: function(node, e, parser, currentSourceName) {
            if (node.type === Token.OBJECTLIT && node.parent && node.parent.type === Token.CALL && isInWidgetFactory(node, 1)) {
                var widgetName = node.parent.arguments.get(0).toSource();
                e.id = 'astnode' + node.hashCode(); // the id of the object literal node
                e.comment = String(node.parent.jsDoc||'');
                e.lineno = node.parent.getLineno();
                e.filename = currentSourceName;
                e.astnode = node;
                e.code = {
                    name: "" + widgetName.substring(1, widgetName.length() - 1),
                    type: "class",
                    node: node
                };
                e.event = "symbolFound";
                e.finishers = [parser.addDocletRef];
                
                addCommentTag(e, "param", "{Object=} options A set of configuration options");
            } 
            else if(isTriggerCall(node)) {
                var nameNode = node.arguments.get(0);
                    eventName = String((nameNode.type == Token.STRING) ? nameNode.value : nameNode.toSource()),
                    func = {},
                    comment = "@event\n",
                    eventKey = "";
                
                if (node.enclosingFunction) {
                    func.id = 'astnode'+node.enclosingFunction.hashCode();
                    func.doclet = parser.refs[func.id];
                }
                if(func.doclet) {
                    func.doclet.addTag("fires", eventName);
                    if (func.doclet.memberof) {
                        eventKey = func.doclet.memberof + "#event:" + eventName;
                        comment += "@name " + func.doclet.memberof + "#" + eventName;
                    }
                }
                e.comment = comment;
                e.lineno = node.getLineno();
                e.filename = currentSourceName;
                e.event = "jsdocCommentFound";                
            }
        }
    };
    function isTriggerCall(node) {
        if(node.type != Token.CALL) { return false; }
        var target = node.getTarget(),
            left = target && target.left && String(target.left.toSource()),
            right = target && target.right && String(target.right.toSource());
        return (left === "this" && right === "_trigger");
    }
    
    function isInWidgetFactory(node, depth) {
        var parent = node.parent,
            d = 0;
        while(parent && (!depth || d < depth)) {
            if (parent.type === Token.CALL) {
                var target = parent.getTarget(),
                    left = target && target.left && String(target.left.toSource()),
                    right = target && target.right && String(target.right.toSource());
                return ((left === "$" || left === "jQuery") && right === "widget");
            } else {
                parent = parent.parent;
                d++;
            }
        }
        return false;
    }

You'll notice a "finishers" property set.  The finishers property should contain
an array of functions to be called after the event is fired and all the handlers
have processed it.  The parser provides an ```addDocletRef``` function that adds the
doclet to the map (keyed off of the id property) of doclets it knows about.

Lastly, the visitors are executed in the order the plugins are listed in the
conf.json file.  A plugin can stop later plugins from visiting a node by
setting a ```stopPropagation``` property on the event object (e.stopPropagation = true).
A plugin can stop the event from firing setting a ```preventDefault``` property.

Packaging JSDoc 3 Plugins
----

The JSDoc 3 Jakefile has an ```install``` task that can be used to install a plugin
into the jsdoc 3 installation.  So running the following will install the plugin:

    $>jake install[path/to/YourPluginFolder]

_note: on some systems (like MacOS X), you may need to quote the target name and parameters_:

    $>jake 'install[path/to/YourPluginFolder]'

The task is passed a directory that should look something like the following:

    YourPluginFolder
     |- plugins
     |   |- YourPlugin.js
     |   \- test
     |       |- fixtures
     |       |   \- YourFixtures.js
     |       \- specs
     |           \- YourTests.js
     \- templates
         \- YourTemplate
             \- publish.js

Basically everything is copied over into the jsdoc installation directory, the
directory should contain anything you want to put there.