### collections.walk

> Functions to recursively walk collections which are trees.

Documentation should use [Journo](https://github.com/jashkenas/journo) formats and standards.

      _.walk = walk;
      postorder: function(obj, visitor, context)
      preorder: function(obj, visitor, context)
      walk(obj, visitor, null, context)
      map: function(obj, strategy, visitor, context)
      pluck: function(obj, propertyName)
      pluckRec: function(obj, propertyName)
      _.walk.collect = _.walk.map;

