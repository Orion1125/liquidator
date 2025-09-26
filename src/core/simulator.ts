export async function simulate(tx: any) {
  // In production, use provider.call(tx) against fork
  return { profit: 0.1, gasCost: 0.002 };
}