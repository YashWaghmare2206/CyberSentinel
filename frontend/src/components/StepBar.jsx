import React from "react";
import "./StepBar.css";

/**
 * StepBar — Guided 5-Phase Incident Workflow Bar
 * Derives current step directly from active application state.
 */
export default function StepBar({
  networkId,
  entryNode,
  targetNode,
  status,
  STATUS,
  pathIndex,
  onStepClick,
}) {
  // Derive active step 1 through 5
  let currentStep = 1;
  if (status === STATUS.SIMULATING) {
    currentStep = 3;
  } else if (status === STATUS.NARRATIVE_DONE || status === STATUS.FIXING) {
    currentStep = 4;
  } else if (status === STATUS.COMPLETE) {
    currentStep = 5;
  } else if (entryNode && targetNode) {
    currentStep = 3;
  } else if (networkId) {
    currentStep = 2;
  }

  const steps = [
    {
      num: "01",
      id: "network",
      label: "Select Network",
      hint: networkId ? networkId.replace(/-/g, " ") : "Choose topology",
      stepNum: 1,
    },
    {
      num: "02",
      id: "scenario",
      label: "Entry & Goal",
      hint: entryNode ? `${entryNode} → ${targetNode}` : "Set vector",
      stepNum: 2,
    },
    {
      num: "03",
      id: "simulate",
      label: "Simulate Attack",
      hint: status === STATUS.SIMULATING ? "Breaching..." : "Dijkstra / A*",
      stepNum: 3,
    },
    {
      num: "04",
      id: "paths",
      label: "Review Routes",
      hint: status === STATUS.IDLE ? "Awaiting run" : `Route #${(pathIndex ?? 0) + 1} active`,
      stepNum: 4,
    },
    {
      num: "05",
      id: "fixes",
      label: "Remediation",
      hint: status === STATUS.COMPLETE ? "Fixes ready" : status === STATUS.FIXING ? "Patching..." : "Action plan",
      stepNum: 5,
    },
  ];

  return (
    <nav className="step-bar" aria-label="Incident Response Workflow">
      <div className="step-bar__container">
        {steps.map((step, idx) => {
          const isCurrent = step.stepNum === currentStep;
          const isDone = step.stepNum < currentStep || (step.stepNum === 5 && status === STATUS.COMPLETE);
          const isPulsing = step.stepNum === 3 && status === STATUS.SIMULATING;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                className={`step-item ${isCurrent ? "is-current" : ""} ${isDone ? "is-done" : ""} ${
                  isPulsing ? "is-pulsing" : ""
                }`}
                onClick={() => onStepClick && onStepClick(step.id)}
                title={`Step ${step.num}: ${step.label} (${step.hint})`}
              >
                <div className="step-item__icon-wrapper">
                  <span className="step-item__num">{step.num}</span>
                  {isDone && <span className="step-item__check">✓</span>}
                  {isPulsing && <span className="step-item__radar" />}
                </div>
                <div className="step-item__info">
                  <span className="step-item__label">{step.label}</span>
                  <span className="step-item__hint">{step.hint}</span>
                </div>
              </button>
              {idx < steps.length - 1 && (
                <div className={`step-divider ${idx < currentStep - 1 ? "is-filled" : ""}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
