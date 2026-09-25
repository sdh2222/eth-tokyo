import { Navigate, Route, Routes } from "react-router-dom";
import { PAGE } from "../copy/en";
import { Placeholder } from "../pages/Placeholder";
import { AppFrame } from "./shell";

export function AppRouter() {
  return (
    <AppFrame>
      <Routes>
        <Route path="/" element={<Placeholder title={PAGE.landing} />} />
        <Route path="/desk" element={<Placeholder title={PAGE.dashboard} />} />
        <Route path="/open" element={<Placeholder title={PAGE.open} />} />
        <Route path="/counterparties" element={<Placeholder title={PAGE.counterparties} />} />
        <Route path="/trade" element={<Placeholder title={PAGE.trade} />} />
        <Route path="/controls" element={<Placeholder title={PAGE.controls} />} />
        <Route path="/fills" element={<Placeholder title={PAGE.fills} />} />
        <Route path="/fills/:tx" element={<Placeholder title={PAGE.verify} />} />
        <Route path="/program" element={<Placeholder title={PAGE.program} />} />
        <Route path="/agent" element={<Placeholder title={PAGE.agent} />} />
        <Route path="*" element={<Navigate to="/desk" replace />} />
      </Routes>
    </AppFrame>
  );
}
