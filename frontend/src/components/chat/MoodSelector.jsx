import { PlusIcon } from '../buttons/Icons';

const MOODS = ['great', 'good', 'alright', 'terrible'];

export function MoodSelector({ onSelectMood }) {
	return (
		<div className="grid grid-cols-2 gap-3 w-80">
		{MOODS.map((mood) => (
			<button
			key={mood}
			onClick={() => onSelectMood(mood)}
			className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-600 hover:bg-white hover:border-gray-400 transition-all"
			>
			<PlusIcon />
			<span className="font-medium">{mood}</span>
			</button>
		))}
		</div>
	);
}