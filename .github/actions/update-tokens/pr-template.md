# Description

It's time for the monthy update to the access tokens needed for accessing our sample data.

This PR updates

- The ion access Token
- The share keys for the itwins used in Sandcastle

Manual update will still be needed for the ArcGIS token

## Testing plan

- Check out this branch
- Run `npm start`
- Check that the globe and default imagery loads in Sandcastle (ion token)
- Check that the itwin related Sandcastles still load (itwin keys)

### CI Builds

There are [limitations](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token#using-the-github_token-in-a-workflow) with Github on running other PR workflows when the PR is created by the Bot account. The quickest way to generate and deploy a CI build is to **close and re-open the PR yourself**. This should kick off the normal CI workflows.
