import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { ChatSession } from '../../types/chat';

interface AuthCallbackProps {
    onLoginSuccess: (userId: string, sessions: ChatSession[]) => void;
}

export function AuthCallback({ onLoginSuccess }: AuthCallbackProps) {
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        const completeAuthentication = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (error) throw error;

                const session = data.session;

                if (!session) {
                    setMessage('Verification failed. Please try again.');
                    return;
                }

                onLoginSuccess(session.user.id, []);
            } catch (error) {
                console.error('Authentication callback error:', error);
                setMessage('Something went wrong verifying your email.');
            }
        };

        completeAuthentication();
    }, [onLoginSuccess]);

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <p className="text-gray-600">{message}</p>
        </div>
    );
}