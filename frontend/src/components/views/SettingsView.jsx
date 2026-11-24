

export function SettingsView({onBackToChat, theme = 'light', onToggleTheme}) {
    const isDark = theme === 'dark';

    return (
        <div className="flex-1 flex flex-col justify-center px-12 py-8 overflow-y-auto max-w-4xl w-full mx-auto">
			<h1 className="text-center text-3xl font-bold text-gray-900 dark:text-slate-100 mb-8">
				Settings
			</h1>

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