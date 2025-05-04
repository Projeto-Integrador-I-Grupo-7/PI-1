from django.shortcuts import render, redirect
# from .models import Solicitacao 
# from .forms import SolicitacaoForm


# Create your views here.

def index(request):
    return render(
        request,
        'contact/index.html',
    )

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
