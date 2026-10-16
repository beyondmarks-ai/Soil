import { EmailClient } from "@azure/communication-email";
import { SmsClient } from "@azure/communication-sms";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1).max(40),
  message: z.string().min(1).max(500),
  severity: z.enum(["warning", "critical"]),
  deviceId: z.string().min(1).max(100).default("local-arduino"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid notification" }, { status: 400 });
  const connection = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  if (!connection) return Response.json({ email: "not-configured", sms: "not-configured" }, { status: 503 });
  const subject = `[Soil Agri ${parsed.data.severity.toUpperCase()}] ${parsed.data.code}`;
  const results: Record<string, string> = {};

  const emailTo = process.env.ALERT_EMAIL_TO;
  const sender = process.env.ACS_EMAIL_SENDER;
  if (emailTo && sender) {
    try {
      const poller = await new EmailClient(connection).beginSend({ senderAddress: sender, recipients: { to: [{ address: emailTo }] }, content: { subject, plainText: `${parsed.data.message}\nDevice: ${parsed.data.deviceId}\nTime: ${new Date().toISOString()}` } });
      const result = await poller.pollUntilDone();
      results.email = result.status;
    } catch (error) { results.email = error instanceof Error ? `failed: ${error.message}` : "failed"; }
  } else results.email = "not-configured";

  const phoneTo = process.env.ALERT_PHONE_TO;
  const smsFrom = process.env.ACS_SMS_FROM;
  if (phoneTo && smsFrom) {
    try {
      const [result] = await new SmsClient(connection).send({ from: smsFrom, to: [phoneTo], message: `${subject}: ${parsed.data.message}` });
      results.sms = result?.successful ? "Succeeded" : `failed: ${result?.errorMessage ?? "unknown"}`;
    } catch (error) { results.sms = error instanceof Error ? `failed: ${error.message}` : "failed"; }
  } else results.sms = "not-configured";
  return Response.json(results);
}
