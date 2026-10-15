import fs from "node:fs";
import path from "node:path";
import solc from "solc";

export function compile() {
  const sourcePath = path.resolve("contracts/SensorAudit.sol");
  const input = {
    language: "Solidity",
    sources: { "SensorAudit.sol": { content: fs.readFileSync(sourcePath, "utf8") } },
    settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((item) => item.severity === "error");
  if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
  return output.contracts["SensorAudit.sol"].SensorAudit;
}
