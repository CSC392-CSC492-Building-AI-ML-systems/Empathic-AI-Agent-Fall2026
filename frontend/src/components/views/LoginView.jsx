import { useState } from 'react';
import { ChatThread } from '../chat/ChatThread';
import { Input } from '../buttons/Input';
import { YesOrNoButton } from '../buttons/YesOrNoButton';


export function LoginView({onBackToChat, onSwitchToSignup}) {

    const [messages, setMessages] = useState([
        { id: Date.now(), sender: 'sam', text: "Hi! I'm Sam :) What's your name?", timestamp: new Date().toISOString() }
    ]);
    
    const [inputVal, setInputVal] = useState('');
    const [error, setError] = useState('');

    // status = 'name' | 'confirmName' | 'email' | 'confirmEmail' | 'password' | 'confirmPassword' | 'done'
    const [status, setStatus] = useState('name');

    // only confirm name after user types in a valid input
    const [username, setUsername] = useState('');
    const [pendingName, setPendingName] = useState('');

    const [email, setEmail] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');

    const [password, setPassword] = useState('');
    // so we hide/show password in the input
    const [showPassword, setShowPassword] = useState(false);
    
    // TODO !!
    // ADD IN POPUP TO CONFRIM IF NAME TYPED IN CORRECTLY
    // ADD IN CHECKS FOR EMAILS AS WELL
    // HV CHECKS FOR EVERYTHING TO DOUBLE CHECK

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedInput = inputVal.trim();
        if (!trimmedInput) return;

        // check for username
        if (status === 'name') {
            const usernameRegex = /^\w+$/;
            if (!usernameRegex.test(trimmedInput)) {
                setError('Sorry, your username must be one word and should not contain any special characters. Please try again');
                return;
            }
            setError('');
            setPendingName(trimmedInput);

            const userMsg = { 
                id: Date.now(), 
                sender: 'user', 
                text: trimmedInput, 
                timestamp: new Date().toISOString()
            };

            const confirmNameMsg = {
                id: Date.now() + 1,
                sender: 'sam',
                text: `I will call you ${trimmedInput} from now on, is that alright with you?`,
                timestamp: new Date().toISOString()
            };

            setMessages((prev) => [...prev, userMsg, confirmNameMsg]);
            setInputVal('');
            setStatus('confirmName')
        }

        // check for email
        else if (status === 'email') {
            const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!emailRegex.test(trimmedInput)){
                setError('Sorry, the format of your email is incorrect. Please try again');
                return;
            }
            setError('');
            setPendingEmail(trimmedInput);

            const userMsg = { 
                id: Date.now(), 
                sender: 'user', 
                text: trimmedInput, 
                timestamp: new Date().toISOString()
            };

            const confirmEmailMsg = {
                id: Date.now() + 1,
                sender: 'sam',
                text: `Is ${trimmedInput} your email?`,
                timestamp: new Date().toISOString()
            };
            
            setMessages((prev) => [...prev, userMsg, confirmEmailMsg]);
            setInputVal('');
            setStatus('confirmEmail')
        }

        // check for password
        else if (status === 'password') {
            // check for length first
            if (trimmedInput.length < 8){
                setError('Hey, your password will be more secure if you have more than 8 characters!');
                return;
            }
            
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[^\s]+$/;
            if (!passwordRegex.test(trimmedInput)) {
                setError('Hey, your password is not the most secure right now... Try to use at least one uppercase, one lowercase, one number, and one special character!');
                return;
            }

            setError('');
            setShowPassword(false);
            setPassword(trimmedInput);

            const doneMsg = {
                id: Date.now() + 1,
                sender: 'sam',
                text: `Ok :D I have all the info I need now. It was a pleasure to meet you ${username}!`,
                timestamp: new Date().toISOString()
            };
            
            setMessages((prev) => [...prev, doneMsg]);
            setInputVal('');
            setStatus('done')
        }
        
    };

    const handleConfirmYes = () => {
        const userMsg = { 
            id: Date.now(), 
            sender: 'user', 
            text: 'Yes', 
            timestamp: new Date().toISOString() 
        };
        
        if (status === 'confirmName') {

            const emailMsg = { 
                id: Date.now() + 1, 
                sender: 'sam', 
                text: `Nice to meet you ${pendingName}. What's your email?`, 
                timestamp: new Date().toISOString() 
            };

            setMessages((prev) => [...prev, userMsg, emailMsg]);
            setUsername(pendingName);
            setStatus('email');
        } 

        else if (status === 'confirmEmail') {

            const passwordMsg = { id: Date.now() + 1, 
                sender: 'sam', 
                text: "Got it! Now, please choose a password (at least 8 characters):", 
                timestamp: new Date().toISOString() 
            };

            setMessages((prev) => [...prev, userMsg, passwordMsg]);
            setEmail(pendingEmail);
            setStatus('password');
        }
    };

    const handleConfirmNo = () => {
        const userMsg = { 
            id: Date.now(), 
            sender: 'user', 
            text: 'No', 
            timestamp: new Date().toISOString() 
        };
        
        if (status === 'confirmName') {
            
            const retryMsg = { 
                id: Date.now() + 1, 
                sender: 'sam', 
                text: "ok, maybe I read wrong, what is your name again?", 
                timestamp: new Date().toISOString() 
            };

            setMessages((prev) => [...prev, userMsg, retryMsg]);
            setStatus('name');
        } 
        else if (status === 'confirmEmail') {
            const retryMsg = { 
                id: Date.now() + 1, 
                sender: 'sam', 
                text: "No worries, what is your email again?", 
                timestamp: new Date().toISOString() 
            };

            setMessages((prev) => [...prev, userMsg, retryMsg]);
            setStatus('email');
        }
    };

    const isWaitingForConfirmation = status === 'confirmName' || status === 'confirmEmail';


    return (
        <div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
            <div className="p-12 overflow-y-auto max-w-4xl">
                <h1 className="text-center text-3xl font-bold text-gray-900 mb-1">Login</h1>
            </div>

            <div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
                <ChatThread messages={messages} />

                    <div className="p-6 max-w-4xl w-full mx-auto">

                        {error && (
                            <p className="text-red-500 text-xs mb-2 px-1">
                                {error}
                            </p>
                        )}

                        {isWaitingForConfirmation ? (
                            <YesOrNoButton 
                            onYes={handleConfirmYes} 
                            onNo={handleConfirmNo} 
                            />
                        ) : status === 'done' ? (
                            <p className="text-center text-sm text-gray-500">Completed Login</p>
                        ) : (
                            <div className="relative flex items-center w-full">
                                <Input
                                value={inputVal}
                                onChange={(e) => {
                                    setInputVal(e.target.value);
                                    if (error) setError('');
                                }}
                                onSubmit={handleSubmit}
                                placeholder={status === 'password' ? "Enter your password..." : "Type your response..."}
                                type={status === 'password' && !showPassword ? "password" : "text"}
                                />

                                {status === 'password' && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 text-xs text-gray-500 hover:text-gray-800 font-medium py-1 px-2 focus:outline-none"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                )}
                            </div>
                        )}

                    </div>
            </div>

            <button
                onClick={onBackToChat}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-400 mt-6 transition-colors"
                >
                Back to main screen
            </button>
        </div>
    );
}