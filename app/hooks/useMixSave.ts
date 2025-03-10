import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Track } from '../types/mixer';

export function useMixSave() {
  const [isSaveMixModalVisible, setIsSaveMixModalVisible] = useState(false);
  const [mixName, setMixName] = useState('');

  const handleSaveMix = async (tracks: Track[], mixDuration: number) => {
    try {
      const activeTracks = tracks.filter(track => track.name && track.url);
      if (activeTracks.length === 0) {
        console.error('No tracks to save');
        return;
      }

      if (!mixName.trim()) {
        console.error('Mix name is required');
        return;
      }

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Prepare sanitized tracks data for JSON storage
      const sanitizedTracks = activeTracks.map(track => {
        const name = typeof track.name === 'string' ? track.name : String(track.name || '');
        const url = typeof track.url === 'string' ? track.url : String(track.url || '');
        
        // Ensure we preserve the track's specific loop time
        const loopTime = track.loopTime !== undefined ? track.loopTime : 1;
        console.log(`Saving track ${track.id} with loop time:`, loopTime);
        
        return {
          id: track.id,
          name,
          url,
          volume: track.volume || 1,
          loopTime, // Save the track's specific loop time
          isPlaying: false,
          progress: 0
        };
      });

      console.log('Saving mix with duration:', mixDuration);
      console.log('Tracks to save:', sanitizedTracks);

      // Insert into mixes_v2 table with tracks as JSON
      const { data: mix, error: mixError } = await supabase
        .from('mixes_v2')
        .insert({
          name: mixName.trim(),
          duration: Math.round(mixDuration),
          is_public: false,
          user_id: user.id,
          tracks: sanitizedTracks
        })
        .select()
        .single();

      if (mixError) throw mixError;

      console.log('Mix saved successfully:', mix);
      setIsSaveMixModalVisible(false);
      setMixName('');
      
      return mix;
    } catch (error) {
      console.error('Error saving mix:', error);
      throw error;
    }
  };

  return {
    isSaveMixModalVisible,
    setIsSaveMixModalVisible,
    mixName,
    setMixName,
    handleSaveMix,
  };
}

// Default export for routing
export default useMixSave; 