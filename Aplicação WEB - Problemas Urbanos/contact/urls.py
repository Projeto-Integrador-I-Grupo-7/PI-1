from django.urls import path
from contact import views
# from myapp.admin import admin_site
#from .views import criar_solicitacao

app_name = 'contact'

urlpatterns = [
    path('', views.index, name='index'),
    path('login/contact/mapa/', views.mapa, name='mapa'),  
    path('contact/solicitar/', views.solicitar, name='solicitar'),
    path('contact/sucesso/', views.pagina_sucesso, name='pagina_sucesso'),
    # path("myadmin/", admin_site.urls)

]