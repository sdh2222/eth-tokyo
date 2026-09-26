import { useEffect, useState } from "react";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Kbd } from "@astryxdesign/core/Kbd";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { NAV, ROLE_WORD, ROLES, PageNav, VersionLinks, WalletControl } from "./shell-parts";
import { OPEN, OpenStepNav, ShellPages, type OpenFocus } from "./shell-pages";
import type { Role } from "../../app/role";
import "./shell-preview.css";

export function ShellPreview() {
  const [role, setRole] = useState<Role>("treasury");
  const [page, setPage] = useState(NAV.treasury[0] ?? "Dashboard");
  const [focus, setFocus] = useState<OpenFocus>(null);
  const [ahead, setAhead] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(true);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "b" || !event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']")) return;
      event.preventDefault();
      setMenuOpen((open) => !open);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mul-shell" data-astryx-theme="neutral" data-roles={menuOpen ? "open" : "closed"}>
      <VersionLinks current="side" />
      <div className="mul-frame">
        <div className="watermark-toc" aria-hidden={menuOpen ? undefined : true}>
          <div role="radiogroup" aria-label="Role">
            {ROLES.map((item) => (
              <button
                key={item}
                type="button"
                className="watermark-toc-item"
                role="radio"
                aria-checked={item === role}
                tabIndex={menuOpen ? 0 : -1}
                onClick={() => {
                  setRole(item);
                  setPage(NAV[item][0] ?? "Dashboard");
                  setFocus(null);
                }}
              >
                {ROLE_WORD[item]}
              </button>
            ))}
          </div>
        </div>
        <div className="mul-main">
          <header className="mul-header">
            <TopNav
              label="Account"
              heading={
                <span className="watermark-heading">
                  <Tooltip placement="below" content={<span className="watermark-tip">Roles <Kbd keys="ctrl+b" /></span>}>
                    <IconButton
                      className="watermark-menu"
                      label={menuOpen ? "Close roles" : "Open roles"}
                      variant="ghost"
                      icon={<Icon icon={menuOpen ? "chevronLeft" : "menu"} />}
                      onClick={() => setMenuOpen((open) => !open)}
                    />
                  </Tooltip>
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
      </div>
    </div>
  );
}
