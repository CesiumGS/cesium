// Hides doclets that exist only for the type checker, or that can't appear in
// the output, so tsd-jsdoc doesn't warn "Failed to find parent of doclet".

const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

function isThisMemberAssignment(node) {
  let target = node;
  if (node.type === "AssignmentExpression") {
    target = node.left;
  } else if (node.parent && node.parent.type === "AssignmentExpression") {
    target = node.parent.left;
  }

  return (
    target &&
    target.type === "MemberExpression" &&
    target.object &&
    target.object.type === "ThisExpression"
  );
}

/**
 * Returns true for doclets scoped function-local, otherwise false. Examples
 * include type annotations on local variables and inline casts. Constructor
 * members (`this.x = ...`) and comments that name their parent with `@memberof`,
 * `@name`, or `@alias` are kept.
 */
function isFunctionLocal(doclet) {
  const node = doclet.meta?.code?.node;
  if (!node || !node.enclosingScope) {
    return false;
  }

  if (!FUNCTION_TYPES.has(node.enclosingScope.type)) {
    return false;
  }

  if (/@(memberof|name|alias)\b/.test(doclet.comment || "")) {
    return false;
  }

  return !isThisMemberAssignment(node);
}

exports.handlers = {
  newDoclet: function (e) {
    const doclet = e.doclet;
    if (doclet.undocumented) {
      return;
    }

    if (isFunctionLocal(doclet)) {
      doclet.ignore = true;
      return;
    }

    // A comment on `export default ...` documents "module.exports", which has
    // no parent unless the file declares a @module.
    if (doclet.longname === "module.exports" && doclet.memberof === "module") {
      doclet.ignore = true;
    }
  },

  /**
   * Members of a @private parent are unreachable in the output; mark them
   * private too, so they're handled the same way as their parent. A longname
   * may be shared by several doclets, so a parent counts as hidden only if
   * none of them is visible.
   */
  processingComplete: function (e) {
    const isVisible = (d) => !d.ignore && d.access !== "private";

    const documentedDoclets = e.doclets.filter((d) => !d.undocumented);
    const existingLongnames = new Set(documentedDoclets.map((d) => d.longname));

    let changed = true;

    while (changed) {
      changed = false;

      const visibleLongnames = new Set(
        documentedDoclets.filter(isVisible).map((d) => d.longname),
      );

      for (const d of documentedDoclets) {
        if (
          isVisible(d) &&
          d.access === undefined &&
          d.memberof &&
          existingLongnames.has(d.memberof) &&
          !visibleLongnames.has(d.memberof)
        ) {
          d.access = "private";
          changed = true;
        }
      }
    }
  },
};
