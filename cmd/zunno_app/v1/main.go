package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_pgx_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres/conn"
	core_redis_conn "github.com/MulLoMaH/Zunno/internal/core/repository/redis"

	tokenpkg "github.com/MulLoMaH/Zunno/internal/core/token"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"

	auth_redis_repository "github.com/MulLoMaH/Zunno/internal/features/auth/repository/redis"
	auth_service "github.com/MulLoMaH/Zunno/internal/features/auth/service"
	auth_transport_http "github.com/MulLoMaH/Zunno/internal/features/auth/transport/http"

	users_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/users/repository/postgres"
	user_service "github.com/MulLoMaH/Zunno/internal/features/users/service"
	user_transport_http "github.com/MulLoMaH/Zunno/internal/features/users/transport/http"

	"go.uber.org/zap"
)

const (
	accessTTL  = 15 * time.Minute
	refreshTTL = 7 * 24 * time.Hour
)

func main() {
	ctx, cancel := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer cancel()

	// --- Logger ---
	logger, err := core_logger.NewLogger(core_logger.NewConfigMust())
	if err != nil {
		fmt.Println("failed to initialize logger", err)
		os.Exit(1)
	}
	defer logger.Close()

	// --- Postgres ---
	logger.Debug("initializing database pool")
	pool, err := core_pgx_pool.NewPool(ctx, core_pgx_pool.NewConfigMust())
	if err != nil {
		logger.Fatal("failed to initialize database pool", zap.Error(err))
	}
	defer pool.Close()

	// --- Redis ---
	logger.Debug("initializing redis client")
	redisClient, err := core_redis_conn.NewClient(ctx, core_redis_conn.NewConfigMust())
	if err != nil {
		logger.Fatal("failed to initialize redis client", zap.Error(err))
	}
	defer redisClient.Close()

	// --- JWT ---
	jwtSecret := os.Getenv("JWT_SECRET")
	if len(jwtSecret) < 32 {
		logger.Fatal("JWT_SECRET must be at least 32 chars")
	}
	tokenManager := tokenpkg.NewManager(jwtSecret, "zunno", accessTTL, refreshTTL)

	// --- Users feature ---
	logger.Debug("initializing feature", zap.String("feature", "users"))
	usersRepository := users_postgres_repository.NewUsersRepository(pool)
	usersService := user_service.NewUserService(usersRepository)
	userTransportHTTP := user_transport_http.NewUsersHTTPHandler(usersService)

	// --- Auth feature ---
	logger.Debug("initializing feature", zap.String("feature", "auth"))
	refreshRepository := auth_redis_repository.NewRefreshRepository(redisClient)
	authSvc := auth_service.NewAuthService(usersService, tokenManager, refreshRepository)
	cookieSecure := os.Getenv("COOKIE_SECURE") == "true"
	authTransportHTTP := auth_transport_http.NewAuthHTTPHandler(authSvc, refreshTTL, cookieSecure)

	// --- HTTP server ---
	logger.Debug("initializing http server")
	httpServer := core_http_server.NewHTTPServer(
		core_http_server.NewConfigMust(),
		logger,
		core_http_middleware.RequestID(),
		core_http_middleware.Logger(logger),
		core_http_middleware.Panic(),
		core_http_middleware.Trace(),
	)

	// --- Routes ---
	apiV1Router := core_http_server.NewAPIVersionRouter(core_http_server.ApiVersionV1)

	// Публичные
	apiV1Router.RegisterRoutes(authTransportHTTP.Routes()...)

	// Защищённые — добавляем JWTAuth на каждый route
	jwtMw := core_http_middleware.JWTAuth(tokenManager)
	userRoutes := userTransportHTTP.Routes()
	for i := range userRoutes {
		userRoutes[i].Middlewares = append(userRoutes[i].Middlewares, jwtMw)
	}
	apiV1Router.RegisterRoutes(userRoutes...)

	httpServer.RegisterApiRouters(apiV1Router)

	httpServer.RegisterStatic("/", "web")
	if err := httpServer.Run(ctx); err != nil {
		logger.Error("HTTP server run error", zap.Error(err))
	}
}
