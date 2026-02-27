import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { devices } from "../src/lib/db/schema";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function createTestDevice() {
  const deviceCode = "TEST123456"; // 10 characters
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in .env.local");
    process.exit(1);
  }
  
  try {
    await db.insert(devices).values({
      code: deviceCode,
      userId: null, // Unclaimed, so you can use it without registration
      name: null,
      createdAt: new Date(),
    });
    
    console.log(`✅ Test device created: ${deviceCode}`);
    console.log(`\n📱 Mobile app route: /device/${deviceCode}/edit`);
    console.log(`🌐 Web app route: http://localhost:3000/app/device/${deviceCode}`);
    console.log(`\n💡 Make sure your Pi's config.json has deviceCode: "${deviceCode}"`);
  } catch (error: any) {
    if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      console.log(`ℹ️  Device ${deviceCode} already exists - you're good to go!`);
    } else {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  }
  
  process.exit(0);
}

createTestDevice();
