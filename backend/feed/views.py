from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Exists, OuterRef, Value, Q, Sum, F, Case, When, IntegerField
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User
from .models import Post, Comment, Like
from .serializers import PostSerializer, CommentSerializer, UserSerializer

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().select_related('author').order_by('-created_at')
    serializer_class = PostSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        qs = qs.annotate(
            likes_count=Count('likes'),
            is_liked=Exists(Like.objects.filter(user=user, post=OuterRef('pk'))) if user.is_authenticated else Value(False)
        )
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        # Custom retrieve to include threaded comments
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        # Fetch all comments for this post in one query (N+1 protection)
        user = request.user
        comments_qs = Comment.objects.filter(post=instance).select_related('author').annotate(
            likes_count=Count('likes'),
            is_liked=Exists(Like.objects.filter(user=user, comment=OuterRef('pk'))) if user.is_authenticated else Value(False)
        ).order_by('created_at')

        # Convert to list of dicts using serializer
        comments_data = CommentSerializer(comments_qs, many=True).data
        
        # Build tree in memory
        comment_map = {c['id']: {**c, 'replies': []} for c in comments_data}
        root_comments = []

        for c_id, c_node in comment_map.items():
            parent_id = c_node['parent']
            if parent_id:
                if parent_id in comment_map:
                    comment_map[parent_id]['replies'].append(c_node)
                else:
                    # Orphaned comment or parent deleted? Add to root just in case (or ignore)
                    root_comments.append(c_node)
            else:
                root_comments.append(c_node)

        data['comments'] = root_comments
        return Response(data)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Toggle like
        like, created = Like.objects.get_or_create(user=user, post=post)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True
        
        return Response({'liked': liked, 'likes_count': post.likes.count()})

    @action(detail=True, methods=['post'], url_path='comments')
    def add_comment(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        data = request.data.copy()
        data['post'] = post.id # Enforce post association
        
        serializer = CommentSerializer(data=data) # Note: CommentSerializer needs adapting for write? 
        # Actually CommentSerializer has read_only fields. We need to pass data carefully.
        # But 'post' is read_only in my serializer? No, I defined `post` in Meta.fields? 
        # Wait, I removed `post` from fields in CommentSerializer in previous step!
        # "fields = ['id', 'content', 'author', 'parent', 'created_at', ...]"
        # So I need to save `post` manually in `perform_create` or `save`.
        
        if serializer.is_valid():
            serializer.save(author=user, post=post)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CommentViewSet(viewsets.GenericViewSet):
    # Only need specific actions like 'like' or 'delete'.
    # Comments are created via PostViewSet for easier URL structure /posts/id/comments
    queryset = Comment.objects.all()
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        comment = self.get_object()
        user = request.user
        if not user.is_authenticated:
             return Response({'error': 'Auth required'}, status=401)
        
        like, created = Like.objects.get_or_create(user=user, comment=comment)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True
        return Response({'liked': liked, 'likes_count': comment.likes.count()})

class LeaderboardView(APIView):
    def get(self, request):
        cutoff = timezone.now() - timedelta(hours=24)
        
        # Aggregate Karma. 1 Post like = 5, 1 Comment like = 1.
        # We need to sum likes for each user's posts and comments.
        
        # Option 1: Annotate User model.
        # Users who received likes in the last 24h.
        
        users = User.objects.annotate(
            post_karma=Count('posts__likes', filter=Q(posts__likes__created_at__gte=cutoff), distinct=True) * 5,
            comment_karma=Count('comments__likes', filter=Q(comments__likes__created_at__gte=cutoff), distinct=True) * 1
        ).annotate(
            total_karma=F('post_karma') + F('comment_karma')
        ).filter(total_karma__gt=0).order_by('-total_karma')[:5]
        
        data = [{'username': u.username, 'karma': u.total_karma} for u in users]
        return Response(data)
