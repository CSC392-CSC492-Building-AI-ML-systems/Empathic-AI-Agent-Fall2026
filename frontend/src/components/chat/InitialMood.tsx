import { PlusIcon } from '../buttons/Icons';
import type { Mood } from '../../types/chat';

const MOODS: Mood[] = ['great', 'good', 'alright', 'terrible'];

interface InitialMoodProps {
	onSelectMood: (mood: Mood) => void;
}

export function InitialMood({ onSelectMood }: InitialMoodProps) {
	return (
		<div className="grid grid-cols-2 gap-3 w-80">
		{MOODS.map((mood) => (
			<button
			key={mood}
			onClick={() => onSelectMood(mood)}
			className="flex items-center justify-between px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-full text-sm text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-gray-400 dark:hover:border-slate-600 transition-all"
			>
			<PlusIcon />
			<span className="font-medium">{mood}</span>
			</button>
		))}
		</div>
	);
}