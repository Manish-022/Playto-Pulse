from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from feed.models import Post, Comment, Like
import random

class Command(BaseCommand):
    help = 'Seeds database with initial data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')
        
        # Create Users
        users = []
        for i in range(10):
            u, _ = User.objects.get_or_create(username=f'user{i}')
            u.set_password('password')
            u.save()
            users.append(u)
            
        # Create Posts
        posts = []
        for i in range(5):
            p = Post.objects.create(
                content=f'This is post number {i} from Playto Pulse! \n\nWe are building great social software.',
                author=random.choice(users)
            )
            posts.append(p)
            
        # Create Comments (Nested)
        for p in posts:
            # Root comments
            for i in range(3):
                c = Comment.objects.create(content=f'Root discussion point {i}', author=random.choice(users), post=p)
                # Reply
                r = Comment.objects.create(content=f'I agree with this point!', author=random.choice(users), post=p, parent=c)
                # Undo reply
                Comment.objects.create(content=f'Actually, I have a counterpoint.', author=random.choice(users), post=p, parent=r)

        # Create Likes
        for u in users:
            # Like random posts
            p = random.choice(posts)
            try: Like.objects.get_or_create(user=u, post=p)
            except: pass
            
            # Like random comments
            if Comment.objects.exists():
                c = Comment.objects.order_by('?').first()
                try: Like.objects.get_or_create(user=u, comment=c)
                except: pass
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded data'))
