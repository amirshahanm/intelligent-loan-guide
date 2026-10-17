export function reasoningQueryKey(slotsKey: string, status: string, needText: string | null) {
  return ["reasoning", slotsKey, status, needText] as const;
}
