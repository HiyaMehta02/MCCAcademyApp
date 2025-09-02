import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testConnection() {

    const { data, error } = await supabase.from('student').select('*');

    if (error) {
    console.error('Error fetching students:', error);
    } else {
    console.log('Student data:', data);
    }
}

testConnection();
