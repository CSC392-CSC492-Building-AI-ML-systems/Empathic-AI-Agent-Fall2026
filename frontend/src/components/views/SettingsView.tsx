import { useState } from 'react';
import type { ChangeEvent, SyntheticEvent } from 'react';
import type { Theme } from '../../types/chat';
import { Button } from '../buttons/Button';
import { PRESS, FOCUS, CARD, PAGE, PAGE_INNER, HEADING, SUBTEXT } from '../buttons/styles';

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
	{ id: 'happy', label: 'Happy', src: makeEmojiAvatar('😃', '#fef3c7') },
	{ id: 'smile', label: 'Smile', src: makeEmojiAvatar('😊', '#e0f2fe') },
	{ id: 'muscles', label: 'Muscles', src: makeEmojiAvatar('💪', '#ede9fe') },
];

const CARD_PADDING = 'p-5 sm:p-8';
const FIELD =
	'flex-1 min-w-0 bg-gray-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 rounded-full px-5 py-2.5 text-base text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 transition';

// for choosing pfp's for sam or the user
function PFPChooser({
	title,
	description,
	currentPFP,
	onSelectPFP,
	resetLabel = 'Reset to default icon',
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
		<div className={`${CARD} ${CARD_PADDING} space-y-5`}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
					{description && <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>}
				</div>

				{currentPFP && (
					<Button variant="ghost" size="sm" onClick={() => onSelectPFP?.(null)}>
						{resetLabel}
					</Button>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-3 sm:gap-4">
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
							className={`p-1 rounded-full border-2 cursor-pointer ${PRESS} ${FOCUS} ${
								isSelected
									? 'border-purple-600 dark:border-indigo-400 scale-105'
									: 'border-transparent hover:border-gray-300 dark:hover:border-slate-600'
							}`}
						>
							<img src={preset.src} alt={preset.label} className="w-12 h-12 rounded-full object-cover" />
						</button>
					);
				})}

				<label
					className={`px-4 py-2 rounded-full text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60 cursor-pointer has-focus-visible:ring-2 has-focus-visible:ring-purple-500/60 ${PRESS}`}
				>
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
	onChangeSamName,
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
		<div className={PAGE}>
			<div className={PAGE_INNER}>
				<h1 className={`${HEADING} mb-2`}>Settings</h1>

				<div className="space-y-5 sm:space-y-6">
					{/* light/dark mode */}
					<div className={`${CARD} ${CARD_PADDING} flex items-center justify-between gap-6`}>
						<div className="space-y-1">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Dark mode</h2>
							<p className="text-sm text-gray-500 dark:text-slate-400">
								{isDark ? 'On. Easier on the eyes at night.' : 'Off. Switch it on for a darker look.'}
							</p>
						</div>

						<button
							type="button"
							role="switch"
							aria-checked={isDark}
							aria-label="Dark mode"
							onClick={onToggleTheme}
							className={`relative w-14 h-8 rounded-full shrink-0 cursor-pointer transition-colors duration-200 motion-reduce:transition-none ${FOCUS} ${
								isDark ? 'bg-indigo-500' : 'bg-gray-300'
							}`}
						>
							<span
								className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none ${
									isDark ? 'translate-x-6' : 'translate-x-0'
								}`}
							/>
						</button>
					</div>

					{/* sam's (agent's) name */}
					<div className={`${CARD} ${CARD_PADDING} space-y-4`}>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="space-y-1">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Agent name</h2>
								<p className="text-sm text-gray-500 dark:text-slate-400">
									What are you talking to?
								</p>
							</div>

							{samName !== 'Sam' && (
								<Button variant="ghost" size="sm" onClick={handleResetName}>
									Reset to default
								</Button>
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
								className={FIELD}
							/>
							<Button type="submit" variant="primary" size="sm">
								Save
							</Button>
						</form>

						{savedNotice && (
							<p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
								You are now chatting with {nameInput}.
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

				<div className="mt-8">
					<Button variant="ghost" size="sm" onClick={onBackToChat}>
						← Back
					</Button>
				</div>
			</div>
		</div>
	);
}