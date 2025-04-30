from django.shortcuts import render
from django.http import HttpResponse

# Create your views here.
# Aqui estarão os HTML, CSS e JavaScript.

def home(request):
    return render(request, 'mapeando_problemas_urbanos/home.html')

def mapa(request):
    return render(request, 'mapeando_problemas_urbanos/mapa.html')
