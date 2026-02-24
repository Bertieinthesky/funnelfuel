/**
 * Creates the first Organization record.
 * Run once after deploying: npx tsx scripts/seed-org.ts
 *
 * Prints the publicKey you paste into the pixel <script> tag.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const existing = await db.organization.findFirst();
  if (existing) {
    console.log("\nOrganization already exists:");
    console.log(`  id:        ${existing.id}`);
    console.log(`  name:      ${existing.name}`);
    console.log(`  publicKey: ${existing.publicKey}`);
    console.log("\nPixel script tag:");
    console.log(`  <script src="https://app.funnelfuel.ai/pixel.js" data-org-key="${existing.publicKey}" async></script>\n`);
    return;
  }

  const org = await db.organization.create({
    data: { name: "Funnel Fuel (My Account)" },
  });

  console.log("\nOrganization created:");
  console.log(`  id:        ${org.id}`);
  console.log(`  publicKey: ${org.publicKey}`);
  console.log("\nPixel script tag:");
  console.log(`  <script src="https://app.funnelfuel.ai/pixel.js" data-org-key="${org.publicKey}" async></script>\n`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
