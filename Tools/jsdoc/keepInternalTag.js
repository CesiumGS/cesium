// tsd-jsdoc writes only a doclet's description (or, for a class without one,
// its classdesc), examples, properties, params, and returns into the .d.ts
// comments. Append @internal to whichever of description and classdesc it
// writes, so the tag reaches the declarations.

exports.handlers = {
  newDoclet: function (e) {
    const doclet = e.doclet;
    if (!doclet.internal) {
      return;
    }

    if (!doclet.description && doclet.classdesc) {
      doclet.classdesc = `${doclet.classdesc}\n@internal`;
      return;
    }

    doclet.description = doclet.description
      ? `${doclet.description}\n@internal`
      : "@internal";
  },
};
