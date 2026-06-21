import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CollapsibleSessionListControl } from "./collapsible-session-list-control";

describe("CollapsibleSessionListControl", () => {
  it("exposes its collapsed state and controlled list to assistive technology", () => {
    const markup = renderToStaticMarkup(
      <CollapsibleSessionListControl
        collapseLabel="Collapse sessions"
        controlsId="recent-sessions-list"
        expandLabel="Show all sessions"
        isExpanded={false}
        onExpandedChange={() => undefined}
        totalCount={6}
      />,
    );

    expect(markup).toContain('aria-controls="recent-sessions-list"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Show all sessions");
  });

  it("does not render a control when five items are already fully visible", () => {
    const markup = renderToStaticMarkup(
      <CollapsibleSessionListControl
        collapseLabel="Collapse sessions"
        controlsId="recent-sessions-list"
        expandLabel="Show all sessions"
        isExpanded={false}
        onExpandedChange={() => undefined}
        totalCount={5}
      />,
    );

    expect(markup).toBe("");
  });
});
