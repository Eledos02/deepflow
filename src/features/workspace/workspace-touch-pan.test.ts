import { describe, expect, it } from "vitest";

import {
  cancelWorkspaceTouchPan,
  moveWorkspaceTouchPan,
  panWorkspaceViewportByScreenDelta,
  startWorkspaceTouchPan,
  type WorkspaceTouchPoint,
} from "./workspace-touch-pan";

const first: WorkspaceTouchPoint = { pointerId: 11, x: 100, y: 120 };
const second: WorkspaceTouchPoint = { pointerId: 22, x: 200, y: 220 };

describe("workspace two-touch panning", () => {
  it("does not start canvas panning from one touch", () => {
    expect(startWorkspaceTouchPan([first])).toBeNull();
  });

  it("starts when exactly two active touch pointers are registered", () => {
    expect(startWorkspaceTouchPan([first, second])).toEqual({
      centroid: { x: 150, y: 170 },
      pointerIds: [11, 22],
    });
  });

  it("uses continuous centroid movement as the screen-space pan delta", () => {
    const session = startWorkspaceTouchPan([first, second]);
    expect(session).not.toBeNull();

    const points = new Map<number, WorkspaceTouchPoint>([
      [11, { pointerId: 11, x: 135, y: 145 }],
      [22, { pointerId: 22, x: 235, y: 245 }],
    ]);
    const movement = moveWorkspaceTouchPan(session!, points);

    expect(movement).toEqual({
      delta: { x: 35, y: 25 },
      session: {
        centroid: { x: 185, y: 195 },
        pointerIds: [11, 22],
      },
    });
  });

  it("ends movement calculations when either tracked pointer is released", () => {
    const session = startWorkspaceTouchPan([first, second]);
    expect(session).not.toBeNull();

    expect(
      moveWorkspaceTouchPan(
        session!,
        new Map([[11, { pointerId: 11, x: 140, y: 150 }]]),
      ),
    ).toBeNull();
  });

  it("clears the gesture on pointer cancellation", () => {
    expect(cancelWorkspaceTouchPan()).toBeNull();
  });

  it.each([0.75, 1, 1.25, 1.5])(
    "applies screen deltas without zoom drift at %s zoom",
    (zoom) => {
      expect(
        panWorkspaceViewportByScreenDelta(
          { x: -80, y: 45, zoom },
          { x: 32, y: -18 },
        ),
      ).toEqual({ x: -48, y: 27, zoom });
    },
  );
});
