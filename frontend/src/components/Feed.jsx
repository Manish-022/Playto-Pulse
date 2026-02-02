import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../api';
import PostCard from './PostCard';
import CreatePost from './CreatePost';
import { Loader2 } from 'lucide-react';

const Feed = () => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error
    } = useInfiniteQuery({
        queryKey: ['posts'],
        queryFn: ({ pageParam = 1 }) => api.get('posts/', { params: { page: pageParam } }).then(res => res.data),
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.next ? allPages.length + 1 : undefined;
        }
    });

    const posts = data?.pages.flatMap(page => page.results) || [];

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
            {posts.map(post => (
                <PostCard key={post.id} post={post} />
            ))}
            {posts.length === 0 && (
                <p className="text-center text-gray-500 py-10">No posts yet.</p>
            )}

            {hasNextPage && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 disabled:opacity-50 font-medium"
                    >
                        {isFetchingNextPage ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                            </span>
                        ) : (
                            'Load More'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
export default Feed;
