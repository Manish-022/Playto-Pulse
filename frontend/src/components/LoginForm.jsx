import React, { useState } from 'react';
import api from '../api';

const LoginForm = ({ onLogin }) => {
    const [username, setUsername] = useState('user0'); // Default to seeded user
    const [password, setPassword] = useState('password');

    const handleLogin = (e) => {
        e.preventDefault();
        const token = btoa(`${username}:${password}`);
        api.defaults.headers.common['Authorization'] = `Basic ${token}`;

        // Simple validation check (optional, or just assume success for prototype)
        api.get('posts/').then(() => {
            onLogin(username);
        }).catch(err => {
            alert('Login failed! Check console.');
            console.error(err);
        });
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h3 className="font-bold mb-2">Login to Post</h3>
            <form onSubmit={handleLogin} className="flex gap-2">
                <input
                    className="border p-2 rounded text-sm"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
                <input
                    className="border p-2 rounded text-sm"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm">
                    Login
                </button>
            </form>
        </div>
    );
};
export default LoginForm;
