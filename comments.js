// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

// Create express app
const app = express();
// Parse the body of the request
app.use(bodyParser.json());
// Allow cross-origin resource sharing
app.use(cors());

// Store comments
const commentsByPostId = {};

// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
  // Send back comments for the post id
  res.send(commentsByPostId[req.params.id] || []);
});

// Add comment to post
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id
  const commentId = randomBytes(4).toString('hex');
  // Get comment
  const { content } = req.body;
  // Get comments for post id
  const comments = commentsByPostId[req.params.id] || [];
  // Push new comment
  comments.push({ id: commentId, content, status: 'pending' });
  // Set comments
  commentsByPostId[req.params.id] = comments;
  // Emit event
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });
  // Send back comments
  res.status(201).send(comments);
});

// Handle event
app.post('/events', async (req, res) => {
  // Get event
  const { type, data } = req.body;
  // If event is comment moderated
  if (type === 'CommentModerated') {
    // Get comment
    const { id, postId, status, content } = data;
    // Get comments for post id
    const comments = commentsByPostId[postId];
    // Get comment
    const comment = comments.find((c) => c.id === id);
    // Set status
    comment.status = status;
    // Emit event
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, postId, status, content },
    });
  }
  // Send back status
  res