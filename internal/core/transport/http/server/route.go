package core_http_server

import (
	"net/http"

	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
)

type Route struct {
	Method      string
	Path        string
	Handler     http.HandlerFunc
	Middlewares []core_http_middleware.Middleware
}

func NewRoute(method, path string, handler http.HandlerFunc) Route {
	return Route{
		Method:  method,
		Path:    path,
		Handler: handler,
	}
}

func NewRouteWithMiddleware(
	method, path string,
	handler http.HandlerFunc,
	middlewares ...core_http_middleware.Middleware,
) Route {
	return Route{
		Method:      method,
		Path:        path,
		Handler:     handler,
		Middlewares: middlewares,
	}
}
