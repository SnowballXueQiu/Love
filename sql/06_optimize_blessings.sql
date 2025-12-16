-- Optimize blessings storage to use a single counter row instead of one row per click

-- 1. Create a new table to store the aggregate count
CREATE TABLE IF NOT EXISTS public.blessing_stats (
    id INT PRIMARY KEY DEFAULT 1,
    count INT DEFAULT 0,
    CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Initialize it with the current count from the old table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blessings') THEN
        INSERT INTO public.blessing_stats (id, count)
        SELECT 1, count(*) FROM public.blessings
        ON CONFLICT (id) DO UPDATE SET count = EXCLUDED.count;
    ELSE
        INSERT INTO public.blessing_stats (id, count) VALUES (1, 0)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END
$$;

-- 3. Create a function to increment the count atomically
CREATE OR REPLACE FUNCTION increment_blessing()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_count INT;
BEGIN
    UPDATE public.blessing_stats
    SET count = count + 1
    WHERE id = 1
    RETURNING count INTO new_count;
    
    RETURN new_count;
END;
$$;

-- 4. Grant permissions
ALTER TABLE public.blessing_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.blessing_stats
FOR SELECT USING (true);

-- Allow public update access (needed if we were updating directly, but we use RPC)
-- However, for Realtime to work and broadcast changes, the user might need read access.
-- We also need to grant execute on the function.
GRANT EXECUTE ON FUNCTION increment_blessing TO anon, authenticated, service_role;
GRANT SELECT ON public.blessing_stats TO anon, authenticated, service_role;

-- 5. Enable Realtime for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.blessing_stats;

-- 6. Drop the old table to save space
DROP TABLE IF EXISTS public.blessings;
