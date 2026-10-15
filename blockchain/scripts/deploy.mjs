import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";
import { compile } from "./compiler.mjs";

const rpcUrl = process.env.BLOCKCHAIN_RPC_URL ?? "https://rpc-amoy.polygon.technology";
const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
if (!privateKey) throw new Error("Set BLOCKCHAIN_PRIVATE_KEY to a funded Polygon Amoy wallet key.");

const contract = compile();
const wallet = new Wallet(privateKey, new JsonRpcProvider(rpcUrl));
const balance = await wallet.provider.getBalance(wallet.address);
if (balance === 0n) throw new Error(`Wallet ${wallet.address} has no Amoy POL. Fund it from the Polygon faucet first.`);

const deployed = await new ContractFactory(contract.abi, `0x${contract.evm.bytecode.object}`, wallet).deploy();
await deployed.waitForDeployment();
console.log(JSON.stringify({ network: "polygon-amoy", owner: wallet.address, contractAddress: await deployed.getAddress() }));
