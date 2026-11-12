import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { Input } from './components/buttons/Input';
import { InitialMood } from './components/chat/InitialMood';
import { ChatThread } from './components/chat/ChatThread';
import { PastChatsView } from './components/views/PastChatsView';
import { LoginView } from './components/views/LoginView';
import { SettingsView } from './components/views/SettingsView';
import { AgentThinking } from './components/chat/AgentThinking';
import './App.css';

function App() {
	const [activeTab, setActiveTab] = useState('chat' | 'past_chats' | 'login' | 'settings' | 'signup' ); 
	const [messages, setMessages] = useState([]);
	const [inputVal, setInputVal] = useState('');
	const [sessionId, setSessionId] = useState(null);
	const sessionFetched = useRef(false);
	// to simulate thinking -> more empathetic (?)
	const waitOneSecond = () => new Promise((resolve) => setTimeout(resolve, 1000));
	const [isTyping, setIsTyping] = useState(false);
	// userId = null -> not logged in
	const [userId, setUserId] = useState(null);

	const BASE = "http://localhost:8000";

	// getting session id
	const makeNewSession = async () => {
		console.log("Getting a new session id from backend");

		// backend API call
		try {
			const response = await fetch(`${BASE}/session/`, {
				method: 'GET', 
			});
			const session = await response.json();
			setSessionId(session.session_id);
			console.log("Current session id: ", session.session_id);
		}
		catch (error) {
			console.log(error);
			console.log("Error in getting a new session id");
		}
	}

	// immediately create a session
	// runs when compopnent first loads
	useEffect(() => {
		if (!sessionFetched.current) {
			sessionFetched.current = true;
			makeNewSession();
		}
	}, []);

	// backend integration
	const sendToBackend = async (payload) => {
		console.log("Sending payload to backend:", payload);
    
		// backend API call
		try {
			const response = await fetch(`${BASE}/session/${sessionId}/message`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message: payload.text }),
			});
			const backendResponse = await response.json();
			console.log("Received from backend: ", backendResponse);
			return backendResponse.response

		}
		catch (error) {
			console.log("Error in sending msg to backend", error)
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
			{ id: Date.now(), sender: 'sam', text: initialResponse },
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
	const handleSubmit = async (e) => {
    	e.preventDefault();

		// so user cant send a msg when the agent is responding
		if (isTyping) return;
    	const trimmedInput = inputVal.trim();
    	if (!trimmedInput) return;

		const userMsg = { 
			id: Date.now(), 
			sender: 'user', 
			text: trimmedInput, 
			timestamp: new Date().toISOString()
		};

		setMessages((prev) => [...prev, userMsg]);

		// prepare and send msg to backend
		const userMessagePayload = {
			text: trimmedInput,
			sender: 'user',
			timestamp: new Date().toISOString(),
		};

		setInputVal('');
		setIsTyping(true);

		// sending msg to backend and receiving response
		// but we wait and have the delay
		const [agentResponse] = await Promise.all([
			sendToBackend(userMessagePayload),
			waitOneSecond()
		]);

		// will need to get response from backend
		// display agent response
		const agentMsg = { 
			id: Date.now() + 1,
			sender: 'sam', 
			text: agentResponse,
			timestamp: new Date().toISOString()
		};

		setMessages((prev) => [...prev, agentMsg]);
		setIsTyping(false);
		
 	};

  	const sidebarTabState =
		activeTab === 'settings'
		? 'settings'
		: activeTab === 'login' || activeTab === 'signup'
		? 'login'
    	: activeTab === 'past_chats'
      	? 'past_chats'
      	: messages.length === 0
      	? 'chat_new'
      	: 'chat_active';

	// showing the temp past chats
	const handleSelectPastChat = (chat) => {
		setMessages(chat.messages);
		setSessionId(chat.sessionId);
		setActiveTab('chat');
	};

	const handleLogout = async () => {
        try {
			const logoutResponse = await fetch(`$BASE/logout?cache=${userId}`, {
				method: 'GET',
				credentials: 'include',
			});


			const loggedOut = await logoutResponse.json();
			if (loggedOut.logout === 'successful') {
				setUserId(null);
				setMessages([]);
				setActiveTab('chat');
				makeNewSession();
			}
		}
		catch (error) {
			console.log(error);
			console.log("error in logging out");
		}
    };

  	return (
    	<div className="flex h-screen w-full bg-[#f6f7f5] text-gray-800 font-sans">

			{activeTab === 'login' ? (
				<LoginView
					onBackToChat={() => setActiveTab('chat')}
				/>
			) : (
				<>
					<Sidebar
						activeTab={sidebarTabState}
						onNewChat={handleNewChat}
						onOpenPastChats={() => setActiveTab('past_chats')}
						onOpenLogin={() => setActiveTab('login')}
						onOpenSettings={() => setActiveTab('settings')}
						isLoggedIn={Boolean(userId)}
                        onLogout={handleLogout}
					/>

					<main className="flex-1 flex flex-col h-full overflow-hidden relative">
						{activeTab === 'past_chats' ? (
							<PastChatsView 
								onSelectChat={handleSelectPastChat} 
							/>
						) : activeTab === 'settings' ? (
							<SettingsView 
								onBackToChat={() => setActiveTab('chat')} 
							/>
						) : (
							<div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
								{messages.length === 0 ? (
								<div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
									<div className="space-y-3">
									<h1 className="text-4xl font-extrabold text-gray-900">Welcome</h1>
									<p className="text-2xl text-gray-700">How was your day ?</p>
									</div>
									<InitialMood onSelectMood={handleMoodSelect} />
								</div>
								) : (
								<div className="flex-1 flex flex-col overflow-y-auto">
									{/* for the thinking before responding of the agent */}
									<ChatThread messages={messages} isTyping={isTyping} />
								</div>
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
				</>
			)}
		</div>
	);
}

export default App;