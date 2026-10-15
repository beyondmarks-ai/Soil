import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../scripts/compiler.mjs";

test("SensorAudit compiles with anchor and exists methods", () => {
  const contract = compile();
  assert.ok(contract.evm.bytecode.object.length > 0);
  const names = contract.abi.filter((item) => item.type === "function").map((item) => item.name);
  assert.deepEqual(names.sort(), ["anchor", "exists", "owner"]);
});
