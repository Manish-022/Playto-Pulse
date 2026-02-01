import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import PostCard from './PostCard';
import CreatePost from './CreatePost';
import { Loader2 } from 'lucide-react';

const Feed = () => {
    const { data: posts, isLoading, error } = useQuery({
        queryKey: ['posts'],
        queryFn: () => api.get('posts/').then(res => res.data),
    });

    if (isLoading) return (
        <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
        </div>
    );

    if (error) return (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
            Error loading feed: {error.message}
        </div>
    );

    return (
        <div className="space-y-6">
            <CreatePost />
            {posts?.map(post => (
                <PostCard key={post.id} post={post} />
            ))}
            {posts?.length === 0 && (
                <p className="text-center text-gray-500 py-10">No posts yet.</p>
            )}
        </div>
    );
};
export default Feed;
