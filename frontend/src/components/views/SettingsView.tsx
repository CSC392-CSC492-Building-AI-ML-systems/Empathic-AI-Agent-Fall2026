import { ChangeEvent, SyntheticEvent, useState } from 'react';
import type { Theme } from '../../types/chat';

interface PFPChooserProps {
	title: string;
	description?: string;
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

const makeEmojiAvatar = (emoji: string, bgColor: string) =>
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

const CARD = 'bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 rounded-2xl py-7 px-8 shadow-xs';
const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60';
const PRIMARY_BTN = `px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white dark:bg-indigo-500 dark:text-white hover:opacity-90 transition cursor-pointer shrink-0 ${FOCUS}`;
const LINK_BTN = `text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white underline underline-offset-2 rounded cursor-pointer ${FOCUS}`;

// for choosing pfp's for sam or the user
function PFPChooser({ 
	title, 
	description,
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
		<div className={`${CARD} space-y-5`}>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
					{description && <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>}
				</div>

				{currentPFP && (
					<button type="button" onClick={() => onSelectPFP?.(null)} className={LINK_BTN}>
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
							className={`p-1 rounded-full border-2 transition-all cursor-pointer ${FOCUS} ${
								isSelected
									? 'border-purple-600 dark:border-indigo-400 scale-105'
									: 'border-transparent hover:border-gray-300 dark:hover:border-slate-600'
							}`}
						>
							<img src={preset.src} alt={preset.label} className="w-12 h-12 rounded-full object-cover" />
						</button>
					);
				})}

				<label className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer has-focus-visible:ring-2 has-focus-visible:ring-purple-500/60">
					Upload image
					{/* sr-only (not hidden) so keyboard users can still reach it */}
					<input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
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
		<div className="flex-1 overflow-y-auto">
			<div className="px-6 sm:px-12 py-10 max-w-3xl w-full mx-auto">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Settings</h1>
				<p className="text-base text-gray-600 dark:text-slate-400 mb-8">Customize :D</p>

				<div className="space-y-6">
					{/* light/dark mode */}
					<div className={`${CARD} flex flex-wrap items-center justify-between gap-6`}>
						<div className="space-y-1">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Appearance</h2>
							<p className="text-sm text-gray-500 dark:text-slate-400">
								Currently {isDark ? 'Dark' : 'Light'} mode.
							</p>
						</div>

						<button
							type="button"
							onClick={onToggleTheme}
							className={`px-6 py-3 rounded-xl text-sm font-medium bg-gray-900 text-white dark:bg-indigo-500 dark:text-white hover:opacity-90 transition cursor-pointer shrink-0 ${FOCUS}`}
						>
							Switch to {isDark ? 'light' : 'dark'} mode
						</button>
					</div>

					{/* sam's (agent's) name */}
					<div className={`${CARD} space-y-4`}>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="space-y-1">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Agent name</h2>
								<p className="text-sm text-gray-500 dark:text-slate-400">
									What would you like to call your assistant?
								</p>
							</div>

							{samName !== 'Sam' && (
								<button type="button" onClick={handleResetName} className={LINK_BTN}>
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
								aria-label="Agent name"
								className="flex-1 min-w-0 bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-base text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 transition"
							/>
							<button type="submit" className={PRIMARY_BTN}>
								Save
							</button>
						</form>

						{savedNotice && (
							<p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
								Your assistant's name is now {nameInput}.
							</p>
						)}
					</div>

					{/* sam's pfp */}
					<PFPChooser
						title="Sam's profile picture"
						description="Choose a picture for your assistant."
						currentPFP={samPFP}
						onSelectPFP={onSelectSamPFP}
					/>

					{/* user's pfp */}
					<PFPChooser
						title="Your profile picture"
						description="This appears next to your messages."
						currentPFP={userPFP}
						onSelectPFP={onSelectUserPFP}
					/>
				</div>

				<button
					type="button"
					onClick={onBackToChat}
					className={`mt-8 px-1 py-1 rounded text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer ${FOCUS}`}
				>
					← Back
				</button>
			</div>
		</div>
	);
}