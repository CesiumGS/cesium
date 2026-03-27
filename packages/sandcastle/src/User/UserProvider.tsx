import { ReactNode, useEffect, useRef, useState } from "react";
import { initialUserContext, UserContext } from "./UserContext.ts";
import { UserInfo } from "./IonOAuthClient.ts";

export function UserProvider({ children }: { children: ReactNode }) {
  const [ionState] = useState(initialUserContext.ionClient);

  const initStarted = useRef(false);
  useEffect(() => {
    if (!initStarted.current) {
      ionState.init();
      initStarted.current = true;
    }
  }, [ionState]);

  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
  async function getUserInfo() {
    if (!ionState.loggedIn) {
      return;
    }
    if (userInfo) {
      return userInfo;
    }
    const resp: UserInfo = await ionState.fetch("/v1/me");
    if (!resp.username) {
      return undefined;
    }
    // TODO: remove just testing
    if (Math.random() * 10 > 5) {
      resp.avatar = undefined;
    }
    setUserInfo(resp);
    return resp;
  }

  return (
    <UserContext value={{ ionClient: ionState, userInfo, getUserInfo }}>
      {children}
    </UserContext>
  );
}
