import mysql from "mysql2/promise";

const db = await mysql.createPool({
  host: "localhost",     // ganti sesuai server
  user: "root",          // ganti sesuai user DB
  password: "",          // password MySQL
  database: "office_db", // ganti sesuai DB
});

export default db;
