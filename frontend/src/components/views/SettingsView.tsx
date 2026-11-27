import { useEffect, useState } from 'react';
import type { ChangeEvent, SyntheticEvent } from 'react';
import type { Theme } from '../../types/chat';
import { Button } from '../buttons/Button';
import { PRESS, FOCUS } from '../buttons/styles';

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

// torn notebook look
const TORN_NOTEBOOK_CLIP =
	'polygon(0% 10px, 3% 2px, 6% 12px, 10% 3px, 14% 11px, 18% 2px, 22% 12px, 26% 4px, 30% 11px, 34% 2px, 39% 12px, 43% 3px, 48% 11px, 53% 2px, 58% 12px, 63% 3px, 68% 11px, 73% 2px, 78% 12px, 83% 3px, 88% 11px, 93% 2px, 97% 10px, 100% 3px, 100% calc(100% - 10px), 97% calc(100% - 3px), 93% calc(100% - 12px), 88% calc(100% - 3px), 84% calc(100% - 11px), 79% calc(100% - 2px), 74% calc(100% - 12px), 69% calc(100% - 4px), 64% calc(100% - 11px), 59% calc(100% - 2px), 54% calc(100% - 12px), 49% calc(100% - 3px), 44% calc(100% - 11px), 39% calc(100% - 2px), 34% calc(100% - 12px), 29% calc(100% - 3px), 24% calc(100% - 11px), 19% calc(100% - 2px), 14% calc(100% - 12px), 9% calc(100% - 3px), 4% calc(100% - 11px), 0% calc(100% - 4px))';

const NOTEBOOK_PAPER_STYLE = {
	clipPath: TORN_NOTEBOOK_CLIP,
	backgroundColor: '#fcf9f2',
	backgroundImage:
		'linear-gradient(to right, transparent 42px, rgba(196, 122, 112, 0.32) 42px, rgba(196, 122, 112, 0.32) 43.5px, transparent 43.5px), repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, rgba(154, 136, 112, 0.22) 27px, rgba(154, 136, 112, 0.22) 28px)',
};

