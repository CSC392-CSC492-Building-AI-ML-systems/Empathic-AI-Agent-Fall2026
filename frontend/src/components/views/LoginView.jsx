export function LoginView({onBackToChat, onSwitchToSignup}) {
    return (
        <div className="p-12 overflow-y-auto max-w-4xl">
		    <h1 className="text-center text-3xl font-bold text-gray-900 mb-1">Login</h1>

            <button
                    onClick={onSwitchToSignup}
                    className="w-full text-center text-indigo-600 font-medium hover:underline focus:outline-none"
                >
                Sign up
            </button>

            <button
                onClick={onBackToChat}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-400 mt-6 transition-colors"
                >
                Back to main screen
            </button>
        </div>
    );
}