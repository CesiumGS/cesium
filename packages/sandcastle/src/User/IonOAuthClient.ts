import { ProcessStatus } from "../util/ProcessStatus.ts";
import { IonOAuth } from "./IonOAuth.ts";
import { UUID } from "./pkce.ts";

const LOCAL_STORAGE_KEY = "sandcastle/ionAccessToken";

export type UserInfo = {
  id: number;
  scopes: string[];
  username?: string;
  email?: string;
  emailVerified?: boolean;
  avatar?: string;
  storage?: {
    used: number;
    available: number;
    total: number;
  };
};

export class IonOAuthClient {
  ionApi: string;
  accessToken?: string;
  oauth: IonOAuth;
  initStatus: ProcessStatus = "NOT_STARTED";

  constructor({
    ion = "https://ion.cesium.com/",
    ionApi = "https://api.cesium.com/",
    callbackUrl,
    clientId,
    scopes,
    accessToken,
    oauth,
  }: {
    ion?: string;
    ionApi?: string;
    callbackUrl: string;
    clientId: string;
    scopes?: string[];
    accessToken?: string;
    oauth?: IonOAuth;
  }) {
    this.ionApi = ionApi;
    this.accessToken = accessToken;
    this.oauth =
      oauth ?? new IonOAuth({ ion, ionApi, callbackUrl, clientId, scopes });
  }

  initPromise?: Promise<boolean> = undefined;

  /**
   * Check whether the configured oauth client is set up for the current page.
   * If the urls don't match then logging in won't work and we should just disable it entirely
   */
  canLogIn() {
    // Ignore a possible tailing `index.html` since it should work the same with or without
    const currentPage =
      `${window.location.origin}${window.location.pathname}`.replace(
        "index.html",
        "",
      );
    return (
      this.oauth.config.callbackUrl.replace("index.html", "") === currentPage
    );
  }

  /**
   * Extrack PKCE info from url and the corresponding remove query params to clean up the address bar
   */
  #processAndClearUrl():
    | {
        isLoginUrl: true;
        isErrorUrl: false;
        code: string;
        state: UUID;
      }
    | {
        isLoginUrl: false;
        isErrorUrl: true;
        error: string;
        errorDescription?: string;
      }
    | {
        isErrorUrl: false;
        isLoginUrl: false;
      } {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state") as UUID | null;
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    // Only clear out the known keys we can discard to preserve any others that were added
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");

    // Clear out search terms without refreshing.
    if (window.history) {
      history.replaceState({}, "", url.href);
    }

    if (code && state) {
      return {
        isLoginUrl: true,
        isErrorUrl: false,
        code,
        state,
      };
    }
    if (error) {
      return {
        isLoginUrl: false,
        isErrorUrl: true,
        error,
        errorDescription: errorDescription ?? undefined,
      };
    }
    return {
      isErrorUrl: false,
      isLoginUrl: false,
    };
  }

  async init(): Promise<IonOAuthClient> {
    if (!this.canLogIn()) {
      this.initStatus = "ERROR";
      return this;
    }

    this.initStatus = "IN_PROGRESS";
    let deferredResolve;
    this.initPromise = new Promise((resolve) => {
      deferredResolve = resolve;
    });

    const urlInfo = this.#processAndClearUrl();

    let accessToken =
      window.localStorage?.getItem?.(LOCAL_STORAGE_KEY) ?? this.accessToken;

    if (urlInfo.isErrorUrl) {
      // TODO: ion currently doesn't return the state param so we can't do the
      // "return to previous page" logic from localStorage
      console.warn("Login failed or was denied");
      console.warn(urlInfo.error, urlInfo.errorDescription);
      this.initStatus = "ERROR";
      deferredResolve!(false);
      return this;
    }
    if (urlInfo.isLoginUrl) {
      try {
        const response = await this.oauth.tokenExchange(
          urlInfo.code,
          urlInfo.state,
        );
        accessToken = response.accessToken;
        if (accessToken) {
          window.localStorage?.setItem?.(LOCAL_STORAGE_KEY, accessToken);
          if (
            response.previousPage &&
            response.previousPage !== window.location.href
          ) {
            window.location.href = response.previousPage;
            return this;
          }
        }
      } catch (e) {
        console.warn(e);
        this.initStatus = "ERROR";
        deferredResolve!(false);
        return this;
      }
    }

    if (accessToken) {
      this.accessToken = accessToken;
    }
    this.initStatus = "COMPLETE";
    deferredResolve!(true);
    return this;
  }

  get loggedIn() {
    return !!this.accessToken;
  }

  async signIn() {
    if (!this.canLogIn()) {
      throw new Error("Unable to log in with the current client configuration");
    }
    const target = await this.oauth.getOauthRequestUrl();
    if (window.location) {
      window.location.href = target;
    }
    return target;
  }

  async signOut() {
    delete this.accessToken;
    window?.localStorage?.removeItem?.(LOCAL_STORAGE_KEY);
    if (window.location) {
      // There may be a way to do this without a reload but reloading is the best
      // way to guarantee all state values are cleared/refreshed
      window.location.reload();
    }
  }

  async fetch(uri: string, init?: RequestInit) {
    if (!this.loggedIn) {
      throw new Error("Not logged in");
    }

    console.log("making request", this);
    const url = new URL(uri, this.ionApi);
    const request = new Request(url, {
      ...init,
      headers: {
        ...init?.headers,
        //
        authorization: `Bearer ${this.accessToken}`,
      },
      // credentials: "include",
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
