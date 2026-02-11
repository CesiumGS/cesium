import Button from "@mui/material/Button";
import { MuiRoot } from "./MuiRoot";

export function TestBench() {
  return (
    <MuiRoot>
      Testing!
      <Button variant="contained">Hello world</Button>
    </MuiRoot>
  );
}
