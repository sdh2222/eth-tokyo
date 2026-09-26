import { useState } from "react";
import { Link } from "react-router-dom";
import { FOOTER, LANDING } from "../copy/en";
import { LandingDump } from "./LandingDump";
import { LandingOrbit } from "./LandingOrbit";
import { LandingSwarm } from "./LandingSwarm";
import "./landing.css";

// The dithered loops (the hero clouds, the closing sea) are baked at three widths by
// landing-dither.mjs, so the dots stay whole and each screen loads the one that is at least
// as wide as it is. 1920 is the fallback.
const LOOP_WIDTHS = [
  [1280, "(max-width: 1280px)"],
  [1600, "(max-width: 1600px)"],
] as const;

// The still paints first and the moving picture fades in over it once it has loaded. With
// reduced motion only the still loads.
function DitherLoop({ name, className }: { name: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={className ? `wm-sky ${className}` : "wm-sky"} aria-hidden="true">
      <picture>
        {LOOP_WIDTHS.map(([width, media]) => (
          <source key={width} media={media} srcSet={`/landing/${name}-${width}-still.png`} />
        ))}
        <img src={`/landing/${name}-1920-still.png`} alt="" />
      </picture>
      <picture>
        {LOOP_WIDTHS.map(([width, media]) => (
          <source
            key={`still-${width}`}
            media={`(prefers-reduced-motion: reduce) and ${media}`}
            srcSet={`/landing/${name}-${width}-still.png`}
          />
        ))}
        <source media="(prefers-reduced-motion: reduce)" srcSet={`/landing/${name}-1920-still.png`} />
        {LOOP_WIDTHS.map(([width, media]) => (
          <source key={width} media={media} srcSet={`/landing/${name}-${width}.png`} />
        ))}
        <img
          className="wm-sky-moving"
          src={`/landing/${name}-1920.png`}
          alt=""
          data-loaded={loaded}
          onLoad={() => setLoaded(true)}
        />
      </picture>
    </div>
  );
}

function Wordmark() {
  return (
    <Link className="wm-mark" to="/" aria-label="watermark">
      <span className="wm-word-water">water</span>
      <span className="wm-word-mark">mark</span>
    </Link>
  );
}

// The four layers every section keeps to: the claim, then the picture that proves it
// (with its numbers), then one paragraph beside it.
function Claim({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="wm-claim">
      <h2 className="wm-h2">{title}</h2>
      {sub ? <p className="wm-claim-sub">{sub}</p> : null}
    </header>
  );
}

export function LandingPage() {
  return (
    <div className="wm-landing">
      <header className="wm-top">
        <Wordmark />
        <nav className="wm-top-links" aria-label="Site">
          <a href="#how">{LANDING.how}</a>
          <Link to="/desk">{LANDING.open}</Link>
        </nav>
      </header>

      <section className="wm-hero">
        <DitherLoop name="clouds" />
        <div className="wm-hero-text">
          <h1 className="wm-headline">{LANDING.headline}</h1>
          <p className="wm-via">{LANDING.via}</p>
          <div className="wm-actions">
            <Link className="wm-button" to="/desk">
              {LANDING.open}
            </Link>
            <a className="wm-link" href="#how">
              {LANDING.how}
            </a>
          </div>
        </div>
      </section>

      <section id="how" className="wm-section">
        <Claim title={LANDING.sell.title} />
        <LandingDump />
        <div className="wm-after">
          <div className="wm-stats">
            {LANDING.sell.stats.map((stat) => (
              <p key={stat.name} className="wm-stat">
                <span className="wm-stat-name">{stat.name}</span>
                <span className="wm-stat-value">{stat.value}</span>
                <span className="wm-stat-note">{stat.note}</span>
              </p>
            ))}
          </div>
          <p className="wm-body">{LANDING.sell.body}</p>
        </div>
      </section>

      <div className="wm-band wm-band-water">
        <section className="wm-section wm-section-center">
          <Claim title={LANDING.gate.title} sub={LANDING.gate.sub} />
          <LandingSwarm named="#ffffff" unnamed="#111111" />
          <p className="wm-body wm-body-center">{LANDING.gate.body}</p>
        </section>
      </div>

      <section className="wm-section wm-split">
        <div className="wm-split-text">
          <Claim title={LANDING.orbit.title} />
          <p className="wm-body">{LANDING.orbit.body}</p>
        </div>
        <LandingOrbit />
      </section>

      <section className="wm-close">
        <DitherLoop name="sea" className="wm-sea" />
        <div className="wm-section wm-section-center wm-close-inner">
          <Claim title={LANDING.close.title} sub={LANDING.close.sub} />
          <div className="wm-doors">
            {LANDING.close.doors.map((door) => (
              <div key={door.tag} className="wm-panel-field wm-door">
                <span className="wm-tag">{door.tag}</span>
                <div className="wm-door-body">
                  <h3 className="wm-door-name">{door.name}</h3>
                  <ol className="wm-door-steps">
                    {door.steps.map((step, i) => (
                      <li key={step}>
                        <span>
                          {step}
                          {i === 0 && "example" in door ? <code className="wm-door-name-example">{door.example}</code> : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <Link className="wm-button" to={door.to}>
                    {door.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="wm-footer">
        <div className="wm-footer-row">
          <div>
            <Wordmark />
            <p className="wm-footer-born">{LANDING.footer.born}</p>
          </div>
          <nav className="wm-top-links" aria-label="Footer">
            <a href="#how">{LANDING.how}</a>
            {LANDING.close.doors.map((door) => (
              <Link key={door.to} to={door.to}>
                {door.cta}
              </Link>
            ))}
            <Link to="/fills">{LANDING.footer.fills}</Link>
          </nav>
        </div>
        <div className="wm-footer-cols">
          <div>
            <p className="wm-footer-label">{LANDING.footer.builtBy}</p>
            <ul className="wm-footer-list">
              {LANDING.footer.builders.map((handle) => (
                <li key={handle}>
                  <a href={`https://github.com/${handle}`} target="_blank" rel="noreferrer">
                    {handle} ↗
                  </a>
                </li>
              ))}
            </ul>
            <p className="wm-footer-small">
              {LANDING.footer.with}{" "}
              <a href={LANDING.footer.club.href} target="_blank" rel="noreferrer">
                {LANDING.footer.club.name}
              </a>
            </p>
          </div>
          <div>
            <p className="wm-footer-label">{LANDING.footer.builtOn}</p>
            <ul className="wm-footer-list">
              {LANDING.footer.stack.map((item) => (
                <li key={item.name}>
                  <a href={item.href} target="_blank" rel="noreferrer">
                    {item.name} ↗
                  </a>
                </li>
              ))}
            </ul>
            <p className="wm-footer-small">{LANDING.footer.thanks}</p>
          </div>
        </div>
        <p className="wm-footer-note">{FOOTER}</p>
      </footer>
    </div>
  );
}
