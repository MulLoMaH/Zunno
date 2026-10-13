package core_http_response

import "net/http"

var (
	statusCodeUninitialized = -1
)

type ResponseWriter struct {
	http.ResponseWriter
	stausCode int
}

func NewResponseWriter(w http.ResponseWriter) *ResponseWriter {
	return &ResponseWriter{
		ResponseWriter: w,
		stausCode:      statusCodeUninitialized,
	}
}

func (rw *ResponseWriter) WriteHeader(statusCode int) {
	rw.ResponseWriter.WriteHeader(statusCode)
	rw.stausCode = statusCode
}

func (rw *ResponseWriter) GetStatusCodeOrPanic() int {
	if rw.stausCode == statusCodeUninitialized {
		panic("no status code set")
	}

	return rw.stausCode
}
