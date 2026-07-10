// All motion lives here, GSAP-driven. The design brief is restraint:
// exactly five things move (dashboard count-up, shift-close settle,
// calendar selection flash, rate-row enter / grey-out, button press),
// everything else stays still. Every helper is a no-op under
// prefers-reduced-motion.

import gsap from "gsap";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- 5. tactile press feedback -------------------------------------------
// One delegated listener; any element with data-press scales to 0.97 on
// pointer-down and releases on up/cancel. Call once at startup.
export function initPressFeedback() {
  document.addEventListener("pointerdown", (e) => {
    if (prefersReducedMotion()) return;
    const el = e.target.closest?.("[data-press]");
    if (!el) return;
    gsap.to(el, { scale: 0.97, duration: 0.1, ease: "power2.out" });
    const release = () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      gsap.to(el, {
        scale: 1,
        duration: 0.18,
        ease: "power2.out",
        clearProps: "scale",
      });
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  });
}

// --- 1. mechanical count-up ------------------------------------------------
// Tweens {minutes, earnings} from 0 and hands interpolated values to
// `render` each tick, like an odometer spinning up. Returns the tween
// (or null under reduced motion, leaving the real values in place).
export function countUp({ minutes, earnings, delay = 0, render }) {
  if (prefersReducedMotion()) return null;
  const obj = { m: 0, e: 0 };
  render(0, 0); // avoid a one-frame flash of the final value
  return gsap.to(obj, {
    m: minutes,
    e: earnings,
    duration: 0.6,
    delay,
    ease: "power2.out",
    onUpdate: () => render(obj.m, obj.e),
    onComplete: () => render(minutes, earnings),
  });
}

// --- 2. shift-close settle ---------------------------------------------------
// The live tick just resolved into a static number: brief snap and settle.
export function settle(node) {
  if (!node || prefersReducedMotion()) return;
  gsap.fromTo(
    node,
    { scale: 1.05 },
    {
      scale: 1,
      duration: 0.2,
      ease: "back.out(2)",
      transformOrigin: "left center",
      clearProps: "transform",
    }
  );
}

// --- 3. calendar selection flash ------------------------------------------
export function selectFlash(node) {
  if (!node || prefersReducedMotion()) return;
  gsap.fromTo(
    node,
    { opacity: 0.55 },
    { opacity: 1, duration: 0.15, ease: "power1.out", clearProps: "opacity" }
  );
}

// --- 4a. new rate row entering from the top --------------------------------
export function rowEnter(node) {
  if (!node || prefersReducedMotion()) return;
  gsap.from(node, {
    y: -10,
    opacity: 0,
    duration: 0.25,
    ease: "power2.out",
    clearProps: "all",
  });
}

// --- 4b. rate row greying out on soft delete -------------------------------
// Resolves when the fade is done so the caller can then mutate + refetch.
export function fadeOutRow(node) {
  if (!node || prefersReducedMotion()) return Promise.resolve();
  return gsap
    .to(node, { opacity: 0.35, duration: 0.25, ease: "power1.out" })
    .then();
}

// Undo a fadeOutRow if the mutation failed.
export function restoreRow(node) {
  if (!node) return;
  gsap.set(node, { clearProps: "opacity" });
}
