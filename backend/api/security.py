class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        response.setdefault(
            "Cache-Control",
            "no-store"
        )

        response.setdefault(
            "Pragma",
            "no-cache"
        )

        response.setdefault(
            "Content-Security-Policy",
            (
                "default-src 'none'; "
                "base-uri 'none'; "
                "form-action 'none'; "
                "frame-ancestors 'none'"
            )
        )

        response.setdefault(
            "Permissions-Policy",
            (
                "camera=(), "
                "microphone=(), "
                "geolocation=(), "
                "payment=(), "
                "usb=()"
            )
        )

        response.setdefault(
            "X-Robots-Tag",
            "noindex, nofollow"
        )

        return response
