import { mapComparison } from "../blocks";
import type { PackageComparisonModel, RendererInputBlock, TableModel } from "../types";

export function renderComparisonTable(
  block: RendererInputBlock
): PackageComparisonModel | TableModel {
  return mapComparison(block);
}

export function toMatrix(model: PackageComparisonModel): TableModel {
  return {
    id: `${model.id}_table`,
    kind: "table",
    title: model.title,
    subtitle: model.subtitle,
    themeHints: model.themeHints,
    a11yLabel: model.a11yLabel,
    columns: model.columns,
    rows: model.rows.map((row) => model.columns.map((c) => row[c] ?? null)),
  };
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "tables" as const,
  description: "Comparison / pricing table presentation models",
} as const;
