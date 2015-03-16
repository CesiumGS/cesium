Pull Requests
-------------

If you're thinking about making some changes, maybe fixing a bug, or adding a
snazzy new feature, first, thank you.  Contributions are very welcome.  Things
need to be manageable for the maintainers, however. So below you'll find  **The
fastest way to get your pull request merged in.**  Some things, particularly how
you set up your branches and work with git, are just suggestions, but pretty good
ones.

1. **Create a remote to track the base jsdoc3/jsdoc repository**
   This is just a convenience to make it easier to update your ```<tracking branch>```
   (more on that shortly).  You would execute something like:

        git remote add base git://github.com/jsdoc3/jsdoc.git

   Here 'base' is the name of the remote.  Feel free to use whatever you want.

2. **Set up a tracking branch for the base repository**
   We're gonna call this your ```<tracking branch>```.  You will only ever update
   this branch by pulling from the 'base' remote. (as opposed to 'origin')

        git branch --track pullpost base/master
        git checkout pullpost

   Here 'pullpost' is the name of the branch.  Fell free to use whatever you want.

3. **Create your change branch**
   Once you are in ```<tracking branch>```, make sure it's up to date, then create
   a branch for your changes off of that one.

        git branch fix-for-issue-395
        git checkout fix-for-issue-395

   Here 'fix-for-issue-395' is the name of the branch.  Feel free to use whatever
   you want.  We'll call this the ```<change branch>```.  This is the branch that
   you will eventually issue your pull request from.

   The purpose of these first three steps is to make sure that your merge request
   has a nice clean diff that only involves the changes related to your fix/feature.

4. **Make your changes**
   On your ```<change branch>``` make any changes relevant to your fix/feature.  Don't
   group fixes for multiple unrelated issues or multiple unrelated features together.
   Create a separate branch for each unrelated changeset.  For instance, if you're
   fixing a bug in the parser and adding some new UI to the default template, those
   should be separate branches and merge requests.

5. **Add tests**
   Add tests for your change.  If you are submitting a bugfix, include a test that
   verifies the existence of the bug along with your fix.  If you are submitting
   a new feature, include tests that verify proper feature function, if applicable.
   See the readme in the 'test' directory for more information

6. **Commit and publish**
   Commit your changes and publish your branch (or push it if it's already published)

7. **Issue your pull request**
   On github.com, switch to your ```<change branch>``` and click the 'Pull Request'
   button.  Enter some meaningful information about the pull request.  If it's a bugfix,
   that doesn't already have an issue associated with it, provide some info on what
   situations that bug occurs in and a sense of it's severity.  If it does already have
   an issue, make sure the include the hash and issue number (e.g. '#100') so github
   links it.

   If it's a feature, provide some context about the motivations behind the feature,
   why it's important/useful/cool/necessary and what it does/how it works.  Don't
   worry about being too verbose. Folks will be much more amenable to reading through
   your code if they know what its supposed to be about.
