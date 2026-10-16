import { z } from "zod";

const schema = z.object({
  soilPercent: z.number().min(0).max(100).nullable(),
  temperature: z.number().min(-40).max(85).nullable(),
  humidity: z.number().min(0).max(100).nullable(),
  relay: z.enum(["ON", "OFF"]),
  dhtOk: z.boolean(),
});

type Recommendation = {
  action: "water_now" | "monitor" | "do_not_water" | "check_sensor";
  title: string;
  explanation: string;
  durationMinutes: number;
  confidence: "low" | "medium" | "high";
  factors: string[];
};

function ruleBased(data: z.infer<typeof schema>): Recommendation {
  if (data.soilPercent === null || !data.dhtOk) return { action: "check_sensor", title: "Check the sensors", explanation: "A reliable recommendation needs valid soil and DHT22 readings.", durationMinutes: 0, confidence: "low", factors: ["Missing or invalid sensor data"] };
  if (data.soilPercent < 15) return { action: "water_now", title: "Supervised watering recommended", explanation: "Soil moisture is critically low. Verify that the probe is calibrated, then run a short supervised cycle.", durationMinutes: 5, confidence: "high", factors: [`Soil moisture ${data.soilPercent}%`, `Temperature ${data.temperature ?? "unknown"} C`] };
  if (data.soilPercent < 25) return { action: "water_now", title: "Watering recommended", explanation: "Moisture is below the configured safe threshold. Start with a short cycle and recheck the soil.", durationMinutes: 3, confidence: "medium", factors: [`Soil moisture ${data.soilPercent}%`] };
  if (data.soilPercent > 60) return { action: "do_not_water", title: "Do not water now", explanation: "The soil already contains sufficient moisture; additional watering risks saturation.", durationMinutes: 0, confidence: "high", factors: [`Soil moisture ${data.soilPercent}%`] };
  return { action: "monitor", title: "Moisture is healthy", explanation: "No irrigation is needed. Continue monitoring for changes.", durationMinutes: 0, confidence: "high", factors: [`Soil moisture ${data.soilPercent}%`] };
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid sensor readings" }, { status: 400 });
  const fallback = ruleBased(parsed.data);
  const endpoint = process.env.SOIL_AZURE_OPENAI_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.SOIL_AZURE_OPENAI_API_KEY ?? process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.SOIL_AZURE_OPENAI_DEPLOYMENT ?? process.env.AZURE_OPENAI_DEPLOYMENT;
  if (!endpoint || !apiKey || !deployment) return Response.json({ ...fallback, source: "rules" });

  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=2024-10-21`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        temperature: 0.1,
        max_tokens: 280,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "irrigation_recommendation",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                action: { type: "string", enum: ["water_now", "monitor", "do_not_water", "check_sensor"] },
                title: { type: "string" },
                explanation: { type: "string" },
                durationMinutes: { type: "number", minimum: 0, maximum: 10 },
                confidence: { type: "string", enum: ["low", "medium", "high"] },
                factors: { type: "array", maxItems: 5, items: { type: "string" } },
              },
              required: ["action", "title", "explanation", "durationMinutes", "confidence", "factors"],
            },
          },
        },
        messages: [
          { role: "system", content: "You are a cautious irrigation adviser. Follow these safety rules: invalid sensors => check_sensor and 0 minutes; soil below 15% => water_now for at most 5 minutes after calibration is verified; soil 15-24% => water_now for at most 3 minutes; soil above 60% => do_not_water and 0 minutes; otherwise monitor and 0 minutes. Never claim to start equipment. Always mention that a person should verify probe calibration before watering. Return only the required JSON schema." },
          { role: "user", content: JSON.stringify(parsed.data) },
        ],
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Azure OpenAI returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const payload = await response.json();
    const candidate = JSON.parse(payload.choices?.[0]?.message?.content ?? "null");
    const validated = z.object({ action: z.enum(["water_now", "monitor", "do_not_water", "check_sensor"]), title: z.string().max(100), explanation: z.string().max(500), durationMinutes: z.number().min(0).max(10), confidence: z.enum(["low", "medium", "high"]), factors: z.array(z.string().max(100)).max(5) }).parse(candidate);
    return Response.json({ ...validated, source: "azure-openai" });
  } catch (error) {
    console.error("[recommendations] Azure OpenAI fallback:", error instanceof Error ? error.message : error);
    return Response.json({ ...fallback, source: "rules", warning: "AI service unavailable; safe local rules were used." });
  }
}
