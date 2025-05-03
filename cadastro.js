function validarForm() {
    const cpf = document.getElementById('cpf').value;
    if (!validarCPF(cpf)) {
        alert('CPF inválido!');
        return false;
    }
    alert('Cadastro realizado com sucesso!');
    return true;
}

function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    return cpf.length === 11;
}

function redirectToUni() {
    window.open("https://univesp.br/", "_blank");
}

function redirectToUs() {
    window.location.href = 'QS.html';
}