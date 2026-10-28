import { useState, useEffect } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { Input } from './components/buttons/Input';
import { InitialMood } from './components/chat/InitialMood';
import { ChatThread } from './components/chat/ChatThread';
import { PastChatsView } from './components/views/PastChatsView';
import './App.css';

function App() {
	const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'past_chats'
	const [messages, setMessages] = useState([]);
	const [inputVal, setInputVal] = useState('');
	const [sessionId, setSessionId] = useState(null);

	// getting session id
	const makeNewSession = async () => {
		console.log("Getting a new session id from backend");

		// backend API call
		try {
			const response = await fetch("http://localhost:8000/session", {
				method: 'POST', 
			});
			const session = await response.json();
			setSessionId(session.session_id);
			console.log("Current session id: ", session.session_id);
		}
		catch (error) {
			console.log("Error in getting a new session id");
		}
	}

	// immediately create a session
	// runs when compopnent first loads
	useEffect(() => {
		makeNewSession();
	}, []);

	// backend integration
	const sendToBackend = async (payload) => {
		console.log("Sending payload to backend:", payload);
    
		// backend API call
		try {
			const response = await fetch("http://localhost:8000/session/test-session/message", {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message: payload.text }),
			});
			const backendResponse = await response.json();
			console.log("Received from backend: ", backendResponse);

		}
		catch (error) {
			console.log("Error in sending msg to backend")
		}
	};

	const handleMoodSelect = (mood) => {
		// hv default response based on the user's initial mood
		// seem more human
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


		// show initial response like a chat bubble based on user's initial mood
		setMessages([
			{ id: Date.now(), sender: 'chat', text: initialResponse },
		]);

	};

	// new chat resetting everything
	// also creates a new session id
	const handleNewChat = () => {
    	setActiveTab('chat');
    	setMessages([]);
    	setInputVal('');
		makeNewSession();
	};
	
	// get msg from user and display
	const handleSubmit = (e) => {
    	e.preventDefault();
    	const trimmedInput = inputVal.trim();
    	if (!trimmedInput) return;

	const userMsg = { id: Date.now(), sender: 'user', text: trimmedInput };
	setMessages((prev) => [...prev, userMsg]);

    // prepare and send msg to backend
    const userMessagePayload = {
    	text: trimmedInput,
      	sender: 'user',
      	timestamp: new Date().toISOString(),
    };

	// sending msg to backend and receiving response
    sendToBackend(userMessagePayload);


	// will need to get response from backend
	// display agent response
    const agentMsg = { id: Date.now() + 1, sender: 'chat', text: 'placeholder' };
    setMessages((prev) => [...prev, agentMsg]);
    
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
						<InitialMood onSelectMood={handleMoodSelect} />
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