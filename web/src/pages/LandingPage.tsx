import { useState } from "react";
import { Link } from "react-router-dom";
import { LANDING } from "../copy/en";
import { LandingDump } from "./LandingDump";
import { LandingOrbit } from "./LandingOrbit";
import { LandingSwarm } from "./LandingSwarm";
import "./landing.css";

// The hero clouds are baked at three widths (landing-dither.mjs), so the dots stay whole
// and each screen loads the one that is at least as wide as it is. 1920 is the fallback.
const SKY_WIDTHS = [
  [1280, "(max-width: 1280px)"],
  [1600, "(max-width: 1600px)"],
] as const;

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
  const [skyLoaded, setSkyLoaded] = useState(false);

  return (
    <div className="wm-landing">
      <header className="wm-top">
        <Link className="wm-mark" to="/" aria-label="watermark">
          <span className="wm-word-water">water</span>
          <span className="wm-word-mark">mark</span>
        </Link>
        <nav className="wm-top-links" aria-label="Site">
          <a href="#how">{LANDING.how}</a>
          <Link to="/desk">{LANDING.open}</Link>
        </nav>
      </header>

      <section className="wm-hero">
        <div className="wm-sky" aria-hidden="true">
          <picture>
            {SKY_WIDTHS.map(([width, media]) => (
              <source key={width} media={media} srcSet={`/landing/clouds-${width}-still.png`} />
            ))}
            <img src="/landing/clouds-1920-still.png" alt="" />
          </picture>
          <picture>
            {SKY_WIDTHS.map(([width, media]) => (
              <source
                key={`still-${width}`}
                media={`(prefers-reduced-motion: reduce) and ${media}`}
                srcSet={`/landing/clouds-${width}-still.png`}
              />
            ))}
            <source media="(prefers-reduced-motion: reduce)" srcSet="/landing/clouds-1920-still.png" />
            {SKY_WIDTHS.map(([width, media]) => (
              <source key={width} media={media} srcSet={`/landing/clouds-${width}.png`} />
            ))}
            <img
              className="wm-sky-moving"
              src="/landing/clouds-1920.png"
              alt=""
              data-loaded={skyLoaded}
              onLoad={() => setSkyLoaded(true)}
            />
          </picture>
        </div>
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
    </div>
  );
}
