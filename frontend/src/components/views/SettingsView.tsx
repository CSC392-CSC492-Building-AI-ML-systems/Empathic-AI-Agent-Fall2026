import { ChangeEvent, SyntheticEvent, useState } from 'react';
import type { Theme } from '../../types/chat';

interface PFPChooserProps {
	title: string;
	currentPFP: string | null;
	onSelectPFP?: (src: string | null) => void;
	resetLabel?: string;
}

interface SettingsViewProps {
	onBackToChat: () => void;
	theme?: Theme;
	onToggleTheme: () => void;
	samPFP?: string | null;
	onSelectSamPFP?: (src: string | null) => void;
	userPFP?: string | null;
	onSelectUserPFP?: (src: string | null) => void;
	samName?: string;
	onChangeSamName?: (name: string) => void;
}

const makeEmojiAvatar = (emoji, bgColor) =>
	`data:image/svg+xml;utf8,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${bgColor}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="36">${emoji}</text></svg>`
	)}`;

const PFP_PRESETS = [
	{
		id: 'happy',
		label: 'Happy',
		src: makeEmojiAvatar('😃', '#fef3c7'),
	},
	{
		id: 'smile',
		label: 'Smile',
		src: makeEmojiAvatar('😊', '#e0f2fe'),
	},
	{
		id: 'muscles',
		label: 'Muscles',
		src: makeEmojiAvatar('💪', '#ede9fe'),
	},
];

// for choosing pfp's for sam or the user
function PFPChooser({ 
	title, 
	currentPFP, 
	onSelectPFP, 
	resetLabel = 'Reset to default icon'
	}: PFPChooserProps) {

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !file.type.startsWith('image/')) return;

		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') {
				onSelectPFP?.(reader.result);
			}
		};
		reader.readAsDataURL(file);
		e.target.value = '';
	};

	return (
		<div className="bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 rounded-2xl py-7 px-8 shadow-xs space-y-5">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
						{title}
					</h2>
				</div>

				{currentPFP && (
					<button
						type="button"
						onClick={() => onSelectPFP?.(null)}
						className="text-xs font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white underline cursor-pointer"
					>
						{resetLabel}
					</button>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-4">
				{PFP_PRESETS.map((preset) => {
					const isSelected = currentPFP === preset.src;
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectPFP?.(preset.src)}
							title={preset.label}
							aria-label={preset.label}
							aria-pressed={isSelected}
							className={`p-1 rounded-full border-2 transition-all cursor-pointer ${
								isSelected
									? 'border-purple-600 dark:border-indigo-400 scale-105'
									: 'border-transparent hover:border-gray-300 dark:hover:border-slate-600'
							}`}
						>
							<img
								src={preset.src}
								alt={preset.label}
								className="w-12 h-12 rounded-full object-cover"
							/>
						</button>
					);
				})}

				<label className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer">
					Upload Image
					<input
						type="file"
						accept="image/*"
						onChange={handleFileChange}
						className="hidden"
					/>
				</label>
			</div>
		</div>
	);
}

export function SettingsView({
	onBackToChat, 
	theme = 'light', 
	onToggleTheme, 
	samPFP = null, 
	onSelectSamPFP, 
	userPFP = null, 
	onSelectUserPFP,
	samName = 'Sam',
	onChangeSamName
	}: SettingsViewProps) {

    const isDark = theme === 'dark';
	const [nameInput, setNameInput] = useState(samName);
	const [savedNotice, setSavedNotice] = useState(false);

	const handleNameSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		const cleaned = nameInput.trim() || 'Sam';
		onChangeSamName?.(cleaned);
		setNameInput(cleaned);
		setSavedNotice(true);
		setTimeout(() => setSavedNotice(false), 2000);
	};

	const handleResetName = () => {
		onChangeSamName?.('Sam');
		setNameInput('Sam');
	};

    return (
		<div className="flex-1 flex flex-col justify-start px-12 py-10 overflow-y-auto max-w-4xl w-full mx-auto">
			<h1 className="text-center text-3xl font-bold text-gray-900 dark:text-slate-100 mb-8">
				Settings
			</h1>

			<div className="space-y-6">
				{/* light/dark mode */}
				<div className="flex items-center justify-between gap-6 bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 rounded-2xl py-7 px-8 shadow-xs">
					<div className="space-y-1.5">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
							Current Theme: {isDark ? 'Dark Mode' : 'Light Mode'}
						</h2>
					</div>

					<button
						type="button"
						role="switch"
						aria-checked={isDark}
						onClick={onToggleTheme}
						className="px-6 py-3.5 rounded-xl text-sm font-medium bg-gray-900 text-white dark:bg-indigo-500 dark:text-white hover:opacity-90 transition-colors cursor-pointer shrink-0"
					>
						{isDark ? 'Light Mode' : 'Dark Mode'}
					</button>
				</div>

				{/* sam's (agent's) name */}
				<div className="bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 rounded-2xl py-7 px-8 shadow-xs space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="space-y-1">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
								Agent Name
							</h2>
						</div>

						{samName !== 'Sam' && (
							<button
								type="button"
								onClick={handleResetName}
								className="text-xs font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white underline cursor-pointer"
							>
								Reset to default
							</button>
						)}
					</div>

					<form onSubmit={handleNameSubmit} className="flex items-center gap-3">
						<input
							type="text"
							value={nameInput}
							onChange={(e) => setNameInput(e.target.value)}
							maxLength={30}
							placeholder="Enter a name..."
							className="flex-1 bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-gray-400 dark:focus:border-slate-500 transition-colors"
						/>
						<button
							type="submit"
							className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white dark:bg-indigo-500 dark:text-white hover:opacity-90 transition-colors cursor-pointer shrink-0"
						>
							Save
						</button>
					</form>

					{savedNotice && (
						<p className="text-xs text-emerald-600 dark:text-emerald-400">
							Saved! Your agent's name is now {samName}.
						</p>
					)}
				</div>

				{/* sam's pfp */}
				<PFPChooser
					title="Sam's Profile Picture"
					currentPFP={samPFP}
					onSelectPFP={onSelectSamPFP}
				/>

				{/* user's pfp */}
				<PFPChooser
					title="Your Profile Picture"
					currentPFP={userPFP}
					onSelectPFP={onSelectUserPFP}
				/>
			</div>

			<button
				type="button"
				onClick={onBackToChat}
				className="w-full text-center text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mt-8 transition-colors"
			>
				Back
			</button>
		</div>
	);
}