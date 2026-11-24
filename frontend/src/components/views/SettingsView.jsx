const SAM_PRESETS = [
	{
		id: 'heart-violet',
		label: 'Violet Heart',
		src: `data:image/svg+xml;utf8,${encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#ede9fe"/><path d="M32 48.5l-2.3-2.1C21.2 38.6 16 33.8 16 27.8c0-4.9 3.8-8.8 8.7-8.8 2.8 0 5.4 1.3 7.3 3.4 1.9-2.1 4.5-3.4 7.3-3.4 4.9 0 8.7 3.9 8.7 8.8 0 6-5.2 10.8-13.7 18.6L32 48.5z" fill="#7c3aed"/></svg>`
		)}`,
	},
	{
		id: 'sky-spark',
		label: 'Sky Spark',
		src: `data:image/svg+xml;utf8,${encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#e0f2fe"/><circle cx="32" cy="32" r="14" fill="#0284c7"/><circle cx="27" cy="29" r="2.2" fill="#ffffff"/><circle cx="37" cy="29" r="2.2" fill="#ffffff"/><path d="M26 36c1.6 2.5 3.8 3.8 6 3.8s4.4-1.3 6-3.8" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/></svg>`
		)}`,
	},
	{
		id: 'mint-leaf',
		label: 'Mint Calm',
		src: `data:image/svg+xml;utf8,${encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#dcfce7"/><path d="M18 42c0-13 9-22 26-22 0 17-9 26-22 26h-4v-4z" fill="#16a34a"/><path d="M20 40c6-5 13-11 22-18" fill="none" stroke="#dcfce7" stroke-width="2.5" stroke-linecap="round"/></svg>`
		)}`,
	},
];

export function SettingsView({onBackToChat, theme = 'light', onToggleTheme, samPFP = null, onSelectSamPFP}) {
    const isDark = theme === 'dark';

    // dealing with changing sam's pfp
    const handleFileChange = (e) => {
		const file = e.target.files?.[0];
		if (!file || !file.type.startsWith('image/')) return;

		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') {
				onSelectSamPFP?.(reader.result);
			}
		};
		reader.readAsDataURL(file);
		e.target.value = '';
	};

    return (
        <div className="flex-1 flex flex-col justify-center px-12 py-8 overflow-y-auto max-w-4xl w-full mx-auto">
			<h1 className="text-center text-3xl font-bold text-gray-900 dark:text-slate-100 mb-8">
				Settings
			</h1>

			<div className="space-y-6">
				{/* dark/light mode button */}
				<div className="flex items-center justify-between gap-6 bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 rounded-2xl py-7 px-8 shadow-xs">
					<div className="space-y-1.5">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
							Appearance
						</h2>
						<p className="text-sm text-gray-500 dark:text-slate-400">
							Current mode: {isDark ? 'Dark' : 'Light'}
						</p>
					</div>

					<button
						type="button"
						role="switch"
						aria-checked={isDark}
						onClick={onToggleTheme}
						className="px-6 py-3.5 rounded-xl text-sm font-medium bg-gray-900 text-white dark:bg-indigo-500 dark:text-white hover:opacity-90 transition-colors cursor-pointer shrink-0"
					>
						{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
					</button>
				</div>

				{/* sam's pfp */}
				<div className="bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 rounded-2xl py-7 px-8 shadow-xs space-y-5">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="space-y-1">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
								Sam&apos;s Profile Picture
							</h2>
							<p className="text-sm text-gray-500 dark:text-slate-400">
								Choose a preset or upload a custom image for Sam
							</p>
						</div>

						{samPFP && (
							<button
								type="button"
								onClick={() => onSelectSamPFP?.(null)}
								className="text-xs font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white underline cursor-pointer"
							>
								Reset to default icon
							</button>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-4">
						{SAM_PRESETS.map((preset) => {
							const isSelected = samPFP === preset.src;
							return (
								<button
									key={preset.id}
									type="button"
									onClick={() => onSelectSamPFP?.(preset.src)}
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
			</div>

			<button
				type="button"
				onClick={onBackToChat}
				className="w-full text-center text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mt-8 transition-colors"
			>
				Back to main screen
			</button>
		</div>
    );
}