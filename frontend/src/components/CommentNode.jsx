import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { Heart, Reply, CornerDownRight } from 'lucide-react';

const CommentNode = ({ comment, postId, depth }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    // Optimistic UI State
    const [liked, setLiked] = useState(comment.is_liked);
    const [likesCount, setLikesCount] = useState(comment.likes_count);

    // Sync with server state when refetch happens
    React.useEffect(() => {
        setLiked(comment.is_liked);
        setLikesCount(comment.likes_count);
    }, [comment.is_liked, comment.likes_count]);

    const queryClient = useQueryClient();

    const likeMutation = useMutation({
        mutationFn: () => api.post(`comments/${comment.id}/like/`),
        onMutate: async () => {
            // Optimistic Update
            const previousLiked = liked;
            setLiked(!previousLiked);
            setLikesCount(prev => previousLiked ? prev - 1 : prev + 1);
        },
        onError: (err, variables, context) => {
            // Revert on error
            setLiked(comment.is_liked);
            setLikesCount(comment.likes_count);
        },
        onSuccess: () => {
            // Silent refresh (eventual consistency)
            queryClient.invalidateQueries(['post', postId]);
            queryClient.invalidateQueries(['leaderboard']);
        }
    });

    const replyMutation = useMutation({
        mutationFn: () => api.post(`posts/${postId}/comments/`, { content: replyContent, parent: comment.id }),
        onSuccess: () => {
            setIsReplying(false);
            setReplyContent('');
            queryClient.invalidateQueries(['post', postId]);
        }
    });

    const submitReply = (e) => {
        e.preventDefault();
        if (replyContent.trim()) {
            replyMutation.mutate();
        }
    };

    return (
        <div className={`group ${depth > 0 ? 'ml-0' : ''}`}>
            <div className="flex gap-3">
                <div className="flex-1">
                    <div className="bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm text-gray-900">{comment.author.username}</span>
                            <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{comment.content}</p>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => likeMutation.mutate()}
                                className={`flex items-center gap-1 text-xs font-medium ${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                            >
                                <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                                <span>{likesCount}</span>
                            </button>

                            <button
                                onClick={() => setIsReplying(!isReplying)}
                                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-600"
                            >
                                <Reply className="w-3.5 h-3.5" />
                                <span>Reply</span>
                            </button>
                        </div>
                    </div>

                    {isReplying && (
                        <form onSubmit={submitReply} className="mt-2 ml-2 flex gap-2">
                            <CornerDownRight className="w-4 h-4 text-gray-400 mt-2" />
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder={`Reply to ${comment.author.username}...`}
                                    className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                                    autoFocus
                                />
                                <div className="mt-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsReplying(false)}
                                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                                    >
                                        Reply
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-3">
                            {comment.replies.map(reply => (
                                <CommentNode key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentNode;
