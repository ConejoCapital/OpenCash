/**
 * OpenCash — Entry point.
 * Loads config, boots facilitator (if built-in), starts Express server.
 */

import "dotenv/config";
import { loadConfig, getNetworkCaip2 } from "./config.js";
import { bootstrapFacilitator } from "./facilitator.js";
import { createApp } from "./server.js";

async function main() {
  console.log("OpenCash — Universal x402 API Proxy\n");

  // Load config
  const configPath = process.env.OPENCASH_CONFIG;
  const config = loadConfig(configPath);
  console.log(`Loaded config: ${config.services.length} service(s), ${config.tokens.length} token(s)`);
  console.log(`Operator: ${config.operator.name}`);
  console.log(`Payment address: ${config.operator.payment_address}`);

  const network = getNetworkCaip2(config);
  const port = parseInt(process.env.PORT || "4020", 10);

  // Determine facilitator URL
  let facilitatorUrl = process.env.FACILITATOR_URL || "";

  if (!facilitatorUrl) {
    // Boot built-in facilitator
    const facilitatorPort = port + 1;
    await bootstrapFacilitator(config, network, facilitatorPort);
    facilitatorUrl = `http://localhost:${facilitatorPort}`;
  } else {
    console.log(`Using external facilitator: ${facilitatorUrl}`);
  }

  // Create and start Express app
  const app = await createApp(config, network, facilitatorUrl);

  app.listen(port, () => {
    console.log(`\nOpenCash server running on http://localhost:${port}`);
    console.log(`Discovery: http://localhost:${port}/v1/discover`);
    console.log(`Health:    http://localhost:${port}/health`);
  });
}

main().catch((err) => {
  console.error("Fatal:", err.message || err);
  process.exit(1);
});
