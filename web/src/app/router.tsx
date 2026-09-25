import { Navigate, Route, Routes } from "react-router-dom";
import { PAGE } from "../copy/en";
import { DeskPage } from "../pages/DeskPage";
import { ControlsPage } from "../pages/ControlsPage";
import { FillsPage } from "../pages/FillsPage";
import { VerifyPage } from "../pages/VerifyPage";
import { OpenPage } from "../pages/OpenPage";
import { LandingPage } from "../pages/LandingPage";
import { TradePage } from "../pages/TradePage";
import { Kit } from "../pages/dev/Kit";
import { Placeholder } from "../pages/Placeholder";
import { AppFrame } from "./shell";

export function AppRouter() {
  return (
    <AppFrame>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/desk" element={<DeskPage />} />
        <Route path="/open" element={<OpenPage />} />
        <Route path="/counterparties" element={<Placeholder title={PAGE.counterparties} />} />
        <Route path="/trade" element={<TradePage />} />
        <Route path="/controls" element={<ControlsPage />} />
        <Route path="/fills" element={<FillsPage />} />
        <Route path="/fills/:tx" element={<VerifyPage />} />
        <Route path="/fills/:tx" element={<Placeholder title={PAGE.verify} />} />
        <Route path="/program" element={<Placeholder title={PAGE.program} />} />
        <Route path="/agent" element={<Placeholder title={PAGE.agent} />} />
        {import.meta.env.DEV ? <Route path="/dev/kit" element={<Kit />} /> : null}
        <Route path="*" element={<Navigate to="/desk" replace />} />
      </Routes>
    </AppFrame>
  );
}
