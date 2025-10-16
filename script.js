var signUpButton = document.getElementById("signUp");
signUpButton.addEventListener("click", displaySignUp)

function displaySignUp(){
    window.location.href = 'signup.html';
}

var loginButton = document.getElementById("login");
loginButton.addEventListener("click", displayLogin)
function displayLogin(){
    window.location.href = 'login.html';
}