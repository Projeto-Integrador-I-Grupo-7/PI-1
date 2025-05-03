function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log('Tentativa de login:', { username, password });
    alert('Login realizado com sucesso!');
}

function redirectToSignup() {
    window.location.href = 'cadastro.html';
}

function redirectToUs() {
    window.location.href = 'QS.html';
}

function redirectToUni() {
    window.open("https://univesp.br/", "_blank");
}


