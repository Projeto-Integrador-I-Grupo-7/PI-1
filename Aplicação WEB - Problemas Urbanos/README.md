# PJI110
aplicação Web de mapeamento dos problemas urbanos da cidade de Osasco-SP. 

No Django Admin, tem as opcoes:
1- Status das Solicitações	:(Pendente |Em Análise |Resolvido  |Descartado |)
2- Emails das Secretarias	: cadastrar todos os emails das secretarias referente a cada assunto;
3- Assuntos da Reclamação	: Rua com buraco | Falta e iluminação | Arvores sem podar |
4- Solicitações : aqui será feita a reclamação que será enviado ao email da secretária referente ao
                assunto escolhido.

URL's: http://127.0.0.1:8000/admin/
       http://127.0.0.1:8000/contact/solicitar/
       http://127.0.0.1:8000/
       

# Iniciar o projeto Django

python -m venv venv
. venv/bin/activate
pip install django
django-admin startproject project . # (somente senao baixar do github, ou seja um projeto novo)
python manage.py startapp contact   # (somente senao baixar do github, ou seja um projeto novo)

# Migrando a base de dados do Django

python manage.py makemigrations     (somente senao baixar do github, ou seja um projeto novo)
python manage.py migrate            (somente senao baixar do github, ou seja um projeto novo)

# Criando e modificando a senha de um super usuário Django
# 
python manage.py createsuperuser
python manage.py changepassword USERNAME

# informações extras:
# Configurar o git

git config --global user.name 'Seu nome'
git config --global user.email 'seu_email@gmail.com'
git config --global init.defaultBranch main
# Configure o .gitignore
git init
git add .
git commit -m 'Mensagem'
git remote add origin URL_DO_GIT

# Resumo da Estrutura
seu_projeto/
│
├── base_static/
│   └── global/
│       └── css/
│           └── style.css
│
├── templates/
│   └── contact/
│       └── solicitar.html
│
├── contact/
│   └── views/
│       └── contact_views.py
│
├── manage.py
└── settings.py





