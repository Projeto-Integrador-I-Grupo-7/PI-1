# Arquivo: mapa_app/forms.py

from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(
        required=True,
        help_text='Obrigatório. Um endereço de e-mail válido para contato e recuperação de senha.'
    )
    first_name = forms.CharField(
        max_length=150, # Aumentado para nomes mais longos, se necessário
        required=False, # Defina como True se quiser que seja obrigatório
        help_text='Opcional. Seu primeiro nome.'
    )
    last_name = forms.CharField(
        max_length=150,
        required=False, # Defina como True se quiser que seja obrigatório
        help_text='Opcional. Seu sobrenome.'
    )
    
    class Meta(UserCreationForm.Meta):
        model = User
        # Define os campos que aparecerão no formulário e sua ordem
        fields = ('username', 'first_name', 'last_name', 'email') 
        # As senhas (password1, password2) são adicionadas automaticamente pelo UserCreationForm

    def clean_email(self):
        """
        Validação para garantir que o e-mail não esteja em uso por um usuário ativo.
        """
        email = self.cleaned_data.get('email')
        if email and User.objects.filter(email=email, is_active=True).exists():
            raise forms.ValidationError("Este endereço de e-mail já está em uso. Por favor, utilize outro.")
        return email