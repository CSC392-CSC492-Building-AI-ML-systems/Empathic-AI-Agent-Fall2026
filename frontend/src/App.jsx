import { useState } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { Input } from './components/buttons/Input';
import { MoodSelector } from './components/chat/MoodSelector';
import { ChatThread } from './components/chat/ChatThread';
import { PastChatsView } from './components/views/PastChatsView';
import './App.css';

function App() {
	const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'past_chats'
	const [messages, setMessages] = useState([]);
	const [inputVal, setInputVal] = useState('');

	// Placeholder function for backend integration
	const sendToBackend = async (payload) => {
		console.log("Sending payload to backend:", payload);
    
		// put actual backend API call

	};

	// Handle Quick Mood Option Selection
	const handleMoodSelect = (mood) => {
	// 1. Determine specific response for mood selection
    let initialResponse = "How can I help you today?";
    if (mood === 'terrible') {
    	initialResponse = "Oh no, what happened? Why was your day terrible";
    } 
	else if (mood === 'great' || mood === 'good') {
    	initialResponse = "Glad to hear that! What's on your mind today?";
    } 
	else if (mood === 'alright') {
    	initialResponse = "Hope your day gets better! How can I assist you?";
    }

    // 2. Prepare payload and forward copy to backend
    const userMessagePayload = {
    	text: mood,
    	sender: 'user',
    	timestamp: new Date().toISOString(),
    };
    sendToBackend(userMessagePayload);

    // 3. Render initial custom response in UI
    setMessages([
    	{ id: Date.now(), sender: 'chat', text: initialResponse },
    ]);

	};

	const handleNewChat = () => {
    	setActiveTab('chat');
    	setMessages([]);
    	setInputVal('');
	};

	const handleSubmit = (e) => {
    	e.preventDefault();
    	const trimmedInput = inputVal.trim();
    	if (!trimmedInput) return;

    // Prepare payload and forward copy to backend
    const userMessagePayload = {
    	text: trimmedInput,
      	sender: 'user',
      	timestamp: new Date().toISOString(),
    };

    sendToBackend(userMessagePayload);

    // Render user message and placeholder response for typed input
    const userMsg = { id: Date.now(), sender: 'user', text: trimmedInput };
    const botMsg = { id: Date.now() + 1, sender: 'chat', text: 'placeholder' };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInputVal('');
 	};

  	const sidebarTabState =
    	activeTab === 'past_chats'
      	? 'past_chats'
      	: messages.length === 0
      	? 'chat_new'
      	: 'chat_active';

  	return (
    	<div className="flex h-screen w-full bg-[#f6f7f5] text-gray-800 font-sans">
      	<Sidebar
        	activeTab={sidebarTabState}
        	onNewChat={handleNewChat}
        	onOpenPastChats={() => setActiveTab('past_chats')}
      	/>

      	<main className="flex-1 flex flex-col h-full overflow-hidden relative">
        	{activeTab === 'past_chats' ? (
          		<PastChatsView />
        	) : (
				<div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
					{messages.length === 0 ? (
					<div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
						<div className="space-y-3">
						<h1 className="text-4xl font-extrabold text-gray-900">Welcome</h1>
						<p className="text-2xl text-gray-700">How was your day :)</p>
						</div>
						<MoodSelector onSelectMood={handleMoodSelect} />
					</div>
					) : (
					<ChatThread messages={messages} />
					)}

					<div className="p-6 max-w-4xl w-full mx-auto">
					<Input
						value={inputVal}
						onChange={(e) => setInputVal(e.target.value)}
						onSubmit={handleSubmit}
						placeholder={messages.length === 0 ? "What is your question" : "Reply..."}
					/>
					</div>
				</div>
			)}
		</main>
		</div>
	);
}

export default App;