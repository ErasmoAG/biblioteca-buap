import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json({ mensaje: "Conectado a Supabase", hora: result.rows[0] });
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));