var yargs = require('yargs');

var argv = yargs.usage('This is my awesome program', {
  'about': {
    description: 'Provide some details about the author of this program',
    required: true,
    short: 'a',
  },
  'info': {
    description: 'Provide some information about the node.js agains!!!!!!',
    boolean: true,
    short: 'i'
  }
}).argv;

yargs.showHelp();

console.log('\n\nInspecting options');
console.dir(argv);
