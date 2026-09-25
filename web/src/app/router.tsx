import { Navigate, Route, Routes } from "react-router-dom";
import { PAGE } from "../copy/en";
import { DeskPage } from "../pages/DeskPage";
import { LandingPage } from "../pages/LandingPage";
import { Kit } from "../pages/dev/Kit";
import { Placeholder } from "../pages/Placeholder";
import { AppFrame } from "./shell";

export function AppRouter() {
  return (
    <AppFrame>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/desk" element={<DeskPage />} />
        <Route path="/open" element={<Placeholder title={PAGE.open} />} />
        <Route path="/counterparties" element={<Placeholder title={PAGE.counterparties} />} />
        <Route path="/trade" element={<Placeholder title={PAGE.trade} />} />
        <Route path="/controls" element={<Placeholder title={PAGE.controls} />} />
        <Route path="/fills" element={<Placeholder title={PAGE.fills} />} />
        <Route path="/fills/:tx" element={<Placeholder title={PAGE.verify} />} />
        <Route path="/program" element={<Placeholder title={PAGE.program} />} />
        <Route path="/agent" element={<Placeholder title={PAGE.agent} />} />
        {import.meta.env.DEV ? <Route path="/dev/kit" element={<Kit />} /> : null}
        <Route path="*" element={<Navigate to="/desk" replace />} />
      </Routes>
    </AppFrame>
  );
}
