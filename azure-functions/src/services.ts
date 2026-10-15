import { CosmosClient, type Container } from "@azure/cosmos";
import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { createHmac } from "node:crypto";

const databaseName = process.env.COSMOS_DATABASE ?? "soil-agri";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

let cosmos: CosmosClient | undefined;
export function container(name: "telemetry" | "alerts" | "audit" | "deviceState" | "settings"): Container {
  cosmos ??= new CosmosClient(required("COSMOS_CONNECTION_STRING"));
  return cosmos.database(databaseName).container(name);
}

let webPubSub: WebPubSubServiceClient | undefined;
export function realtime(): WebPubSubServiceClient {
  if (!webPubSub) webPubSub = new WebPubSubServiceClient(required("WEB_PUBSUB_CONNECTION_STRING"), process.env.WEB_PUBSUB_HUB ?? "farm");
  return webPubSub;
}

export async function sendDeviceCommand(deviceId: string, payload: Record<string, unknown>) {
  const values = Object.fromEntries(required("IOT_HUB_SERVICE_CONNECTION").split(";").map((part) => {
    const separator = part.indexOf("=");
    return [part.slice(0, separator), part.slice(separator + 1)];
  })) as Record<string, string>;
  const host = values.HostName;
  const keyName = values.SharedAccessKeyName;
  const key = values.SharedAccessKey;
  if (!host || !keyName || !key) throw new Error("IOT_HUB_SERVICE_CONNECTION is invalid");
  const resource = `${host}/devices/${deviceId}`.toLowerCase();
  const expiry = Math.floor(Date.now() / 1000) + 300;
  const encoded = encodeURIComponent(resource);
  const signature = createHmac("sha256", Buffer.from(key, "base64")).update(`${encoded}\n${expiry}`).digest("base64");
  const token = `SharedAccessSignature sr=${encoded}&sig=${encodeURIComponent(signature)}&se=${expiry}&skn=${encodeURIComponent(keyName)}`;
  const response = await fetch(`https://${host}/devices/${encodeURIComponent(deviceId)}/messages/deviceBound?api-version=2021-04-12`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      "iothub-app-message-id": crypto.randomUUID(),
      "iothub-app-content-type": "application/json",
      "iothub-app-content-encoding": "utf-8",
    },
    body: JSON.stringify({ ...payload, requestedAt: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`IoT Hub rejected the device command (${response.status})`);
}

export async function sendRelayCommand(deviceId: string, enabled: boolean) {
  return sendDeviceCommand(deviceId, { type: "relay", enabled });
}

const auditAbi = ["function anchor(bytes32 digest,string batchId,uint64 timestamp) external", "function exists(bytes32 digest) view returns (bool)"];

export async function anchorHash(hash: string, batchId: string) {
  const rpc = process.env.BLOCKCHAIN_RPC_URL;
  const key = process.env.BLOCKCHAIN_PRIVATE_KEY;
  const address = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;
  if (!rpc || !key || !address) return { status: "configured-later" as const };
  const provider = new JsonRpcProvider(rpc);
  const contract = new Contract(address, auditAbi, new Wallet(key, provider));
  const tx = await contract.anchor(`0x${hash}`, batchId, Math.floor(Date.now() / 1000));
  const receipt = await tx.wait();
  return { status: "anchored" as const, transactionHash: receipt?.hash ?? tx.hash };
}
