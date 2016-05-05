/*global require,importScripts,self*/
"use strict";

var DIR = '/Workers/';
var reqWithContext = require.context('../', false, /.*\.js/);

self.onmessage = function(event) {
    var data = event.data;
    var worker = reqWithContext('./' + data.workerModule.substring(data.workerModule.lastIndexOf(DIR) + DIR.length) + '.js');
    self.onmessage = worker;
};
