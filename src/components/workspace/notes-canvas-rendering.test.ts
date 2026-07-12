import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const component = readFileSync(
  resolve(process.cwd(), "src/components/workspace/notes-canvas.tsx"),
  "utf8",
);
const styles = readFileSync(
  resolve(process.cwd(), "src/styles/globals.css"),
  "utf8",
);

function rulesContaining(selector: string) {
  return [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].includes(selector))
    .map((match) => match[2]);
}

describe("Notes Canvas rendering", () => {
  it("keeps resize and drag on independent pointer targets", () => {
    expect(component).toContain('aria-label="Drag note"');
    expect(component).toContain('aria-label="Resize note"');
    expect(component).toContain("startDrag(event, note)");
    expect(component).toContain("startResize(event, note)");
    expect(component).toContain("event.stopPropagation()");
  });

  it("positions notes without a redundant transformed text layer", () => {
    expect(component).toContain('left: `${note.x}px`');
    expect(component).toContain('top: `${note.y}px`');
    expect(component).not.toContain('translate3d(${note.x}px, ${note.y}px, 0)');

    const noteRule = rulesContaining(".workspace-note")
      .find((body) => body.includes("position: absolute")) ?? "";
    const surfaceRule = rulesContaining(".workspace-note__surface")
      .find((body) => body.includes("grid-template-rows")) ?? "";

    expect(noteRule).not.toContain("will-change");
    expect(surfaceRule).not.toContain("will-change");
    expect(surfaceRule).not.toContain("filter:");
    expect(surfaceRule).toContain("border-radius: 9px");
  });

  it("gives note content the resized height without native textarea resizing", () => {
    const textareaRule = rulesContaining(".workspace-note__body")
      .find((body) => body.includes("flex: 1 1 auto")) ?? "";
    const resizeRule = rulesContaining(".workspace-note__resize-handle")
      .find((body) => body.includes("cursor: nwse-resize")) ?? "";

    expect(textareaRule).toContain("height: 100%");
    expect(textareaRule).toContain("min-height: 0");
    expect(textareaRule).toContain("resize: none");
    expect(resizeRule).toContain("touch-action: none");
  });

  it("keeps the single-line title compact while the body receives extra height", () => {
    const surfaceRule = rulesContaining(".workspace-note__surface")
      .find((body) => body.includes("grid-template-rows")) ?? "";
    const titleRule = rulesContaining(".workspace-note__title")
      .find((body) => body.includes("text-overflow: ellipsis")) ?? "";
    const textareaRule = rulesContaining(".workspace-note__body")
      .find((body) => body.includes("flex: 1 1 auto")) ?? "";

    expect(component).toContain('className="workspace-note__title"');
    expect(component).toContain('type="text"');
    expect(surfaceRule).toContain(
      "grid-template-rows: max-content 48px minmax(0, 1fr)",
    );
    expect(titleRule).toContain("height: 48px");
    expect(titleRule).toContain("white-space: nowrap");
    expect(titleRule).toContain("overflow: hidden");
    expect(textareaRule).toContain("flex: 1 1 auto");
    expect(textareaRule).toContain("min-height: 0");
  });

  it("top-aligns body text directly below the compact title", () => {
    const bodyWrapRule = rulesContaining(".workspace-note__body-wrap")
      .find((body) => body.includes("display: flex")) ?? "";
    const textareaRule = rulesContaining(".workspace-note__body")
      .find((body) => body.includes("flex: 1 1 auto")) ?? "";
    const connectionNodesRule = rulesContaining(
      ".workspace-note__connection-nodes",
    ).find((body) => body.includes("position: absolute")) ?? "";

    expect(component).toContain('className="workspace-note__body-wrap"');
    expect(component).toContain('className="workspace-note__body"');
    expect(bodyWrapRule).toContain("grid-row: 3");
    expect(bodyWrapRule).toContain("min-height: 0");
    expect(bodyWrapRule).toContain("flex-direction: column");
    expect(bodyWrapRule).toContain("align-self: stretch");
    expect(bodyWrapRule).toContain("justify-content: flex-start");
    expect(textareaRule).toContain("height: 100%");
    expect(textareaRule).toContain("padding: 8px 14px 14px");
    expect(textareaRule).toContain("overflow-y: auto");
    expect(textareaRule).toContain("text-align: left");
    expect(textareaRule).toContain("vertical-align: top");
    expect(connectionNodesRule).toContain("inset: 0");
    expect(connectionNodesRule).toContain("pointer-events: none");
  });

  it("uses one pointer drag session instead of the old two-click workflow", () => {
    expect(component).toContain("startWorkspaceConnectionDrag(");
    expect(component).toContain("moveWorkspaceConnectionDrag(");
    expect(component).toContain("completeWorkspaceConnectionDrag(session)");
    expect(component).toContain('event.key === "Escape" && connectionDragRef.current');
    expect(component).toContain("cancelActiveConnection()");
    expect(component).not.toContain("connectNote(");
  });

  it("keeps connection dragging isolated from note drag and canvas pan", () => {
    expect(component).toContain("event.preventDefault();\n    event.stopPropagation();");
    expect(component).toContain(
      'target.closest("button, input, textarea, select, a")',
    );
    expect(component).toContain("connectionCapture.session.pointerId");
  });

  it("renders a refined connector plus a wide transparent selection path", () => {
    expect(component).toContain('className="workspace-connection__line"');
    expect(component).toContain('className="workspace-connection__hit-area"');
    expect(component).toContain("setSelectedConnectionId(connection.id)");
    expect(component).toContain("deleteSelectedConnection");

    const lineRule = rulesContaining(".workspace-connection__line")
      .find((body) => body.includes("stroke-width: 2.35")) ?? "";
    const hitRule = rulesContaining(".workspace-connection__hit-area")
      .find((body) => body.includes("stroke-width: 12")) ?? "";

    expect(lineRule).toContain("pointer-events: none");
    expect(hitRule).toContain("stroke: transparent");
    expect(hitRule).toContain("pointer-events: stroke");
  });

  it("marks the compatible target anchor for live highlighting", () => {
    expect(component).toContain("data-connection-target={");
    expect(styles).toContain(
      '.workspace-note__connection-node[data-connection-target="true"]',
    );
    const anchorRule = rulesContaining(".workspace-note__connection-node")
      .find((body) => body.includes("cursor: crosshair")) ?? "";

    expect(anchorRule).toContain("touch-action: none");
  });

  it("offers a CSS-expanded Canvas with a reachable compact toolbar", () => {
    const expandedCardRule = rulesContaining(
      '.workspace-canvas-card[data-expanded="true"]',
    ).find((body) => body.includes("position: fixed")) ?? "";
    const expandedCanvasRule = rulesContaining(
      '.workspace-canvas-card[data-expanded="true"] .workspace-canvas',
    ).find((body) => body.includes("touch-action: none")) ?? "";

    expect(component).toContain('aria-label="Expand canvas"');
    expect(component).toContain('aria-label="Minimize Canvas"');
    expect(component).toContain('aria-label="Expanded Canvas controls"');
    expect(component).toContain("data-expanded={isCanvasExpanded}");
    expect(component).toContain("createPortal(canvasCard, document.body)");
    expect(expandedCardRule).toContain("position: fixed");
    expect(expandedCardRule).toContain("inset: 0");
    expect(expandedCardRule).toContain("width: 100vw");
    expect(expandedCardRule).toContain("height: 100vh");
    expect(expandedCardRule).toContain("height: 100dvh");
    expect(expandedCardRule).toContain("env(safe-area-inset-top)");
    expect(expandedCardRule).toContain("env(safe-area-inset-right)");
    expect(expandedCardRule).toContain("env(safe-area-inset-bottom)");
    expect(expandedCardRule).toContain("env(safe-area-inset-left)");
    expect(expandedCardRule).toContain("z-index: 2147483000");
    expect(expandedCardRule).toContain("background: #f7f4ec");
    expect(expandedCanvasRule).toContain("touch-action: none");
  });

  it("uses one touch to pan only from blank space while expanded", () => {
    const normalCanvasRule = rulesContaining(".workspace-canvas")
      .find((body) => body.includes("min-height: clamp")) ?? "";

    expect(component).toContain("shouldPanExpandedTouch");
    expect(component).toContain('event.pointerType === "touch"');
    expect(component).toContain("startedOnCanvasSurface");
    expect(component).toContain(
      'event.button !== 0 || event.pointerType === "touch"',
    );
    expect(normalCanvasRule).not.toContain("touch-action: none");
    expect(component).not.toContain("activeTouchPointsRef");
    expect(component).not.toContain("startWorkspaceTouchPan");
  });

  it("restores page scroll and releases interactions on minimize or Escape", () => {
    expect(component).toContain('body.style.position = "fixed"');
    expect(component).toContain("window.scrollTo(scrollX, scrollY)");
    expect(component).toContain('event.key !== "Escape"');
    expect(component).toContain("releaseCanvasInteractions()");
    expect(component).toContain("dragState.element.releasePointerCapture");
    expect(component).toContain("resizeState.element.releasePointerCapture");
    expect(component).toContain("cancelActiveConnection()");
  });
});