const FIELD =
	'flex-1 min-w-0 bg-[#fbf7ee] border border-[#d6c7b0] rounded-xs px-4 py-2 text-sm text-[#2b2118] placeholder-[#8a7967] focus:outline-none focus:border-[#6e4430] focus:ring-2 focus:ring-[#6e4430]/15 transition';

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
		<div className="border-t border-dashed border-[#d8cab4] pt-4 space-y-3">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<h2 className="font-serif text-base font-semibold text-[#231a12]">{title}</h2>
					{description && <p className="text-xs text-[#6c5d4d]">{description}</p>}
				</div>

				{currentPFP && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onSelectPFP?.(null)}
						className="rounded-xs! border border-[#d6c7b0] bg-[#fbf7ee] text-xs text-[#4a3b2d] hover:bg-[#f2eadb]"
					>
						{resetLabel}
					</Button>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-3">
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
							className={`p-0.5 rounded-full border-2 cursor-pointer ${PRESS} ${FOCUS} ${
								isSelected
									? 'border-[#6e4430] scale-105'
									: 'border-transparent hover:border-[#c8b79e]'
							}`}
						>
							<img src={preset.src} alt={preset.label} className="w-10 h-10 rounded-full object-cover" />
						</button>
					);
				})}

				<label
					className={`px-3.5 py-1.5 rounded-xs text-xs font-medium border border-[#d6c7b0] bg-[#fbf7ee] text-[#3b2f24] hover:bg-[#f2eadb] cursor-pointer has-focus-visible:ring-2 has-focus-visible:ring-[#6e4430]/50 ${PRESS}`}
				>
					Upload image
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

	useEffect(() => {
		setNameInput(samName);
	}, [samName]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onBackToChat();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [onBackToChat]);

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
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="settings-popup-title"
			onClick={onBackToChat}
			className="fixed inset-0 z-50 flex items-center justify-center bg-[#231a12]/45 backdrop-blur-[1px] px-4 py-6"
		>
			{/* Drop shadow container outside clip-path */}
			<div
				onClick={(e) => e.stopPropagation()}
				className="relative w-full max-w-xl drop-shadow-[0_18px_36px_rgba(35,26,18,0.28)]"
			>
				{/* Torn Notebook Page */}
				<div
					style={NOTEBOOK_PAPER_STYLE}
					className="max-h-[82vh] overflow-y-auto pl-14 pr-6 py-7 sm:pl-16 sm:pr-8 sm:py-8 text-[#2b2118]"
				>
					{/* Header + Close Box (matches reference popup) */}
					<div className="flex items-start justify-between gap-4 border-b border-[#d6c7b0] pb-3.5 mb-4">
						<h1
							id="settings-popup-title"
							className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#231a12]"
						>
							Settings
						</h1>

						<button
							type="button"
							onClick={onBackToChat}
							aria-label="Close settings"
							className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-[#8e6f56] bg-[#fcf9f2] text-lg text-[#3b2f24] shadow-[0_0_0_2px_#fcf9f2,0_0_0_3px_#b79d82] hover:bg-[#f2eadb] ${PRESS} ${FOCUS}`}
						>
							×
						</button>
					</div>

					<div className="space-y-4">
						{/* Dark / Light Mode */}
						<div className="flex items-center justify-between gap-4 py-1">
							<div>
								<h2 className="font-serif text-base font-semibold text-[#231a12]">Dark / Light mode</h2>
								<p className="text-xs text-[#6c5d4d]">
									{isDark ? 'Dark mode enabled.' : 'Light notebook paper enabled.'}
								</p>
							</div>

							<button
								type="button"
								role="switch"
								aria-checked={isDark}
								aria-label="Dark mode"
								onClick={onToggleTheme}
								className={`relative w-12 h-7 rounded-full shrink-0 cursor-pointer transition-colors duration-200 ${FOCUS} ${
									isDark ? 'bg-[#6e4430]' : 'bg-[#d6c7b0]'
								}`}
							>
								<span
									className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[#fcf9f2] border border-[#b8a58c] shadow transition-transform duration-200 ${
										isDark ? 'translate-x-5' : 'translate-x-0'
									}`}
								/>
							</button>
						</div>

						{/* Sam / Agent Name */}
						<div className="border-t border-dashed border-[#d8cab4] pt-4 space-y-3">
							<div className="flex flex-wrap items-start justify-between gap-2">
								<div>
									<h2 className="font-serif text-base font-semibold text-[#231a12]">Sam name</h2>
									<p className="text-xs text-[#6c5d4d]">What would you like to call Sam?</p>
								</div>

								{samName !== 'Sam' && (
									<Button
										variant="ghost"
										size="sm"
										onClick={handleResetName}
										className="rounded-xs! border border-[#d6c7b0] bg-[#fbf7ee] text-xs text-[#4a3b2d] hover:bg-[#f2eadb]"
									>
										Reset to default
									</Button>
								)}
							</div>

							<form onSubmit={handleNameSubmit} className="flex items-center gap-2.5">
								<input
									type="text"
									value={nameInput}
									onChange={(e) => setNameInput(e.target.value)}
									maxLength={30}
									placeholder="Enter Sam's name..."
									aria-label="Sam name"
									className={FIELD}
								/>
								<Button
									type="submit"
									variant="primary"
									size="sm"
									className="rounded-xs! border-[#5d3827]! bg-[#6e4430]! text-[#fcf9f2]! hover:bg-[#5b3726]!"
								>
									Save
								</Button>
							</form>

							{savedNotice && (
								<p role="status" className="text-xs text-[#465a45] font-medium">
									Now chatting with {nameInput}.
								</p>
							)}
						</div>

						{/* Sam PFP */}
						<PFPChooser
							title="Sam PFP"
							description="Choose a profile picture for Sam."
							currentPFP={samPFP}
							onSelectPFP={onSelectSamPFP}
						/>

						{/* User PFP */}
						<PFPChooser
							title="User PFP"
							description="Choose your profile picture."
							currentPFP={userPFP}
							onSelectPFP={onSelectUserPFP}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}