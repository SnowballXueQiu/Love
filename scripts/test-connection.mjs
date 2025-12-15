import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually since we don't have dotenv installed
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2].trim();
    }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

console.log(`Testing connection to: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('\n--- 1. Testing Database Connection ---');
    const { data: settings, error: dbError } = await supabase
        .from('settings')
        .select('*')
        .limit(1);

    if (dbError) {
        console.error('❌ Database connection failed:', dbError.message);
    } else {
        console.log('✅ Database connection successful!');
        console.log('   Found settings:', settings ? settings.length : 0, 'rows');
    }

    console.log('\n--- 2. Testing Storage Buckets (Upload Test) ---');
    
    // Try to upload a dummy file to 'photos' to verify access
    const dummyFileName = `test-${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('photos')
        .upload(dummyFileName, 'Test file content', {
            upsert: true
        });

    if (uploadError) {
        console.error('❌ Upload failed:', uploadError.message);
        console.log('   (This might mean the bucket does not exist or policies are wrong)');
    } else {
        console.log('✅ Upload successful to "photos" bucket!');
        console.log('   File:', uploadData.path);
        
        // Clean up
        await supabase.storage.from('photos').remove([dummyFileName]);
        console.log('   (Test file cleaned up)');
    }
}

testConnection();
