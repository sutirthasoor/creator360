// Usage: node scripts/make-admin.js you@example.com super_admin
//        node scripts/make-admin.js ops@example.com admin partners,finance
// Run from the server folder. Uses the service-account key set in server/.env.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { loadEnvFile } from "../src/config.js";

const [email, role = "admin", perms = ""] = process.argv.slice(2);
if (!email || !["super_admin", "admin"].includes(role)) {
  console.error("Usage: node scripts/make-admin.js <email> <super_admin|admin> [partners,finance]");
  process.exit(1);
}
loadEnvFile(); // reads server/.env so GOOGLE_APPLICATION_CREDENTIALS is picked up
initializeApp();
const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, { role, perms: perms.split(",").filter(Boolean) });
console.log(`${email} is now ${role}${perms ? ` (${perms})` : ""}. They must sign out and in again.`);
