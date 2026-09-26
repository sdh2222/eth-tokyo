import { Navigate, Route, Routes } from "react-router-dom";
import { DeskPage } from "../pages/DeskPage";
import { AgentPage } from "../pages/AgentPage";
import { CounterpartiesPage } from "../pages/CounterpartiesPage";
import { ControlsPage } from "../pages/ControlsPage";
import { ProgramPage } from "../pages/ProgramPage";
import { FillsPage } from "../pages/FillsPage";
import { VerifyPage } from "../pages/VerifyPage";
import { OpenPage } from "../pages/OpenPage";
import { LandingPage } from "../pages/LandingPage";
import { TradePage } from "../pages/TradePage";
import { Kit } from "../pages/dev/Kit";
import { ShellPreview } from "../pages/dev/ShellPreview";
import { ShellRow } from "../pages/dev/ShellRow";
import { ShellAstryx } from "../pages/dev/ShellAstryx";
import { AppFrame } from "./shell";

export function AppRouter() {
  return (
    <AppFrame>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/desk" element={<DeskPage />} />
        <Route path="/open" element={<OpenPage />} />
        <Route path="/counterparties" element={<CounterpartiesPage />} />
        <Route path="/trade" element={<TradePage />} />
        <Route path="/controls" element={<ControlsPage />} />
        <Route path="/fills" element={<FillsPage />} />
        <Route path="/fills/:tx" element={<VerifyPage />} />
        <Route path="/program" element={<ProgramPage />} />
        <Route path="/agent" element={<AgentPage />} />
        {import.meta.env.DEV ? <Route path="/dev/kit" element={<Kit />} /> : null}
        {import.meta.env.DEV ? <Route path="/dev/shell" element={<ShellPreview />} /> : null}
        {import.meta.env.DEV ? <Route path="/dev/shell/row" element={<ShellRow />} /> : null}
        {import.meta.env.DEV ? <Route path="/dev/shell/astryx" element={<ShellAstryx />} /> : null}
        <Route path="*" element={<Navigate to="/desk" replace />} />
      </Routes>
    </AppFrame>
  );
}
