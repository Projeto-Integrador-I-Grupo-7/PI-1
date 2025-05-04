from django.urls import path
from contact import views
#from .views import criar_solicitacao

app_name = 'contact'

urlpatterns = [
    path('', views.index, name='index'),
    path('contact/solicitar/', views.solicitar, name='solicitar'),
    path('contact/sucesso/', views.pagina_sucesso, name='pagina_sucesso'),  
]