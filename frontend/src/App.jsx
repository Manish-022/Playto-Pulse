import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Feed from './components/Feed';
import Leaderboard from './components/Leaderboard';
import LoginForm from './components/LoginForm';

const queryClient = new QueryClient();

function App() {
    const [user, setUser] = useState(null);

    return (
        <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-gray-100 flex justify-center p-4">
                <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <h1 className="text-3xl font-bold mb-6 text-gray-800">Playto Pulse Feed</h1>
                        {!user ? <LoginForm onLogin={setUser} /> : <div className="mb-4 text-green-700">Logged in as <b>{user}</b></div>}
                        <Feed />
                    </div>
                    <div className="md:col-span-1">
                        <Leaderboard />
                    </div>
                </div>
            </div>
        </QueryClientProvider>
    );
}

export default App;
