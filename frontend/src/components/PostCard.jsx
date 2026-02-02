import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { MessageSquare, Heart } from 'lucide-react';
import CommentSection from './CommentSection';

const PostCard = ({ post }) => {
    const [showComments, setShowComments] = useState(false);
    const queryClient = useQueryClient();

    const likeMutation = useMutation({
        mutationFn: () => api.post(`posts/${post.id}/like/`),
        onMutate: async () => {
            await queryClient.cancelQueries(['posts']);
            const previousPosts = queryClient.getQueryData(['posts']);

            queryClient.setQueryData(['posts'], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.map(p => {
                            if (p.id === post.id) {
                                return {
                                    ...p,
                                    likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1,
                                    is_liked: !p.is_liked
                                };
                            }
                            return p;
                        })
                    }))
                };
            });

            return { previousPosts };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['posts'], context.previousPosts);
        },
        onSuccess: (data) => {
            // Update with authoritative server data (optional, but safer than optimistic)
            // But since we did optimistic update, we might just leave it.
            // IMPORTANT: Do NOT invalidate ['posts'] here as it triggers mass refetch.
            // Only invalidate leaderboard as it changes.
            queryClient.invalidateQueries(['leaderboard']);

            // Update the specific post in the cache with the real likes count if needed
            queryClient.setQueryData(['posts'], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.map(p => {
                            if (p.id === post.id) {
                                return {
                                    ...p,
                                    likes_count: data.data.likes_count,
                                    is_liked: data.data.liked
                                };
                            }
                            return p;
                        })
                    }))
                };
            });
        }
    });

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                            {post.author.username[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{post.author.username}</p>
                            <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <p className="text-gray-800 mb-6 whitespace-pre-wrap">{post.content}</p>

                <div className="flex items-center space-x-6 border-t pt-4">
                    <button
                        onClick={() => likeMutation.mutate()}
                        className={`flex items-center space-x-2 text-sm font-medium transition-colors ${post.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                    >
                        <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
                        <span>{post.likes_count} Likes</span>
                    </button>

                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                        <MessageSquare className="w-5 h-5" />
                        <span>Comments</span>
                    </button>
                </div>
            </div>

            {showComments && (
                <div className="bg-gray-50 p-6 border-t">
                    <CommentSection postId={post.id} />
                </div>
            )}
        </div>
    );
};

export default PostCard;
