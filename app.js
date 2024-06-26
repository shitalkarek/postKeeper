
// // // user post likh skenge
// // //users create krna hai
// // //login out
// // //post creation
// // //post like
// // //post delete




const express = require('express');
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Set view engine to EJS for rendering HTML templates
app.set("view engine", "ejs");

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Middleware to parse cookies
app.use(cookieParser());

// Route for the home page
app.get('/', (req, res) => {
    res.render("index");
});

// Route for the login page
app.get('/login', (req, res) => {
    res.render("login");
});

// Route for logging out
app.get('/logout', (req, res) => {
    // Clear the token cookie to log out the user
    res.cookie("token", "", { expires: new Date(0) });
    res.redirect("/login");
});

// Middleware for protected routes
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect("/login");
    }

    try {
        // Verify token and assign user data to req.user
        const data = jwt.verify(token, "secret");
        req.user = data;
        next();
    } catch (error) {
        // Redirect to login if there's an error verifying the token
        return res.redirect("/login");
    }
}

// Route for the profile page (protected)
app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        // Find the user by email and populate posts
        let user = await userModel.findOne({ email: req.user.email }).populate('posts');
        console.log(user);
        res.render("profile", { user: user }); // Pass 'user' object to the template
    } catch (error) {
        res.status(500).send("Error retrieving profile");
    }
});

// Route for liking a post (protected)
app.get('/like/:id', isLoggedIn, async (req, res) => {
    try {
        // Find the post by ID
        let post = await postModel.findOne({_id: req.params.id }).populate('user');
       
        // Check if user has already liked the post
        if(post.likes.indexOf(req.user.userid) === -1){
            post.likes.push(req.user.userid); // Add like
        } else {
            post.likes.splice(post.likes.indexOf(req.user.userid), 1); // Remove like
        }

        // Save the post
        await post.save();
        res.redirect("/profile");
    } catch (error) {
        res.status(500).send("like not done");
    }
});

// Route for editing a post (protected)
app.get('/edit/:id', isLoggedIn, async (req, res) => {
    try {
        // Find the post by ID
        let post = await postModel.findOne({_id: req.params.id }).populate('user');
        res.render("edit", {post}); // Render the edit page with the post data
    } catch (error) {
        res.status(500).send("edit not done");
    }
});

// Route for updating a post (protected)
app.post('/update/:id', isLoggedIn, async (req, res) => {
    try {
        // Update the post content
        let post = await postModel.findOneAndUpdate({_id: req.params.id }, {content: req.body.content});
        res.redirect("/profile");
    } catch (error) {
        res.status(500).send("update not done");
    }
});

// Route for creating a new post (protected)
app.post('/post', isLoggedIn, async (req, res) => {
    try {
        // Find the user by email
        let user = await userModel.findOne({ email: req.user.email });
        let { content } = req.body;

        // Create a new post
        let post = await postModel.create({
            user: user._id,
            content
        });

        // Ensure user.posts is initialized as an array
        if (!user.posts) {
            user.posts = [];
        }

        // Add the new post to the user's posts array
        user.posts.push(post._id);

        // Save the updated user object
        await user.save();

        res.redirect("/profile");
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).send("Error creating post");
    }
});

// Route for registering a new user
app.post('/register', async (req, res) => {
    // Destructure request body
    let { email, password, username, name, age } = req.body;

    // Check if user already registered
    let user = await userModel.findOne({ email });
    if (user) return res.status(500).send("user already registered");

    // If user does not exist, hash password and create new user
    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash,
                posts: []
            });

            // Generate JWT token and set it in cookie
            let token = jwt.sign({ email: email, userid: user._id }, "secret");
            res.cookie("token", token);
            res.send("registered successfully");
        });
    });
});

// Route for logging in an existing user
app.post('/login', async (req, res) => {
    // Destructure request body
    let { email, password } = req.body;

    // Check if user exists
    let user = await userModel.findOne({ email });
    if (!user) return res.status(500).send("something went wrong");

    // Compare password with hashed password in database
    bcrypt.compare(password, user.password, function (err, result) {
        if (result) {
            // Generate JWT token and set it in cookie
            let token = jwt.sign({ email: email, userid: user._id }, "secret");
            res.cookie("token", token);
            // Redirect to profile on successful login
            res.redirect("/profile");
        } else {
            res.redirect("/login");
        }
    });
});

// Start the server on port 3002
app.listen(3002, () => {
    console.log("server is running on http://localhost:3002");
});
