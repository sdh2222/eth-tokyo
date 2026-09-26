import "./styles/app.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LinkProvider } from "@astryxdesign/core/Link";
import { AppProviders } from "./app/providers";
import { AppRouter } from "./app/router";
import { RouterLink } from "./app/RouterLink";

const root = document.getElementById("root");
if (!root) {
  throw new Error("root missing");
}

createRoot(root).render(
  <AppProviders>
    <BrowserRouter>
      <LinkProvider component={RouterLink}>
        <AppRouter />
      </LinkProvider>
    </BrowserRouter>
  </AppProviders>,
);
