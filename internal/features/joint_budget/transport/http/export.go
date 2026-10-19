package budget_transport_http

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
)

func (h *BudgetHTTPHandler) ExportTransactions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	rows, err := h.budgetService.ExportTransactions(ctx, info.GroupID)
	if err != nil {
		responseHandler.ErrorResponse(err, "export transactions")
		return
	}

	filename := fmt.Sprintf("zunno-transactions-%s.csv", time.Now().Format("2006-01-02"))

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	// BOM для корректного открытия в Excel (русские символы)
	_, _ = w.Write([]byte{0xEF, 0xBB, 0xBF})

	csvWriter := csv.NewWriter(w)
	defer csvWriter.Flush()

	// Заголовки
	_ = csvWriter.Write([]string{
		"Дата",
		"Тип",
		"Категория",
		"Описание",
		"Сумма",
		"Участник",
	})

	// Данные
	for _, row := range rows {
		typeLabel := "Расход"
		if row.Type == "income" {
			typeLabel = "Доход"
		}

		_ = csvWriter.Write([]string{
			row.Date.Format("2006-01-02 15:04"),
			typeLabel,
			row.CategoryName,
			row.Description,
			strconv.FormatFloat(row.Amount, 'f', 2, 64),
			row.UserName,
		})
	}
}
