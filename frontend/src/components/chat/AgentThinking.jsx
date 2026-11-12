export function AgentThinking() {
    return (
        <div className="px-6 py-2">
            <div className="flex items-center space-x-1.5 p-3 bg-white border border-gray-200 rounded-2xl w-fit text-gray-400 animate-pulse shadow-sm">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
        </div>
    );
}