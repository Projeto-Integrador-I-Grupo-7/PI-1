# Arquivo: mapa_app/views.py
from django.shortcuts import render, redirect, HttpResponse
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import CustomUserCreationForm # Importa o formulário que acabamos de criar
from django.urls import reverse


@login_required # Protege a página do mapa, só usuários logados podem acessar
def mapa_pagina_inicial_view(request):
    """
    View para renderizar a página principal do mapa interativo.
    """
    context = {} 
    return render(request, 'mapa_app/mapa_interativo.html', context)

def signup_view(request):
    """
    View para o cadastro de novos usuários.
    """
    if request.user.is_authenticated: # Se o usuário já está logado, redireciona para o mapa
        return redirect('mapa_app:mapa_interativo')

    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()  # Salva o novo usuário
            login(request, user)  # Loga o usuário automaticamente
            messages.success(request, f"Cadastro realizado com sucesso! Bem-vindo(a), {user.username}!")
            return redirect('mapa_app:mapa_interativo') # Redireciona para o mapa
        else:
            # Se o formulário não for válido, as mensagens de erro já estarão no objeto 'form'
            # E serão exibidas no template. Podemos adicionar uma mensagem geral se quisermos.
            messages.error(request, "Houve erros no seu cadastro. Por favor, verifique os campos.")
    else:
        form = CustomUserCreationForm()
    
    return render(request, 'mapa_app/registration/signup.html', {'form': form})

# Views placeholder para outros links (para evitar erros NoReverseMatch)
def placeholder_view(request):
    """
    View temporária para funcionalidades ainda não implementadas.
    """
    url_name = request.resolver_match.url_name if request.resolver_match else "Página desconhecida"

 # Gere a URL usando reverse
    try:
        link_voltar_mapa = reverse('mapa_app:mapa_interativo')
    except Exception as e:
        # Caso a URL não possa ser resolvida por algum motivo (improvável aqui)
        print(f"Erro ao reverter URL 'mapa_app:mapa_interativo': {e}")
        link_voltar_mapa = "/" # Fallback para a raiz

    # Agora construa o HTML
    html_content = f"<h1>Página para '{url_name}' em construção.</h1>"
    html_content += f"<p><a href='{link_voltar_mapa}'>Voltar ao Mapa</a></p>"
    
    return HttpResponse(html_content, status=200)

# Atribuindo a placeholder_view para funcionalidades futuras
quem_somos_view = placeholder_view
perfil_usuario_view = placeholder_view
meus_pins_view = placeholder_view
