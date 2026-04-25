import { fetchJson, nodeUrl, printJson } from "../client";
import type { NodeInfo } from "../types";

const TEMPLATE = `# Routstr Node Agent Instructions

## Identity
You are interacting with a Routstr node — a payment proxy for permissionless AI inference.
Node: {name} — {description}

## Connection
- Node URL: {node_url}
- API: OpenAI-compatible (POST /v1/chat/completions)
- Payment: Cashu ecash tokens, Lightning Network

## Available Operations

### 1. Check Available Models
\`\`\`
GET {node_url}/v1/models
\`\`\`
Returns a list of models with pricing (cost per 1K input/output tokens in msats).

### 2. Check Balance
\`\`\`
GET {node_url}/v1/balance
Headers: Authorization: Bearer <api_key>
\`\`\`
Returns current balance and reserved amount in msats.

### 3. Make an Inference Request
\`\`\`
POST {node_url}/v1/chat/completions
Headers:
  Authorization: Bearer <cashu_token_or_api_key>
  Content-Type: application/json
Body: {"model": "<model_id>", "messages": [{"role": "user", "content": "..."}]}
\`\`\`
Standard OpenAI chat completion format. Supports streaming with \`"stream": true\`.

### 4. Node Info
\`\`\`
GET {node_url}/v1/info
\`\`\`
Returns node name, version, npub, and supported mints.

## Payment Flow
1. Obtain Cashu tokens from a supported mint: {mints}
2. Include token in Authorization header: \`Bearer <cashu_token>\`
3. Node deducts cost based on model pricing and token usage
4. Change (remaining balance) returned via x-cashu response header

## Error Codes
- 402: Insufficient payment / balance
- 429: Rate limited
- 503: No upstream provider available
- 500: Upstream provider error (details in response body)

## Tips
- Always GET /v1/models first to discover available models and current pricing
- Use streaming for long responses to get faster time-to-first-token
- Check /v1/info to verify node identity and supported payment mints
`;

function fillTemplate(name: string, description: string, url: string, mints: string): string {
  return TEMPLATE.replaceAll("{name}", name)
    .replaceAll("{description}", description)
    .replaceAll("{node_url}", url)
    .replaceAll("{mints}", mints);
}

export async function instructCommand(opts: { format?: string }): Promise<void> {
  const info = await fetchJson<NodeInfo>("/v1/info");
  const name = info?.name ?? "Routstr Node";
  const description = info?.description ?? "A Routstr Node";
  const mints = info?.mints ?? [];
  const url = nodeUrl();

  const text = fillTemplate(
    name,
    description,
    url,
    mints.length ? mints.join(", ") : "none configured",
  );

  const format = opts.format ?? "text";

  if (format === "json") {
    printJson({ instruction: text, node_url: url, name, description, mints });
  } else if (format === "openai") {
    printJson({ role: "system", content: text });
  } else {
    console.log(text);
  }
}
