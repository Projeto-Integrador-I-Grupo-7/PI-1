# Importando os caminhos das URLs
from django.urls import path

#Importando todas as Views
from . import views

urlpatterns = [
    path('',views.home, name='home'),
    path('mapa',views.mapa, name='mapa'),
]