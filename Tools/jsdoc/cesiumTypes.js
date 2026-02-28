const SYNTAX_REGEXP = /\{\s*(typeof|asserts)\s+([^\s]+)\s*\}/g;
const TOKEN = "{any}";

const dim = (str) => `\x1b[2m${str}\x1b[0m`;
const red = (str) => `\x1b[31m${str}\x1b[0m`;

// Handles certain type syntax that TypeScript supports but JSDoc does not,
// temporarily replacing them with a special token, and then checking that
// this token is not emitted to public documentation or .d.ts files.
//
// Makes syntax like 'typeof' safe for inline type assertions, while enforcing
// that all public/documented APIs still use JSCompatible types.
//
// References:
// - https://github.com/jsdoc/jsdoc/issues/1349
// - https://github.com/cancerberoSgx/jsdoc-typeof-plugin
exports.handlers = {
  jsdocCommentFound: (e) => {
    if (e.comment && e.comment.match(SYNTAX_REGEXP)) {
      e.comment = e.comment.replace(SYNTAX_REGEXP, TOKEN);
    }
  },
  newDoclet: (e) => {
    const { ignore, comment, meta } = e.doclet;
    if (!ignore && comment.includes(TOKEN)) {
      const { filename, lineno } = meta;
      console.error(`Error: Invalid public JSDoc, "${filename}#L${lineno}".\n`);
      console.error(comment.split(TOKEN).map(dim).join(red(TOKEN)));
      process.exit(2);
    }
  },
};
