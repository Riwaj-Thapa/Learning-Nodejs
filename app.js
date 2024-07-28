const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const upload = require("./multerConfig");
const app = express();
const port = 3000; // or change to 3001 if needed
const saltRounds = 12;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// MySQL connection setup
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "nodes",
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
          <label for="file"> Profile Picture:</label>
          <input type="file" id="file" name="file" required><br><br>
          <input type="submit" value="Register">
          <input type="file" name="myFiles" multiple>
          <input type="submit" value="Upload">
        </form>
      </body>
    </html>
  `);
});

// Route to handle registration
// app.post("/register", upload.single("file"), async (req, res) => {
//   const { username, email, password } = req.body;
//   const file = req.file;

//   if (!file) {
//     return res.status(400).send('No file uploaded.');
//   }

//   try {
//     const hashedPassword = await bcrypt.hash(password, saltRounds);
//     const filePath = `/uploads/${file.filename}`;
//     const query = "INSERT INTO users (username, email, password, file_path) VALUES (?, ?, ?, ?)";

//     connection.query(query, [username, email, hashedPassword, filePath], (error, results) => {
//       if (error) {
//         console.error("Error inserting user: ", error.stack);
//         res.status(500).send("Error registering user");
//         return;
//       }
//       console.log("User registered: ", results);
//       res.send("Registration Successful");
//     });
//   } catch (error) {
//     console.error("Error hashing password: ", error.stack);
//     res.status(500).send("Error registering user");
//   }
// });

app.post("/register", upload.single("file"), async (req, res) => {
  const { username, email, password } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const filePath = `/uploads/${file.filename}`;
    const query = "INSERT INTO users (username, email, password, file_path) VALUES (?, ?, ?, ?)";

    connection.query(query, [username, email, hashedPassword, filePath], (error, results) => {
      if (error) {
        console.error("Error inserting user: ", error.stack);
        res.status(500).send("Error registering user");
        return;
      }
      console.log("User registered: ", results);
      res.send("Registration Successful");
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
  const query = "SELECT * FROM users WHERE id = ?";

  connection.query(query, [userId], (error, results) => {
    if (error) {
      console.error("Error fetching user: ", error.stack);
      res.status(500).send("Error fetching user data");
      return;
    }

    if (results.length > 0) {
      const user = results[0];
      console.log("Fetched user data: ", user); // Log the user data
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
        <label for="file_path">Profile Picture:</label>
        <input type="file" id="file_path" name="file_path">
        <br><br>
        <button type="submit">Update Profile</button>
    </form>
</body>
</html>
`);
    } else {
      res.status(404).send("User not found");
    }
  });
});

// Route to handle form submission and update user data
app.post("/update/:id", upload.single("file_path"), (req, res) => {
  const userId = req.params.id;
  const { username, email, password } = req.body;
  const file = req.file;

  const updateFields = { username, email };

  if (file) {
    updateFields.file_path = `/uploads/${file.filename}`;
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
      res.send("Profile updated successfully");
    });
  }
});

// Start the server
app.listen(port, async () => {
  console.log(`Example app listening on port ${port}`);
  const open = await import('open'); // Dynamic import for 'open'
  await open.default(`http://localhost:${port}/register`);
});

