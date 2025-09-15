// // server.js
// import express from "express";
// import bodyParser from "body-parser";
// import cors from "cors";

// const app = express();
// app.use(cors({ origin: "http://localhost:5173", credentials: true }));
// app.use(bodyParser.json());

// // dummy user
// const dummyUser = {
//   username: "admin",
//   password: "123456", // plaintext untuk testing
// };

// let session = { loggedIn: false };

// app.post("/api/login", (req, res) => {
//   const { username, password } = req.body;
//   if (username === dummyUser.username && password === dummyUser.password) {
//     session.loggedIn = true;
//     return res.json({ success: true, message: "Login berhasil" });
//   }
//   return res.json({ success: false, message: "Username/password salah" });
// });

// app.get("/api/logout", (req, res) => {
//   session.loggedIn = false;
//   res.json({ success: true });
// });

// app.get("/api/session", (req, res) => {
//   res.json({ loggedIn: session.loggedIn });
// });

// app.listen(5000, () => {
//   console.log("Dummy API running at http://localhost:5000");
// });
