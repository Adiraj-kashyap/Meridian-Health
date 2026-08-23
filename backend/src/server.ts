import { app } from "./app";
import { env, isLlmConfigured, isEmailConfigured, isGoogleConfigured } from "./config/env";
import { logger } from "./lib/logger";
import { startBackgroundJobs } from "./jobs/scheduler";

app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  logger.info(
    `Integrations — LLM: ${isLlmConfigured() ? `configured (Gemini, ${env.GEMINI_MODEL})` : "NOT configured (summaries will be skipped gracefully)"}, ` +
      `Email: ${isEmailConfigured() ? "configured" : "NOT configured (notifications will queue but not send)"}, ` +
      `Google Calendar: ${isGoogleConfigured() ? "configured" : "NOT configured (sync disabled)"}`
  );
  startBackgroundJobs();
});
