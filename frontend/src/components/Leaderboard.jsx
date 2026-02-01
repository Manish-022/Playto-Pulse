import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { Trophy } from 'lucide-react';

const Leaderboard = () => {
    const { data: users, isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: () => api.get('leaderboard/').then(res => res.data),
        refetchInterval: 30000,
    });

    return (
        <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
                <Trophy className="mr-2 text-yellow-500" /> Leaderboard
            </h2>
            <p className="text-xs text-gray-500 mb-4">Top Karma (Last 24h)</p>
            {isLoading ? <div className="text-center py-4">Loading...</div> : (
                <ul className="space-y-3">
                    {users?.map((user, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                            <span className="font-medium text-gray-700 flex items-center">
                                <span className={`mr-2 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
                                    {idx + 1}
                                </span>
                                {user.username}
                            </span>
                            <span className="font-bold text-indigo-600">{user.karma}</span>
                        </li>
                    ))}
                    {users?.length === 0 && <p className="text-gray-400 text-center">No activity yet.</p>}
                </ul>
            )}
        </div>
    );
};
export default Leaderboard;
