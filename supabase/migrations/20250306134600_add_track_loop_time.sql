/*
  # Add loop_time to tracks in mixes_v2

  1. Changes
    - Add loop_time field to each track in the tracks JSONB array
    - Default loop_time to 1 minute for existing tracks
    
  2. Migration Strategy
    - Update existing tracks to include loop_time
    - Ensure new tracks will have loop_time field
*/

-- Update existing tracks to include loop_time if they don't have it
UPDATE mixes_v2
SET tracks = (
  SELECT jsonb_agg(
    CASE 
      WHEN track->>'loop_time' IS NULL 
      THEN track || jsonb_build_object('loop_time', 1)
      ELSE track 
    END
  )
  FROM jsonb_array_elements(tracks) track
)
WHERE tracks IS NOT NULL;

-- Add a trigger to ensure new tracks always have loop_time
CREATE OR REPLACE FUNCTION ensure_track_loop_time()
RETURNS trigger AS $$
BEGIN
  NEW.tracks = (
    SELECT jsonb_agg(
      CASE 
        WHEN track->>'loop_time' IS NULL 
        THEN track || jsonb_build_object('loop_time', 1)
        ELSE track 
      END
    )
    FROM jsonb_array_elements(NEW.tracks) track
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_track_loop_time_trigger ON mixes_v2;

CREATE TRIGGER ensure_track_loop_time_trigger
  BEFORE INSERT OR UPDATE ON mixes_v2
  FOR EACH ROW
  EXECUTE FUNCTION ensure_track_loop_time(); 