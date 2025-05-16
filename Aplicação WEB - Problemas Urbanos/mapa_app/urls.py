# mapa_app/urls.py
from django.urls import path
from . import views

app_name = 'mapa_app'

urlpatterns = [
    path('', views.mapa_pagina_inicial_view, name='mapa_interativo'),
    
    # URLs para os links do base.html, agora apontando para as views placeholder
    path('quem-somos/', views.quem_somos_view, name='quem_somos'),
    path('perfil/', views.perfil_usuario_view, name='perfil_usuario'),
    path('meus-pins/', views.meus_pins_view, name='meus_pins'),
    path('cadastro/', views.signup_view, name='signup'), # Para o link "Criar Conta"
]