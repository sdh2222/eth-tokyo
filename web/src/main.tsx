import "./styles/tokens.css";
import "./styles/global.css";
import { createRoot } from "react-dom/client";
import { AppFrame } from "./app/shell";

const root = document.getElementById("root");
if (!root) {
  throw new Error("root missing");
}

createRoot(root).render(
  <AppFrame>
    Desk
  </AppFrame>,
);
