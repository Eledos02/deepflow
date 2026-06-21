export const DEFAULT_COLLAPSED_SESSION_COUNT = 5;

export function getVisibleSessionListItems<T>(
  items: readonly T[],
  isExpanded: boolean,
  initialVisibleCount = DEFAULT_COLLAPSED_SESSION_COUNT,
) {
  return isExpanded ? [...items] : items.slice(0, initialVisibleCount);
}

export function hasHiddenSessionListItems(
  totalCount: number,
  initialVisibleCount = DEFAULT_COLLAPSED_SESSION_COUNT,
) {
  return totalCount > initialVisibleCount;
}
