
export interface Message {
  role: 'user' | 'model';
  text: string;
}

export type Genre = 'Fantasy' | 'Sci-Fi' | 'Mystery' | 'Romance' | 'Horror';

export interface StoryState {
  image: string | null;
  paragraphs: string[];
  genre: Genre;
  isAnalyzing: boolean;
  isNarrating: boolean;
}
