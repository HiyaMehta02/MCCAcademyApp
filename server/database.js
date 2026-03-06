import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.get("/branchs", async (req, res) => {
    const { data, error } = await supabase.from("Branch").select("*");

    if (error) {
        console.log("Error fetching branch: ", error);
        res.status(500).json({ error: error.message });
    } else {
        console.log(data);
        res.json(data);
    }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});