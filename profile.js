const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const app = express();
const port = 3000; // or change to 3001 if needed
const saltRounds = 12;

// Multer Configuration
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // 1MB file size limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'postFiles', maxCount: 10 }
]);

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// MySQL connection setup
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "profile system",
};

const myLogger = function (req, res, next) {
  if (req.url === "/logout") {
    res.send("Thank you");
  }
  next();
};

app.use(myLogger);

const connection = mysql.createConnection(dbConfig);

// Function to connect to the database
const connectToDatabase = () => {
  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to the database: ", err.stack);
      return;
    }
    console.log("Connected to the database with ID: ", connection.threadId);
  });
};

connectToDatabase();

// Route to display registration form
app.get("/register", (req, res) => {
  res.status(200).send(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Registration Form</title>
      </head>
      <body>
        <h1>Register</h1>
        <form action="/register" method="POST" enctype="multipart/form-data">
          <label for="username">Username:</label><br>
          <input type="text" id="username" name="username"><br><br>
          <label for="email">Email:</label><br>
          <input type="email" id="email" name="email"><br><br>
          <label for="password">Password:</label><br>
          <input type="password" id="password" name="password"><br><br>
          <label for="profilePic">Profile Picture:</label>
          <input type="file" id="profilePic" name="profilePic" required><br><br>
          <label for="postFiles">Post Files:</label>
          <input type="file" id="postFiles" name="postFiles" multiple><br><br>
          <input type="submit" value="Register">
        </form>
      </body>
    </html>
  `);
});

// Route to handle registration
app.post("/register", upload, async (req, res) => {
  const { username, email, password } = req.body;
  const profilePic = req.files['profilePic'][0];
  const postFiles = req.files['postFiles'];

  if (!profilePic) {
    return res.status(400).send('Profile picture is required.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const profilePicPath = `/uploads/${profilePic.filename}`;

    connection.query("INSERT INTO users (username, email, password, file_path) VALUES (?, ?, ?, ?)", [username, email, hashedPassword, profilePicPath], (error, results) => {
      if (error) {
        console.error("Error inserting user: ", error.stack);
        res.status(500).send("Error registering user");
        return;
      }

      const userId = results.insertId;
      const postQuery = "INSERT INTO posts (user_id) VALUES (?)";
      connection.query(postQuery, [userId], (postError, postResults) => {
        if (postError) {
          console.error("Error inserting post: ", postError.stack);
          res.status(500).send("Error creating post");
          return;
        }

        const postId = postResults.insertId;
        const postFilesPaths = postFiles.map(file => [`/uploads/${file.filename}`, postId]);

        if (postFilesPaths.length > 0) {
          connection.query("INSERT INTO post_files (file_path, post_id) VALUES ?", [postFilesPaths], (fileError, fileResults) => {
            if (fileError) {
              console.error("Error inserting post files: ", fileError.stack);
              res.status(500).send("Error uploading post files");
              return;
            }

            res.send("Registration Successful");
          });
        } else {
          res.send("Registration Successful");
        }
      });
    });
  } catch (error) {
    console.error("Error hashing password: ", error.stack);
    res.status(500).send("Error registering user");
  }
});

// Route to display login form
app.get("/login", (req, res) => {
  res.status(200).send(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Login Form</title>
      </head>
      <body>
        <h1>Login</h1>
        <form action="/login" method="POST">
          <label for="username">Username:</label><br>
          <input type="text" id="username" name="username"><br><br>
          <label for="password">Password:</label><br>
          <input type="password" id="password" name="password"><br><br>
          <input type="submit" value="Login">
        </form>
      </body>
    </html>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT * FROM users WHERE username = ?";
  connection.query(query, [username], async (error, results) => {
    if (error) {
      console.error("Error during login: ", error.stack);
      res.status(500).send("Error logging in");
      return;
    }

    if (results.length > 0) {
      const user = results[0];
      try {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
          console.log("Login successful: ", user);
          res.send(`<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Logged In</title>
                    </head>
                    <body>
                        <h1>Congratulations ${user.username} !! you have successfully logged in.</h1>
                        <form action="/update/${user.id}" method="get">
                            <button type="submit">Edit Profile</button>
                        </form>
                    </body>
                    </html>`);
        } else {
          console.log("Invalid credentials");
          res.status(401).send("Invalid credentials");
        }
      } catch (error) {
        console.error("Error comparing passwords: ", error.stack);
        res.status(500).send("Error logging in");
      }
    } else {
      console.log("Invalid credentials");
      res.status(401).send("Invalid credentials");
    }
  });
});

// Route to handle update
app.get("/update/:id", (req, res) => {
  const userId = req.params.id;

  const userQuery = "SELECT * FROM users WHERE id = ?";
  connection.query(userQuery, [userId], (userError, userResults) => {
    if (userError) {
      console.error("Error fetching user: ", userError.stack);
      res.status(500).send("Error fetching user data");
      return;
    }

    if (userResults.length > 0) {
      const user = userResults[0];

      const postQuery = "SELECT * FROM posts WHERE user_id = ?";
      connection.query(postQuery, [userId], (postError, postResults) => {
        if (postError) {
          console.error("Error fetching posts: ", postError.stack);
          res.status(500).send("Error fetching post data");
          return;
        }

        if (postResults.length > 0) {
          const postId = postResults[0].id;
          const postFilesQuery = "SELECT * FROM post_files WHERE post_id = ?";

          connection.query(postFilesQuery, [postId], (fileError, fileResults) => {
            if (fileError) {
              console.error("Error fetching post files: ", fileError.stack);
              res.status(500).send("Error fetching post files");
              return;
            }

            const postFilesPaths = fileResults.map(file => file.file_path);

            res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Profile</title>
</head>
<body>
    <h1>Edit Profile</h1>
    <img src="${user.file_path}" alt="${user.username}" style="width: 100px; height: 100px;">
    <br>
    <form action="/update/${user.id}" method="post" enctype="multipart/form-data">
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" value="${user.username}" required>
        <br>
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" value="${user.email}" required>
        <br>
        <label for="password">New Password:</label>
        <input type="password" id="password" name="password">
        <br>
        <label for="profilePic">Profile Picture:</label>
        <input type="file" id="profilePic" name="profilePic">
        <br>
        <label for="postFiles">Post Files:</label>
        <input type="file" id="postFiles" name="postFiles" multiple>
        <br><br>
        <button type="submit">Update Profile</button>
    </form>
    <h2>Current Post Files</h2>
    <ul>
        ${postFilesPaths.map(filePath => `<li><img src="${filePath}" style="width: 100px; height: 100px;"></li>`).join('')}
    </ul>
</body>
</html>
`);
          });
        } else {
          res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Profile</title>
</head>
<body>
    <h1>Edit Profile</h1>
    <img src="${user.file_path}" alt="${user.username}" style="width: 100px; height: 100px;">
    <br>
    <form action="/update/${user.id}" method="post" enctype="multipart/form-data">
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" value="${user.username}" required>
        <br>
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" value="${user.email}" required>
        <br>
        <label for="password">New Password:</label>
        <input type="password" id="password" name="password">
        <br>
        <label for="profilePic">Profile Picture:</label>
        <input type="file" id="profilePic" name="profilePic">
        <br>
        <label for="postFiles">Post Files:</label>
        <input type="file" id="postFiles" name="postFiles" multiple>
        <br><br>
        <button type="submit">Update Profile</button>
    </form>
</body>
</html>
`);
        }
      });
    } else {
      res.status(404).send("User not found");
    }
  });
});

// Route to handle form submission and update user data
app.post("/update/:id", upload, (req, res) => {
  const userId = req.params.id;
  const { username, email, password } = req.body;
  const profilePic = req.files['profilePic'] ? req.files['profilePic'][0] : null;
  const postFiles = req.files['postFiles'];

  const updateFields = { username, email };

  if (profilePic) {
    updateFields.file_path = `/uploads/${profilePic.filename}`;
  }

  if (password) {
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        console.error("Error hashing password: ", err.stack);
        res.status(500).send("Error updating password");
        return;
      }
      updateFields.password = hash;
      updateUser(updateFields);
    });
  } else {
    updateUser(updateFields);
  }

  function updateUser(fields) {
    const query = "UPDATE users SET ? WHERE id = ?";
    connection.query(query, [fields, userId], (error, results) => {
      if (error) {
        console.error("Error updating user: ", error.stack);
        res.status(500).send("Error updating user data");
        return;
      }

      if (postFiles) {
        const postQuery = "SELECT * FROM posts WHERE user_id = ?";
        connection.query(postQuery, [userId], (postError, postResults) => {
          if (postError) {
            console.error("Error fetching posts: ", postError.stack);
            res.status(500).send("Error fetching post data");
            return;
          }

          if (postResults.length > 0) {
            const postId = postResults[0].id;
            const postFilesPaths = postFiles.map(file => [`/uploads/${file.filename}`, postId]);

            if (postFilesPaths.length > 0) {
              connection.query("INSERT INTO post_files (file_path, post_id) VALUES ?", [postFilesPaths], (fileError, fileResults) => {
                if (fileError) {
                  console.error("Error inserting post files: ", fileError.stack);
                  res.status(500).send("Error uploading post files");
                  return;
                }

                res.send("Profile updated successfully");
              });
            } else {
              res.send("Profile updated successfully");
            }
          } else {
            res.send("Profile updated successfully");
          }
        });
      } else {
        res.send("Profile updated successfully");
      }
    });
  }
});

// Start the server
app.listen(port, async () => {
  console.log(`Example app listening on port ${port}`);
  const open = await import('open'); // Dynamic import for 'open'
  await open.default(`http://localhost:${port}/register`);
});
