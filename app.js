require("dotenv").config(); // allows to run locally you need to use a .env file
const express = require("express");
const app = express();
const pool = require("./dbPool.js");
const homeController = require("./controllers/homeController");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true })); //to be able to parse POST parameters
const session = require("express-session");
const bcrypt = require("bcrypt");

app.use(session({
    secret: "top secret!",
    resave: true,
    saveUninitialized: true
}));

app.use(express.urlencoded({extended: true})); //to be able to parse POST parameters

// Routes
// Root route for sign in page
app.get("/", homeController.displaySignInPage);

// Route to display main page of our website, once user is logged in
app.get("/index", isAuthenticated, homeController.displayIndexPage);

// When user clicks "sign in" on the sign in page, using
// their username and password (Be sure to use POST in .ejs file)
app.post("/signIn", async function(req, res){
  let username = req.body.username;
  let password = req.body.password;
  
  // Check if this username and password exist in our database
  if (await verifyLoginInfo(req, username, password)) {
    res.redirect("/index");
  } else {
    //If username and password do not match, send back to sign in page
    res.render("sign-in", { loginError: true });
  }
});

// When user fills out form to create a new account and submits it
app.post("/register", homeController.register);

// Route for returning movies from a search
app.get("/search", isAuthenticated, homeController.displaySearchResults);

// Route when user clicks the "logout" button
app.get("/logout", function(req, res){
   req.session.destroy();
   res.redirect("/");
});

// Route when user adds or deletes movies from their cart
app.get("/updateCart", isAuthenticated, homeController.updateCart);

// Route to display the shopping cart page 
app.get("/shoppingCart", isAuthenticated, homeController.displayCartPage);

// Start server
app.listen(process.env.PORT, process.env.IP, function () {
  console.log("Express server is running...");
  console.log("Port:", process.env.PORT);
  console.log("IP:", process.env.IP);
  console.log("API_KEY:", process.env.API_KEY);
});


/*******************************************************************************
 *                      Password Authentication Functions                      *
 ******************************************************************************/

async function verifyLoginInfo(req, username, password) {
  console.log("inside verifyLoginInfo");
  
  let result = await checkUsername(username);
  let hashedPwd = "";

  if (result.length > 0) {
    hashedPwd = result[0].password;
  }

  let passwordMatch = await checkPassword(password, hashedPwd);

  if (passwordMatch) {
    req.session.authenticated = true;
    req.session.name = result[0].user_id;
    return true;
  } else {
    return false;
  }
}


function checkUsername(username) {
  let sql = "SELECT * from user WHERE username = ?";
  return new Promise((resolve, reject) => {
      pool.query(sql, [username], (err, rows, fields) => {
        if (err) throw err;
        resolve(rows);
      }); // query
  }); // promise
}

function checkPassword(password, hashedValue) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hashedValue, (err, result) => {
      resolve(result);
    });
  });
}

function isAuthenticated(req, res, next) {
    if(!req.session.authenticated) {
        res.redirect('/');
    } else {
        next();
    }
}