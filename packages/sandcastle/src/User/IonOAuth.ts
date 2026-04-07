import { getPkceState, newPkceState, UUID } from "./pkce.js";

export const DEFAULT_APP_SCOPES = ["tokens:read", "profile:read"];

export class IonOAuth {
  config: {
    ion: string;
    ionApi: string;
    callbackUrl: string;
    clientId: string;
    scopes: string[];
  };

  constructor({
    ion = "https://ion.cesium.com/",
    ionApi = "https://api.cesium.com/",
    callbackUrl,
    clientId,
    // TODO: probably need some way to check scopes we /have/ vs scopes we /want/
    // so that if we add more or remove some at some point users have to re-validate
    scopes = DEFAULT_APP_SCOPES,
  }: {
    ion?: string;
    ionApi?: string;
    callbackUrl: string;
    clientId: string;
    scopes?: string[];
  }) {
    if (!clientId || !callbackUrl) {
      throw new Error("A clientId and callbackUrl must be specified");
    }
    this.config = { ion, ionApi, clientId, callbackUrl, scopes };
  }

  async getOauthRequestUrl() {
    // @see https://cesium.com/learn/ion/ion-oauth2/#step-2-code-authorization
    // Generate randoms for the state and verifier, and store them both, using the state as the key
    const { stateId, codeChallenge } = await newPkceState();
    // Construct the request URL ans redirect the user
    return new URL(
      `/oauth?${new URLSearchParams({
        client_id: this.config.clientId,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        redirect_uri: this.config.callbackUrl,
        response_type: "code",
        scope: this.config.scopes.join(" "),
        state: stateId,
      }).toString()}`,
      this.config.ion,
    ).toString();
  }

  async tokenExchange(code: string, state: UUID) {
    // @see https://cesium.com/learn/ion/ion-oauth2/#step-3-token-exchange
    // Retrieve the verifier based on the state
    const { codeVerifier, previousPage } = (await getPkceState(state)) ?? {};

    // If it isn't there, it's not a valid state.
    if (!codeVerifier) {
      throw new Error("State mismatch");
    }

    // Perform the token exchange
    const ionResponse = await fetch(
      new URL("/oauth/token", this.config.ionApi),
      {
        method: "post",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          code,
          code_verifier: codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: this.config.callbackUrl,
        }),
      },
    );
    if (!ionResponse.ok) {
      // The request failed; proxy the failure to the client.
      throw new Error(await ionResponse.text());
    }

    const { token_type, access_token } = await ionResponse.json();
    if (token_type !== "bearer") {
      // Ion only ever uses `token_type: "bearer"`, so this means something's weird.
      throw new Error(`Unrecognized token_type: ${token_type}`);
    }
    return {
      accessToken: access_token as string,
      tokenType: token_type as string,
      previousPage,
    };
  }
}
