import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

// Use the application's TypeScript and alias resolution, without a DOM or React mount.
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
let createLayoutTools;
try {
  ({ createLayoutTools } = await server.ssrLoadModule(
    "/features/simulator/browser-tools/create-layout-tools.ts",
  ));
} finally {
  await server.close();
}

function box(id, change = {}) {
  return {
    id,
    name: id,
    kind: "box",
    supportId: null,
    x: 0,
    y: 0,
    z: 0,
    width: 10,
    depth: 10,
    height: 10,
    ...change,
  };
}

function setup(initialItems = []) {
  let desk = { width: 100, depth: 60, height: 73 };
  let items = initialItems;
  let selectedId = null;
  let updates = 0;
  const tools = createLayoutTools({
    getDesk: () => desk,
    getItems: () => items,
    setItems: (next) => {
      items = next;
    },
    selectItem: (id) => {
      selectedId = id;
    },
    createId: () => "new-item",
    afterUpdate: async () => {
      updates++;
    },
  });
  return {
    execute: (name, input = {}) =>
      tools.find((tool) => tool.name === name).execute(input),
    get items() {
      return items;
    },
    get selectedId() {
      return selectedId;
    },
    get updates() {
      return updates;
    },
    replace: (nextDesk, nextItems) => {
      desk = nextDesk;
      items = nextItems;
    },
  };
}

test("registered read handler reads the latest layout and resolves support coordinates", () => {
  const state = setup();
  const desk = { width: 120, depth: 70, height: 75 };
  state.replace(desk, [
    box("base", { x: 20, y: 15, width: 40, depth: 30 }),
    box("child", { supportId: "base", x: 2, y: 3 }),
  ]);
  const result = state.execute("read_desk_layout");
  assert.deepEqual(result.desk, desk);
  assert.deepEqual(result.items[1].world, { x: 22, y: 18, z: 10 });
});

test("addition commits and selects the placed object before completing", async () => {
  const state = setup();
  const result = await state.execute("add_desk_object", {
    name: "  Book  ",
    width: 10,
    depth: 10,
    height: 5,
  });
  assert.equal(result.item.name, "Book");
  assert.equal(state.items[0].id, "new-item");
  assert.equal(state.selectedId, "new-item");
  assert.equal(state.updates, 1);
});

test("invalid dimensions or a missing support reject addition without changing state", async () => {
  const state = setup();
  for (const patch of [
    { width: 0 },
    { height: Infinity },
    { name: " " },
    { supportId: "missing" },
  ]) {
    await assert.rejects(() =>
      state.execute("add_desk_object", {
        name: "Book",
        width: 10,
        depth: 10,
        height: 5,
        ...patch,
      }),
    );
  }
  assert.deepEqual(state.items, []);
  assert.equal(state.selectedId, null);
  assert.equal(state.updates, 0);
});

test("an occupied desk rejects addition without overwriting existing objects", async () => {
  const original = [box("full", { width: 100, depth: 60 })];
  const state = setup(original);
  await assert.rejects(() =>
    state.execute("add_desk_object", {
      name: "Book",
      width: 10,
      depth: 10,
      height: 5,
    }),
  );
  assert.equal(state.items, original);
});

test("movement converts world coordinates to coordinates relative to the support", async () => {
  const state = setup([
    box("base", { x: 20, y: 15, width: 40, depth: 30 }),
    box("child", { supportId: "base" }),
  ]);
  await state.execute("move_desk_object", { id: "child", x: 25, y: 22 });
  assert.equal(state.items[1].x, 5);
  assert.equal(state.items[1].y, 7);
  assert.equal(state.selectedId, "child");
});

test("a colliding movement rejects the change and preserves selection", async () => {
  const original = [box("first"), box("second", { x: 20 })];
  const state = setup(original);
  await assert.rejects(() =>
    state.execute("move_desk_object", { id: "first", x: 20, y: 0 }),
  );
  assert.equal(state.items, original);
  assert.equal(state.selectedId, null);
});

test("placing on a support changes elevation and rejects a subsequent support cycle", async () => {
  const state = setup([
    box("base", { width: 40, depth: 30 }),
    box("child", { x: 50 }),
  ]);
  await state.execute("place_desk_object_on", {
    id: "child",
    supportId: "base",
  });
  assert.equal(state.items[1].supportId, "base");
  assert.equal(state.execute("read_desk_layout").items[1].world.z, 10);
  const placed = state.items;
  await assert.rejects(() =>
    state.execute("place_desk_object_on", { id: "base", supportId: "child" }),
  );
  assert.equal(state.items, placed);
});
