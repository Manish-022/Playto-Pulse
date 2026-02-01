import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Send, Loader2 } from 'lucide-react';

const CreatePost = () => {
    const [content, setContent] = useState('');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (newContent) => api.post('posts/', { content: newContent }),
        onMutate: async (newContent) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries(['posts']);

            // Snapshot the previous value
            const previousPosts = queryClient.getQueryData(['posts']);

            // Optimistically update to the new value
            const newPost = {
                id: Date.now(), // Temporary ID
                content: newContent,
                author: { username: 'You' }, // Placeholder
                created_at: new Date().toISOString(),
                likes_count: 0,
                is_liked: false,
                comments_count: 0
            };

            queryClient.setQueryData(['posts'], (old) => [newPost, ...(old || [])]);
            setContent(''); // Clear input immediately

            return { previousPosts };
        },
        onError: (err, newContent, context) => {
            queryClient.setQueryData(['posts'], context.previousPosts);
            setContent(newContent); // Restore input on fail
        },
        onSuccess: () => {
            // Still refetch to get real ID and server data
            queryClient.invalidateQueries(['posts']);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (content.trim()) {
            mutation.mutate(content);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create a Post</h3>
            <form onSubmit={handleSubmit}>
                <textarea
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] mb-3"
                    placeholder="What's on your mind?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={mutation.isPending}
                />
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!content.trim() || mutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {mutation.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Post
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePost;
