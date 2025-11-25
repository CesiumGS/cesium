import { IonOAuth } from "./IonOAuth.ts";

export class IonOAuthClient {
  ionApi: string;
  access_token?: string;
  oauth: IonOAuth;
  initStarted = false;
  initFinished = false;

  constructor({
    ion = "https://ion.cesium.com/",
    ionApi = "https://api.cesium.com/",
    callbackUrl,
    clientId,
    scopes,
    access_token,
    oauth,
  }: {
    ion?: string;
    ionApi?: string;
    callbackUrl: string;
    clientId: string;
    scopes?: string[];
    access_token?: string;
    oauth?: IonOAuth;
  }) {
    this.ionApi = ionApi;
    this.access_token = access_token;
    this.oauth =
      oauth ?? new IonOAuth({ ion, ionApi, callbackUrl, clientId, scopes });
  }

  initPromise?: Promise<boolean> = undefined;

  async init(location = window.location) {
    this.initStarted = true;
    let deferredResolve;
    this.initPromise = new Promise((resolve) => {
      deferredResolve = resolve;
    });
    const params = new URL(location.href, "http://x/").searchParams;
    const code = params.get("code");
    const state = params.get("state");
    let access_token =
      window.localStorage?.getItem?.("ion_access_token") ?? this.access_token;
    if (code && state) {
      try {
        const response = await this.oauth.tokenExchange(code, state);
        console.log(response);
        access_token = response.access_token;
        if (access_token) {
          window.localStorage?.setItem?.("ion_access_token", access_token);
        }
      } catch (e) {
        console.warn(e);
      }
      // Clear out search terms without refreshing.
      if (window.history) {
        history.replaceState({}, "", new URL(location.pathname, location.href));
      }
    }
    if (access_token) {
      this.access_token = access_token;
    }
    console.log(this);
    deferredResolve!(true);
    return this;
  }

  get loggedIn() {
    return !!this.access_token;
  }

  async signIn() {
    const target = await this.oauth.getOauthRequestUrl();
    if (window.location) {
      window.location.href = target;
    }
    return target;
  }

  async signOut() {
    delete this.access_token;
    window?.localStorage?.removeItem?.("ion_access_token");
    if (window.location) {
      // TODO: reload definitely works, is there a way to do it without the reload?
      // maybe not worth the effort
      window.location.reload();
    }
  }

  async fetch(uri: string, init?: RequestInit) {
    if (!this.loggedIn) {
      throw new Error("Not logged in");
    }
    const url = new URL(uri, this.ionApi);
    const request = new Request(url, {
      ...init,
      headers: {
        ...init?.headers,
        authorization: `Bearer ${this.access_token}`,
      },
    });
    const response = await fetch(request);
    if (!response.ok) {
      let content = await response.text();
      let extras = {
        name: `HttpError ${response.status}${response.statusText ? ` (${response.statusText})` : ""}`,
        status: response.status,
        statusText: response.statusText,
        url,
        method: request.method,
      };
      try {
        const payload = JSON.parse(content);
        if (payload?.message) {
          const { message, ...rest } = payload;
          extras = { ...rest, ...extras };
          content = message;
        }
      } catch {
        /***/
      }
      const err = new Error(content);
      throw Object.assign(err, extras);
    }
    if (response.status === 204) {
      return undefined;
    }
    return await response.json();
  }

  _defaultAccessToken?: string = undefined;
  async getDefaultAccessToken() {
    if (this._defaultAccessToken) {
      return this._defaultAccessToken;
    }

    const resp = await this.fetch("/v2/tokens/default");
    this._defaultAccessToken = resp.token;
    return this._defaultAccessToken;
  }
}
