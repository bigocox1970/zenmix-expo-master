import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Sound } from '../types/mixer';

export function useSoundPicker() {
  const [isSoundPickerVisible, setIsSoundPickerVisible] = useState(false);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSoundsAndCategories = async () => {
    try {
      setIsLoading(true);
      
      const { data: audioData, error: audioError } = await supabase
        .from('audio_tracks')
        .select('*')
        .order('name');
        
      if (audioError) throw audioError;
      
      if (Array.isArray(audioData)) {
        const formattedSounds = audioData.map(sound => {
          const name = typeof sound.name === 'string' ? sound.name : String(sound.name || '');
          const category = typeof sound.category === 'string' ? 
            sound.category : 
            String(sound.category || 'music');
          const url = typeof sound.url === 'string' ? sound.url : String(sound.url || '');
          
          return {
            id: sound.id,
            name,
            url,
            category
          };
        });
        
        const uniqueCategories = [...new Set(formattedSounds.map(sound => sound.category))];
        setCategories(['All', ...uniqueCategories]);
        setSounds(formattedSounds);
        
        console.log('Loaded sounds:', formattedSounds.length);
      }
    } catch (error) {
      console.error('Error fetching sounds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredSounds = () => {
    return sounds.filter(sound => {
      const matchesCategory = selectedCategory === 'All' || sound.category === selectedCategory;
      const matchesSearch = sound.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  return {
    isSoundPickerVisible,
    setIsSoundPickerVisible,
    selectedTrackIndex,
    setSelectedTrackIndex,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    categories,
    sounds,
    isLoading,
    fetchSoundsAndCategories,
    getFilteredSounds,
  };
}

// Default export for routing
export default useSoundPicker; 