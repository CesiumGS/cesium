import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { IonOAuthClient, UserInfo } from "./IonOAuthClient";
import { Avatar, Button } from "@stratakit/bricks";
import { SandcastlePopover } from "../SandcastlePopover";
import "./UserProfile.css";

let clientSettings = {
  // TODO: this needs to be extracted to a config file and/or build level definition
  clientId: "1420",
  callbackUrl: "http://localhost:5173",
};

if (window.location.hostname === "ci-builds.cesium.com") {
  clientSettings = {
    // TODO: this needs to be extracted to a config file and/or build level definition
    // it also won't work for dynamic branch names in CI...
    clientId: "1741",
    callbackUrl:
      "https://ci-builds.cesium.com/cesium/sandcastle-login/Apps/Sandcastle2/index.html",
  };
}

const ionClient = new IonOAuthClient(clientSettings);

export const UserContext = createContext<{
  ionClient: IonOAuthClient;
  userInfo: UserInfo | undefined;
  getUserInfo: () => Promise<UserInfo | undefined>;
}>({
  // This is a "last resort" default if not inside the context
  ionClient,
  userInfo: undefined,
  getUserInfo: () => Promise.resolve(undefined),
});

export function UserProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line
  const [ionState, setIonState] = useState(ionClient);

  const initStarted = useRef(false);
  useEffect(() => {
    if (!initStarted.current) {
      ionState.init();
      initStarted.current = true;
    }
  }, [ionState]);

  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
  async function getUserInfo() {
    if (!ionClient.loggedIn) {
      return;
    }
    if (userInfo) {
      return userInfo;
    }
    const resp: UserInfo = await ionClient.fetch("/v1/me");
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

function UserPopover({
  username,
  avatar,
  logOut,
}: {
  username: string;
  avatar?: string;
  logOut: () => void;
}) {
  return (
    <SandcastlePopover
      className="user-popover"
      disclosure={
        <div className="user-profile" style={{ cursor: "pointer" }}>
          <Avatar
            initials={username[0]}
            alt={username}
            image={avatar ? <img src={avatar} /> : undefined}
          />
          <span className="username">{username}</span>
        </div>
      }
    >
      <Button onClick={() => logOut()} tone="accent">
        Log out
      </Button>
    </SandcastlePopover>
  );
}

export default function UserProfile() {
  const { ionClient, userInfo, getUserInfo } = useContext(UserContext);
  console.log("UserProfile render");

  const loginStarted = useRef(false);
  useEffect(() => {
    if (!loginStarted.current && ionClient.loggedIn) {
      loginStarted.current = true;
      getUserInfo();
    }
  }, [ionClient, ionClient.loggedIn, getUserInfo]);

  if (!ionClient.loggedIn) {
    return (
      <Button onClick={() => ionClient.signIn()} tone="accent">
        Login
      </Button>
    );
  }

  if (!userInfo) {
    return (
      <div onClick={() => ionClient.signOut()} style={{ cursor: "pointer" }}>
        Logging in...
      </div>
    );
  }

  return (
    <UserPopover
      username={userInfo.username ?? "User"}
      avatar={userInfo.avatar}
      logOut={() => ionClient.signOut()}
    />
  );
}
