import { useState, SyntheticEvent } from 'react';
import { ChatThread } from '../chat/ChatThread';
import { Input } from '../buttons/Input';
import { supabase } from '../../lib/supabaseClient';
import { TwoOptionButton } from '../buttons/TwoOptionButton';
import type { User } from '@supabase/supabase-js';
import type { ChatMessage, ChatSession, LoginStatus, LoginOrSignup } from '../../types/chat';

interface LoginViewProps {
	onLoginSuccess: (userId: string, sessions: ChatSession[], username?: string) => void;
	onBackToChat?: () => void;
}

// add in onBackToChat when implement guest state
export function LoginView({ onLoginSuccess }: LoginViewProps) {

    // initial message from agent
    const [messages, setMessages] = useState<ChatMessage[]>(() => [
        { id: crypto.randomUUID(), sender: 'sam', text: "Hi! I'm Sam :) Would you like to signup or login?", timestamp: new Date().toISOString() }
    ]);
    
    
    const [inputVal, setInputVal] = useState('');
    const [error, setError] = useState('');

    // status = 'name' | 'confirmName' | 'email' | 'confirmEmail' | 'password' | 'confirmPassword' | 'awaitingVerification' | 'done'
    // confirming password and awaiting verification are only for signup, NOT login
    const [status, setStatus] = useState<LoginStatus>('');

    // login + password -> ask for their set password
    // signup + password -> ask them to create a password
    const [loginOrSignup, setLoginOrSignup] = useState<LoginOrSignup>('');

    // only confirm name after user types in a valid input
    const [username, setUsername] = useState('');
    const [pendingName, setPendingName] = useState('');

    const [email, setEmail] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');

    const [password, setPassword] = useState('');
    // so we hide/show password in the input
    const [showPassword, setShowPassword] = useState(false);
    const [passwordAttempts, setPasswordAttempts] = useState(0);

    // to simulate thinking -> more empathetic (?)
	const waitOneSecond = () => new Promise((resolve) => setTimeout(resolve, 1000));
	const [isTyping, setIsTyping] = useState(false);

    const [userId, setUserId] = useState('')

    // const BASE = "http://localhost:8000";

    const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        // so user cant send a msg when the agent is responding
		if (isTyping) return;

        const trimmedInput = inputVal.trim();
        if (!trimmedInput) return;
        
        console.log("------------------start of trying to login/signup-----------------------");
        printAllFields();

        // check for username
        if (status === 'name') {
            const usernameRegex = /^\w+$/;
            if (!usernameRegex.test(trimmedInput)) {
                setError('Sorry, your username must be one word and should not contain any special characters. Please try again');
                return;
            }
            setError('');
            setPendingName(trimmedInput);

            await userMsg(trimmedInput);
            await agentMsg(`I will call you ${trimmedInput} from now on, are you ok with that?`);
            
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
            setEmail(trimmedInput);

            await userMsg(trimmedInput);
            await agentMsg('Thanks for sharing your email with me!');

            if (loginOrSignup === 'login') {
                await agentMsg("Okay :) Please enter in your password so I can help you login");
            }

            // user is signing up -> let user choose a password
            if (loginOrSignup === 'signup') {
                await agentMsg("Got it! Now please choose a password that is at least 8 characters");
            }

            setStatus('password')
        }

        else if (status === 'password') {

            // ---------- SIGNUP ----------
            if (loginOrSignup === 'signup') {
                if (trimmedInput.length < 8) {
                    setError('Your password needs at least 8 characters!');
                    return;
                }
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/;
                if (!passwordRegex.test(trimmedInput)) {
                    setError('Try to use at least one uppercase, one lowercase, one number, and one special character!');
                    return;
                }

                setError('');
                setShowPassword(false);
                setPassword(trimmedInput);

                // confirm that user typed in password correctly
                setStatus('confirmPassword');
                await agentMsg("Please enter in your password again to double check that you entered it correctly!");
                return;

            }

            // ---------- LOGIN ----------
            // need to set check after 5 login attempts -> lock user out? and bring back to start(?)
            // CURRENTLY -> will just bring user back to the starting status
            if (loginOrSignup === 'login') {
                console.log("please");
                
                // attempt password >= 5 times -> send back to og state
                if (passwordAttempts + 1 >= 5) {
                    // TODO !!!
                    // DISABLE USER
                    await agentMsg("you have tried too many times, disabling and bringing you back to the start now");
                    await resetAllFields();
                    // await printAllFields();
                    await agentMsg("Hi! I'm Sam :) Would you like to login or signup?");
                    return;
                }

                const loginData = await loginToAccount(trimmedInput);
                if (!loginData || !loginData.user || !loginData.session){
                    setShowPassword(false);
                    await agentMsg("Hey, I think you entered the wrong password, or your account doesn't exist. Please try again!");
                    setPasswordAttempts(passwordAttempts + 1);
                    return;
                }

                const userId = loginData.user.id;
                const name = extractUserName(loginData.user);
                setUsername(name);
                setUserId(userId);
                onLoginSuccess(userId, [], name);

                await agentMsg("Ok :D I have all the info I need now. You are all logged in now!");
                console.log("-----------------completed login---------------------");
                printAllFields();
                console.log("-----------------------------------------------------");
                setStatus('done');
                return;
            }
        }
        
        else if (status === 'confirmPassword') {
            console.log(trimmedInput);
            console.log(password);
            if (trimmedInput !== password) {
                await agentMsg("Sorry, your passwords don't match. Please try again!");
                await agentMsg("Please choose a password that is at least 8 characters");
                setStatus('password');
                return;
            }

            setPassword(trimmedInput);

            // creating an account using supabase -> will send a verification email to the user
            const signupData = await createAccount(username, email, trimmedInput);

            if (!signupData || !signupData.user) {
                await agentMsg("Hmm, something went wrong creating your account. Please try a different password or try again later.");
                return;
            }

            if (!signupData.session){
                await agentMsg("I've sent you a verification email! Please check your inbox and click the link to finish creating your account.");
                // wait for email verification and then we're done!
                setStatus('awaitingVerification');
                return; 
            }
            
            const newUserId = signupData.user.id;
            const name = extractUserName(signupData.user);
            setUsername(name);

            setUserId(newUserId);
            // signup -> new user -> no chat history
            onLoginSuccess(newUserId, [], name);
            // password is handled by supabase now
            
            await agentMsg(`Ok :D I have all the info I need now. It was a pleasure to meet you ${username}!`);
            console.log("-----------------completed signup---------------------");
            printAllFields();
            console.log("-----------------------------------------------------");
            setStatus('done');
            return;
        }
    };

    const isWaitingForConfirmation = status === 'confirmName' || status === 'confirmEmail';
    const isSignupOrLogin = status === '' && !isWaitingForConfirmation;

    const userMsg = async (text: string) => {
        setMessages((prev) => [...prev, {
            id: crypto.randomUUID(),
            sender: username !== '' ? username : 'user',
            text,
            timestamp: new Date().toISOString()
        }]);
    };
    
    const agentMsg = async (text: string) => {
        setInputVal('');
        setIsTyping(true);
        await waitOneSecond();
        setIsTyping(false);
        setMessages((prev) => [...prev, {
            id: crypto.randomUUID(),
            sender: 'sam',
            text,
            timestamp: new Date().toISOString()
        }]);
    };

    const handleConfirmYes = async () => {
        // so user cant send a msg when the agent is responding
		if (isTyping) return;
        
        if (status === 'confirmName') {
            await userMsg('Yes');
 
            await waitOneSecond();

            await agentMsg(`Nice to meet you ${pendingName}. What's your email?`);
            setUsername(pendingName);
            setStatus('email');
        } 
    };

    const handleConfirmNo = async () => {
        // so user cant send a msg when the agent is responding
		if (isTyping) return;

        await userMsg('No');
        
        if (status === 'confirmName') {

            await agentMsg("ok, maybe I read wrong, what is your name again?");
            setIsTyping(false);
            setStatus('name');

        } 
        else if (status === 'confirmEmail') {
            await agentMsg("no worries, maybe I read wrong, what is your email again?");
            setIsTyping(false);
            setStatus('email');
        }
    };

    const handleLogin = async () => {
        // so user cant send a msg when the agent is responding
        if (isTyping) return;

        await userMsg('login');
        await agentMsg("Ok :) Please enter in your email so I can help you login");
        
        setStatus('email');
        setLoginOrSignup('login');
    };

    const handleSignup = async () => {
        // so user cant send a msg when the agent is responding
        if (isTyping) return;

        await userMsg('signup');
        await agentMsg("Ok :) I will help you create an account");
        await agentMsg("To start off, what would you like me to call you?");
        
        setStatus('name');
        setLoginOrSignup('signup');
    };

    const handleRestart = async () => {
        // so user cant send a msg when the agent is responding
        if (isTyping) return;
        await resetAllFields();
        await agentMsg("Hi! I'm Sam :) Would you like to login or signup?");
        return;
    };
    
    // using supabaset to login to an account -> returns data if successful, null if not
    const loginToAccount = async(password: string) => {
         try {
            const { data, error } =
                await supabase.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {
                console.error("Login error:", error.message);
                return null;
            }

            return data;
        }
        catch (error) {
            console.error("Error logging in:", error);
            return null;
        }
    };

    // using supabase to create an account -> returns data if successful, null if not
    const createAccount = async(name: string, email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name },
                    emailRedirectTo: "http://localhost:5173/auth/callback"
                }
            });

            if (error) {
                console.error("error in creating an account:((((( ", error.message);
                return null;
            }

            return data;
        }
        catch (error) {
            console.error("Error creating account:", error);
            return null;
        }
    };

    const extractUserName = (user: User | null | undefined) =>
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        username ||
        'User';

    const resetAllFields = async() => {
        setUsername('');
        setPendingName('');
        setEmail('');
        setPendingEmail('');
        setPassword('');
        setPasswordAttempts(0);
        setUserId('');
        setMessages([]);
        setInputVal('');
        setStatus('');
        setError('');
        setLoginOrSignup('');
        return;
    };

    const printAllFields = async () => {
        console.log("username: ", username);
        console.log("pendingname: ", pendingName);
        console.log("email: ", email);
        console.log("pending email: ", pendingEmail);
        console.log("password: ", password);
        console.log("password attempts: ", passwordAttempts);
        console.log("user id: ", userId);
        return;
    };

    return (
        <div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
            <div className="flex items-center justify-between max-w-4xl w-full mx-auto px-6 pt-6 shrink-0">
                <h1 className="text-center text-3xl font-bold text-gray-900 dark:text-slate-100mb-1">Login</h1>
                {status !== '' && status !== 'done' && (
                    <div className="flex justify-end px-6 pt-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleRestart}
                            disabled={isTyping}
                            className="text-xs text-gray-500 hover:text-gray-800 font-medium py-1 px-3 rounded-full border border-gray-200 bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Restart ↻
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
                <ChatThread messages={messages} isTyping={isTyping} onBranch={undefined} />

                    <div className="p-6 max-w-4xl w-full mx-auto">

                        {error && (
                            <p className="text-red-500 text-xs mb-2 px-1">
                                {error}
                            </p>
                        )}

                        {isWaitingForConfirmation ? (
                            <TwoOptionButton 
                                onOption1={handleConfirmYes} 
                                onOption2={handleConfirmNo} 
                                option1Text="Yes" 
                                option2Text="No"
                                option1Variant="primary"
                                option2Variant="primary"
                                disabled={isTyping}
                            />
                        ) : isSignupOrLogin ? (
                            <TwoOptionButton
                                onOption1={handleSignup}
                                onOption2={handleLogin}
                                option1Text="Signup"
                                option2Text="Login"
                                option1Variant="primary"
                                option2Variant="primary"
                                disabled={isTyping}
                            />
                        ) : status === 'awaitingVerification' ? ( // lets see how this looks huh lol
                            <p className="text-center text-sm text-gray-500">
                                Please verify your email to continue!
                            </p>
                        ): status === 'done' ? (
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
                                    type={(status === 'password' || status === 'confirmPassword') && !showPassword ? "password" : "text"}
                                >
                                {(status === 'password' || status === 'confirmPassword') && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="text-xs text-gray-500 hover:text-gray-800 font-medium py-1 px-2 focus:outline-none"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                )}
                                </Input>
                            </div>
                        )}

                    </div>
            </div>

            <button
                // onClick={onBackToChat}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-400 mt-6 transition-colors"
                >
                Back to main screen
            </button>
        </div>
    );
}