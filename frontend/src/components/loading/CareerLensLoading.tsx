"use client";

import React, { useEffect, useState, useCallback } from "react";
import "./CareerLensLoading.css";

interface CareerLensLoadingProps {
  onComplete?: () => void;
  durationMs?: number;
}

function LensMark() {
  return (
    <span className="lens-mark" aria-hidden="true">
      <span />
    </span>
  );
}

function Aperture() {
  return (
    <div className="aperture" aria-hidden="true">
      <div className="aperture-ring" />
      {Array.from({ length: 10 }, (_, index) => (
        <span
          className="aperture-blade"
          style={{ "--blade": index } as React.CSSProperties}
          key={index}
        />
      ))}
      <div className="aperture-glass" />
    </div>
  );
}

function EvidenceEnvironment() {
  return (
    <div className="evidence-world" aria-hidden="true">
      <div className="evidence-ambient" />
      <div className="depth-grid" />
      <svg className="provenance-map" viewBox="0 0 1200 720" fill="none">
        <path d="M145 477C310 430 377 261 534 294S756 474 1038 256" />
        <path d="M238 180C401 229 470 201 604 129S837 158 964 366" />
        <path d="M534 294 604 129M756 474 964 366" />
        <circle cx="145" cy="477" r="4" />
        <circle cx="534" cy="294" r="4" />
        <circle cx="604" cy="129" r="4" />
        <circle cx="756" cy="474" r="4" />
        <circle cx="964" cy="366" r="4" />
      </svg>

      <div className="evidence-object profile-fragment">
        <span className="object-kicker">CANDIDATE / 042</span>
        <div className="profile-row">
          <i>VK</i>
          <b>Vikram</b>
        </div>
        <span className="profile-role">Software Engineering</span>
      </div>

      <div className="evidence-object resume-fragment">
        <div className="document-top">
          <span className="object-kicker">RESUME / SKILLS</span>
          <i>01</i>
        </div>
        <strong>Technical profile</strong>
        <span className="document-line document-line--wide" />
        <span className="document-line" />
        <div className="skill-row">
          <span>Python</span>
          <span>React</span>
          <span>SQL</span>
        </div>
        <span className="document-caption">Claim detected</span>
      </div>

      <div className="evidence-object project-fragment">
        <div className="project-visual">
          <span className="pulse-chart">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="signal-ring" />
        </div>
        <span className="object-kicker">PROJECT EVIDENCE</span>
        <strong>
          Smart Monitoring
          <br />
          System
        </strong>
        <span className="project-meta">Python · ML · Edge analytics</span>
      </div>

      <div className="evidence-object repository-fragment">
        <div className="repository-head">
          <span className="repo-mark">
            <i />
            <i />
          </span>
          <span>github / smart-monitor</span>
          <b>PUBLIC</b>
        </div>
        <div className="file-row">
          <span>PY</span>
          <strong>main.py</strong>
          <i>82%</i>
        </div>
        <div className="file-row">
          <span>TX</span>
          <strong>requirements.txt</strong>
          <i>12%</i>
        </div>
        <div className="file-row">
          <span>DR</span>
          <strong>tests/</strong>
          <i>6%</i>
        </div>
        <div className="repo-footer">
          <span>● Python</span>
          <span>48 commits</span>
        </div>
      </div>

      <div className="activity-fragment">
        <span className="object-kicker">CONTRIBUTION ACTIVITY</span>
        <div className="activity-cells">
          {Array.from({ length: 28 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </div>

      <div className="foreground-code">
        <span>def analyze_evidence(source):</span>
        <span>&nbsp;&nbsp;confidence = verify(source)</span>
        <span>&nbsp;&nbsp;return confidence</span>
      </div>
      <div className="light-slice" />
    </div>
  );
}

function EvidenceOverlay() {
  return (
    <div className="evidence-sequence" aria-hidden="true">
      <svg className="analysis-lines" viewBox="0 0 640 360" fill="none">
        <path className="trace trace--one" d="M76 246H224L278 191H387" />
        <path className="trace trace--two" d="M387 191H496L552 134" />
        <circle className="target-ring" cx="387" cy="191" r="55" />
        <path
          className="file-outline"
          d="M359 151h41l16 16v62h-57v-78Zm41 0v17h16M371 185h33m-33 12h33m-33 12h22"
        />
        <path className="scan-line" d="M309 133v118" />
      </svg>
      <div className="evidence-label evidence-label--source">
        <span>01 / SOURCE</span>
        <strong>Evidence located</strong>
      </div>
      <div className="claim-chain">
        <span className="chain-kicker">CLAIM</span>
        <strong>Python</strong>
        <i />
        <span className="chain-kicker">EVIDENCE</span>
        <strong>GitHub repository</strong>
        <i />
        <span className="verified">VERIFIED</span>
      </div>
    </div>
  );
}

export default function CareerLensLoading({
  onComplete,
  durationMs = 6800,
}: CareerLensLoadingProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const handleFinish = useCallback(() => {
    setIsFadingOut(true);
    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 750);
    return () => clearTimeout(finishTimer);
  }, [onComplete]);

  useEffect(() => {
    // Auto-advance after cinematic animation duration
    const autoTimer = setTimeout(() => {
      handleFinish();
    }, durationMs);

    return () => clearTimeout(autoTimer);
  }, [durationMs, handleFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`careerlens-loading-root ${isFadingOut ? "fade-out" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Kareer Kranti loading introduction"
    >
      <div className="intro intro--playing">
        <div className="intro-glow" />
        <div className="evidence-scene evidence-scene--blurred">
          <EvidenceEnvironment />
        </div>
        <div className="evidence-scene evidence-scene--sharp">
          <EvidenceEnvironment />
        </div>
        <div className="scene-vignette" />
        <Aperture />
        <div className="lens-rim">
          <span />
        </div>
        <EvidenceOverlay />
        <div className="brand-reveal">
          <div className="intro-wordmark">
            <LensMark />
            <span>
              <span>Kareer </span>
              <span className="wordmark-accent">Kranti</span>
            </span>
          </div>
          <p>See beyond the resume.</p>
        </div>
        <div className="loading-note">
          <span />
          Examining evidence
        </div>

        <button
          className="skip-btn"
          onClick={handleFinish}
          aria-label="Skip introduction animation"
        >
          Skip Intro <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
}
