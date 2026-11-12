import { useState } from 'react';
import { ChatThread } from '../chat/ChatThread';
import { Input } from '../buttons/Input';
import { YesOrNoButton } from '../buttons/YesOrNoButton';


export function LoginView({onBackToChat, onLoginSuccess}) {

    // initial message from agent
    const [messages, setMessages] = useState(() => [
        { id: Date.now(), sender: 'sam', text: "Hi! I'm Sam :) Would you like to login or signup?", timestamp: new Date().toISOString() }
    ]);
    
    const [inputVal, setInputVal] = useState('');
    const [error, setError] = useState('');

    // status = 'name' | 'confirmName' | 'email' | 'confirmEmail' | 'password' | 'confirmPassword' | 'done'
    const [status, setStatus] = useState('');
    // default to login -> mainly used at the password state
    // login + password -> ask for their set password
    // signup + password -> ask them to create a password
    const [loginOrSignup, setLoginOrSignup] = useState('login');

    // only confirm name after user types in a valid input
    const [username, setUsername] = useState('');
    const [pendingName, setPendingName] = useState('');

    const [email, setEmail] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');

    const [password, setPassword] = useState('');
    // so we hide/show password in the input
    const [showPassword, setShowPassword] = useState(false);

    // to simulate thinking -> more empathetic (?)
	const waitOneSecond = () => new Promise((resolve) => setTimeout(resolve, 1000));
	const [isTyping, setIsTyping] = useState(false);

    const [userId, setUserId] = useState('')

    const BASE = "http://localhost:8000";
    
    // TODO !!
    // ADD IN POPUP TO CONFRIM IF NAME TYPED IN CORRECTLY
    // ADD IN CHECKS FOR EMAILS AS WELL
    // HV CHECKS FOR EVERYTHING TO DOUBLE CHECK

    const handleSubmit = async (e) => {
        e.preventDefault();
        // so user cant send a msg when the agent is responding
		if (isTyping) return;

        const trimmedInput = inputVal.trim();
        if (!trimmedInput) return;
        // check for login/signup
        if (status === '') {
            // user wants to login
            if (trimmedInput.toLowerCase() === 'login') {
                // immediately ask user for their email
                
                const userMsg = { 
                    id: Date.now(), 
                    sender: 'user', 
                    text: trimmedInput, 
                    timestamp: new Date().toISOString()
                };


                const confirmLoginMsg = {
                    id: Date.now() + 1,
                    sender: 'sam',
                    text: `Ok, I will help you login now! Please give me your email`,
                    timestamp: new Date().toISOString()
                };

                setMessages((prev) => [...prev, userMsg]);
                setIsTyping(true);
                setInputVal('');
                
                await waitOneSecond();

                setMessages((prev) => [...prev, confirmLoginMsg]);
                setIsTyping(false);

                
                setStatus('email');
                setLoginOrSignup('login');
            } 

            // user wants to signup
            else if (trimmedInput.toLowerCase() === 'signup') {
                // ask user for their name first

                const userMsg = { 
                    id: Date.now(), 
                    sender: 'user', 
                    text: trimmedInput, 
                    timestamp: new Date().toISOString()
                };


                const confirmSignupMsg = {
                    id: Date.now() + 1,
                    sender: 'sam',
                    text: `Ok, I will help you signup now!`,
                    timestamp: new Date().toISOString()
                };

                const askForNameMsg = {
                    id: Date.now() + 2,
                    sender: 'sam',
                    text: `To start off, what's your name?`,
                    timestamp: new Date().toISOString()
                };

                setMessages((prev) => [...prev, userMsg, confirmSignupMsg]);
                setIsTyping(true);
                setInputVal('');
                await waitOneSecond();

                setMessages((prev) => [...prev, askForNameMsg]);
                setIsTyping(false);

                
                setStatus('name');
                setLoginOrSignup('signup');
            }

            else {
                setError('Please enter login or signup');
                return;
            }

            setError('');
        }

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

            setMessages((prev) => [...prev, userMsg]);
            setIsTyping(true);
            setInputVal('');
            await waitOneSecond();

            setMessages((prev) => [...prev, confirmNameMsg]);
            setIsTyping(false);
            
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
            
            setMessages((prev) => [...prev, userMsg]);
            setIsTyping(true);
            setInputVal('');

            await waitOneSecond();
            setMessages((prev) => [...prev, confirmEmailMsg]);
            setIsTyping(false);
            
            setStatus('confirmEmail')
        }

        // check for password
        else if (status === 'password') {
            // email verification here
            const userExists = await verifyEmail(email);

            // only perform checks for correct password strength when the user is signing up 
            if (loginOrSignup === 'signup') {
                // check for length first
                if (trimmedInput.length < 8){
                    setError('Hey, your password will be more secure if you have more than 8 characters!');
                    return;
                }
                
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/;
                if (!passwordRegex.test(trimmedInput)) {
                    setError('Hey, your password is not the most secure right now... Try to use at least one uppercase, one lowercase, one number, and one special character!');
                    return;
                }

                setError('');
                setShowPassword(false);
                setPassword(trimmedInput);
                // when everything is good -> create account
                setUserId( await createAccount(username, email, password) );
                // notify main
                if (userId) {
                    onLoginSuccess(userId);
                }

                const doneMsg = {
                    id: Date.now() + 1,
                    sender: 'sam',
                    text: `Ok :D I have all the info I need now. It was a pleasure to meet you ${username}!`,
                    timestamp: new Date().toISOString()
                };
                
                setIsTyping(true);
                setInputVal('');
                await waitOneSecond();
                setIsTyping(false);

                setMessages((prev) => [...prev, doneMsg]);
                // for debugging rn
                // WILL SEND TO BACKEND
                console.log(`your userid is: ${userId}`);
                console.log(password);
                setStatus('done')
                return;
            }

            // what to do when logging in
            if (loginOrSignup === 'login' && userExists === 'true') {
                // try to login to account and get the user id
                setUserId( await loginToAccount(trimmedInput) );
                // notify main
                if (userId) {
                    onLoginSuccess(userId);
                }

                console.log("the below is userID");
                console.log(userId);
                if (userId != null) {
                    console.log("yay we are logged in");
                    const text = "Ok :D we are all logged in now";
                    setShowPassword(false);
                    setPassword(trimmedInput);

                    const doneMsg = {
                        id: Date.now() + 1,
                        sender: 'sam',
                        text: `Ok :D I have all the info I need now. You are all logged in now!`,
                        timestamp: new Date().toISOString()
                    };
                    
                    setIsTyping(true);
                    setInputVal('');
                    await waitOneSecond();
                    setIsTyping(false);

                    setMessages((prev) => [...prev, doneMsg]);
                    setStatus('done')
                    return;

                }
            }
            // something wrong with password verification
            else {
                console.log("password verification gone wrong -> wrong password match with email");
                console.log("or account doesnt exist with this email")
                const wrongPasswordMsg = {
                    id: Date.now() + 1,
                    sender: 'sam',
                    text: `Hey, I think you entered in the wrong password, or your account doesn't exist, please try again!`,
                    timestamp: new Date().toISOString()
                };
                setShowPassword(false);
                setInputVal('');
                setIsTyping(true);
                await waitOneSecond();
                setIsTyping(false);

                setMessages((prev) => [...prev, wrongPasswordMsg]);
                return;
            }
        }
        
    };

    const handleConfirmYes = async () => {
        // so user cant send a msg when the agent is responding
		if (isTyping) return;

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

            setMessages((prev) => [...prev, userMsg]);

            setIsTyping(true);
            await waitOneSecond();

            setMessages((prev) => [...prev, emailMsg])
            setIsTyping(false);
            setUsername(pendingName);
            setStatus('email');
        } 

        else if (status === 'confirmEmail') {
            let tempText = '';
            console.log(loginOrSignup);
            // user is logging in -> ask for their password
            if (loginOrSignup === 'login') {
                tempText = "Okay :) Please enter in your password so I can help you login";
            }

            if (loginOrSignup === 'signup') {
                tempText = "Got it! Now please choose a password that is at least 8 characters";
            }

            console.log(tempText);
            const passwordMsg = { id: Date.now() + 1, 
                sender: 'sam', 
                text: tempText, 
                timestamp: new Date().toISOString() 
            };

            setMessages((prev) => [...prev, userMsg]);
            setIsTyping(true);
            await waitOneSecond();

            setMessages((prev) => [...prev, passwordMsg])
            setIsTyping(false);
            setEmail(pendingEmail);
            // for debugging rn 
            // WILL SEND TO BACKEND
            console.log(email);
            setStatus('password');
        }
    };

    const handleConfirmNo = async () => {
        // so user cant send a msg when the agent is responding
		if (isTyping) return;

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

            setMessages((prev) => [...prev, userMsg]);

            setIsTyping(true);
            await waitOneSecond();

            setMessages((prev) => [...prev, retryMsg])
            setIsTyping(false);
            setStatus('name');
        } 
        else if (status === 'confirmEmail') {
            const retryMsg = { 
                id: Date.now() + 1, 
                sender: 'sam', 
                text: "No worries, what is your email again?", 
                timestamp: new Date().toISOString() 
            };

            setMessages((prev) => [...prev, userMsg]);
            setIsTyping(true);
            await waitOneSecond();

            setMessages((prev) => [...prev, retryMsg])
            setIsTyping(false);
            setStatus('email');
        }
    };

    const isWaitingForConfirmation = status === 'confirmName' || status === 'confirmEmail';

    const verifyEmail = async(email) => {
        try {
            const verifyEmailResponse = await fetch(`${BASE}/login/verify_email`, {
                method: 'POST',
                credentials: 'include', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const isVerifiedEmail = await verifyEmailResponse.json();
            return isVerifiedEmail.verified;
        }

        catch (error) {
            console.log(error);
            console.log("error in verifying email");
            return null;

        }
    };
    
    // AKA verifying your password
    const loginToAccount = async(password) => {
        // logging in is essentially also just verifying your password
        // on success -> receive uuid from backend
        // on fail -> uuid = None
        try {
            const loginResponse = await fetch(`${BASE}/`, {
                method: 'POST',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify( {"password": password, "email": email} ),
            });
            const isLoggedIn = await loginResponse.json();
            return isLoggedIn.user_id;
        }
        
        catch (error) {
            console.log(error);
            console.log("error in logging in - email and password dont match");
            return null;
        }
    };

    const createAccount = async(name, email, password) => {
        try {
            const createAccountResponse = await fetch(`${BASE}/create_account/`, {
                method: 'POST',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify( {"name": name, "email": email, "password": password}),
            });
            const createdAccount =  await createAccountResponse.json();
            return createdAccount.user_id;
        }
        catch (error) {
            console.log(error);
            console.log("error in creating an account:(((((");
            return null;
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
            <div className="p-12 overflow-y-auto max-w-4xl">
                <h1 className="text-center text-3xl font-bold text-gray-900 mb-1">Login</h1>
            </div>

            <div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
                <ChatThread messages={messages} isTyping={isTyping} />

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
                            disabled={isTyping}
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