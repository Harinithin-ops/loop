const http = require("http");

const data = JSON.stringify({
  action: "get",
  userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567802",
  otherId: "a1b2c3d4-e5f6-7890-abcd-ef1234567803"
});

const options = {
  hostname: "localhost",
  port: 8082,
  path: "/api/messages",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length
  }
};

console.log("Sending POST request to http://localhost:3005/api/messages...");
const req = http.request(options, (res) => {
  let body = "";
  console.log(`STATUS: ${res.statusCode}`);
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("Response body:");
    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch {
      console.log(body);
    }
  });
});

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
