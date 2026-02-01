from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from .models import Post, Comment, Like
from django.utils import timezone
from datetime import timedelta
from django.db import IntegrityError

class PerformanceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.post = Post.objects.create(content='Root post', author=self.user)
        # Create nested comments
        parent = None
        for i in range(50):
            parent = Comment.objects.create(
                content=f'Comment {i}', 
                author=self.user, 
                post=self.post, 
                parent=parent
            )
        self.client = Client()
        self.client.force_login(self.user)

    def test_post_detail_n_plus_one(self):
        # We expect a fixed number of queries regardless of comment count.
        # Queries:
        # 1. Savepoint (Test)
        # 2. Select User (Authentication)
        # 3. Select Session
        # 4. Select Post (with Author)
        # 5. Select Comments (with Author)
        # 6. Exists(Like) for Post
        # 7. Exists(Like) for Comments (subquery in annotation) - handled in single query if optimized
        
        # Our implementation:
        # retrieve() -> get_queryset() (1 query for Post)
        #            -> Comment.objects.filter... (1 query for Comments)
        # Total logic queries ~2. Auth adds ~2.
        
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        
        with CaptureQueriesContext(connection) as queries:
             response = self.client.get(reverse('post-detail', args=[self.post.id]))
             self.assertEqual(response.status_code, 200)
             self.assertTrue(len(response.data['comments']) > 0)
        
        # Verify query count is small (O(1) relative to comments)
        # Expected: ~4-6 queries. Definitely < 10.
        self.assertLess(len(queries), 10, f"Too many queries: {len(queries)}")

class ConcurrencyTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='c_user', password='password')
        self.post = Post.objects.create(content='C Post', author=self.user)

    def test_double_like_constraint(self):
        # Manually create like
        Like.objects.create(user=self.user, post=self.post)
        
        # Try to create again - DB should reject
        with self.assertRaises(IntegrityError):
             Like.objects.create(user=self.user, post=self.post)

class LeaderboardTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='u1', password='p')
        self.user2 = User.objects.create_user(username='u2', password='p')
        self.post1 = Post.objects.create(content='P1', author=self.user1)
        self.client = Client()
        self.client.force_login(self.user1)
        
    def test_leaderboard_logic(self):
        # u2 likes u1's post (Fresh)
        Like.objects.create(user=self.user2, post=self.post1)
        
        response = self.client.get(reverse('leaderboard'))
        self.assertEqual(response.data[0]['username'], 'u1')
        self.assertEqual(response.data[0]['karma'], 5)
        
        # u1 likes u1's post (Expired logic test)
        # We create a like and assume it's fresh first
        l2 = Like.objects.create(user=self.user1, post=self.post1)
        
        response = self.client.get(reverse('leaderboard'))
        # Now u1 has 5 + 5 = 10
        self.assertEqual(response.data[0]['karma'], 10)
        
        # Now age the l2 like
        Like.objects.filter(id=l2.id).update(created_at=timezone.now() - timedelta(hours=25))
        
        # Fetch leaderboard again
        response = self.client.get(reverse('leaderboard'))
        # Should be back to 5
        self.assertEqual(response.data[0]['karma'], 5)

    def test_leaderboard_aggregation_bug(self):
        # AI Audit: Test for Cartesian product bug in aggregation
        # If we have multiple relations (post likes and comment likes), 
        # a naive join might multiply the counts.
        
        # User 3 has 1 post and 1 comment
        u3 = User.objects.create_user(username='u3', password='p')
        p3 = Post.objects.create(content='P3', author=u3)
        c3 = Comment.objects.create(content='C3', author=u3, post=p3)
        
        # Add 2 likes to the post (Fresh)
        u4 = User.objects.create_user(username='u4', password='p')
        u5 = User.objects.create_user(username='u5', password='p')
        Like.objects.create(user=u4, post=p3)
        Like.objects.create(user=u5, post=p3)
        
        # Add 2 likes to the comment (Fresh)
        Like.objects.create(user=u4, comment=c3)
        Like.objects.create(user=u5, comment=c3)
        
        # Expected Karma:
        # Post Likes: 2 * 5 = 10
        # Comment Likes: 2 * 1 = 2
        # Total = 12
        
        response = self.client.get(reverse('leaderboard'))
        
        # Find u3 in response
        u3_data = next((item for item in response.data if item['username'] == 'u3'), None)
        self.assertIsNotNone(u3_data)
        
        # If bug exists, it might report generic multiplication (e.g. 2*2=4 for each count)
        # 4 * 5 + 4 * 1 = 24
        self.assertEqual(u3_data['karma'], 12, f"Expected 12, got {u3_data['karma']}")

class CommentTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u1', password='password')
        self.post = Post.objects.create(content='P1', author=self.user)
        self.client = Client()
        self.client.force_login(self.user)

    def test_nested_comment_creation(self):
        """Test creating a reply to an existing comment"""
        from rest_framework import status
        
        # 1. Create root comment
        # Note: the URL for adding a comment via @action is /api/posts/<pk>/comments/
        # But for test client, we use reverse logic or hardcoded path if needed.
        # reverse('post-add-comment', ...) might be 'post-add-comment' if DefaultRouter names it so?
        # Usually it is 'post-add-comment' or 'post-comments' depending on router.
        # Let's try reverse first.
        
        # Checking router names:
        # router.register(r'posts', PostViewSet) -> 'post-list', 'post-detail'
        # @action(url_path='comments') -> 'post-add-comment' (likely)
        
        try:
            url = reverse('post-add-comment', kwargs={'pk': self.post.pk})
        except:
             # Fallback to manual construction
             url = f'/api/posts/{self.post.pk}/comments/'

        root_data = {'content': 'Root comment'}
        response = self.client.post(url, root_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        root_id = response.data['id']
        
        # 2. Create reply (nested)
        reply_data = {'content': 'Reply to root', 'parent': root_id}
        response_reply = self.client.post(url, reply_data)
        
        self.assertEqual(response_reply.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_reply.data['parent'], root_id)
        
        # 3. Verify it appears in post detail (tree)
        url_detail = reverse('post-detail', kwargs={'pk': self.post.pk})
        response_detail = self.client.get(url_detail)
        
        comments = response_detail.data['comments']
        # Find root
        root_node = next(c for c in comments if c['id'] == root_id)
        # Check replies
        self.assertEqual(len(root_node['replies']), 1)
        self.assertEqual(root_node['replies'][0]['content'], 'Reply to root')
