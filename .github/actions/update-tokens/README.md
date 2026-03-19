# Update tokensin CI

The purpose of this "sub-project" is to automate our update of access tokens and keys that we include with the release and deployment of CesiumJS and Sandcastle.

Our general policy for access tokens and keys is that **they should work for two releases of CesiumJS**, ie 2 months.

The main work happens in `index.js` and the list of "replacements" is defined in `replacements.js`. If you want to add new replacements they should go in `replacements.js`. Each replacement relies on the file path containing the token, an [esquery "js selector"](https://estools.github.io/esquery/) (see [AST Explorer](https://astexplorer.net/) for help) and a value or function to define the new value.

The main update logic is scheduled to happen in CI with the [`update-tokens`](../../workflows/update-tokens.yml) workflow. This lets us define the necessary access secrets in Github's settings.

Access tokens in ion do not automatically expire like share keys do in the itwin platform. To account for this we have a separate `ionTokenDeleter.js` script to handle deleting tokens. This is meant to run in the [`prod`](../../workflows/prod.yml) workflow _after_ the normal release process is done.

## Running locally

The scripts rely on a few environment variables. The easiest way to set these up is using `dotenvx`. Create a `.env` file in this directory and populate it with the following values.

```sh
ITWIN_SERVICE_APP_CLIENT_ID=[client id]
ITWIN_SERVICE_APP_CLIENT_SECRET=[client secret]
ION_TOKEN_CONTROLLER_TOKEN=[ion token with scopes: tokens:read, tokens:write]
```

Then you can just run `npx dotenvx run -- node index.js` and it will pull in the appropriate values.
