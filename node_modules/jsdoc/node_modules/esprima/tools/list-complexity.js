var cr = require('complexity-report'),
    content = require('fs').readFileSync('esprima.js', 'utf-8'),
    opt = { logicalor: false, switchcase: false },
    list = [];

cr.run(content, opt).functions.forEach(function (entry) {
    var name = (entry.name === '<anonymous>') ? (':' + entry.line) : entry.name;
    list.push({ name: name, value: entry.complexity.cyclomatic });
});

list.sort(function (x, y) {
    return y.value - x.value;
});

console.log('Most cyclomatic-complex functions:');
list.slice(0, 6).forEach(function (entry) {
    console.log('  ', entry.name, entry.value);
});
