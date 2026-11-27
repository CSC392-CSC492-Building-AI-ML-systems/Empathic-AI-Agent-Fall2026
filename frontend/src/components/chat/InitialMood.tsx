import { PlusIcon } from '../buttons/Icons';
import type { Mood } from '../../types/chat';
import { PRESS, FOCUS } from '../buttons/styles';

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
				className={`flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border border-gray-200 dark:border-slate-700/70 bg-white dark:bg-slate-800/80 shadow-xs hover:border-purple-300 dark:hover:border-indigo-400/60 hover:shadow-sm cursor-pointer ${PRESS} ${FOCUS}`}
			>
				<PlusIcon />
				<span className="text-sm font-medium text-gray-800 dark:text-slate-200">{mood}</span>
			</button>
		))}
		</div>
	);
}