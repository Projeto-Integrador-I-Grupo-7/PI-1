from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required # Decorador para proteger views
# from .models import Solicitacao 
# from .forms import SolicitacaoForm

# usuarios/views.py

from django.contrib.auth import login # Para logar o usuário automaticamente após o cadastro
from django.contrib import messages

# Se você criou CustomUserCreationForm:
from .contact_usuario_forms import CustomUserCreationForm
# Se você quer usar o padrão do Django diretamente (sem campos extras): 
#from django.contrib.auth.forms import UserCreationForm



# Create your views here.



def index(request):
    return render(
        request,
        'contact/index.html',
    )

def mapa(request):
    # Você pode acessar o usuário logado com request.user
    context = {
        'usuario': request.user
    }
    return render(request, 'contact/mapa.html', context)

def cadastro(request):
    if request.method == "POST":
        form = CustomUserCreationForm(request.POST) # Ou UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()  # Salva o novo usuário no banco de dados
            login(request, user) # Loga o usuário automaticamente
            messages.success(request, "Cadastro realizado com sucesso!")
            return redirect("login")  # Redirecione para uma página após o cadastro (ex: home)
        else:
            # Adiciona mensagens de erro de validação do formulário
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{form.fields[field].label if field != '__all__' else ''}: {error}")
            # Se você não quiser mensagens detalhadas, apenas:
            # messages.error(request, "Informações inválidas. Por favor, corrija os erros abaixo.")
    else:
        form = CustomUserCreationForm() # Ou UserCreationForm()
    return render(request, 'cadastro.html')

# View protegida
#@login_required # Esta linha garante que apenas usuários logados acessem
#def solicitar(request):
    # Você pode acessar o usuário logado com request.user
#    context = {
#        'usuario': request.user
#    }
#    return render(request, 'contact/solicitar.html', context)


# View protegida
#@login_required # Esta linha garante que apenas usuários logados acessem
#def mapa(request):
    # Você pode acessar o usuário logado com request.user
#    context = {
#        'usuario': request.user
#    }
#    return render(request, 'contact/mapa.html', context)
    

'''
def criar_solicitacao(request):
    if request.method == 'POST':
        form = SolicitacaoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('pagina_sucesso')  # ou mostre mensagem de sucesso
    else:
        form = SolicitacaoForm()
    return render(request, 'solicitacao_form.html', {'form': form})


def pagina_sucesso(request):
    return render(request, 'contact/sucesso.html')
'''
