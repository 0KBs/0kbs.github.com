const { useState, useEffect, useRef } = React;

const App = () => {
    const [contentBlockerDetected, setContentBlockerDetected] = useState(false);
    const [subreddits, setSubreddits] = useState(() => {
        const savedSubreddits = localStorage.getItem('subreddits');
        return savedSubreddits ? JSON.parse(savedSubreddits) : [{ name: 'r/technology' }];
    });
    const [selectedSubreddit, setSelectedSubreddit] = useState(() => {
        const savedSubreddit = localStorage.getItem('selectedSubreddit');
        return savedSubreddit ? savedSubreddit : 'r/technology';
    });
    const [posts, setPosts] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [sort, setSort] = useState('hot');
    const [commentSort, setCommentSort] = useState('best');
    const [newSubreddit, setNewSubreddit] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [subredditToDelete, setSubredditToDelete] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sidebarRef = useRef(null);
    const [commentVisibility, setCommentVisibility] = useState([]);

    const fetchPosts = () => {
        fetch(`https://www.reddit.com/${selectedSubreddit}/${sort}.json`)
            .then(response => {
                if (!response.ok) {
                    setContentBlockerDetected(true);
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const fetchedPosts = data.data.children.map(child => ({
                    id: child.data.id,
                    title: child.data.title,
                    author: child.data.author,
                    content: child.data.selftext,
                    url: child.data.url,
                    subreddit: child.data.subreddit_name_prefixed,
                    created_utc: child.data.created_utc,
                    gallery_data: child.data.gallery_data,
                    media_metadata: child.data.media_metadata,
                    pinned: child.data.stickied,
                    ups: child.data.ups - child.data.downs
                }));
                setPosts(fetchedPosts);
                setContentBlockerDetected(false);
            })
            .catch(error => {
                console.error('Fetch error:', error);
                setContentBlockerDetected(true);
            });
    };

    const fetchComments = (postId) => {
        fetch(`https://www.reddit.com/${selectedSubreddit}/comments/${postId}.json?sort=${commentSort}`)
            .then(response => response.json())
            .then(data => {
                const postTitle = data[0].data.children[0].data.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(); // Sanitize title for URL
                const fetchedComments = data[1].data.children.map(child => {
                    const commentData = {
                        author: child.data.author,
                        body: child.data.body,
                        media_metadata: child.data.media_metadata,
                        pinned: child.data.stickied,
                        ups: child.data.ups - child.data.downs,
                        replies: child.data.replies ? child.data.replies.data.children.map(reply => ({
                            author: reply.data.author,
                            body: reply.data.body,
                            media_metadata: reply.data.media_metadata,
                            pinned: reply.data.stickied,
                            ups: reply.data.ups - reply.data.downs,
                        })) : []
                    };
    
                    // Modify the media_metadata URLs to include the post title
                    if (commentData.media_metadata && commentData.media_metadata.length > 0) {
                        commentData.media_metadata.forEach(media => {
                            media.s.u = media.s.u.replace(/redd\.it\/(.*?)(\.jpeg|\.jpg|\.png)/, `redd.it/${postTitle}$1$2`);
                        });
                    }
    
                    return { ...commentData, isVisible: true };
                });
                setComments(fetchedComments);
                setCommentVisibility(new Array(fetchedComments.length).fill(true)); // All comments start as visible
            });
    };

    const toggleCommentVisibility = (index) => {
        const updatedVisibility = [...commentVisibility];
        updatedVisibility[index] = !updatedVisibility[index]; // Toggle the visibility
        setCommentVisibility(updatedVisibility);
    };

    useEffect(() => {
        fetchPosts();
    }, [selectedSubreddit, sort]);

    useEffect(() => {
        localStorage.setItem('subreddits', JSON.stringify(subreddits));
    }, [subreddits]);

    useEffect(() => {
        localStorage.setItem('selectedSubreddit', selectedSubreddit);
    }, [selectedSubreddit]);

    const viewPost = (postId) => {
        const post = posts.find(p => p.id === postId);
        setSelectedPost(post);
        fetchComments(postId);
    };

    const addSubreddit = () => {
        if (newSubreddit && !subreddits.some(sub => sub.name === newSubreddit)) {
            setSubreddits([...subreddits, { name: newSubreddit }]);
            setNewSubreddit('');
        }
    };

    const handleRightClick = (e, subreddit) => {
        e.preventDefault();
        setSubredditToDelete(subreddit);
        setShowPopup(true);
    };

    const confirmDelete = () => {
        setSubreddits(subreddits.filter(sub => sub.name !== subredditToDelete));
        setShowPopup(false);
        setSubredditToDelete(null);
    };

    const cancelDelete = () => {
        setShowPopup(false);
        setSubredditToDelete(null);
    };

    const handleClickOutside = (event) => {
        if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
            setSidebarOpen(false);
        }
    };

    useEffect(() => {
        if (sidebarOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [sidebarOpen]);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        setTouchStartX(touch.clientX);
    };

    const handleTouchMove = (e) => {
        if (!touchStartX) return;
        const touch = e.touches[0];
        const touchEndX = touch.clientX;
        const touchDiff = touchEndX - touchStartX;

        if (touchDiff > 50) {
            setSelectedPost(null);
        }
    };

    const [touchStartX, setTouchStartX] = useState(null);

    const renderGallery = (post) => {
        if (!post.gallery_data || !post.media_metadata) return null;

        const items = post.gallery_data.items.map(item => {
            const media = post.media_metadata[item.media_id];
            const src = media.s.u.replace(/&amp;/g, '&');
            return <img key={item.media_id} src={src} alt="Gallery item" className="w-full h-auto rounded mt-2 max-w-full" />;
        });

        return <div className="gallery">{items}</div>;
    };

    const renderFormattedText = (text) => {
        const sanitizedText = text.replace(/\\/g, '');
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        let formattedText = sanitizedText.replace(linkRegex, (match, p1, p2) => {
            return `<a href="${p2}" class="text-blue-500 underline">${p1}</a>`;
        });
      
        const inlineRegex = [
            { regex: /~~(.*?)~~/g, tag: 'del' },
            { regex: /\^(\S+)/g, tag: 'sup' },
            { regex: /`(.*?)`/g, tag: 'code' }
        ];
    
        inlineRegex.forEach(({ regex, tag }) => {
            formattedText = formattedText.replace(regex, (match, p1) => {
                return `<${tag}>${p1}</${tag}>`;
            });
        });
    
        const markdownRegex = [
            { regex: /(\*\*\*|___)(.*?)\1/g, tag: 'strong', className: 'italic' },
            { regex: /(\*\*|__)(.*?)\1/g, tag: 'strong' },
            { regex: /(\*|_)(.*?)\1/g, tag: 'em' }
        ];
    
        markdownRegex.forEach(({ regex, tag, className }) => {
            formattedText = formattedText.replace(regex, (match, p1, p2) => {
                return `<${tag} class="${className || ''}">${p2}</${tag}>`;
            });
        });

        const codeBlockRegex = /((?:^|\n)(?: {4}.*\n)+)/g;
        formattedText = formattedText.replace(codeBlockRegex, (match, p1) => {
            const codeContent = p1.replace(/^ {4}/gm, '');
            return `<pre>${codeContent}</pre>`;
        });
        formattedText = formattedText.replace(/\n/g, '<br/>');
        return <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
    };

    const renderPostContent = (post) => {
        if (post.url && post.url.includes("https://www.reddit.com/gallery/")) {
            return renderGallery(post);
        } else if (post.url && !post.url.includes("/comments/")) {
            const isRedditUrl = post.url.includes("reddit.com") || post.url.includes("redd.it");
            return isRedditUrl ? (
                <img src={post.url} alt="Post content" className="mt-2 rounded max-w-full" />
            ) : (
                <a href={post.url} className="text-blue-500 underline mt-2 block">{post.url}</a>
            );
        }
        return null;
    };
    const Comment = ({ comment }) => {
        const [isVisible, setIsVisible] = useState(true);
        
        const toggleVisibility = () => {
            setIsVisible(!isVisible);
        };

        return (
            <div className="text-white bg-gray-700 p-2 rounded mt-1">
                <div className="flex items-center text-gray-400 text-sm">
                    <button className="ml-2 text-blue-500" onClick={toggleVisibility}>
                        {isVisible ? '[ - ]' : '[ + ]'}
                    </button>
                    <span>by {comment.author}</span>
                </div>
                {isVisible && (
                    <div>
                        <span className="text-gray-400"><i className="fas fa-arrow-up"></i> {comment.ups} upvotes</span>
                        <div>{renderFormattedText(comment.body)}</div>
                        {comment.media_metadata && comment.media_metadata.length > 0 && (
                            <img src={comment.media_metadata[0].s.u} alt="Comment embedded content" className="mt-2 rounded" />
                        )}
                        {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-4">
                                {comment.replies.map((reply, index) => (
                                    <Comment key={index} comment={reply} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };
    
    return (
        <div className="flex h-screen">
            <div ref={sidebarRef} className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out w-64 bg-gray-900 p-4 z-50`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <img src="https://0kb.org/app/zennit/assets/favicon/favicon-96x96.png" alt="Reddit Icon" className="w-8 h-8" />
                        <span className="ml-2 text-white text-xl">Zennit</span>
                    </div>
                    <button className="text-white" onClick={() => setSidebarOpen(false)}>
                        <i className="fas fa-arrow-left"></i>
                    </button>
                </div>
                <div className="mb-4">
                    <h2 className="text-gray-400">Subreddits</h2>
                    {subreddits.map((subreddit, index) => (
                        <div 
                            className="flex items-center mt-2 cursor-pointer" 
                            key={index} 
                            onClick={() => setSelectedSubreddit(subreddit.name)}
                            onContextMenu={(e) => handleRightClick(e, subreddit.name)}
                        >
                            <div className="ml-2 text-white">{subreddit.name}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-4">
                    <input
                        type="text"
                        placeholder="Add subreddit"
                        className="w-full p-2 bg-gray-800 text-white rounded"
                        value={newSubreddit}
                        onChange={(e) => setNewSubreddit(e.target.value)}
                    />
                    <button className="mt-2 w-full p-2 bg-gray-700 text-white rounded" onClick={addSubreddit}>Add Subreddit</button>
                </div>
            </div>
            <div className="flex-1 bg-gray-800 p-4 flex flex-col">
            {contentBlockerDetected && (
                <div className="bg-red-600 text-white p-4 rounded mb-4">
                    <p>It seems that a content blocker is preventing posts from being fetched. Please disable your content blocker and refresh the page.</p>
                    <button 
                        className="mt-2 p-2 bg-gray-700 text-white rounded" 
                        onClick={() => window.location.reload()}
                    >
                        Refresh Page
                    </button>
                </div>
            )}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center cursor-pointer" onClick={() => setSelectedPost(null)}>
                        <button className="text-white mr-4" onClick={() => setSidebarOpen(true)}>
                            <img src="https://0kb.org/app/zennit/assets/favicon/favicon-96x96.png" alt="Reddit Icon" className="w-8 h-8" />
                        </button>
                        <div className="ml-2">
                            <div className="text-white text-xl sm:text-2xl">{selectedSubreddit}</div>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <select className="p-2 bg-gray-700 text-white rounded" value={sort} onChange={(e) => setSort(e.target.value)}>
                            <option value="hot">Hot</option>
                            <option value="new">New</option>
                            <option value="top">Top</option>
                            <option value="rising">Rising</option>
                        </select>
                        <button className="text-white ml-4" onClick={fetchPosts}>
                            <i className="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
                    {selectedPost ? (
                        <div>
                            <div className="text-white bg-gray-700 p-2 rounded mt-1 flex items-center">
                                {selectedPost.pinned && <i className="fas fa-thumbtack text-yellow-500 mr-2"></i>}
                                <span>{selectedPost.title}</span>
                                <span className="text-gray-400 ml-2 flex items-center">
                                    <i className="fas fa-arrow-up mr-1"></i>
                                    {selectedPost.ups} upvotes
                                </span>
                            </div>
                            <div className="text-gray-400 text-sm mt-1 flex justify-between">
                                <span>by {selectedPost.author}</span>
                                <span>{formatDate(selectedPost.created_utc)}</span>
                            </div>
                            <div className="text-white bg-gray-700 p-2 rounded mt-1">{renderFormattedText(selectedPost.content)}</div>
                            {renderPostContent(selectedPost)}
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center">
                                    <select className="p-2 bg-gray-700 text-white rounded" value={commentSort} onChange={(e) => { setCommentSort(e.target.value); fetchComments(selectedPost.id); }}>
                                        <option value="best">Best</option>
                                        <option value="top">Top</option>
                                        <option value="new">New</option>
                                        <option value="controversial">Controversial</option>
                                    </select>
                                    <button className="text-white ml-4" onClick={() => fetchComments(selectedPost.id)}>
                                        <i className="fas fa-sync-alt"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="text-gray-400 text-sm mt-1">Comments</div>
                        {comments.map((comment, index) => (
                            <Comment key={index} comment={comment} />
                        ))}
                        <button className="mt-4 p-2 bg-gray-700 text-white rounded" onClick={() => setSelectedPost(null)}>Back to Posts</button>
                    </div>
                ) : (
                        posts.map((post, index) => (
                            <div className="mb-4" key={index}>
                                <div className="text-white bg-gray-700 p-2 rounded mt-1 flex justify-between items-center">
                                    <div className="flex items-center">
                                        {post.pinned && <i className="fas fa-thumbtack text-yellow-500 mr-2"></i>}
                                        <span>{post.title}</span>
                                        <span className="text-gray-400 ml-2 flex items-center">
                                        <i className="fas fa-arrow-up mr-1"></i>
                                        {post.ups}
                                        </span>
                                    </div>
                                    <button className="ml-4 p-2 bg-gray-700 text-white rounded" onClick={() => viewPost(post.id)}>View Post</button>
                                </div>
                                <div className="text-gray-400 text-sm mt-1 flex justify-between">
                                    <span>by {post.author}</span>
                                    <span>{formatDate(post.created_utc)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-gray-800 p-4 rounded">
                        <div className="text-white mb-4">Do you want to delete {subredditToDelete}?</div>
                        <div className="flex justify-end">
                            <button className="p-2 bg-gray-700 text-white rounded mr-2" onClick={confirmDelete}>Yes</button>
                            <button className="p-2 bg-gray-700 text-white rounded" onClick={cancelDelete}>No</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));
