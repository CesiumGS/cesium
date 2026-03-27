import { useContext, useEffect, useRef } from "react";
import { Avatar, Button, Tooltip } from "@stratakit/bricks";
import { SandcastlePopover } from "../SandcastlePopover";
import "./UserProfile.css";
import { UserContext } from "./UserContext.ts";
import { IonOAuthClient } from "./IonOAuthClient.ts";

function UserPopover({
  username,
  avatar,
  logOut,
  ionClient,
}: {
  username: string;
  avatar?: string;
  logOut: () => void;
  ionClient: IonOAuthClient;
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
      <Button
        onClick={async () => {
          try {
            const result = await ionClient.fetch("/v2/tokens/default");
            console.log("success", result);
          } catch (error) {
            console.error("failed request");
            console.error(error);
          }
        }}
        tone="accent"
      >
        Test fetch
      </Button>
      <Button onClick={() => logOut()} tone="accent">
        Log out
      </Button>
    </SandcastlePopover>
  );
}

export default function UserProfile() {
  const { ionClient, userInfo, getUserInfo } = useContext(UserContext);

  const loginStarted = useRef(false);
  useEffect(() => {
    if (!loginStarted.current && ionClient.loggedIn) {
      loginStarted.current = true;
      getUserInfo();
    }
  }, [ionClient, ionClient.loggedIn, getUserInfo]);

  if (!ionClient.canLogIn()) {
    return (
      <Tooltip
        content={"Login is not enabled for this environment"}
        type="label"
        placement="bottom"
      >
        <Button tone="accent" disabled>
          Login
        </Button>
      </Tooltip>
    );
  }

  if (!ionClient.loggedIn) {
    return (
      <Button
        onClick={() => ionClient.signIn()}
        tone="accent"
        disabled={
          ionClient.initStatus === "NOT_STARTED" ||
          ionClient.initStatus === "IN_PROGRESS"
        }
      >
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
      ionClient={ionClient}
    />
  );
}
