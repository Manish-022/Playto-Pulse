# EXPLAINER.md

## 1. The Tree (Nested Comments)
To avoid the **N+1 query problem** typical with recursive Django templates, I used a **single query + in-memory reconstruction** strategy.

### Implementation:
1. **Fetch**: Query all comments for the post in **one SQL call**, ordered by creation time.
2. **Serialize**: Convert the QuerySet to a list of dictionaries.
3. **Reconstruct**: Use a pass-by-reference approach to build the tree in O(N) time.
   - Initialize a `comment_map` lookup.
   - Iterate through the flat list.
   - If a comment has a `parent_id`, append it to the parent's `replies` list.
   - Otherwise, add it to the `root_comments` list.

Because Python dictionaries are mutable references, adding a child to a parent in the map automatically updates the nested structure in the root list.

## 2. The Math (Leaderboard) (Last 24h)
We calculate the leaderboard on-the-fly without storing a running "daily karma" counter.

### The Algorithm:
1. **Filter**: Consider `Like` objects created only in the last 24 hours (`created_at__gte=cutoff`).
2. **Aggregate**: Join `User` with their `posts` and `comments`.
3. **Weighted Sum**: 
   - Count likes on user's posts $\times$ 5.
   - Count likes on user's comments $\times$ 1.
4. **Distinct Counting**: Crucially, we use `distinct=True` to avoid Cartesian product over-counting when a user has both post likes and comment likes.

### The Query (Django ORM):
```python
users = User.objects.annotate(
    post_karma=Count('posts__likes', 
        filter=Q(posts__likes__created_at__gte=cutoff), 
        distinct=True) * 5,
    comment_karma=Count('comments__likes', 
        filter=Q(comments__likes__created_at__gte=cutoff), 
        distinct=True) * 1
).annotate(
    total_karma=F('post_karma') + F('comment_karma')
).filter(total_karma__gt=0).order_by('-total_karma')[:5]
```

## 3. The AI Audit
**The Bug:**
The AI (and I) initially wrote the aggregation query **without** `distinct=True`.

```python
# BUGGY CODE (Initial AI Draft)
users = User.objects.annotate(
    post_karma=Count('posts__likes') * 5,
    comment_karma=Count('comments__likes') * 1
)
```

**The Issue:**
This created a **Cartesian Product**. If a user had:
- 1 Post with **2** Likes
- 1 Comment with **2** Likes

The SQL join produced $2 \times 2 = 4$ rows for that user.
- `post_karma` became 4 * 5 = 20 (Actual: 10)
- `comment_karma` became 4 * 1 = 4 (Actual: 2)
- **Total Calculation: 24 (Actual: 12)**

**The Fix:**
I added `distinct=True` to the `Count` function to ensure unique counting of `Like` IDs, decoupling the two joins.

```python
# FIXED CODE
post_karma=Count('posts__likes', ..., distinct=True) * 5
```
I verified this with a specific unit test (`test_leaderboard_aggregation_bug`) that asserted the score was 12, not 24.
