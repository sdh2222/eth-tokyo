import { useState } from "react";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import { Button } from "@astryxdesign/core/Button";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { NAV, ROLE_WORD, ROLES, PageNav, VersionLinks, WalletControl } from "./shell-parts";
import { OPEN, OpenStepNav, ShellPages, type OpenFocus } from "./shell-pages";
import type { Role } from "../../app/role";
import "./shell-preview.css";

const DASHBOARD = "Dashboard";

export function ShellRow() {
  const [role, setRole] = useState<Role>("treasury");
  const [page, setPage] = useState(DASHBOARD);
  const [focus, setFocus] = useState<OpenFocus>(null);
  const [ahead, setAhead] = useState(-1);

  return (
    <div className="mul-shell" data-astryx-theme="neutral">
      <VersionLinks current="row" />
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
        <div className="watermark-role-row" role="radiogroup" aria-label="Role">
          {ROLES.map((item) => (
            <Button
              key={item}
              label={ROLE_WORD[item]}
              variant={item === role ? "primary" : "ghost"}
              onClick={() => {
                setRole(item);
                setPage(NAV[item][0] ?? DASHBOARD);
                setFocus(null);
              }}
            />
          ))}
        </div>
        <PageNav
          role={role}
          page={page}
          onPick={(next) => {
            setPage(next);
            setFocus(null);
          }}
        />
        {page === OPEN ? <OpenStepNav focus={focus} ahead={ahead} onPick={setFocus} /> : null}
      </header>
      <ShellPages role={role} page={page} focus={focus} onFocus={setFocus} onAhead={setAhead} />
    </div>
  );
}
