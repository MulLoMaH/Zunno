package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	core_kafka "github.com/MulLoMaH/Zunno/internal/core/kafka"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_pgx_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres/conn"
	core_redis_conn "github.com/MulLoMaH/Zunno/internal/core/repository/redis"

	tokenpkg "github.com/MulLoMaH/Zunno/internal/core/token"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"

	auth_redis_repository "github.com/MulLoMaH/Zunno/internal/features/auth/repository/redis"
	auth_service "github.com/MulLoMaH/Zunno/internal/features/auth/service"
	auth_transport_http "github.com/MulLoMaH/Zunno/internal/features/auth/transport/http"
	goals_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/goals/repository/postgres"
	goal_service "github.com/MulLoMaH/Zunno/internal/features/goals/service"
	goal_transport_http "github.com/MulLoMaH/Zunno/internal/features/goals/transport/http"
	groups_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/groups/repository/postgres"
	group_service "github.com/MulLoMaH/Zunno/internal/features/groups/service"
	group_transport_http "github.com/MulLoMaH/Zunno/internal/features/groups/transport/http"
	budget_kafka "github.com/MulLoMaH/Zunno/internal/features/joint_budget/kafka"
	budget_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/joint_budget/repository/postgres"
	budget_service "github.com/MulLoMaH/Zunno/internal/features/joint_budget/service"
	budget_transport_http "github.com/MulLoMaH/Zunno/internal/features/joint_budget/transport/http"
	plans_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/plans/repository/postgres"
	plan_service "github.com/MulLoMaH/Zunno/internal/features/plans/service"
	plan_transport_http "github.com/MulLoMaH/Zunno/internal/features/plans/transport/http"

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

	// --- Groups ---
	logger.Debug("initializing feature", zap.String("feature", "groups"))
	groupsRepository := groups_postgres_repository.NewGroupsRepository(pool)
	groupsService := group_service.NewGroupService(groupsRepository, usersRepository)
	groupsTransportHTTP := group_transport_http.NewGroupsHTTPHandler(groupsService)

	// --- Goals ---
	logger.Debug("initializing feature", zap.String("feature", "goals"))
	goalsRepository := goals_postgres_repository.NewGoalsRepository(pool)
	goalsService := goal_service.NewGoalService(goalsRepository)
	goalsTransportHTTP := goal_transport_http.NewGoalsHTTPHandler(goalsService)

	// --- Plans ---
	logger.Debug("initializing feature", zap.String("feature", "plans"))
	plansRepository := plans_postgres_repository.NewPlansRepository(pool)
	plansService := plan_service.NewPlanService(plansRepository)
	plansTransportHTTP := plan_transport_http.NewPlansHTTPHandler(plansService)

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

	// --- JWT middleware ---
	jwtMw := core_http_middleware.JWTAuth(tokenManager)

	// --- User routes ---
	userRoutes := userTransportHTTP.Routes()
	for i := range userRoutes {
		userRoutes[i].Middlewares = append(userRoutes[i].Middlewares, jwtMw)
	}
	apiV1Router.RegisterRoutes(userRoutes...)

	// --- Group routes ---
	// ВАЖНО:
	// - jwtMw навешивается на все групповые роуты.
	// - groupContextMw (проверка "юзер — активный участник группы")
	//   навешивается ТОЛЬКО на роуты с {id}, КРОМЕ /join.
	//   На /join юзер ещё не участник — middleware бы его не пропустил.
	//   Также исключаем /invite, /leave, /members/{userId}/... на будущее.
	groupContextMw := core_http_middleware.GroupContext(groupsService)
	groupRoutes := groupsTransportHTTP.Routes()
	for i := range groupRoutes {
		groupRoutes[i].Middlewares = append(groupRoutes[i].Middlewares, jwtMw)

		path := groupRoutes[i].Path
		if strings.Contains(path, "{id}") &&
			!strings.HasSuffix(path, "/join") &&
			!strings.HasSuffix(path, "/invite") {
			groupRoutes[i].Middlewares = append(groupRoutes[i].Middlewares, groupContextMw)
		}
	}
	apiV1Router.RegisterRoutes(groupRoutes...)

	// --- Goal routes ---
	goalRoutes := goalsTransportHTTP.Routes()
	for i := range goalRoutes {
		goalRoutes[i].Middlewares = append(goalRoutes[i].Middlewares, jwtMw)
		if strings.Contains(goalRoutes[i].Path, "{id}") {
			goalRoutes[i].Middlewares = append(goalRoutes[i].Middlewares, groupContextMw)
		}
	}
	apiV1Router.RegisterRoutes(goalRoutes...)

	// --- Plan routes ---
	planRoutes := plansTransportHTTP.Routes()
	for i := range planRoutes {
		planRoutes[i].Middlewares = append(planRoutes[i].Middlewares, jwtMw)
		if strings.Contains(planRoutes[i].Path, "{id}") {
			planRoutes[i].Middlewares = append(planRoutes[i].Middlewares, groupContextMw)
		}
	}
	apiV1Router.RegisterRoutes(planRoutes...)

	// --- Kafka + Budget ---
	logger.Debug("initializing kafka")
	kafkaCfg := core_kafka.NewConfigMust()
	kafkaProducer := core_kafka.NewProducer(kafkaCfg)

	budgetRepo := budget_postgres_repository.NewBudgetRepository(pool)
	budgetSvc := budget_service.NewBudgetService(budgetRepo, kafkaProducer)
	budgetHTTP := budget_transport_http.NewBudgetHTTPHandler(budgetSvc)

	budgetRoutes := budgetHTTP.Routes()
	for i := range budgetRoutes {
		budgetRoutes[i].Middlewares = append(budgetRoutes[i].Middlewares, jwtMw, groupContextMw)
	}
	apiV1Router.RegisterRoutes(budgetRoutes...)

	// Kafka consumer — в горутине, не блокирует старт
	statsHandler := budget_kafka.NewHandler(budgetRepo)
	kafkaConsumer := core_kafka.NewConsumer(kafkaCfg, statsHandler.Handle)

	go func() {
    const retryDelay = 10 * time.Second
    for {
        err := kafkaConsumer.Run(ctx)
        if ctx.Err() != nil {
            // graceful shutdown
            return
        }
        logger.Error("kafka consumer stopped, retrying",
            zap.Error(err),
            zap.Duration("retry_in", retryDelay),
        )
        select {
        case <-ctx.Done():
            return
        case <-time.After(retryDelay):
        }
    }
}()

	// Регистрируем роутер и статику
	httpServer.RegisterApiRouters(apiV1Router)
	httpServer.RegisterStatic("/", "web")

	if err := httpServer.Run(ctx); err != nil {
		logger.Error("HTTP server run error", zap.Error(err))
	}
}
