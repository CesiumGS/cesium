// This is a copy of ThirdParty/CodeMirror-2.24/lib/util/javascript-hint.js
// that has been customized for Cesium.

(function () {
  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function arrayContains(arr, item) {
    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === item) {
          return true;
        }
      }
      return false;
    }
    return arr.indexOf(item) != -1;
  }

  function scriptHint(editor, keywords, getToken) {
    // Find the token at the cursor
    var cur = editor.getCursor(), token = getToken(editor, cur), tprop = token;
    // If it's not a 'word-style' token, ignore the token.
		if (!/^[\w$_]*$/.test(token.string)) {
      token = tprop = {start: cur.ch, end: cur.ch, string: "", state: token.state,
                       className: token.string == "." ? "property" : null};
    }
    // If it is a property, find out what it is a property of.
    while (tprop.className == "property") {
      tprop = getToken(editor, {line: cur.line, ch: tprop.start});
      if (tprop.string != ".") return;
      tprop = getToken(editor, {line: cur.line, ch: tprop.start});
      if (tprop.string == ')') {
        var level = 1;
        do {
          tprop = getToken(editor, {line: cur.line, ch: tprop.start});
          switch (tprop.string) {
          case ')': level++; break;
          case '(': level--; break;
          default: break;
          }
        } while (level > 0)
        tprop = getToken(editor, {line: cur.line, ch: tprop.start});
				if (tprop.className == 'variable')
					tprop.className = 'function';
				else return; // no clue
      }
      if (!context) var context = [];
      context.push(tprop);
    }
    return {list: getCompletions(token, context, keywords),
            from: {line: cur.line, ch: token.start},
            to: {line: cur.line, ch: token.end}};
  }

  var stringProps = ("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
                     "toUpperCase toLowerCase split concat match replace search").split(" ");
  var arrayProps = ("length concat join splice push pop shift unshift slice reverse sort indexOf " +
                    "lastIndexOf every some filter forEach map reduce reduceRight ").split(" ");
  var funcProps = "prototype apply call bind".split(" ");
  var javascriptKeywords = ("break case catch continue debugger default delete do else false finally for function " +
                  "if in instanceof new null return switch throw true try typeof var void while with").split(" ");
  var knownGlobals = "Cesium CesiumViewerWidget dojo dijit dojox".split(" ");

  CodeMirror.cesiumHint = function(editor) {
    return scriptHint(editor, javascriptKeywords,
      function (e, cur) {
        var tprop = e.getTokenAt(cur);
        if ((tprop.className === 'variable-2') && arrayContains(knownGlobals, tprop.string)) {
            tprop.className = 'variable';
        }
        return tprop;
      });
  };

  function getCompletions(token, context, keywords) {
    var found = [], start = token.string;
    function maybeAdd(str) {
      if (str.indexOf(start) == 0 && !arrayContains(found, str) && str[0] !== '_') found.push(str);
    }
    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(stringProps, maybeAdd);
      else if (obj instanceof Array) forEach(arrayProps, maybeAdd);
      else if (obj instanceof Function) { for (var name in obj.prototype) { maybeAdd(name); } forEach(funcProps, maybeAdd); }
      for (var name in obj) maybeAdd(name);
    }

    var win = CodeMirror.cesiumWindow || window;
    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;
      if (obj.className == "variable")
        base = win[obj.string];
      else if (obj.className == "string")
        base = "";
      else if (obj.className == "atom")
        base = 1;
      else if (obj.className == "function") {
        if (win.jQuery != null && (obj.string == '$' || obj.string == 'jQuery') &&
            (typeof win.jQuery == 'function'))
          base = win.jQuery();
        else if (win._ != null && (obj.string == '_') && (typeof win._ == 'function'))
          base = win._();
      }
      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    }
    else {
      // If not, just look in the window object and any local scope
      // (reading into JS mode internals to get at the local variables)
      for (var v = token.state.localVars; v; v = v.next) maybeAdd(v.name);
      gatherCompletions(win);
      forEach(keywords, maybeAdd);
    }
    return found.sort();
  }
})();
