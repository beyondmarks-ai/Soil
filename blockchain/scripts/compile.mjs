import fs from "node:fs";
import { compile } from "./compiler.mjs";

const contract = compile();
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/SensorAudit.json", JSON.stringify({ abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}` }, null, 2));
console.log("Compiled SensorAudit.sol");
