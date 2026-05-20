const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "web", ".next");
if (fs.existsSync(target)) {
  console.log("Found .next folder, deleting...");
  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log("Successfully deleted .next folder!");
  } catch (err) {
    console.error("Error during deletion:", err.message);
  }
} else {
  console.log(".next folder does not exist.");
}
