const { useState, useEffect, useRef } = React;
const { createRoot } = ReactDOM;

const App = () => {
    const [contentBlockerDetected, setContentBlockerDetected] = useState(false);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [subreddits, setSubreddits] = useState(() => {
        const savedSubreddits = localStorage.getItem('subreddits');
        return savedSubreddits ? JSON.parse(savedSubreddits) : [{ name: 'r/Zennit' }];
    });
    const [selectedSubreddit, setSelectedSubreddit] = useState(() => {
        const savedSubreddit = localStorage.getItem('selectedSubreddit');
        return savedSubreddit ? savedSubreddit : 'r/Zennit';
    });
    const [posts, setPosts] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [sort, setSort] = useState('hot');
    const [commentSort, setCommentSort] = useState('best');
    const [newSubreddit, setNewSubreddit] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [subredditToDelete, setSubredditToDelete] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sidebarRef = useRef(null);
    const [commentVisibility, setCommentVisibility] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [savedPosts, setSavedPosts] = useState(() => {
        const saved = localStorage.getItem('savedPosts');
        return saved ? JSON.parse(saved) : [];
    });
    const [viewingSaved, setViewingSaved] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [showDeletePopup, setShowDeletePopup] = useState(false);
    const [editMode, setEditMode] = useState(false);

    

    const fetchPosts = (page = 0) => {
        setLoadingPosts(true);
        let fetchUrl;
        if (selectedSubreddit.startsWith('u/')) {
            const username = selectedSubreddit.substring(2);
            fetchUrl = `https://www.reddit.com/user/${username}/submitted/${sort}.json?count=${(page - 1) * 25}`;
        } else {
            fetchUrl = `https://www.reddit.com/${selectedSubreddit}/${sort}.json?count=${(page - 1) * 25}`;
        }
    
        fetch(fetchUrl)
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
    
                setPosts(prevPosts => [...fetchedPosts]);
                setContentBlockerDetected(false);
            })
            .catch(error => {
                console.error('Fetch error:', error);
                setContentBlockerDetected(true);
            })
            .finally(() => {
                setLoadingPosts(false);
            });
    };

    const fetchComments = (postId) => {
        setLoadingComments(true);
        const post = posts.find(p => p.id === postId) || savedPosts.find(p => p.id === postId);
        const subredditToUse = post.subreddit;
        fetch(`https://www.reddit.com/${subredditToUse}/comments/${postId}.json?sort=${commentSort}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const postTitle = data[0].data.children[0].data.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
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
    
                    if (commentData.media_metadata && commentData.media_metadata.length > 0) {
                        commentData.media_metadata.forEach(media => {
                            media.s.u = media.s.u.replace(/redd\.it\/(.*?)(\.jpeg|\.jpg|\.png)/, `redd.it/${postTitle}$1$2`);
                        });
                    }
    
                    return { ...commentData, isVisible: true };
                });
    
                setComments(fetchedComments);
                setCommentVisibility(new Array(fetchedComments.length).fill(true));
            })
            .catch(error => {
                console.error('Fetch error:', error);
            })
            .finally(() => {
                setLoadingComments(false);
            });
    };

    const toggleCommentVisibility = (index) => {
        const updatedVisibility = [...commentVisibility];
        updatedVisibility[index] = !updatedVisibility[index];
        setCommentVisibility(updatedVisibility);
    };

    const savePost = (post) => {
        if (!savedPosts.some(savedPost => savedPost.id === post.id)) {
            const updatedSavedPosts = [...savedPosts, post];
            setSavedPosts(updatedSavedPosts);
            localStorage.setItem('savedPosts', JSON.stringify(updatedSavedPosts));
            setToastMessage('Post saved!');
        }
    };

    const handleSavedPostRightClick = (e, post) => {
        e.preventDefault();
        setPostToDelete(post);
        setShowDeletePopup(true);
    };

    const confirmDeletePost = () => {
        setSavedPosts(savedPosts.filter(p => p.id !== postToDelete.id));
        localStorage.setItem('savedPosts', JSON.stringify(savedPosts.filter(p => p.id !== postToDelete.id)));
        setShowDeletePopup(false);
        setPostToDelete(null);
        setToastMessage('Post removed from bookmarks!');
    };
    
    const cancelDeletePost = () => {
        setShowDeletePopup(false);
        setPostToDelete(null);
    };
    
    const renderSavedPosts = () => {
        return savedPosts.map((post, index) => (
            <div className="mb-4" key={index}>
                <div className="text-white bg-gray-700 p-2 rounded mt-1 flex justify-between items-center">
                    <div className="flex items-center" onClick={() => viewPost(post.id)}>
                        <span>{post.title}</span>
                        <button className="ml-4 p-2 bg-gray-700 text-white rounded">View Post</button>
                    </div>
                    {editMode && (
                        <button 
                            className="text-red-500 ml-2" 
                            onClick={() => {
                                setPostToDelete(post);
                                setShowDeletePopup(true);
                            }}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
            </div>
        ));
    };


    useEffect(() => {
        setPosts([]);
        fetchPosts(currentPage);
    }, [selectedSubreddit, sort]);


    useEffect(() => {
        localStorage.setItem('subreddits', JSON.stringify(subreddits));
    }, [subreddits]);

    useEffect(() => {
        localStorage.setItem('selectedSubreddit', selectedSubreddit);
    }, [selectedSubreddit]);

    const viewPost = (postId) => {
        const post = posts.find(p => p.id === postId) || savedPosts.find(p => p.id === postId);
        setSelectedPost(post);
        fetchComments(postId);
        setViewingSaved(false);
    };

    const addSubreddit = () => {
        if (newSubreddit) {
            let formattedSubreddit = newSubreddit.trim();
            if (formattedSubreddit.startsWith('user/') && formattedSubreddit.includes('/m/')) {
                const multiRedditName = formattedSubreddit.split('/m/')[1];
                setSubreddits([...subreddits, { name: multiRedditName, original: formattedSubreddit }]);
            } else if (formattedSubreddit.startsWith('u/') && !formattedSubreddit.includes('/m/')) {
                setSubreddits([...subreddits, { name: formattedSubreddit }]);
            } else {
                if (!formattedSubreddit.startsWith('r/')) {
                    formattedSubreddit = 'r/' + formattedSubreddit;
                }
                setSubreddits([...subreddits, { name: formattedSubreddit }]);
            }
    
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
        setToastMessage('Subreddit removed!');
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

    const renderSubreddits = () => {
        return subreddits.map((subreddit, index) => (
            <div className="flex items-center mt-2 cursor-pointer" key={index}>
                <div 
                    className="ml-2 text-white" 
                    onClick={() => {
                        const subredditToFetch = subreddit.original ? subreddit.original : subreddit.name;
                        setSelectedSubreddit(subredditToFetch);
                        setSidebarOpen(false);}}
                    onContextMenu={(e) => handleRightClick(e, subreddit.name)}
                >
                    {subreddit.original ? `m/${subreddit.name}` : subreddit.name}
                </div>
                {editMode && (
                    <button 
                        className="text-red-500 ml-2" 
                        onClick={() => {
                            setSubredditToDelete(subreddit.name);
                            setShowPopup(true);
                        }}
                    >
                        <i className="fas fa-times"></i> {/* Red X icon */}
                    </button>
                )}
            </div>
        ));
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

    const Toast = ({ message, onClose }) => {
        useEffect(() => {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }, [onClose]);
    
        return (
            <div className="fixed bottom-4 right-4 bg-green-500 text-white p-2 rounded shadow-lg">
                {message}
            </div>
        );
    };

    const renderGallery = (post) => {
        if (!post.gallery_data || !post.media_metadata) return null;

        const items = post.gallery_data.items.map(item => {
            const media = post.media_metadata[item.media_id];
            const src = media.s.u.replace(/&amp;/g, '&');
            return <img key={item.media_id} src={src} alt="Gallery item" className="w-full h-auto rounded mt-2 max-w-full" height="30%" width="30%" />;
        });

        return <div className="gallery">{items}</div>;
    };

    const renderFormattedText = (text) => {
        if (!text || typeof text !== 'string') {
            return null;
        }
    
        let formattedText = text;
        formattedText = formattedText.replace(/\\/g, '');
        formattedText = formattedText.replace(/\n\n+/g, '\n');

        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        formattedText = formattedText.replace(linkRegex, (match, p1, p2) => {
            return `<a href="${p2}" class="text-blue-500 underline">${p1}</a>`;
        });

        const previewRedditRegex = /(https?:\/\/preview\.redd\.it\/[^\s]+)/g;
        formattedText = formattedText.replace(previewRedditRegex, (match) => {
            return `<img src="${match}" alt="Comment embedded content" class="mt-2 rounded" height="30%" width="30%" />`;
        });
    
        const inlineRegex = [
            { regex: /~~(.*?)~~/g, tag: 'del' },
            { regex: /\^(\S+)/g, tag:'sup' },
            { regex: /`(.*?)`/g, tag: 'code' }
        ];
    
        inlineRegex.forEach(({ regex, tag }) => {
            formattedText = formattedText.replace(regex, (match, p1) => {
                return `<${tag}>${p1}</${tag}>`;
            });
        });
    
        const markdownRegex = [
            { regex: /(\*\*\*|___)(.*?)\1/g, tag:'strong', className: 'italic' },
            { regex: /(\*\*|__)(.*?)\1/g, tag:'strong' },
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
        } else if (post.url && post.url.includes("v.redd.it")) {
            // Embed Reddit videos
            const videoURL = post.media.reddit_video.fallback_url; // Get the video ID from the URL
            return (
                <video width="100%" height="100%" controls>
                <source src={videoURL} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            );
        } else if (post.url && post.url.includes("youtube.com") || post.url.includes("youtu.be")) {
            // Embed YouTube videos
            const videoId = post.url.includes("youtu.be") 
                ? post.url.split('/').pop() 
                : new URLSearchParams(new URL(post.url).search).get('v');
            return (
                <iframe
                    width="100%"
                    height="400"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    frameBorder="0"
                    allowFullScreen
                    title="YouTube Video"
                ></iframe>
            );
        } else if (post.url && !post.url.includes("/comments/")) {
            const isRedditUrl = post.url.includes("reddit.com") || post.url.includes("redd.it");
            return isRedditUrl ? (
                <img src={post.url} alt="Post content" className="mt-2 rounded max-w-full" height="30%" width="30%" />
            ) : (
                <a href={post.url} className="text-blue-500 underline mt-2 block">{post.url}</a>
            );
        }
        return null;
    };

    const sharePost = (url) => {
        if (!url.startsWith('https://')) {
            url = `https://www.reddit.com${url}`;
        }
        if (navigator.share) {
            navigator.share({
                title: 'Check out this post on Reddit',
                url: url
            }).then(() => {
                console.log('Post shared successfully');
            }).catch((error) => {
                console.error('Error sharing the post:', error);
            });
        } else {
            navigator.clipboard.writeText(url).then(() => {
                setToastMessage('Post link copied to clipboard!');
            }).catch((error) => {
                console.error('Could not copy text: ', error);
            });
        }
    };

    const Comment = ({ comment, saveComment  }) => {
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
                            <img src={comment.media_metadata[0].s.u} alt="Comment embedded content" className="mt-2 rounded" height="30%" width="30%" />
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
                    {renderSubreddits()}
                </div>
                <div className="mt-4">
                    <button className="mt-2 w-full p-2 bg-gray-700 text-white rounded" onClick={() => setEditMode(!editMode)}>
                        {editMode ? 'Done Editing' : 'Edit Subreddits'}
                    </button>
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
                    <div className="flex items-center cursor-pointer" onClick={() => { setSelectedPost(null); setViewingSaved(false); }}>
                        <button className="text-white mr-4" onClick={() =>  { setSelectedPost(null); setViewingSaved(false); setSidebarOpen(true) }}>
                            <img src="https://0kb.org/app/zennit/assets/favicon/favicon-96x96.png" alt="Reddit Icon" className="w-8 h-8" />
                        </button>
                        <div className="ml-2">
                            <div className="text-white text-xl sm:text-2xl">
                                {selectedSubreddit.startsWith('user/') && selectedSubreddit.includes('/m/') 
                                    ? `m/${selectedSubreddit.split('/m/')[1]}`
                                    : selectedSubreddit}
                            </div>
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
                        <button className="text-white ml-4" onClick={() => setViewingSaved(!viewingSaved)}>
                            {viewingSaved ? <i class="fas fa-bookmark inactive" id="bookmarkIcon"></i> : <i class="fas fa-bookmark active" id="bookmarkIcon"></i>}
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
                    {loadingPosts && (
                        <div className="text-white text-center">
                            <i className="fas fa-yin-yang fa-spin fa-10x"></i>
                        </div>
                    )}
                    {viewingSaved ? (
                        <div>
                            <h2 className="text-white text-xl mb-4">Saved Posts</h2>
                            <div className="text-gray-400 text-sm mb-4">
                            <h3 className="text-gray-400 text-sm mt-1" onClick={() => setEditMode(!editMode)}>Edit saved posts</h3>
                            {renderSavedPosts()}
                            </div>
                        </div>
                    ) : selectedPost ? (
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
                            <div className="text-white bg-gray-700 p-2 rounded mt-1">
                                {renderFormattedText(selectedPost.content)}
                                {renderPostContent(selectedPost)}
                            </div>
                            <div className="flex items-center mt-4">
                                <button className="p-2 bg-gray-700 text-white rounded" onClick={() => sharePost(selectedPost.url)}>
                                    <i className="fas fa-share-alt"></i> Share Post
                                </button>
                                <button className="ml-4 p-2 bg-gray-700 text-white rounded" onClick={() => savePost(selectedPost)}>
                                    <i class="fas fa-bookmark inactive" id="bookmarkIcon"></i> Save Post
                                </button>

                            </div>
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
                        {loadingComments && (
                            <div className="text-white text-center">
                                <i className="fas fa-yin-yang fa-spin fa-10x"></i>
                            </div>
                        )}
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
            {showDeletePopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-gray-800 p-4 rounded">
                        <div className="text-white mb-4">Do you want to delete {postToDelete.title}?</div>
                        <div className="flex justify-end">
                            <button className="p-2 bg-gray-700 text-white rounded mr-2" onClick={confirmDeletePost}>Yes</button>
                            <button className="p-2 bg-gray-700 text-white rounded" onClick={cancelDeletePost}>No</button>
                        </div>
                    </div>
                </div>
            )}
            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
        </div>
    )
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<App />);
