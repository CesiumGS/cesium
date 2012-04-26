#!/bin/sh

DESTINATION=beautifier.js

echo '// ==UserScript==
// @name        Scripts beautifier for Opera
// @author      Rafal Chlodnicki
// @author      Einar Lielmanis
// @version     1.1
// @include     *
// ==/UserScript==

(function(){

  // Enabling this setting will beautify all scripts on page
  var enabled = /*@Beautify all scripts@bool@*/false/*@*/;

  /* Specially formated comment above is for use with Opera Unite UJS Manager
     https://unite.opera.com/application/401/ */

' > $DESTINATION
cat ../beautify.js >> $DESTINATION

echo '
  var toString = String.prototype.toString;

  // Set up tidy method on strings and functions
  // @returns beautified string representation
  var tidy =
    Function.prototype.tidy =
    String.prototype.tidy =
    function(){ return js_beautify( toString.call(this) ) };

  if (enabled)
  {
    opera.addEventListener("BeforeScript", function(ev) {
      ev.element.text = tidy.call(ev.element.text);
    }, false);
  }

})();
' >> $DESTINATION
