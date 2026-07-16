/**
 * React output adapter — presentation *tree* descriptors (no JSX in this module).
 * Surfaces map node types to real components using design-system tokens.
 */

import type {
  PresentationBlock,
  ReactPresentationNode,
  ReactRenderOutput,
  RendererThemeContext,
} from "./types";

function blockToNode(block: PresentationBlock): ReactPresentationNode {
  return {
    type: `Renderer.${block.kind}`,
    props: {
      id: block.id,
      title: block.title,
      subtitle: block.subtitle,
      themeHints: block.themeHints,
      a11yLabel: block.a11yLabel,
      model: block,
    },
  };
}

export function toReactOutput(
  blocks: PresentationBlock[],
  theme: RendererThemeContext
): ReactRenderOutput {
  return {
    outputType: "react",
    theme,
    tree: [
      {
        type: "Renderer.Root",
        props: {
          mode: theme.mode,
          themeId: theme.themeId,
          cssVariables: theme.cssVariables,
          a11y: theme.a11y,
          responsive: true,
        },
        children: blocks.map(blockToNode),
      },
    ],
    blocks,
  };
}
