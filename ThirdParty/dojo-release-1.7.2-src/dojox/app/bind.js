define(["dojo/_base/kernel", "dojo/query" , "dojo/_base/array", "dijit", "dojo/_base/json"], function(dojo, query, array, dijit, djson){
    return function(/*Array of widgets*/widgets, /*Object*/ models){
        array.forEach(widgets, function(item){
            //TODO need to find a better way to get all bindable widgets
            var bindWidgets = query("div[dojoType^=\"dojox.mvc\"],div[data-dojo-type^=\"dojox.mvc\"]", item.domNode);
            //set ref for each dojox.mvc widgets.
            array.forEach(bindWidgets, function(widget){
                //TODO need to find a better way to know which model the widget is bound to
                //currently, the ref attribute in dojox.mvc.Group cannot be empty, leave
                //explicit string with single quote in ref attribute.
                var ref = widget.getAttribute("ref");
                
                if(ref === null){
                    var refProps = widget.getAttribute("data-dojo-props");
                    if(refProps){
                        try{
                            refProps = djson.fromJson("{" + refProps + "}");
                        }catch(e){
                            // give the user a pointer to their invalid parameters. FIXME: can we kill this in production?
                            throw new Error(e.toString() + " in data-dojo-props='" + extra + "'");
                        }
                        ref = refProps.ref.replace(/^\s*rel\s*:\s*/, "");
                    }
                }
                
                if (ref) {
                    if(ref[0] === "'"){
                        ref = ref.substring(1, ref.length-1);
                    }
                    var model = dojo.getObject(ref, false, models);
                    if (model){
                        dijit.byNode(widget).set("ref", model);
                    }                    
                }
            }, this);
        }, this);
        
    }
});
