import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// chuyển import.meta.url thành __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// đường dẫn đến file
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const dbJsonPath = path.join(__dirname, "../../shared/db.json");

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
const dbJson = JSON.parse(fs.readFileSync(dbJsonPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importData() {
  for (const collectionName in dbJson) {
    const docs = dbJson[collectionName];
    for (const doc of docs) {
      const docId = doc.id;
      if (!docId) {
        console.warn(`Document trong ${collectionName} thiếu "id", bỏ qua.`);
        continue;
      }
      await db.collection(collectionName).doc(docId).set(doc);
      console.log(`Đã thêm ${collectionName}/${docId}`);
    }
  }
  console.log("Import xong!");
}

importData().catch(console.error);
