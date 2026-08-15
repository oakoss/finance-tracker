# Research: axe color-contrast failures during hydration

Date: 2026-08-15
Related: CI run 31896724663 (main, `chore(deps): bump dependencies`)

## Summary

`@a11y` E2E tests failed intermittently on `color-contrast` at 2.29:1,
reporting `#fcfcfc` on `#95acbf`. That background is `--primary`
composited at 50% opacity over the page background — a primary button
caught mid-hydration. The cause is a gap between two React scheduling
points, not a styling defect: `waitForHydration()` resolves before the
control is enabled, and axe scans a still-faded button that no longer
carries the `disabled` attribute exempting it. Fixed by having
`a11yScan()` wait for controls to stop changing before scanning.

## Findings

- **axe exempts inactive controls from contrast, but computes contrast
  from opacity-adjusted colors.** Both behaviors are correct alone; a
  half-opacity control that has just lost `disabled` sits in the seam.
  `isDisabled()` treats a native `disabled` attribute and
  `aria-disabled="true"` as exempt — nothing else.
- **The gap is two frames, and it is React's, not a component
  library's.** A MutationObserver over the whole hydration recorded
  exactly two attribute mutations: `body[data-hydrated]` at t=123ms
  (root `useEffect`) and the button's `disabled` removal at t=139ms
  (the `useSyncExternalStore` commit adopting the client snapshot).
  Nothing else mutated, so Base UI is not involved in the timing. A
  plain `<button disabled={!hydrated}>` behaves identically.

  ```text
  t=153ms  hydrated=true   disabled=true   opacity=0.5
  t=166ms  hydrated=true   disabled=false  opacity=0.5   <- scanned here
  t=174ms  hydrated=true   disabled=false  opacity=1
  ```

- **Base UI's role is protective.** `useFocusableWhenDisabled` gives a
  disabled native button the real `disabled` attribute, which is what
  exempts it for the whole ~140ms pre-hydration window. Without that
  the control would be non-exempt the entire time, not for one frame.
- **Reproduction needs a narrow load band.** Under CPU throttling the
  failure appears at 4x (9/24 scans) but not at 1x, 8x, or 16x —
  heavier throttling also slows axe's traversal, so it reaches the
  element after the frame has passed. This is why the suite passes
  locally (29/29, then 129/129 with `--repeat-each=8`) and why CI hit
  it only occasionally.
- **`getAnimations()` does not help here**, despite being the usual
  community remedy. Under `prefers-reduced-motion` the transition
  duration is `1e-05s`, and the frame still occurs with opacity
  transitions removed entirely — it is a style-recalc seam, not an
  animation.
- **A point-in-time "is anything faded?" check is not enough.** A
  control that is still faded _and_ disabled satisfies it, so the
  check passes during hydration and leaves the race intact. Measuring
  stability across consecutive frames spans the flip instead.
- **The dependency bump did not cause it.** Rebuilding at the
  pre-bump commit `146ef87` with its own lockfile and running the same
  4x trial gave 8/24, against 9/24 after the bump. The race has been
  latent since roughly March at constant probability; CI simply
  sampled the wrong moment.
- **Disabling the `color-contrast` rule is the most common advice for
  this class of flake and is the wrong trade here.** It converts a
  flaky failure into a permanent blind spot in exactly the check these
  scans exist for.

## Sources

- [axe-core #1987 — false color-contrast on opacity/clip](https://github.com/dequelabs/axe-core/issues/1987)
- [Deque Axe Monitor — Advanced Scan Settings (Wait Before Scan)](https://docs.deque.com/monitor/8.7/en/advanced_scans/)
- [Playwright #4055 — Add waitForAnimation](https://github.com/microsoft/playwright/issues/4055)
- [Playwright #15660 — locator.waitForTransition](https://github.com/microsoft/playwright/issues/15660)
- [MDN — Element.getAnimations()](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations)
- [w3c/wcag discussion #3502 — disabled buttons and contrast](https://github.com/w3c/wcag/discussions/3502)
- [angular/components #18954 — disabled button contrast](https://github.com/angular/components/issues/18954)
