# Arquivo: mapa_app/views.py

import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST, require_GET # Adicionado require_GET
from django.views.decorators.csrf import csrf_exempt # Para simplificar testes da API inicialmente, mas CUIDADO em produção
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, reverse
from django.contrib.auth import login
from django.utils import timezone # Adicionado timezone

from .models import Problema
from .forms import CustomUserCreationForm # Para a view de cadastro
from .models import Problema, TIPO_PROBLEMA_CHOICES
# --- Views de API para o Mapa ---

@require_GET # Esta view deve apenas retornar dados
def api_listar_problemas(request):
    """
    API para listar todos os problemas cadastrados.
    """
    try:
        problemas = Problema.objects.all().order_by('-data_reporte') # Mais recentes primeiro
        
        lista_problemas_data = []
        for problema in problemas:
            lista_problemas_data.append({
                'id': problema.id,
                'latitude': float(problema.latitude), # Garante que é float
                'longitude': float(problema.longitude), # Garante que é float
                'tipo_problema': problema.tipo_problema,
                'tipo_display': problema.get_tipo_problema_display(),
                'descricao': problema.descricao or "", # Garante string vazia se for None
                'enderecoTexto': problema.endereco_texto or "", # Garante string vazia se for None
                'status': problema.status,
                'status_display': problema.get_status_display(),
                'data_reporte': problema.data_reporte.isoformat(), # Formato ISO 8601
                'reportado_por': problema.usuario.username if problema.usuario else "Anônimo",
            })
        return JsonResponse({'success': True, 'problemas': lista_problemas_data})
    except Exception as e:
        print(f"Erro em api_listar_problemas: {e}") # Para debugging no console do servidor
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@login_required # Requer que o usuário esteja logado
@require_POST   # Esta view deve apenas aceitar requisições POST
# @csrf_exempt # REMOVA OU COMENTE EM PRODUÇÃO. Facilita testes iniciais sem CSRF token no JS.
               # Idealmente, o JS deve enviar o CSRF token.
def registrar_problema_api(request):
    """
    API para registrar um novo problema vindo do mapa.
    """
    try:
        data = json.loads(request.body)

        latitude = data.get('latitude')
        longitude = data.get('longitude')
        tipo_problema_key = data.get('tipo_problema') # Nome do campo vindo do JS
        descricao = data.get('descricao', '')
        endereco_texto = data.get('enderecoTexto', '') # Nome do campo vindo do JS

        if not all([latitude, longitude, tipo_problema_key]):
            return JsonResponse({'success': False, 'error': 'Dados incompletos (latitude, longitude, tipo).'}, status=400)

        # Valida se o tipo_problema_key existe nas choices do modelo
        # (Opcional, mas bom para robustez)
        tipos_validos = [choice[0] for choice in TIPO_PROBLEMA_CHOICES]
        if tipo_problema_key not in tipos_validos:
            return JsonResponse({'success': False, 'error': f'Tipo de problema inválido: {tipo_problema_key}'}, status=400)

        novo_problema = Problema.objects.create(
            usuario=request.user,
            latitude=float(latitude),
            longitude=float(longitude),
            tipo_problema=tipo_problema_key, # Usar a chave recebida
            descricao=descricao,
            endereco_texto=endereco_texto,
            status='pendente', # Definir status inicial explicitamente
            data_reporte=timezone.now() # Definir data de reporte explicitamente
        )

        problema_data = {
            'id': novo_problema.id,
            'latitude': float(novo_problema.latitude),
            'longitude': float(novo_problema.longitude),
            'tipo_problema': novo_problema.tipo_problema,
            'tipo_display': novo_problema.get_tipo_problema_display(),
            'descricao': novo_problema.descricao or "",
            'enderecoTexto': novo_problema.endereco_texto or "",
            'status': novo_problema.status,
            'status_display': novo_problema.get_status_display(),
            'data_reporte': novo_problema.data_reporte.isoformat(),
            'reportado_por': novo_problema.usuario.username,
        }
        return JsonResponse({'success': True, 'message': 'Problema registrado com sucesso!', 'problema': problema_data})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido.'}, status=400)
    except TypeError as e:
        print(f"Erro de tipo em registrar_problema_api: {e}")
        return JsonResponse({'success': False, 'error': f'Erro de tipo nos dados: {e}'}, status=400)
    except Exception as e:
        print(f"Erro genérico em registrar_problema_api: {e} (Tipo: {type(e).__name__})") # Adicionado tipo do erro
        # O erro que você está vendo no JS é o que é retornado aqui no 'str(e)'
        return JsonResponse({'success': False, 'error': str(e)}, status=500) # O JS está recebendo esta mensagem


# --- Views de Páginas HTML ---

def placeholder_view(request, page_name="Página"):
    """
    View genérica para páginas em construção.
    """
    try:
        link_voltar_mapa = reverse('mapa_app:mapa_interativo')
    except Exception:
        link_voltar_mapa = "/" # Fallback
    
    # Tentativa de pegar o nome da URL que chamou esta view
    url_name_display = page_name
    if request.resolver_match and request.resolver_match.url_name:
        # Deixar o nome mais amigável
        url_name_display = request.resolver_match.url_name.replace('_', ' ').replace('view', '').capitalize().strip()
        if not url_name_display: # Se ficou vazio
            url_name_display = page_name

    html_content = f"<h1>{url_name_display}</h1>"
    html_content += "<p>Esta página está em construção.</p>"
    html_content += f"<p><a href='{link_voltar_mapa}'>Voltar ao Mapa Interativo</a></p>"
    return HttpResponse(html_content, status=200)

def quem_somos_view(request):
    return render(request, 'mapa_app/quem_somos.html')

def mapa_pagina_inicial_view(request):
    # Esta view deve renderizar o template que contém o mapa principal
    # Você já tem mapa_interativo.html, então vamos usá-lo.
    return render(request, 'mapa_app/mapa_interativo.html')

@login_required
def perfil_usuario_view(request):
      # O objeto 'request.user' já contém todas as informações do usuário logado
      # que o modelo User padrão do Django possui.
      # Se você tiver um perfil de usuário customizado (Profile model),
      # você o buscaria aqui, ex: user_profile = UserProfile.objects.get(user=request.user)
      
      context = {
          'usuario_atual': request.user, # Passa o objeto User completo para o template
          'page_title': 'Meu Cadastro'
      }
      return render(request, 'mapa_app/perfil_usuario.html', context)

@login_required
def meus_pins_view(request):
    problemas_do_usuario = Problema.objects.filter(usuario=request.user).order_by('-data_reporte')
    context = {
        'problemas': problemas_do_usuario,
        'page_title': 'Meus Problemas Reportados'
    }
    return render(request, 'mapa_app/meus_pins.html', context)

def signup_view(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user) # Loga o usuário automaticamente após o cadastro
            # Redirecionar para a página inicial ou para o mapa
            return render(request, 'mapa_app/mapa_interativo.html', {'message': 'Cadastro realizado com sucesso!'}) # Ou redirect
    else:
        form = CustomUserCreationForm()
    return render(request, 'mapa_app/signup.html', {'form': form})