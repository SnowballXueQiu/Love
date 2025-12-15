-- Add module visibility columns to settings table
ALTER TABLE settings 
ADD COLUMN show_countdown BOOLEAN DEFAULT TRUE,
ADD COLUMN show_blessing BOOLEAN DEFAULT TRUE,
ADD COLUMN show_message_board BOOLEAN DEFAULT TRUE,
ADD COLUMN show_photo_wall BOOLEAN DEFAULT TRUE,
ADD COLUMN show_music_player BOOLEAN DEFAULT TRUE,
ADD COLUMN show_map BOOLEAN DEFAULT TRUE;
