import { useState } from "react";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import { Button } from "@astryxdesign/core/Button";
import { ButtonGroup } from "@astryxdesign/core/ButtonGroup";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import type { Role } from "../../app/role";
import { DismissibleNotices, ShellPages } from "./shell-pages";
import { NAV, ROLE_WORD, ROLES, PageNav, VersionLinks, WalletControl } from "./shell-parts";
import "./shell-preview.css";

const DASHBOARD = "Dashboard";

export function ShellAstryx() {
  const [role, setRole] = useState<Role>("treasury");
  const [page, setPage] = useState(DASHBOARD);

  return (
    <div className="mul-shell" data-astryx-theme="neutral">
      <VersionLinks current="astryx" />
      <header className="mul-header">
        <TopNav
          label="Account"
          heading={
            <span className="watermark-heading">
              <TopNavHeading
                className="watermark-mark"
                logoLabel="watermark"
                logo={
                  <span className="watermark-word">
                    <span className="watermark-water">water</span>
                    <span className="watermark-ens">mark</span>
                  </span>
                }
              />
            </span>
          }
          endContent={<WalletControl />}
        />
        <ButtonGroup className="watermark-role-row" label="Role">
          {ROLES.map((item) => (
            <Button
              key={item}
              label={ROLE_WORD[item]}
              variant={item === role ? "primary" : "ghost"}
              onClick={() => {
                setRole(item);
                setPage(NAV[item][0] ?? DASHBOARD);
              }}
            />
          ))}
        </ButtonGroup>
        <PageNav role={role} page={page} onPick={setPage} />
      </header>
      <DismissibleNotices />
      <ShellPages role={role} page={page} />
    </div>
  );
}
