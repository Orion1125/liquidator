import pino from "pino";

export function getLogger(name: string) {
  const level = (process.env.LOG_LEVEL || "info") as pino.Level;
  // Prefer JSON output in production; pretty print for dev
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    return pino({ name, level });
  }
  return pino({
    name,
    level,
    transport: {
      target: "pino-pretty",
      options: { colorize: true }
    }
  });
}