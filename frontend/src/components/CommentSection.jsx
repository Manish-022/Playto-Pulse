import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import CommentNode from './CommentNode';
import { Loader2, Send } from 'lucide-react';

const CommentSection = ({ postId }) => {
    const [newComment, setNewComment] = useState('');
    const queryClient = useQueryClient();

    const { data: post, isLoading, error } = useQuery({
        queryKey: ['post', postId],
        queryFn: () => api.get(`posts/${postId}/`).then(res => res.data),
    });

    const commentMutation = useMutation({
        mutationFn: (content) => api.post(`posts/${postId}/comments/`, { content }),
        onMutate: async (newContent) => {
            await queryClient.cancelQueries(['post', postId]);
            const previousPost = queryClient.getQueryData(['post', postId]);

            queryClient.setQueryData(['post', postId], (oldPost) => {
                if (!oldPost) return oldPost;
                const newCommentNode = {
                    id: Date.now(),
                    content: newContent,
                    author: { username: localStorage.getItem('username') || 'You' },
                    created_at: new Date().toISOString(),
                    likes_count: 0,
                    is_liked: false,
                    replies: []
                };
                return {
                    ...oldPost,
                    comments: [...(oldPost.comments || []), newCommentNode]
                };
            });
            setNewComment('');
            return { previousPost };
        },
        onError: (err, newContent, context) => {
            if (context?.previousPost) {
                queryClient.setQueryData(['post', postId], context.previousPost);
            }
            setNewComment(newContent);
            alert("Failed to post comment: " + err.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['post', postId]);
        }
    });

    if (isLoading) return <div className="py-4 text-center"><Loader2 className="animate-spin inline w-5 h-5 text-indigo-600" /> Loading comments...</div>;
    if (error) return (
        <div className="text-red-500 py-2 text-sm bg-red-50 p-3 rounded">
            Error loading help: {error.message}
            {error.response && error.response.status === 500 && " (Server Error)"}
            {error.response && error.response.status === 404 && " (Post not found)"}
            <br />
            <button onClick={() => window.location.reload()} className="underline mt-1">Retry</button>
        </div>
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newComment.trim()) {
            commentMutation.mutate(newComment);
        }
    };

    return (
        <div className="space-y-4">
            <div className="border-b pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Discussion</h3>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        disabled={commentMutation.isPending}
                    />
                    <button
                        type="submit"
                        disabled={commentMutation.isPending || !newComment.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {commentMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                {post.comments && post.comments.map(comment => (
                    <CommentNode key={comment.id} comment={comment} postId={postId} depth={0} />
                ))}
                {(!post.comments || post.comments.length === 0) && (
                    <p className="text-gray-500 italic text-sm">No comments yet. Be the first!</p>
                )}
            </div>
        </div>
    );
};
export default CommentSection;
