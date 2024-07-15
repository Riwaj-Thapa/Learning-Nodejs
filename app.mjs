import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql';
import open from 'open';

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL connection setup
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "nodes",
};

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
        <form action="/register" method="POST">
          <label for="username">Username:</label><br>
          <input type="text" id="username" name="username"><br><br>
          <label for="email">Email:</label><br>
          <input type="email" id="email" name="email"><br><br>
          <label for="password">Password:</label><br>
          <input type="password" id="password" name="password"><br><br>
          <input type="submit" value="Register">
        </form>
      </body>
    </html>
  `);
});

// Route to handle registration
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  const query = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
  connection.query(query, [username, email, password], (error, results) => {
    if (error) {
      console.error("Error inserting user: ", error.stack);
      res.status(500).send("Error registering user");
      return;
    }
    console.log("User registered: ", results);
    res.send("Registration successful");
  });
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

// Route to handle login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT * FROM users WHERE username = ? AND password = ?";
  connection.query(query, [username, password], (error, results) => {
    if (error) {
      console.error("Error during login: ", error.stack);
      res.status(500).send("Error logging in");
      return;
    }

    if (results.length > 0) {
      console.log("Login successful: ", results);
      res.send("Login successful");
    } else {
      console.log("Invalid credentials");
      res.status(401).send("Invalid credentials");
    }
  });
});

// Start the server and open the browser
app.listen(port, async () => {
  console.log(`Example app listening on port ${port}`);
  await open(`http://localhost:${port}/register`);
});
