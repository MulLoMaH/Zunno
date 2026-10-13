package user_transport_http

// import (
// 	"net/http"

// 	"github.com/MulLoMaH/Zunno/internal/core/domain"
// 	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
// 	core_http_requset "github.com/MulLoMaH/Zunno/internal/core/transport/http/request"
// 	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
// )

// type CreateUserRequest struct {
// 	FullName     string `json:"full_name" validate:"required,min=3,max=100"`
// 	Age          int    `json:"age" validate:"required,min=18,max=100"`
// 	PhoneNumber  string `json:"phone_number" validate:"required,min=10,max=15,startswith=+"`
// 	PasswordHash string `json:"password_hash" validate:"required,min=8,max=100"`
// }

// type CreateUserResponse UserDTOResponse

// func (h *UsersHTTPHandler) CreateUser(rw http.ResponseWriter, r *http.Request) {
// 	ctx := r.Context()
// 	log := core_logger.FromContext(ctx)
// 	responseHendler := core_http_response.NewHTTPResponseHendler(log, rw)

// 	log.Debug("invoke create user handler")

// 	var request CreateUserRequest

// 	if err := core_http_requset.DecodeAndValidateRequest(r, &request); err != nil {
// 		responseHendler.ErrorResponse(err, "decode and validate request")
// 		return
// 	}

// 	userDomain := domainFromDTO(request)

// 	userDomain, err := h.userService.CreateUser(ctx, userDomain)
// 	if err != nil {
// 		responseHendler.ErrorResponse(err, "create user")
// 		return
// 	}

// 	response := CreateUserResponse(userDTOFromDomain(userDomain))

// 	responseHendler.JSONResponse(response, http.StatusCreated)
// }

// func domainFromDTO(dto CreateUserRequest) domain.User {
// 	return domain.NewUserUninitialized(dto.FullName, dto.Age, dto.PhoneNumber, dto.PasswordHash)
// }
