# usuarios/forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User # O modelo de usuário padrão do Django

class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True, help_text='Obrigatório. Digite um endereço de e-mail válido.')
    first_name = forms.CharField(max_length=30, required=False, help_text='Opcional.')
    last_name = forms.CharField(max_length=150, required=False, help_text='Opcional.')

    class Meta(UserCreationForm.Meta):
        model = User
        fields = UserCreationForm.Meta.fields + ('email', 'first_name', 'last_name') # Adiciona os novos campos

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("Este endereço de e-mail já está em uso.")
        return email

# Se você só precisa do básico (username, senha, confirmação de senha),
# você pode pular este arquivo e usar UserCreationForm diretamente na sua view.
# Mas criar um CustomUserCreationForm é mais flexível.