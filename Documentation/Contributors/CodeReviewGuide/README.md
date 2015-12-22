# Code Review Guide

All code in Cesium is publicly peer reviewed.  We review code to share knowledge, foster shared ownership, and improve code quality and consistency.  Just knowing that code will be reviewed improves its quality.

This guide describes best practices for code reviews.

* [General](#general)
* [Reviewing](#reviewing)
* [Changes to the Public Cesium API](#changes-to-the-public-cesium-api)
* [Testing](#testing)
* [Merging](#merging)
* [Resources](#resources)

## General

* GitHub has great tools for code reviews in pull requests.  Become familiar with [them](https://help.github.com/articles/using-pull-requests/#reviewing-proposed-changes).
* If we don't have a CLA for the contributor who opened the pull request (or, more precisely, any contributor to the branch), politely ask for one before reviewing the pull request ([example](https://github.com/AnalyticalGraphicsInc/cesium/pull/2918#issuecomment-127805425)).
* Most pull requests require additional work, often minor but sometimes major, before being merged.  It's not a big deal.  Sometimes we open a pull request with a [task list](https://github.com/blog/1375%0A-task-lists-in-gfm-issues-pulls-comments) for early feedback.
* Anyone is encouraged to review any pull request that interests them.  However, someone familiar with the changed code should ultimately merge it.

## Reviewing

* See the forest through the trees.  Don't just review code one line at a time.  Consider the big picture and its implications.
* _Comments are about code_, not the contributor who wrote the code.  Don't be offended by a reviewer's comments and don't aim to offend when commenting.  We all want the same thing: to improve Cesium.
* Provide motivation when it isn't obvious.  Suggest why a change should be made.
* Point contributors to a relevant part of the [Coding Guide](../CodingGuide/README.md) when useful.
* _Be concise_.  Make every word tell.
* _Be responsive_.  The contributor should expect prompt feedback from reviewers, and reviewers should expect the same.  If not, politely ask for it.  We all want pull requests to get into master.
* _Limit the scope_.  As a reviewer, it is easy to want to increase the scope, e.g., "why don't we do this everywhere?".  These are often fair questions but can be better served by submitting a separate issue to allow more incremental pull requests.
* Bring others into the conversation sparingly.  If someone has expertise with a particular language feature or problem domain under review, invite them to comment.
* If an experienced contributor makes a occasional whitespace or trivial mistake, just fix it to save on noise and speedup the review.

## Changes to the Public Cesium API

* If new identifiers were added to the public Cesium API:
   * Verify there is new reference doc.  See the [Documentation Guide](../CodingGuide/README.md).
   * Verify that [CHANGES.md](../../../CHANGES.md) was updated.
   * Does the change warrant a new Sandcastle example?
   * Does it warrant a blog post or tweet so users know what to look forward to in the next release?
* Verify that deprecated and breaking changes to the public API were handled correctly.  See the [Deprecation Guide](../DeprecationGuide/README.md).

## Testing

* Don't just review the code; test it by running the unit tests and relevant Sandcastle examples.  See the [Testing Guide](../TestingGuide/README.md).
* For some changes, it is useful to profile Cesium or step through the code in the debugger.
* Read the new reference doc.  Build the reference doc if the changes are significant.

## Merging

* Cesium uses Travis CI for continuous integration.  Travis automatically builds Cesium, runs JSHint, and generates the documentation for each branch pushed to GitHub.  Before merging a pull request, verify that all Travis checks pass, indicated by the green check-mark and green `Merge pull request` button:

![](Travis.jpg)

* Delete the branch after merging the pull request.
* Verify that the corresponding issue (if any) was closed.

## Resources

* [Practice Conspicuous Code Review](http://producingoss.com/en/producingoss.html#code-review) in [Producing Open Source Software](http://producingoss.com/).
