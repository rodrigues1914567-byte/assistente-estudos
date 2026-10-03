import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


# =========================================================
# SEGURANÇA BÁSICA
# =========================================================

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "DJANGO_SECRET_KEY não configurada."
    )


DEBUG = (
    os.environ.get("DEBUG", "False").lower()
    == "true"
)


ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        "ALLOWED_HOSTS",
        ""
    ).split(",")
    if host.strip()
]

if not ALLOWED_HOSTS:
    raise RuntimeError(
        "ALLOWED_HOSTS não configurado."
    )


# =========================================================
# APLICAÇÕES
# =========================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
]


# =========================================================
# MIDDLEWARE
# =========================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",

    "django.middleware.clickjacking.XFrameOptionsMiddleware",

    "api.security.SecurityHeadersMiddleware",
]


# =========================================================
# DJANGO
# =========================================================

ROOT_URLCONF = "config.urls"


TEMPLATES = [
    {
        "BACKEND":
            "django.template.backends.django.DjangoTemplates",

        "DIRS": [],

        "APP_DIRS": True,

        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",

                "django.contrib.auth.context_processors.auth",

                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"


# =========================================================
# BANCO DE DADOS
# =========================================================

DATABASES = {
    "default": {
        "ENGINE":
            "django.db.backends.sqlite3",

        "NAME":
            BASE_DIR / "db.sqlite3",
    }
}


# =========================================================
# SENHAS
# =========================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME":
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator",
    },

    {
        "NAME":
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator",
    },

    {
        "NAME":
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator",
    },

    {
        "NAME":
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator",
    },
]


# =========================================================
# INTERNACIONALIZAÇÃO
# =========================================================

LANGUAGE_CODE = "pt-br"

TIME_ZONE = "America/Sao_Paulo"

USE_I18N = True

USE_TZ = True


# =========================================================
# ARQUIVOS ESTÁTICOS
# =========================================================

STATIC_URL = "static/"

STATIC_ROOT = BASE_DIR / "staticfiles"


DEFAULT_AUTO_FIELD = (
    "django.db.models.BigAutoField"
)


# =========================================================
# ORIGEM DO FRONTEND
# =========================================================

FRONTEND_ORIGIN = os.environ.get(
    "FRONTEND_ORIGIN",
    "https://rodrigues1914567-byte.github.io",
).strip().rstrip("/")


if not FRONTEND_ORIGIN:
    raise RuntimeError(
        "FRONTEND_ORIGIN não configurado."
    )


# =========================================================
# CORS
# =========================================================

CORS_ALLOWED_ORIGINS = [
    FRONTEND_ORIGIN
]

CORS_URLS_REGEX = r"^/api/.*$"

CORS_ALLOW_CREDENTIALS = False

CORS_ALLOW_METHODS = (
    "POST",
    "OPTIONS",
)

CORS_ALLOW_HEADERS = (
    "accept",
    "content-type",
)


# =========================================================
# CSRF
# =========================================================

CSRF_TRUSTED_ORIGINS = [
    FRONTEND_ORIGIN
]


# =========================================================
# HTTPS / TLS
# =========================================================

SECURE_PROXY_SSL_HEADER = (
    "HTTP_X_FORWARDED_PROTO",
    "https",
)

SECURE_SSL_REDIRECT = True

SECURE_HSTS_SECONDS = 31536000

SECURE_HSTS_INCLUDE_SUBDOMAINS = True

SECURE_HSTS_PRELOAD = False

SECURE_CONTENT_TYPE_NOSNIFF = True

SECURE_REFERRER_POLICY = "no-referrer"

SECURE_CROSS_ORIGIN_OPENER_POLICY = (
    "same-origin"
)


# =========================================================
# COOKIES
# =========================================================

SESSION_COOKIE_SECURE = True

SESSION_COOKIE_HTTPONLY = True

SESSION_COOKIE_SAMESITE = "Lax"


CSRF_COOKIE_SECURE = True

CSRF_COOKIE_HTTPONLY = True

CSRF_COOKIE_SAMESITE = "Lax"


# =========================================================
# CLICKJACKING
# =========================================================

X_FRAME_OPTIONS = "DENY"


# =========================================================
# LIMITES DE REQUEST
# =========================================================

DATA_UPLOAD_MAX_MEMORY_SIZE = 250_000

DATA_UPLOAD_MAX_NUMBER_FIELDS = 20
