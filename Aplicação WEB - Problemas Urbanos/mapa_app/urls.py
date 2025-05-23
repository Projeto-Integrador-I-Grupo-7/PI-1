# mapa_app/urls.py
from django.urls import path
from . import views

app_name = 'mapa_app'

urlpatterns = [
    # URLs para páginas HTML (links do base.html, etc.)
    path('', views.quem_somos_view, name='quem_somos'),
    path('mapa/', views.mapa_pagina_inicial_view, name='mapa_interativo'),
    path('perfil/', views.perfil_usuario_view, name='perfil_usuario'),
    path('meus-pins/', views.meus_pins_view, name='meus_pins'),
    path('cadastro/', views.signup_view, name='signup'),

    # URLs para a API (usadas pelo JavaScript do mapa)
    path('api/problemas/', views.api_listar_problemas, name='api_listar_problemas'),
    path('api/registrar-problema/', views.registrar_problema_api, name='api_registrar_problema'),
]