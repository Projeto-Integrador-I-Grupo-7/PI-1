from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required # Decorador para proteger views
# from .models import Solicitacao 
# from .forms import SolicitacaoForm

# Create your views here.



def index(request):
    return render(
        request,
        'contact/index.html',
    )

# View protegida
@login_required # Esta linha garante que apenas usuários logados acessem
def mapa(request):
    # Você pode acessar o usuário logado com request.user
    context = {
        'usuario': request.user
    }
    return render(request, 'contact/mapa.html', context)

    

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
