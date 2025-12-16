-- Create public messages table for danmaku
CREATE TABLE IF NOT EXISTS public_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL CHECK (char_length(content) <= 30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access" ON public_messages
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON public_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete access" ON public_messages
    FOR DELETE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public_messages;
