import { test } from "vitest";

/** Stable IDs connect concrete assertions to the independently maintained human specification. */
export function spec(
  id: string,
  title: string,
  when: string,
  then: string,
  run: () => unknown | Promise<unknown>,
) {
  test(`${id} ${title}`, run);
}
